import i18next, { type TOptions } from "i18next";
import enTranslations from "../locales/en.json";
import zhTranslations from "../locales/zh.json";

export const languages = [
	{ code: "en", label: "English" },
	{ code: "zh", label: "中文" },
] as const;

export type LanguageCode = (typeof languages)[number]["code"];

export const defaultLanguage: LanguageCode = "zh";
export const languageStorageKey = "language";

export function isSupportedLanguage(
	lng: string | null | undefined,
): lng is LanguageCode {
	return languages.some((language) => language.code === lng);
}

export function resolveLanguage(lng: string | null | undefined): LanguageCode {
	if (isSupportedLanguage(lng)) return lng;

	const baseLanguage = lng?.split("-")[0];
	if (isSupportedLanguage(baseLanguage)) return baseLanguage;

	return defaultLanguage;
}

export function getStoredLanguage(): LanguageCode | null {
	if (typeof localStorage === "undefined") return null;

	const savedLanguage = localStorage.getItem(languageStorageKey);
	return isSupportedLanguage(savedLanguage) ? savedLanguage : null;
}

function getInitialLanguage(): LanguageCode {
	return getStoredLanguage() ?? defaultLanguage;
}

i18next.init({
	resources: {
		en: {
			translation: enTranslations,
		},
		zh: {
			translation: zhTranslations,
		},
	},
	lng: getInitialLanguage(),
	fallbackLng: defaultLanguage,
	interpolation: {
		escapeValue: false,
	},
	initImmediate: false,
});

export default i18next;

export function t(key: string, options?: TOptions): string {
	return i18next.t(key, options) as string;
}

export async function changeLanguage(lng: LanguageCode): Promise<void> {
	await i18next.changeLanguage(lng);
}

export function getCurrentLanguage(): LanguageCode {
	return resolveLanguage(i18next.language);
}
