import {
	batch,
	createContext,
	createMemo,
	createSignal,
	onMount,
	useContext,
} from "solid-js";
import i18next, {
	getCurrentLanguage,
	changeLanguage as i18nChangeLanguage,
} from "../utils/i18n";

interface I18nContextType {
	t: (key: string, options?: any) => string;
	changeLanguage: (lng: string) => Promise<void>;
	currentLanguage: () => string;
}

const I18nContext = createContext<I18nContextType | undefined>(undefined);

// Global signal to trigger re-renders when language changes
const [languageVersion, setLanguageVersion] = createSignal(0);

export function I18nProvider(props: { children: any }) {
	const [currentLanguage, setCurrentLanguage] = createSignal(
		getCurrentLanguage(),
	);

	const changeLanguage = async (lng: string) => {
		await i18nChangeLanguage(lng);
		batch(() => {
			setCurrentLanguage(lng);
			setLanguageVersion((v) => v + 1);
			localStorage.setItem("language", lng);
		});
	};

	onMount(() => {
		// 强制使用中文作为默认语言（中文定制版）
		const savedLanguage = localStorage.getItem("language");
		// 如果没有保存的语言设置，或者保存的是英文，则强制设置为中文
		if (!savedLanguage || savedLanguage === "en") {
			changeLanguage("zh");
		} else if (savedLanguage && savedLanguage !== getCurrentLanguage()) {
			changeLanguage(savedLanguage);
		}

		// Listen for language changes from i18next
		i18next.on("languageChanged", (lng) => {
			batch(() => {
				setCurrentLanguage(lng);
				setLanguageVersion((v) => v + 1);
			});
		});
	});

	// Create a reactive t function that depends on languageVersion
	const tFn = (key: string, options?: any): string => {
		// Access languageVersion to create dependency
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

// Reactive t function that can be used outside of components
// Note: For full reactivity when language changes, components should re-render
export function t(key: string, options?: any): string {
	// Access languageVersion to create dependency in reactive contexts
	languageVersion();
	return i18next.t(key, options) as string;
}
