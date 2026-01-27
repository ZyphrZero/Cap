import { convertFileSrc } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { cx } from "cva";
import { createMemo, createResource, createSignal, For, Show } from "solid-js";
import { commands } from "~/utils/tauri";

// 从窗口初始化脚本获取项目路径
declare global {
	interface Window {
		__CAP_INSTANT_PROJECT_PATH__?: string;
	}
}

type RecordingEntry = {
	path: string;
	prettyName: string;
	thumbnailPath?: string;
};

export default function InstantPreview() {
	const [currentProjectPath, setCurrentProjectPath] = createSignal<string>(
		window.__CAP_INSTANT_PROJECT_PATH__ || "",
	);
	const [isPlaying, setIsPlaying] = createSignal(false);
	const [currentTime, setCurrentTime] = createSignal(0);
	const [duration, setDuration] = createSignal(0);
	const [volume, setVolume] = createSignal(1);
	let videoRef: HTMLVideoElement | undefined;

	// 获取所有即时模式录制
	const [recordings] = createResource(async () => {
		try {
			const list = await commands.listRecordings();
			console.log(
				"All recordings:",
				list.map(([path, meta]) => ({
					path,
					mode: meta.mode,
					prettyName: meta.pretty_name,
				})),
			);
			// 过滤出即时模式录制
			const instantRecordings: RecordingEntry[] = [];
			for (const [path, meta] of list) {
				// 检查是否是即时模式录制 (mode === "instant")
				console.log(`Recording ${path}: mode = ${meta.mode}`);
				if (meta.mode === "instant") {
					instantRecordings.push({
						path,
						prettyName:
							meta.pretty_name || path.split(/[/\\]/).pop() || "未命名",
						thumbnailPath: `${path}/screenshots/display.jpg`,
					});
				}
			}
			console.log("Filtered instant recordings:", instantRecordings);
			return instantRecordings;
		} catch (e) {
			console.error("Failed to list recordings:", e);
			return [];
		}
	});

	// 当前选中的录制
	const currentRecording = createMemo(() => {
		const path = currentProjectPath();
		if (!path) return null;
		return recordings()?.find((r) => r.path === path) || null;
	});

	// 视频源URL
	const videoSrc = createMemo(() => {
		const path = currentProjectPath();
		if (!path) return "";
		return convertFileSrc(`${path}/content/output.mp4`);
	});

	// 格式化时间
	const formatTime = (seconds: number) => {
		const mins = Math.floor(seconds / 60);
		const secs = Math.floor(seconds % 60);
		return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
	};

	// 播放/暂停
	const togglePlay = () => {
		if (!videoRef) return;
		if (isPlaying()) {
			videoRef.pause();
		} else {
			videoRef.play();
		}
		setIsPlaying(!isPlaying());
	};

	// 清理文件名，移除 Windows 不允许的字符
	const sanitizeFileName = (name: string) => {
		// Windows 不允许的字符: \ / : * ? " < > |
		return name.replace(/[\\/:*?"<>|]/g, "-");
	};

	// 导出视频
	const handleExport = async () => {
		const path = currentProjectPath();
		if (!path) return;

		try {
			const recording = currentRecording();
			const rawName = recording?.prettyName || "录制";
			// 清理文件名中的非法字符
			const suggestedName = sanitizeFileName(rawName);
			const savePath = await commands.saveFileDialog(
				`${suggestedName}.mp4`,
				"recording",
			);
			if (!savePath) return;

			const outputPath = `${path}/content/output.mp4`;
			await commands.copyFileToPath(outputPath, savePath);

			alert("导出成功！");
		} catch (e) {
			console.error("Export failed:", e);
			alert("导出失败：" + e);
		}
	};

	// 打开文件夹
	const handleOpenFolder = async () => {
		const path = currentProjectPath();
		if (!path) return;
		await commands.openFilePath(`${path}/content`);
	};

	// 关闭窗口并返回主界面
	const handleClose = async () => {
		// 先打开主窗口
		await commands.showWindow({ Main: { init_target_mode: null } });
		// 然后关闭当前窗口
		const currentWindow = getCurrentWindow();
		await currentWindow.close();
	};

	// 选择录制
	const selectRecording = (path: string) => {
		setCurrentProjectPath(path);
		setIsPlaying(false);
		setCurrentTime(0);
		if (videoRef) {
			videoRef.currentTime = 0;
		}
	};

	return (
		<div class="flex h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white">
			{/* 左侧：视频预览区 */}
			<div class="flex-1 flex flex-col">
				{/* 标题栏 */}
				<div
					class="h-10 flex items-center justify-between px-4 bg-gray-100 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700"
					data-tauri-drag-region
				>
					<span class="text-sm font-medium">即时录制预览</span>
					<button
						onClick={handleClose}
						class="w-6 h-6 flex items-center justify-center rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
					>
						<svg
							class="w-4 h-4"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M6 18L18 6M6 6l12 12"
							/>
						</svg>
					</button>
				</div>

				{/* 视频播放区 */}
				<div class="flex-1 flex items-center justify-center bg-gray-900 p-4">
					<Show
						when={videoSrc()}
						fallback={
							<div class="text-gray-400 text-center">
								<p>没有选中的录制</p>
								<p class="text-sm mt-2">请从右侧列表选择一个录制</p>
							</div>
						}
					>
						<video
							ref={videoRef}
							src={videoSrc()}
							class="max-w-full max-h-full rounded-lg shadow-lg"
							onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
							onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
							onEnded={() => setIsPlaying(false)}
							onClick={togglePlay}
						/>
					</Show>
				</div>

				{/* 播放控制栏 */}
				<div class="h-20 bg-gray-100 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 px-4 py-2">
					{/* 进度条 */}
					<div class="flex items-center gap-2 mb-2">
						<span class="text-xs text-gray-500 dark:text-gray-400 w-12">
							{formatTime(currentTime())}
						</span>
						<input
							type="range"
							min="0"
							max={duration() || 100}
							value={currentTime()}
							onInput={(e) => {
								const time = parseFloat(e.currentTarget.value);
								setCurrentTime(time);
								if (videoRef) videoRef.currentTime = time;
							}}
							class="flex-1 h-1 bg-gray-300 dark:bg-gray-600 rounded-lg appearance-none cursor-pointer accent-blue-500"
						/>
						<span class="text-xs text-gray-500 dark:text-gray-400 w-12">
							{formatTime(duration())}
						</span>
					</div>

					{/* 控制按钮 */}
					<div class="flex items-center justify-between">
						<div class="flex items-center gap-2">
							{/* 播放/暂停 */}
							<button
								onClick={togglePlay}
								class="w-10 h-10 flex items-center justify-center rounded-full bg-blue-500 hover:bg-blue-600 text-white transition-colors"
							>
								<Show
									when={isPlaying()}
									fallback={
										<svg
											class="w-5 h-5"
											fill="currentColor"
											viewBox="0 0 24 24"
										>
											<path d="M8 5v14l11-7z" />
										</svg>
									}
								>
									<svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
										<path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
									</svg>
								</Show>
							</button>

							{/* 音量 */}
							<div class="flex items-center gap-1">
								<svg
									class="w-5 h-5 text-gray-500 dark:text-gray-400"
									fill="currentColor"
									viewBox="0 0 24 24"
								>
									<path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z" />
								</svg>
								<input
									type="range"
									min="0"
									max="1"
									step="0.1"
									value={volume()}
									onInput={(e) => {
										const vol = parseFloat(e.currentTarget.value);
										setVolume(vol);
										if (videoRef) videoRef.volume = vol;
									}}
									class="w-20 h-1 bg-gray-300 dark:bg-gray-600 rounded-lg appearance-none cursor-pointer accent-blue-500"
								/>
							</div>
						</div>

						{/* 操作按钮 */}
						<div class="flex items-center gap-2">
							<button
								onClick={handleOpenFolder}
								class="px-3 py-1.5 text-sm bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded transition-colors"
							>
								打开文件夹
							</button>
							<button
								onClick={handleExport}
								class="px-4 py-1.5 text-sm bg-blue-500 hover:bg-blue-600 text-white rounded font-medium transition-colors"
							>
								导出
							</button>
						</div>
					</div>
				</div>
			</div>

			{/* 右侧：录制列表 */}
			<div class="w-72 bg-gray-100 dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 flex flex-col">
				<div class="p-3 border-b border-gray-200 dark:border-gray-700">
					<h3 class="text-sm font-medium">录制列表</h3>
					<p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
						共 {recordings()?.length || 0} 个录制
					</p>
				</div>

				<div class="flex-1 overflow-y-auto p-2">
					<Show
						when={recordings()?.length}
						fallback={
							<div class="text-center text-gray-500 dark:text-gray-400 text-sm py-8">
								暂无录制
							</div>
						}
					>
						<For each={recordings()}>
							{(recording) => (
								<div
									onClick={() => selectRecording(recording.path)}
									class={cx(
										"p-2 rounded-lg cursor-pointer mb-2 transition-colors",
										currentProjectPath() === recording.path
											? "bg-blue-500 text-white"
											: "bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600",
									)}
								>
									{/* 缩略图 */}
									<div class="aspect-video bg-gray-300 dark:bg-gray-900 rounded overflow-hidden mb-2">
										<img
											src={convertFileSrc(recording.thumbnailPath || "")}
											alt={recording.prettyName}
											class="w-full h-full object-cover"
											onError={(e) => {
												e.currentTarget.style.display = "none";
											}}
										/>
									</div>

									{/* 信息 */}
									<div class="text-xs">
										<p class="font-medium truncate">{recording.prettyName}</p>
									</div>
								</div>
							)}
						</For>
					</Show>
				</div>
			</div>
		</div>
	);
}
