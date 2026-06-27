import { emit } from "@tauri-apps/api/event";
import * as dialog from "@tauri-apps/plugin-dialog";
import { revealItemInDir } from "@tauri-apps/plugin-opener";
import { t } from "~/components/I18nProvider";
import type { createOptionsQuery } from "./queries";
import { commands, type RecordingAction, type RecordingMode } from "./tauri";

export function handleRecordingResult(
	result: Promise<RecordingAction>,
	setOptions: ReturnType<typeof createOptionsQuery>["setOptions"] | undefined,
) {
	return result
		.then(async (result) => {
			if (result === "Started") return;
			if (result === "InvalidAuthentication") {
				const buttons = setOptions
					? {
							yes: t("recordingOverlay.errors.login"),
							no: t("recordingOverlay.errors.switchToStudio"),
							cancel: t("recordingOverlay.confirm.cancel"),
						}
					: {
							ok: t("recordingOverlay.errors.login"),
							cancel: t("recordingOverlay.confirm.cancel"),
						};

				const dialogResult = await dialog.message(
					t("recordingOverlay.errors.authRequiredMessage"),
					{
						title: t("recordingOverlay.errors.authRequiredTitle"),
						buttons,
					},
				);

				if (setOptions) {
					if (dialogResult === buttons.yes) emit("start-sign-in");
					else if (dialogResult === buttons.no) {
						setOptions({ mode: "studio" });
						commands.setRecordingMode("studio");
					}
				} else if (dialogResult === buttons.ok) {
					emit("start-sign-in");
				}
			} else if (result === "UpgradeRequired") commands.showWindow("Upgrade");
			else
				await dialog.message(`Error: ${result}`, {
					title: t("recordingOverlay.errors.startErrorTitle"),
				});
		})
		.catch((err) =>
			dialog.message(err, {
				title: t("recordingOverlay.errors.startErrorTitle"),
				kind: "error",
			}),
		);
}

export async function openRecordingFolder(
	projectPath: string,
	mode: RecordingMode,
) {
	const path = projectPath.replace(/[/\\]+$/, "");

	const openedContent =
		mode === "instant" &&
		(await commands.openFilePath(`${path}/content`).then(
			() => true,
			() => false,
		));

	if (openedContent) return;

	await revealItemInDir(`${path}/`);
}
