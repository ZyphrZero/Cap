#![cfg(windows)]

mod windows_version;

pub use windows_version::WindowsVersion;

use std::{
    mem::ManuallyDrop,
    sync::{
        atomic::{AtomicBool, AtomicUsize, Ordering},
        mpsc::RecvError,
        Arc, Mutex,
    },
    time::Duration,
};
use windows::{
    core::{IInspectable, Interface, HSTRING},
    Foundation::{Metadata::ApiInformation, TypedEventHandler},
    Graphics::{
        Capture::{
            Direct3D11CaptureFrame, Direct3D11CaptureFramePool, GraphicsCaptureItem,
            GraphicsCaptureSession,
        },
        DirectX::{Direct3D11::IDirect3DDevice, DirectXPixelFormat},
        SizeInt32,
    },
    Win32::{
        Foundation::HMODULE,
        Graphics::{
            Direct3D::{D3D_DRIVER_TYPE, D3D_DRIVER_TYPE_HARDWARE, D3D_DRIVER_TYPE_WARP},
            Direct3D11::{
                D3D11CreateDevice, ID3D11Device, ID3D11DeviceContext, ID3D11Texture2D,
                ID3D11VideoContext, ID3D11VideoDevice, ID3D11VideoProcessor,
                ID3D11VideoProcessorEnumerator, ID3D11VideoProcessorInputView,
                ID3D11VideoProcessorOutputView, D3D11_BIND_RENDER_TARGET,
                D3D11_BIND_SHADER_RESOURCE, D3D11_BOX, D3D11_CPU_ACCESS_READ,
                D3D11_CREATE_DEVICE_FLAG, D3D11_MAPPED_SUBRESOURCE, D3D11_MAP_READ,
                D3D11_SDK_VERSION, D3D11_TEX2D_VPIV, D3D11_TEX2D_VPOV, D3D11_TEXTURE2D_DESC,
                D3D11_USAGE_DEFAULT, D3D11_USAGE_STAGING, D3D11_VIDEO_FRAME_FORMAT_PROGRESSIVE,
                D3D11_VIDEO_PROCESSOR_COLOR_SPACE, D3D11_VIDEO_PROCESSOR_CONTENT_DESC,
                D3D11_VIDEO_PROCESSOR_INPUT_VIEW_DESC, D3D11_VIDEO_PROCESSOR_INPUT_VIEW_DESC_0,
                D3D11_VIDEO_PROCESSOR_NOMINAL_RANGE_0_255,
                D3D11_VIDEO_PROCESSOR_NOMINAL_RANGE_16_235, D3D11_VIDEO_PROCESSOR_OUTPUT_VIEW_DESC,
                D3D11_VIDEO_PROCESSOR_OUTPUT_VIEW_DESC_0, D3D11_VIDEO_PROCESSOR_STREAM,
                D3D11_VIDEO_USAGE_OPTIMAL_QUALITY, D3D11_VPIV_DIMENSION_TEXTURE2D,
                D3D11_VPOV_DIMENSION_TEXTURE2D,
            },
            Dxgi::{
                Common::{
                    DXGI_FORMAT, DXGI_FORMAT_B8G8R8A8_UNORM, DXGI_FORMAT_R8G8B8A8_UNORM,
                    DXGI_RATIONAL, DXGI_SAMPLE_DESC,
                },
                IDXGIDevice, DXGI_ERROR_UNSUPPORTED,
            },
        },
        System::WinRT::Direct3D11::{
            CreateDirect3D11DeviceFromDXGIDevice, IDirect3DDxgiInterfaceAccess,
        },
    },
};

#[derive(Default, Clone, Copy, Debug)]
#[repr(i32)]
pub enum PixelFormat {
    #[default]
    R8G8B8A8Unorm,
    B8G8R8A8Unorm,
}

impl PixelFormat {
    pub fn as_directx(&self) -> DirectXPixelFormat {
        match self {
            Self::R8G8B8A8Unorm => DirectXPixelFormat::R8G8B8A8UIntNormalized,
            Self::B8G8R8A8Unorm => DirectXPixelFormat::B8G8R8A8UIntNormalized,
        }
    }

    pub fn as_dxgi(&self) -> DXGI_FORMAT {
        match self {
            Self::R8G8B8A8Unorm => DXGI_FORMAT_R8G8B8A8_UNORM,
            Self::B8G8R8A8Unorm => DXGI_FORMAT_B8G8R8A8_UNORM,
        }
    }
}

const STAGING_POOL_SIZE: usize = 3;

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
struct FrameSize {
    width: u32,
    height: u32,
}

impl FrameSize {
    fn from_tuple(size: (u32, u32)) -> Option<Self> {
        let (width, height) = size;
        (width > 0 && height > 0).then_some(Self { width, height })
    }
}

#[derive(Clone)]
struct FramePoolDevice(IDirect3DDevice);

unsafe impl Send for FramePoolDevice {}

impl FramePoolDevice {
    fn recreate(
        &self,
        frame_pool: &Direct3D11CaptureFramePool,
        pixel_format: DirectXPixelFormat,
        frame_pool_size: i32,
        size: SizeInt32,
    ) -> windows::core::Result<()> {
        frame_pool.Recreate(&self.0, pixel_format, frame_pool_size, size)
    }
}

struct PooledStagingTexture {
    texture: ID3D11Texture2D,
    width: u32,
    height: u32,
}

pub struct StagingTexturePool {
    textures: Mutex<Vec<PooledStagingTexture>>,
    d3d_device: ID3D11Device,
    pixel_format: PixelFormat,
    next_index: AtomicUsize,
}

impl StagingTexturePool {
    fn new(d3d_device: ID3D11Device, pixel_format: PixelFormat) -> Self {
        Self {
            textures: Mutex::new(Vec::with_capacity(STAGING_POOL_SIZE)),
            d3d_device,
            pixel_format,
            next_index: AtomicUsize::new(0),
        }
    }

    fn get_or_create_texture(
        &self,
        width: u32,
        height: u32,
    ) -> windows::core::Result<ID3D11Texture2D> {
        let mut textures = self.textures.lock().unwrap();

        let index = self.next_index.fetch_add(1, Ordering::Relaxed) % STAGING_POOL_SIZE;

        if let Some(pooled) = textures.get(index) {
            if pooled.width == width && pooled.height == height {
                return Ok(pooled.texture.clone());
            }
        }

        let texture_desc = D3D11_TEXTURE2D_DESC {
            Width: width,
            Height: height,
            MipLevels: 1,
            ArraySize: 1,
            Format: self.pixel_format.as_dxgi(),
            SampleDesc: DXGI_SAMPLE_DESC {
                Count: 1,
                Quality: 0,
            },
            Usage: D3D11_USAGE_STAGING,
            BindFlags: 0,
            CPUAccessFlags: D3D11_CPU_ACCESS_READ.0 as u32,
            MiscFlags: 0,
        };

        let mut texture = None;
        unsafe {
            self.d3d_device
                .CreateTexture2D(&texture_desc, None, Some(&mut texture))?;
        };

        let texture = texture.unwrap();

        if index < textures.len() {
            textures[index] = PooledStagingTexture {
                texture: texture.clone(),
                width,
                height,
            };
        } else {
            textures.push(PooledStagingTexture {
                texture: texture.clone(),
                width,
                height,
            });
        }

        Ok(texture)
    }
}

struct PooledScaledTexture {
    texture: ID3D11Texture2D,
    output_view: ID3D11VideoProcessorOutputView,
}

struct ScaledTexturePool {
    textures: Mutex<Vec<PooledScaledTexture>>,
}

impl ScaledTexturePool {
    fn new() -> Self {
        Self {
            textures: Mutex::new(Vec::new()),
        }
    }

    fn take_or_create(
        self: &Arc<Self>,
        d3d_device: &ID3D11Device,
        video_device: &ID3D11VideoDevice,
        video_enum: &ID3D11VideoProcessorEnumerator,
        pixel_format: PixelFormat,
        size: FrameSize,
    ) -> windows::core::Result<FrameTextureLease> {
        let pooled = self
            .textures
            .lock()
            .unwrap()
            .pop()
            .map(Ok)
            .unwrap_or_else(|| {
                Self::create_texture(d3d_device, video_device, video_enum, pixel_format, size)
            })?;

        Ok(FrameTextureLease {
            pooled: Some(pooled),
            pool: self.clone(),
        })
    }

    fn create_texture(
        d3d_device: &ID3D11Device,
        video_device: &ID3D11VideoDevice,
        video_enum: &ID3D11VideoProcessorEnumerator,
        pixel_format: PixelFormat,
        size: FrameSize,
    ) -> windows::core::Result<PooledScaledTexture> {
        let texture_desc = D3D11_TEXTURE2D_DESC {
            Width: size.width,
            Height: size.height,
            MipLevels: 1,
            ArraySize: 1,
            Format: pixel_format.as_dxgi(),
            SampleDesc: DXGI_SAMPLE_DESC {
                Count: 1,
                Quality: 0,
            },
            Usage: D3D11_USAGE_DEFAULT,
            BindFlags: (D3D11_BIND_RENDER_TARGET.0 | D3D11_BIND_SHADER_RESOURCE.0) as u32,
            CPUAccessFlags: 0,
            MiscFlags: 0,
        };

        let texture = unsafe {
            let mut texture = None;
            d3d_device.CreateTexture2D(&texture_desc, None, Some(&mut texture))?;
            texture.unwrap()
        };

        let output_view_desc = D3D11_VIDEO_PROCESSOR_OUTPUT_VIEW_DESC {
            ViewDimension: D3D11_VPOV_DIMENSION_TEXTURE2D,
            Anonymous: D3D11_VIDEO_PROCESSOR_OUTPUT_VIEW_DESC_0 {
                Texture2D: D3D11_TEX2D_VPOV { MipSlice: 0 },
            },
        };

        let output_view = unsafe {
            let mut output = None;
            video_device.CreateVideoProcessorOutputView(
                &texture,
                video_enum,
                &output_view_desc,
                Some(&mut output),
            )?;
            output.unwrap()
        };

        Ok(PooledScaledTexture {
            texture,
            output_view,
        })
    }
}

struct FrameTextureLease {
    pooled: Option<PooledScaledTexture>,
    pool: Arc<ScaledTexturePool>,
}

impl FrameTextureLease {
    fn texture(&self) -> &ID3D11Texture2D {
        &self.pooled.as_ref().unwrap().texture
    }

    fn output_view(&self) -> &ID3D11VideoProcessorOutputView {
        &self.pooled.as_ref().unwrap().output_view
    }
}

impl Drop for FrameTextureLease {
    fn drop(&mut self) {
        if let Some(pooled) = self.pooled.take() {
            self.pool.textures.lock().unwrap().push(pooled);
        }
    }
}

struct FrameScaler {
    input_size: FrameSize,
    output_size: FrameSize,
    pixel_format: PixelFormat,
    d3d_device: ID3D11Device,
    d3d_context: ID3D11DeviceContext,
    video_device: ID3D11VideoDevice,
    video_context: ID3D11VideoContext,
    video_enum: ID3D11VideoProcessorEnumerator,
    video_processor: ID3D11VideoProcessor,
    video_input_texture: ID3D11Texture2D,
    video_input: ID3D11VideoProcessorInputView,
    output_pool: Arc<ScaledTexturePool>,
}

impl FrameScaler {
    fn new(
        d3d_device: ID3D11Device,
        pixel_format: PixelFormat,
        input_size: FrameSize,
        output_size: FrameSize,
        frame_rate: u32,
    ) -> windows::core::Result<Self> {
        let d3d_context = unsafe { d3d_device.GetImmediateContext() }?;
        let video_device: ID3D11VideoDevice = d3d_device.cast()?;
        let video_context: ID3D11VideoContext = d3d_context.cast()?;

        let video_desc = D3D11_VIDEO_PROCESSOR_CONTENT_DESC {
            InputFrameFormat: D3D11_VIDEO_FRAME_FORMAT_PROGRESSIVE,
            InputFrameRate: DXGI_RATIONAL {
                Numerator: frame_rate.max(1),
                Denominator: 1,
            },
            InputWidth: input_size.width,
            InputHeight: input_size.height,
            OutputFrameRate: DXGI_RATIONAL {
                Numerator: frame_rate.max(1),
                Denominator: 1,
            },
            OutputWidth: output_size.width,
            OutputHeight: output_size.height,
            Usage: D3D11_VIDEO_USAGE_OPTIMAL_QUALITY,
        };

        let video_enum = unsafe { video_device.CreateVideoProcessorEnumerator(&video_desc) }?;
        let video_processor = unsafe { video_device.CreateVideoProcessor(&video_enum, 0) }?;

        let mut color_space = D3D11_VIDEO_PROCESSOR_COLOR_SPACE {
            _bitfield: 1 | D3D11_VIDEO_PROCESSOR_NOMINAL_RANGE_0_255.0 as u32,
        };
        unsafe { video_context.VideoProcessorSetOutputColorSpace(&video_processor, &color_space) };
        color_space._bitfield = 1 | D3D11_VIDEO_PROCESSOR_NOMINAL_RANGE_16_235.0 as u32;
        unsafe {
            video_context.VideoProcessorSetStreamColorSpace(&video_processor, 0, &color_space)
        };

        let texture_desc = D3D11_TEXTURE2D_DESC {
            Width: input_size.width,
            Height: input_size.height,
            MipLevels: 1,
            ArraySize: 1,
            Format: pixel_format.as_dxgi(),
            SampleDesc: DXGI_SAMPLE_DESC {
                Count: 1,
                Quality: 0,
            },
            Usage: D3D11_USAGE_DEFAULT,
            BindFlags: (D3D11_BIND_RENDER_TARGET.0 | D3D11_BIND_SHADER_RESOURCE.0) as u32,
            CPUAccessFlags: 0,
            MiscFlags: 0,
        };

        let video_input_texture = unsafe {
            let mut texture = None;
            d3d_device.CreateTexture2D(&texture_desc, None, Some(&mut texture))?;
            texture.unwrap()
        };

        let input_view_desc = D3D11_VIDEO_PROCESSOR_INPUT_VIEW_DESC {
            ViewDimension: D3D11_VPIV_DIMENSION_TEXTURE2D,
            Anonymous: D3D11_VIDEO_PROCESSOR_INPUT_VIEW_DESC_0 {
                Texture2D: D3D11_TEX2D_VPIV {
                    MipSlice: 0,
                    ..Default::default()
                },
            },
            ..Default::default()
        };

        let video_input = unsafe {
            let mut input = None;
            video_device.CreateVideoProcessorInputView(
                &video_input_texture,
                &video_enum,
                &input_view_desc,
                Some(&mut input),
            )?;
            input.unwrap()
        };

        Ok(Self {
            input_size,
            output_size,
            pixel_format,
            d3d_device,
            d3d_context,
            video_device,
            video_context,
            video_enum,
            video_processor,
            video_input_texture,
            video_input,
            output_pool: Arc::new(ScaledTexturePool::new()),
        })
    }

    fn process_texture(
        &mut self,
        input_texture: &ID3D11Texture2D,
    ) -> windows::core::Result<FrameTextureLease> {
        let output = self.output_pool.take_or_create(
            &self.d3d_device,
            &self.video_device,
            &self.video_enum,
            self.pixel_format,
            self.output_size,
        )?;

        unsafe {
            self.d3d_context
                .CopyResource(&self.video_input_texture, input_texture);

            let video_stream = D3D11_VIDEO_PROCESSOR_STREAM {
                Enable: true.into(),
                OutputIndex: 0,
                InputFrameOrField: 0,
                pInputSurface: ManuallyDrop::new(Some(self.video_input.clone())),
                ..Default::default()
            };

            self.video_context.VideoProcessorBlt(
                &self.video_processor,
                output.output_view(),
                0,
                &[video_stream],
            )?;
        }

        Ok(output)
    }
}

pub fn is_supported() -> windows::core::Result<bool> {
    Ok(ApiInformation::IsApiContractPresentByMajor(
        &HSTRING::from("Windows.Foundation.UniversalApiContract"),
        8,
    )? && GraphicsCaptureSession::IsSupported()?)
}

fn create_d3d_device_with_type(
    driver_type: D3D_DRIVER_TYPE,
    flags: D3D11_CREATE_DEVICE_FLAG,
    device: *mut Option<ID3D11Device>,
) -> windows::core::Result<()> {
    unsafe {
        D3D11CreateDevice(
            None,
            driver_type,
            HMODULE::default(),
            flags,
            None,
            D3D11_SDK_VERSION,
            Some(device),
            None,
            None,
        )
    }
}

fn create_d3d_device_with_warp_fallback() -> windows::core::Result<(ID3D11Device, bool)> {
    let mut device = None;
    let flags = D3D11_CREATE_DEVICE_FLAG::default();

    let result = create_d3d_device_with_type(D3D_DRIVER_TYPE_HARDWARE, flags, &mut device);

    match result {
        Ok(()) => Ok((device.unwrap(), false)),
        Err(e) if e.code() == DXGI_ERROR_UNSUPPORTED => {
            tracing::info!("Hardware D3D11 device unavailable, attempting WARP fallback");
            create_d3d_device_with_type(D3D_DRIVER_TYPE_WARP, flags, &mut device)?;
            Ok((device.unwrap(), true))
        }
        Err(e) => Err(e),
    }
}

#[derive(Clone, Default, Debug)]
pub struct Settings {
    pub is_border_required: Option<bool>,
    pub is_cursor_capture_enabled: Option<bool>,
    pub min_update_interval: Option<Duration>,
    pub pixel_format: PixelFormat,
    pub crop: Option<D3D11_BOX>,
    pub fps: Option<u32>,
    pub output_size: Option<(u32, u32)>,
}

impl Settings {
    pub fn can_is_border_required() -> windows::core::Result<bool> {
        ApiInformation::IsPropertyPresent(
            &HSTRING::from("Windows.Graphics.Capture.GraphicsCaptureSession"),
            &HSTRING::from("IsBorderRequired"),
        )
    }

    pub fn can_is_cursor_capture_enabled() -> windows::core::Result<bool> {
        ApiInformation::IsPropertyPresent(
            &HSTRING::from("Windows.Graphics.Capture.GraphicsCaptureSession"),
            &HSTRING::from("IsCursorCaptureEnabled"),
        )
    }

    pub fn can_min_update_interval() -> windows::core::Result<bool> {
        ApiInformation::IsPropertyPresent(
            &HSTRING::from("Windows.Graphics.Capture.GraphicsCaptureSession"),
            &HSTRING::from("MinUpdateInterval"),
        )
    }
}

#[derive(Clone, Debug, thiserror::Error)]
pub enum NewCapturerError {
    #[error("Screen capture requires Windows 10 version 1903 (build 18362) or later")]
    WindowsVersionTooOld,
    #[error(
        "Windows Graphics Capture API is disabled or unavailable. This may be due to group policy or missing system components."
    )]
    GraphicsCaptureDisabled,
    #[error("NotSupported")]
    NotSupported,
    #[error("BorderNotSupported")]
    BorderNotSupported,
    #[error("CursorNotSupported")]
    CursorNotSupported,
    #[error("UpdateIntervalNotSupported")]
    UpdateIntervalNotSupported,
    #[error("CreateDevice: {0}")]
    CreateDevice(windows::core::Error),
    #[error("CreateDevice: {0}")]
    Context(windows::core::Error),
    #[error("Direct3DDevice: {0}")]
    Direct3DDevice(windows::core::Error),
    #[error("CreateDevice: {0}")]
    ItemSize(windows::core::Error),
    #[error("FramePool: {0}")]
    FramePool(windows::core::Error),
    #[error("CaptureSession: {0}")]
    CaptureSession(windows::core::Error),
    #[error("CropTexture: {0}")]
    CropTexture(windows::core::Error),
    #[error("RegisterFrameArrived: {0}")]
    RegisterFrameArrived(windows::core::Error),
    #[error("RegisterClosed: {0}")]
    RegisterClosed(windows::core::Error),
    #[error("RecvTimeout")]
    RecvTimeout(#[from] RecvError),
    #[error("Other: {0}")]
    Other(#[from] windows::core::Error),
}

pub struct Capturer {
    settings: Settings,
    d3d_device: ID3D11Device,
    d3d_context: ID3D11DeviceContext,
    session: GraphicsCaptureSession,
    frame_pool: Direct3D11CaptureFramePool,
    frame_arrived_token: i64,
    stop_flag: Arc<AtomicBool>,
    is_using_warp: bool,
}

impl Capturer {
    pub fn new(
        item: GraphicsCaptureItem,
        settings: Settings,
        callback: impl FnMut(Frame) -> windows::core::Result<()> + Send + 'static,
        closed_callback: impl FnMut() -> windows::core::Result<()> + Send + 'static,
        d3d_device: Option<ID3D11Device>,
    ) -> Result<Capturer, NewCapturerError> {
        if let Some(version) = WindowsVersion::detect() {
            tracing::debug!(
                version = %version.display_name(),
                meets_requirements = version.meets_minimum_requirements(),
                "Initializing screen capture"
            );

            if !version.meets_minimum_requirements() {
                tracing::error!(
                    version = %version.display_name(),
                    required = "Windows 10 version 1903 (build 18362)",
                    "Windows version does not meet minimum requirements"
                );
                return Err(NewCapturerError::WindowsVersionTooOld);
            }
        }

        let api_present = ApiInformation::IsApiContractPresentByMajor(
            &HSTRING::from("Windows.Foundation.UniversalApiContract"),
            8,
        )
        .unwrap_or(false);

        if !api_present {
            return Err(NewCapturerError::WindowsVersionTooOld);
        }

        if !GraphicsCaptureSession::IsSupported().unwrap_or(false) {
            return Err(NewCapturerError::GraphicsCaptureDisabled);
        }

        if settings.is_border_required.is_some() && !Settings::can_is_border_required()? {
            return Err(NewCapturerError::BorderNotSupported);
        }

        if settings.is_cursor_capture_enabled.is_some()
            && !Settings::can_is_cursor_capture_enabled()?
        {
            return Err(NewCapturerError::CursorNotSupported);
        }

        if settings.min_update_interval.is_some() && !Settings::can_min_update_interval()? {
            return Err(NewCapturerError::UpdateIntervalNotSupported);
        }

        let (d3d_device, is_using_warp) = if let Some(device) = d3d_device {
            (device, false)
        } else {
            create_d3d_device_with_warp_fallback().map_err(NewCapturerError::CreateDevice)?
        };

        let (d3d_device, d3d_context) = Some(d3d_device)
            .map(|d| unsafe { d.GetImmediateContext() }.map(|v| (d, v)))
            .transpose()
            .map_err(NewCapturerError::Context)?
            .unwrap();

        let staging_pool = Arc::new(StagingTexturePool::new(
            d3d_device.clone(),
            settings.pixel_format,
        ));

        let item = item.clone();
        let settings = settings.clone();
        let stop_flag = Arc::new(AtomicBool::new(false));
        let callback = Arc::new(Mutex::new(callback));
        let closed_callback = Arc::new(Mutex::new(closed_callback));

        let direct3d_device = (|| {
            let dxgi_device = d3d_device.cast::<IDXGIDevice>()?;
            let inspectable = unsafe { CreateDirect3D11DeviceFromDXGIDevice(&dxgi_device) }?;
            inspectable.cast::<IDirect3DDevice>()
        })()
        .map_err(NewCapturerError::Direct3DDevice)?;

        let frame_pool_size = settings
            .fps
            .map(|fps| ((fps as f32 / 30.0 * 2.0).ceil() as i32).clamp(2, 4))
            .unwrap_or(2);

        let initial_size = item.Size().map_err(NewCapturerError::ItemSize)?;
        let current_content_size = Arc::new(Mutex::new(initial_size));
        let output_size = settings.output_size.and_then(FrameSize::from_tuple);
        let scaler = Arc::new(Mutex::new(None::<FrameScaler>));

        let frame_pool = Direct3D11CaptureFramePool::CreateFreeThreaded(
            &direct3d_device,
            settings.pixel_format.as_directx(),
            frame_pool_size,
            initial_size,
        )
        .map_err(NewCapturerError::FramePool)?;

        let session = frame_pool
            .CreateCaptureSession(&item)
            .map_err(NewCapturerError::CaptureSession)?;

        if let Some(border_required) = settings.is_border_required {
            session.SetIsBorderRequired(border_required).unwrap();
        }

        if let Some(cursor_capture_enabled) = settings.is_cursor_capture_enabled {
            session
                .SetIsCursorCaptureEnabled(cursor_capture_enabled)
                .unwrap();
        }

        if let Some(min_update_interval) = settings.min_update_interval {
            session
                .SetMinUpdateInterval(min_update_interval.into())
                .unwrap();
        }

        let crop_data = settings
            .crop
            .map(|crop| {
                let desc = D3D11_TEXTURE2D_DESC {
                    Width: (crop.right - crop.left),
                    Height: (crop.bottom - crop.top),
                    MipLevels: 1,
                    ArraySize: 1,
                    Format: settings.pixel_format.as_dxgi(),
                    SampleDesc: DXGI_SAMPLE_DESC {
                        Count: 1,
                        Quality: 0,
                    },
                    Usage: D3D11_USAGE_DEFAULT,
                    BindFlags: (D3D11_BIND_RENDER_TARGET.0 | D3D11_BIND_SHADER_RESOURCE.0) as u32,
                    CPUAccessFlags: 0,
                    MiscFlags: 0,
                };

                let mut texture = None;
                unsafe { d3d_device.CreateTexture2D(&desc, None, Some(&mut texture)) }
                    .map_err(NewCapturerError::CropTexture)?;

                Ok::<_, NewCapturerError>((texture.unwrap(), crop))
            })
            .transpose()?;

        let frame_arrived_token = frame_pool
            .FrameArrived(
                &TypedEventHandler::<Direct3D11CaptureFramePool, IInspectable>::new({
                    let d3d_context = d3d_context.clone();
                    let d3d_device = d3d_device.clone();
                    let direct3d_device = FramePoolDevice(direct3d_device.clone());
                    let stop_flag = stop_flag.clone();
                    let staging_pool = staging_pool.clone();
                    let current_content_size = current_content_size.clone();
                    let scaler = scaler.clone();
                    let callback = callback.clone();

                    move |frame_pool, _| {
                        if stop_flag.load(Ordering::Relaxed) {
                            return Ok(());
                        }

                        let frame_pool = frame_pool
                            .as_ref()
                            .expect("FrameArrived parameter was None");
                        let frame = frame_pool.TryGetNextFrame()?;

                        let size = frame.ContentSize()?;
                        {
                            let mut current_content_size = current_content_size.lock().unwrap();
                            if current_content_size.Width != size.Width
                                || current_content_size.Height != size.Height
                            {
                                tracing::info!(
                                    from_width = current_content_size.Width,
                                    from_height = current_content_size.Height,
                                    to_width = size.Width,
                                    to_height = size.Height,
                                    "Screen capture content size changed"
                                );
                                drop(frame);
                                direct3d_device.recreate(
                                    frame_pool,
                                    settings.pixel_format.as_directx(),
                                    frame_pool_size,
                                    size,
                                )?;
                                *current_content_size = size;
                                return Ok(());
                            }
                        }

                        let surface = frame.Surface()?;
                        let dxgi_interface = surface.cast::<IDirect3DDxgiInterfaceAccess>()?;
                        let texture = unsafe { dxgi_interface.GetInterface::<ID3D11Texture2D>() }?;

                        let (mut width, mut height, mut texture) =
                            if let Some((cropped_texture, crop)) = crop_data.clone() {
                                unsafe {
                                    d3d_context.CopySubresourceRegion(
                                        &cropped_texture,
                                        0,
                                        0,
                                        0,
                                        0,
                                        &texture,
                                        0,
                                        Some(&crop),
                                    );
                                }

                                (
                                    crop.right - crop.left,
                                    crop.bottom - crop.top,
                                    cropped_texture,
                                )
                            } else {
                                (size.Width as u32, size.Height as u32, texture)
                            };

                        let mut texture_lease = None;
                        if let Some(output_size) = output_size {
                            let input_size = FrameSize { width, height };
                            if input_size != output_size {
                                let mut scaler = scaler.lock().unwrap();
                                let needs_recreate = match scaler.as_ref() {
                                    Some(scaler) => scaler.input_size != input_size,
                                    None => true,
                                };

                                if needs_recreate {
                                    *scaler = Some(FrameScaler::new(
                                        d3d_device.clone(),
                                        settings.pixel_format,
                                        input_size,
                                        output_size,
                                        settings.fps.unwrap_or(60),
                                    )?);
                                }

                                if let Some(scaler) = scaler.as_mut() {
                                    let lease = scaler.process_texture(&texture)?;
                                    texture = lease.texture().clone();
                                    texture_lease = Some(lease);
                                    width = output_size.width;
                                    height = output_size.height;
                                }
                            }
                        }

                        let frame = Frame {
                            width,
                            height,
                            pixel_format: settings.pixel_format,
                            inner: frame,
                            texture,
                            d3d_context: d3d_context.clone(),
                            d3d_device: d3d_device.clone(),
                            staging_pool: staging_pool.clone(),
                            _texture_lease: texture_lease,
                        };

                        let mut callback = callback.lock().unwrap();
                        callback(frame)
                    }
                }),
            )
            .map_err(NewCapturerError::RegisterFrameArrived)?;

        item.Closed(
            &TypedEventHandler::<GraphicsCaptureItem, IInspectable>::new({
                let closed_callback = closed_callback.clone();

                move |_, _| {
                    let mut closed_callback = closed_callback.lock().unwrap();
                    closed_callback()
                }
            }),
        )
        .map_err(NewCapturerError::RegisterClosed)?;

        if is_using_warp {
            tracing::warn!(
                "Hardware GPU unavailable, using WARP software rasterizer for screen capture"
            );
        }

        Ok(Capturer {
            settings,
            d3d_device,
            d3d_context,
            session,
            frame_pool,
            frame_arrived_token,
            stop_flag,
            is_using_warp,
        })
    }

    pub fn is_using_software_rendering(&self) -> bool {
        self.is_using_warp
    }

    pub fn settings(&self) -> &Settings {
        &self.settings
    }

    pub fn session(&self) -> &GraphicsCaptureSession {
        &self.session
    }

    pub fn d3d_device(&self) -> &ID3D11Device {
        &self.d3d_device
    }

    pub fn d3d_context(&self) -> &ID3D11DeviceContext {
        &self.d3d_context
    }
}

impl Capturer {
    pub fn start(&mut self) -> windows::core::Result<()> {
        self.session.StartCapture()
    }
}

#[derive(Clone, Debug, thiserror::Error)]
pub enum StopCapturerError {
    #[error("NotStarted")]
    NotStarted,
    #[error("PostMessageFailed")]
    PostMessageFailed,
    #[error("ThreadJoinFailed")]
    ThreadJoinFailed,
}

impl Capturer {
    pub fn stop(&mut self) -> windows::core::Result<()> {
        if self.stop_flag.swap(true, Ordering::SeqCst) {
            return Ok(());
        }
        let _ = self.frame_pool.RemoveFrameArrived(self.frame_arrived_token);
        let _ = self.session.Close();
        self.frame_pool.Close()
    }
}

impl Drop for Capturer {
    fn drop(&mut self) {
        let _ = self.stop();
    }
}

pub struct Frame {
    width: u32,
    height: u32,
    pixel_format: PixelFormat,
    inner: Direct3D11CaptureFrame,
    texture: ID3D11Texture2D,
    d3d_device: ID3D11Device,
    d3d_context: ID3D11DeviceContext,
    staging_pool: Arc<StagingTexturePool>,
    _texture_lease: Option<FrameTextureLease>,
}

impl std::fmt::Debug for Frame {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.debug_struct("Frame")
            .field("width", &self.width)
            .field("height", &self.height)
            .finish()
    }
}

impl Frame {
    pub fn width(&self) -> u32 {
        self.width
    }

    pub fn height(&self) -> u32 {
        self.height
    }

    pub fn pixel_format(&self) -> PixelFormat {
        self.pixel_format
    }

    pub fn inner(&self) -> &Direct3D11CaptureFrame {
        &self.inner
    }

    pub fn texture(&self) -> &ID3D11Texture2D {
        &self.texture
    }

    pub fn d3d_device(&self) -> &ID3D11Device {
        &self.d3d_device
    }

    pub fn d3d_context(&self) -> &ID3D11DeviceContext {
        &self.d3d_context
    }

    pub fn as_buffer(&self) -> windows::core::Result<FrameBuffer<'_>> {
        let staging_texture = self
            .staging_pool
            .get_or_create_texture(self.width, self.height)?;

        unsafe {
            self.d3d_context
                .CopyResource(&staging_texture, &self.texture);
        };

        let mut mapped_resource = D3D11_MAPPED_SUBRESOURCE::default();
        unsafe {
            self.d3d_context.Map(
                &staging_texture,
                0,
                D3D11_MAP_READ,
                0,
                Some(&mut mapped_resource),
            )?;
        };

        let data = unsafe {
            std::slice::from_raw_parts(
                mapped_resource.pData.cast(),
                (self.height * mapped_resource.RowPitch) as usize,
            )
        };

        Ok(FrameBuffer {
            data,
            width: self.width,
            height: self.height,
            stride: mapped_resource.RowPitch,
            pixel_format: self.pixel_format,
            staging_texture,
            d3d_context: self.d3d_context.clone(),
        })
    }
}

pub struct FrameBuffer<'a> {
    data: &'a [u8],
    width: u32,
    height: u32,
    stride: u32,
    pixel_format: PixelFormat,
    staging_texture: ID3D11Texture2D,
    d3d_context: ID3D11DeviceContext,
}

impl Drop for FrameBuffer<'_> {
    fn drop(&mut self) {
        unsafe {
            self.d3d_context.Unmap(&self.staging_texture, 0);
        }
    }
}

impl FrameBuffer<'_> {
    pub fn width(&self) -> u32 {
        self.width
    }

    pub fn height(&self) -> u32 {
        self.height
    }

    pub fn stride(&self) -> u32 {
        self.stride
    }

    pub fn data(&self) -> &[u8] {
        self.data
    }

    pub fn pixel_format(&self) -> PixelFormat {
        self.pixel_format
    }
}
