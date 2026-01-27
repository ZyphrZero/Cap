import i18next from "i18next";
import enTranslations from "../locales/en.json";
import zhTranslations from "../locales/zh.json";

export const languages = [
	{ code: "en", label: "English" },
	{ code: "zh", label: "中文" },
];

export const defaultLanguage = "zh";

// 同步初始化 i18next
i18next.init({
	resources: {
		en: {
			translation: enTranslations,
		},
		zh: {
			translation: zhTranslations,
		},
	},
	lng: defaultLanguage,
	fallbackLng: defaultLanguage,
	interpolation: {
		escapeValue: false,
	},
	initImmediate: false, // 确保同步初始化
});

export default i18next;

export function t(key: string, options?: any): string {
	return i18next.t(key, options) as string;
}

export async function changeLanguage(lng: string): Promise<void> {
	await i18next.changeLanguage(lng);
}

export function getCurrentLanguage(): string {
	return i18next.language || defaultLanguage;
}
