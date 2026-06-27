import { Button } from "@cap/ui-solid";
import { invoke } from "@tauri-apps/api/core";
import { writeText } from "@tauri-apps/plugin-clipboard-manager";
import { createResource, createSignal, Show } from "solid-js";
import toast from "solid-toast";
import { t } from "~/components/I18nProvider";
import { isTauriRuntime } from "~/utils/tauri-runtime";
import { Section, SectionCard, SettingsPageContent } from "./Setting";

type CliInstallStatus = {
	installDir: string;
	shimPath: string;
	targetPath: string;
	installed: boolean;
	onPath: boolean;
	conflict: string | null;
	pathEntry: string;
	shellCommand: string;
	pathConfigured: boolean;
};

const browserPreviewCliStatus: CliInstallStatus = {
	installDir: "",
	shimPath: "Desktop app only",
	targetPath: "Desktop app only",
	installed: false,
	onPath: false,
	conflict: null,
	pathEntry: "",
	shellCommand: "",
	pathConfigured: false,
};

const getCliInstallStatus = () =>
	isTauriRuntime()
		? invoke<CliInstallStatus>("get_cli_install_status")
		: Promise.resolve(browserPreviewCliStatus);

const installCli = () =>
	isTauriRuntime()
		? invoke<CliInstallStatus>("install_cli")
		: Promise.resolve(browserPreviewCliStatus);

const uninstallCli = () =>
	isTauriRuntime()
		? invoke<CliInstallStatus>("uninstall_cli")
		: Promise.resolve(browserPreviewCliStatus);

function errorMessage(error: unknown, fallback: string) {
	if (error instanceof Error) return error.message;
	if (typeof error === "string") return error;
	return fallback;
}

export default function CliSettings() {
	const [status, { refetch, mutate }] = createResource(getCliInstallStatus);
	const [isInstalling, setIsInstalling] = createSignal(false);
	const [isUninstalling, setIsUninstalling] = createSignal(false);
	const isDesktopRuntime = isTauriRuntime();

	const installButtonLabel = () => {
		if (!isDesktopRuntime) return "Desktop app only";
		if (isInstalling())
			return status()?.installed
				? t("cliPage.repairing")
				: t("cliPage.installing");
		return status()?.installed ? t("cliPage.repair") : t("cliPage.installCli");
	};

	const handleInstall = async () => {
		setIsInstalling(true);

		try {
			mutate(await installCli());
			toast.success(t("cliPage.installSuccess"));
		} catch (error) {
			toast.error(errorMessage(error, t("cliPage.installFailed")));
			await refetch();
		} finally {
			setIsInstalling(false);
		}
	};

	const handleUninstall = async () => {
		setIsUninstalling(true);

		try {
			mutate(await uninstallCli());
			toast.success(t("cliPage.uninstallSuccess"));
		} catch (error) {
			toast.error(errorMessage(error, t("cliPage.uninstallFailed")));
			await refetch();
		} finally {
			setIsUninstalling(false);
		}
	};

	const copyPathCommand = async (command: string) => {
		if (isTauriRuntime()) {
			await writeText(command);
		} else if (navigator.clipboard?.writeText) {
			await navigator.clipboard.writeText(command);
		}
		toast.success(t("cliPage.copiedToClipboard"));
	};

	return (
		<div class="cap-settings-page flex flex-col h-full custom-scroll">
			<SettingsPageContent>
				<Section
					title={t("cliPage.title")}
					description={t("cliPage.description")}
				>
					<SectionCard padded>
						<Show
							when={!status.error && status()}
							fallback={
								<Show
									when={status.error}
									fallback={
										<div class="h-20 rounded-lg bg-gray-3 animate-pulse" />
									}
								>
									<div class="flex flex-col gap-2">
										<p class="text-xs leading-relaxed text-red-11">
											{t("cliPage.loadError", {
												error: errorMessage(status.error, "unknown error"),
											})}
										</p>
										<Button
											size="sm"
											variant="gray"
											class="self-start"
											onClick={() => refetch()}
										>
											{t("cliPage.retry")}
										</Button>
									</div>
								</Show>
							}
						>
							{(currentStatus) => (
								<div class="flex flex-col gap-4">
									<div class="flex items-start justify-between gap-4">
										<div class="flex flex-col gap-1 min-w-0">
											<p class="text-[13px] text-gray-12">
												{currentStatus().installed
													? t("cliPage.installed")
													: t("cliPage.notInstalled")}
											</p>
											<p class="text-xs leading-snug text-gray-10">
												<Show
													when={isDesktopRuntime}
													fallback={
														<>
															CLI installation is available in the desktop app
															runtime.
														</>
													}
												>
													{t("cliPage.descriptionDetail")}
												</Show>
											</p>
										</div>
										<div class="flex shrink-0 gap-2">
											<Show when={currentStatus().installed}>
												<Button
													size="sm"
													variant="gray"
													disabled={isUninstalling() || !isDesktopRuntime}
													onClick={handleUninstall}
												>
													{isUninstalling()
														? t("cliPage.removing")
														: t("cliPage.remove")}
												</Button>
											</Show>
											<Button
												size="sm"
												variant="dark"
												disabled={isInstalling() || !isDesktopRuntime}
												onClick={handleInstall}
											>
												{installButtonLabel()}
											</Button>
										</div>
									</div>

									<div class="grid gap-2 text-xs">
										<PathRow
											label={t("cliPage.command")}
											value={currentStatus().shimPath}
										/>
										<PathRow
											label={t("cliPage.target")}
											value={currentStatus().targetPath}
										/>
									</div>

									<Show when={currentStatus().conflict}>
										{(conflict) => (
											<p class="rounded-lg border border-red-300/40 bg-red-500/10 px-3 py-2 text-xs leading-relaxed text-red-11">
												{conflict()}
											</p>
										)}
									</Show>

									<Show
										when={currentStatus().installed && !currentStatus().onPath}
									>
										<div class="flex flex-col gap-2 rounded-lg border border-gray-4 bg-gray-3 px-3 py-3">
											<p class="text-xs leading-relaxed text-gray-10">
												<Show
													when={currentStatus().pathConfigured}
													fallback={t("cliPage.pathInstruction", {
														path: currentStatus().pathEntry,
													})}
												>
													{t("cliPage.pathInstructionConfigured")}
												</Show>
											</p>
											<div class="flex items-center gap-2">
												<code class="flex-1 min-w-0 truncate rounded-md bg-gray-1 px-2 py-1.5 font-mono text-xs text-gray-12">
													{currentStatus().shellCommand}
												</code>
												<Button
													size="sm"
													variant="gray"
													onClick={() =>
														copyPathCommand(currentStatus().shellCommand)
													}
												>
													{t("cliPage.copy")}
												</Button>
											</div>
										</div>
									</Show>
								</div>
							)}
						</Show>
					</SectionCard>
				</Section>
			</SettingsPageContent>
		</div>
	);
}

function PathRow(props: { label: string; value: string }) {
	return (
		<div class="flex items-center gap-3 min-w-0">
			<span class="w-16 shrink-0 text-gray-10">{props.label}</span>
			<code class="min-w-0 truncate rounded-md bg-gray-3 px-2 py-1 font-mono text-[11px] text-gray-12">
				{props.value}
			</code>
		</div>
	);
}
