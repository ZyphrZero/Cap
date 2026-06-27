import { createQuery } from "@tanstack/solid-query";
import { Store } from "@tauri-apps/plugin-store";
import { onCleanup } from "solid-js";
import type { AutomationsStore } from "~/utils/automations";
import type { GeneralSettingsStore } from "~/utils/general-settings";
import type {
	AuthStore,
	HotkeysStore,
	PresetsStore,
	RecordingSettingsStore,
} from "~/utils/tauri";
import { isTauriRuntime } from "~/utils/tauri-runtime";

export type UserProfileStore = {
	userId: string | null;
	profile: {
		name: string | null;
		email: string | null;
		imageUrl: string | null;
	};
	updatedAt: number;
};

let _store: Promise<Store> | undefined;
const store = () => {
	if (!_store) {
		_store = Store.load("store");
	}

	return _store;
};

const browserStoreData = new Map<string, object | undefined>();
const browserStoreListeners = new Map<
	string,
	Set<(value?: object | undefined) => void>
>();

function declareStore<T extends object>(name: string, defaults?: T) {
	const withDefaults = (value?: T) =>
		defaults ? { ...defaults, ...(value ?? {}) } : value;
	const get = async () => {
		if (!isTauriRuntime()) {
			return withDefaults(browserStoreData.get(name) as T | undefined);
		}

		const s = await store();
		return withDefaults(await s.get<T>(name));
	};
	const listen = (fn: (data?: T | undefined) => void) => {
		if (!isTauriRuntime()) {
			const listeners = browserStoreListeners.get(name) ?? new Set();
			browserStoreListeners.set(name, listeners);
			const listener = (data?: object | undefined) =>
				fn(withDefaults(data as T | undefined));
			listeners.add(listener);
			return Promise.resolve(() => listeners.delete(listener));
		}

		return store().then((s) =>
			s.onKeyChange<T>(name, (data) => fn(withDefaults(data))),
		);
	};

	return {
		get,
		listen,
		set: async (value?: Partial<T>) => {
			if (!isTauriRuntime()) {
				if (value === undefined) {
					browserStoreData.delete(name);
				} else {
					const current = browserStoreData.get(name) ?? {};
					browserStoreData.set(name, {
						...current,
						...value,
					});
				}
				const next = browserStoreData.get(name);
				for (const listener of browserStoreListeners.get(name) ?? []) {
					listener(next);
				}
				return;
			}

			const s = await store();
			if (value === undefined) s.delete(name);
			else {
				const current = (await s.get<T>(name)) || {};
				await s.set(name, {
					...current,
					...value,
				});
			}
			await s.save();
		},
		createQuery: () => {
			const query = createQuery(() => ({
				queryKey: ["store", name],
				queryFn: async () => (await get()) ?? null,
			}));

			const cleanup = listen(() => {
				query.refetch();
			});
			onCleanup(() => cleanup.then((c) => c()));

			return query;
		},
	};
}

export const presetsStore = declareStore<PresetsStore>("presets");
export const authStore = declareStore<AuthStore>("auth");
export const automationsStore = declareStore<AutomationsStore>("automations");
export const userProfileStore = declareStore<UserProfileStore>("user_profile");
export const hotkeysStore = declareStore<HotkeysStore>("hotkeys");
export const generalSettingsStore =
	declareStore<GeneralSettingsStore>("general_settings");
export const recordingSettingsStore = declareStore<RecordingSettingsStore>(
	"recording_settings",
	{
		target: null,
		micName: null,
		cameraId: null,
		mode: "instant",
		systemAudio: false,
		organizationId: null,
		cameraDeviceSettings: {},
		microphoneDeviceSettings: {},
	},
);
