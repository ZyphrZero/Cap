import { invoke } from "@tauri-apps/api/core";
import { type } from "@tauri-apps/plugin-os";
import { createResource, Show } from "solid-js";
import { createStore } from "solid-js/store";
import { t } from "~/components/I18nProvider";
import { generalSettingsStore } from "~/store";
import {
	deriveGeneralSettings,
	type GeneralSettingsStore,
} from "~/utils/general-settings";
import { isTauriRuntime } from "~/utils/tauri-runtime";
import {
	Section,
	SectionRows,
	SettingsPageContent,
	ToggleSettingItem,
} from "./Setting";

export default function ExperimentalSettings() {
	const [store] = createResource(() => generalSettingsStore.get());
	const osType = getOsType();

	return (
		<Show when={store.state === "ready" && ([store()] as const)}>
			{(store) => <Inner initialStore={store()[0] ?? null} osType={osType} />}
		</Show>
	);
}

function Inner(props: {
	initialStore: GeneralSettingsStore | null;
	osType: ReturnType<typeof type>;
}) {
	const [settings, setSettings] = createStore<GeneralSettingsStore>(
		deriveGeneralSettings(props.initialStore),
	);

	const handleChange = async <K extends keyof typeof settings>(
		key: K,
		value: (typeof settings)[K],
	) => {
		console.log(`Handling settings change for ${key}: ${value}`);

		const previousValue = settings[key];
		setSettings(key as keyof GeneralSettingsStore, value);
		try {
			if (key === "enableNativeCameraPreview" && isTauriRuntime()) {
				await invoke("set_native_camera_preview_enabled", { enabled: value });
			}
			await generalSettingsStore.set({ [key]: value });
		} catch (error) {
			setSettings(key as keyof GeneralSettingsStore, previousValue);
			console.error(`Failed to update ${key}`, error);
		}
	};

	return (
		<div class="cap-settings-page flex flex-col h-full custom-scroll">
			<SettingsPageContent>
				<Show
					when={props.osType !== "windows"}
					fallback={
						<p class="text-xs leading-relaxed text-gray-10 px-1">
							{t("experimentalPage.notAvailable")}
						</p>
					}
				>
					<Section title={t("experimentalPage.preview")}>
						<SectionRows>
							<ToggleSettingItem
								label={t("experimentalPage.features.nativeCamera.label")}
								description={t(
									"experimentalPage.features.nativeCamera.description",
								)}
								value={!!settings.enableNativeCameraPreview}
								onChange={(value) =>
									handleChange("enableNativeCameraPreview", value)
								}
							/>
						</SectionRows>
					</Section>
				</Show>

				<Section title={t("experimentalPage.reliability")}>
					<SectionRows>
						<ToggleSettingItem
							label={t("experimentalPage.features.outOfProcessMuxer.label")}
							description={t(
								"experimentalPage.features.outOfProcessMuxer.description",
							)}
							value={!!settings.outOfProcessMuxer}
							onChange={(value) => handleChange("outOfProcessMuxer", value)}
						/>
					</SectionRows>
				</Section>
			</SettingsPageContent>
		</div>
	);
}

function getOsType(): ReturnType<typeof type> {
	if (isTauriRuntime()) return type();

	if (typeof navigator === "undefined") return "windows";
	const platform = navigator.platform.toLowerCase();
	if (platform.includes("mac")) return "macos";
	if (platform.includes("linux")) return "linux";
	return "windows";
}
