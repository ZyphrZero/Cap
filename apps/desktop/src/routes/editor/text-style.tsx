import { createWritableMemo } from "@solid-primitives/memo";
import { t } from "~/components/I18nProvider";
import {
	getHexColorDigitCount,
	normalizeOpaqueHexColor,
} from "~/utils/hex-color";
import type { OrganizationBrandColorSwatch } from "~/utils/organization-branding";
import { BrandColorsDropdown } from "./BrandColorsDropdown";
import { getColorPreviewBorderColor } from "./color-utils";
import { TextInput } from "./TextInput";

export const FONT_OPTIONS = [
	{
		value: "System Sans-Serif",
		get label() {
			return t("editor.textStyle.fonts.systemSansSerif");
		},
	},
	{
		value: "System Serif",
		get label() {
			return t("editor.textStyle.fonts.systemSerif");
		},
	},
	{
		value: "System Monospace",
		get label() {
			return t("editor.textStyle.fonts.systemMonospace");
		},
	},
];

export const CAPTION_POSITION_OPTIONS = [
	{
		value: "manual",
		get label() {
			return t("editor.textStyle.positions.manual");
		},
	},
	{
		value: "top-left",
		get label() {
			return t("editor.textStyle.positions.topLeft");
		},
	},
	{
		value: "top-center",
		get label() {
			return t("editor.textStyle.positions.topCenter");
		},
	},
	{
		value: "top-right",
		get label() {
			return t("editor.textStyle.positions.topRight");
		},
	},
	{
		value: "bottom-left",
		get label() {
			return t("editor.textStyle.positions.bottomLeft");
		},
	},
	{
		value: "bottom-center",
		get label() {
			return t("editor.textStyle.positions.bottomCenter");
		},
	},
	{
		value: "bottom-right",
		get label() {
			return t("editor.textStyle.positions.bottomRight");
		},
	},
];

export const KEYBOARD_POSITION_OPTIONS = [
	{
		value: "top-left",
		get label() {
			return t("editor.textStyle.positions.topLeft");
		},
	},
	{
		value: "top-center",
		get label() {
			return t("editor.textStyle.positions.topCenter");
		},
	},
	{
		value: "top-right",
		get label() {
			return t("editor.textStyle.positions.topRight");
		},
	},
	{
		value: "bottom-left",
		get label() {
			return t("editor.textStyle.positions.bottomLeft");
		},
	},
	{
		value: "bottom-center",
		get label() {
			return t("editor.textStyle.positions.bottomCenter");
		},
	},
	{
		value: "bottom-right",
		get label() {
			return t("editor.textStyle.positions.bottomRight");
		},
	},
];

export const TEXT_WEIGHT_OPTIONS = [
	{
		get label() {
			return t("editor.textStyle.fontWeights.normal");
		},
		value: 400,
	},
	{
		get label() {
			return t("editor.textStyle.fontWeights.medium");
		},
		value: 500,
	},
	{
		get label() {
			return t("editor.textStyle.fontWeights.bold");
		},
		value: 700,
	},
];

export const CAPTION_ANIMATION_OPTIONS = [
	{
		value: "none",
		get label() {
			return t("editor.textStyle.animations.none");
		},
	},
	{
		value: "bounce",
		get label() {
			return t("editor.textStyle.animations.bounce");
		},
	},
	{
		value: "pop",
		get label() {
			return t("editor.textStyle.animations.pop");
		},
	},
];

export const CAPTION_HIGHLIGHT_STYLE_OPTIONS = [
	{
		value: "color",
		get label() {
			return t("editor.textStyle.highlightStyles.color");
		},
	},
	{
		value: "pill",
		get label() {
			return t("editor.textStyle.highlightStyles.pill");
		},
	},
];

export function getTextWeightLabel(weight: number | null | undefined) {
	const option = TEXT_WEIGHT_OPTIONS.find((option) => option.value === weight);
	if (option) return option.label;
	if (weight != null)
		return t("editor.textStyle.fontWeights.customValue", { weight });
	return t("editor.textStyle.fontWeights.normal");
}

export function HexColorInput(props: {
	value: string;
	onChange: (value: string) => void;
	brandColorSwatches?: OrganizationBrandColorSwatch[];
}) {
	const [text, setText] = createWritableMemo(() => props.value);
	let prevColor = props.value;
	let colorInput!: HTMLInputElement;

	const commitValue = (raw: string) => {
		const normalized = normalizeOpaqueHexColor(raw);
		if (normalized) {
			props.onChange(normalized);
			setText(normalized);
			return true;
		}
		return false;
	};

	const selectBrandColor = (color: string) => {
		setText(color);
		prevColor = color;
		props.onChange(color);
	};

	return (
		<div class="flex flex-col gap-2">
			<div class="flex flex-row items-center gap-[0.75rem] relative">
				<button
					type="button"
					class="size-[2rem] rounded-[0.5rem]"
					style={{
						"background-color": text(),
						"box-shadow": `inset 0 0 0 1px ${getColorPreviewBorderColor(
							text(),
						)}`,
					}}
					onClick={() => colorInput.click()}
				/>
				<input
					ref={colorInput}
					type="color"
					class="absolute left-0 bottom-0 size-[2rem] opacity-0"
					value={text()}
					onChange={(e) => {
						setText(e.target.value);
						props.onChange(e.target.value);
					}}
				/>
				<TextInput
					class="w-[5rem] p-[0.375rem] border border-gray-3 text-gray-12 rounded-[0.5rem] bg-gray-2"
					value={text()}
					onFocus={() => {
						prevColor = props.value;
					}}
					onKeyDown={(e) => {
						if (e.key === "Enter") {
							e.preventDefault();
							if (!commitValue(e.currentTarget.value)) {
								setText(prevColor);
							}
							e.currentTarget.blur();
						}
					}}
					onInput={(e) => {
						setText(e.currentTarget.value);
						if (getHexColorDigitCount(e.currentTarget.value) !== 6) return;

						const normalized = normalizeOpaqueHexColor(e.currentTarget.value);
						if (normalized) {
							props.onChange(normalized);
						}
					}}
					onBlur={(e) => {
						if (!commitValue(e.target.value)) {
							setText(prevColor);
							props.onChange(props.value);
						}
					}}
				/>
			</div>
			<BrandColorsDropdown
				swatches={props.brandColorSwatches ?? []}
				onSelect={selectBrandColor}
			/>
		</div>
	);
}
