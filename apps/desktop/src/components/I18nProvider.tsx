import { invoke } from "@tauri-apps/api/core";
import type { TOptions } from "i18next";
import {
	batch,
	createContext,
	createSignal,
	onCleanup,
	onMount,
	type ParentProps,
	useContext,
} from "solid-js";
import i18next, {
	defaultLanguage,
	getCurrentLanguage,
	getStoredLanguage,
	changeLanguage as i18nChangeLanguage,
	type LanguageCode,
	languageStorageKey,
	resolveLanguage,
} from "../utils/i18n";
import { isTauriRuntime } from "../utils/tauri-runtime";

interface I18nContextType {
	t: (key: string, options?: TOptions) => string;
	changeLanguage: (lng: LanguageCode) => Promise<void>;
	currentLanguage: () => LanguageCode;
}

const I18nContext = createContext<I18nContextType | undefined>(undefined);

const [languageVersion, setLanguageVersion] = createSignal(0);

export function I18nProvider(props: ParentProps) {
	const [currentLanguage, setCurrentLanguage] = createSignal(
		getCurrentLanguage(),
	);

	const syncLanguage = (lng: string) => {
		const nextLanguage = resolveLanguage(lng);
		if (currentLanguage() === nextLanguage) return;

		batch(() => {
			setCurrentLanguage(nextLanguage);
			setLanguageVersion((v) => v + 1);
		});
	};

	const changeLanguage = async (lng: LanguageCode) => {
		await i18nChangeLanguage(lng);
		localStorage.setItem(languageStorageKey, lng);
		syncLanguage(lng);
		if (isTauriRuntime()) {
			await invoke("set_tray_language", { language: lng });
		}
	};

	onMount(() => {
		const handleLanguageChanged = (lng: string) => {
			syncLanguage(lng);
		};

		i18next.on("languageChanged", handleLanguageChanged);
		onCleanup(() => {
			i18next.off("languageChanged", handleLanguageChanged);
		});

		const savedLanguage = getStoredLanguage() ?? defaultLanguage;
		if (savedLanguage !== getCurrentLanguage()) {
			void changeLanguage(savedLanguage);
		}
	});

	const tFn = (key: string, options?: TOptions): string => {
		languageVersion();
		return i18next.t(key, options) as string;
	};

	const value: I18nContextType = {
		t: tFn,
		changeLanguage,
		currentLanguage,
	};

	return (
		<I18nContext.Provider value={value}>{props.children}</I18nContext.Provider>
	);
}

export function useI18n() {
	const context = useContext(I18nContext);
	if (!context) {
		throw new Error("useI18n must be used within an I18nProvider");
	}
	return context;
}

export function t(key: string, options?: TOptions): string {
	languageVersion();
	return i18next.t(key, options) as string;
}
