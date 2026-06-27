import { Button } from "@cap/ui-solid";
import { createWritableMemo } from "@solid-primitives/memo";
import { useMutation } from "@tanstack/solid-query";
import { createResource, Show, Suspense } from "solid-js";
import { t } from "~/components/I18nProvider";
import { Input } from "~/routes/editor/ui";
import { createSelectedOrganization } from "~/utils/organization-branding";
import { commands } from "~/utils/tauri";
import { apiClient, protectedHeaders } from "~/utils/web-api";
import { Section, SectionCard, SettingsPageContent } from "../Setting";
import { IntegrationConfigHeader } from "./config-header";

interface S3Config {
	provider: string;
	accessKeyId: string;
	secretAccessKey: string;
	endpoint: string;
	bucketName: string;
	region: string;
}

const DEFAULT_CONFIG = {
	provider: "aws",
	accessKeyId: "",
	secretAccessKey: "",
	endpoint: "https://s3.amazonaws.com",
	bucketName: "",
	region: "us-east-1",
} satisfies S3Config;

export default function S3ConfigPage() {
	const organizationSelection = createSelectedOrganization();
	const [_s3Config, { refetch }] = createResource(
		() => organizationSelection.selectedOrganizationId(),
		async (orgId) => {
			const response = await apiClient.desktop.getS3Config({
				query: orgId ? { orgId } : undefined,
				headers: await protectedHeaders(),
			});

			if (response.status !== 200)
				throw new Error(t("s3ConfigPage.error.fetch"));

			return response.body;
		},
	);

	const managedByOrganization = () =>
		_s3Config()?.managedByOrganization ?? null;
	const hasConfig = () =>
		_s3Config()?.source === "user" && !!_s3Config()?.config.accessKeyId;

	const saveConfig = useMutation(() => ({
		mutationFn: async (config: S3Config) => {
			const response = await apiClient.desktop.setS3Config({
				body: config,
				headers: await protectedHeaders(),
			});

			if (response.status !== 200)
				throw new Error(t("s3ConfigPage.error.save"));
			return response;
		},
		onSuccess: async () => {
			await refetch();
			await commands.globalMessageDialog(t("s3ConfigPage.success.save"));
		},
	}));

	const deleteConfig = useMutation(() => ({
		mutationFn: async () => {
			const response = await apiClient.desktop.deleteS3Config({
				headers: await protectedHeaders(),
			});

			if (response.status !== 200)
				throw new Error(t("s3ConfigPage.error.delete"));
			return response;
		},
		onSuccess: async () => {
			await refetch();
			await commands.globalMessageDialog(t("s3ConfigPage.success.delete"));
		},
	}));

	const testConfig = useMutation(() => ({
		mutationFn: async (config: S3Config) => {
			const controller = new AbortController();
			const timeoutId = setTimeout(() => controller.abort(), 5500);

			try {
				const response = await apiClient.desktop.testS3Config({
					body: config,
					headers: await protectedHeaders(),
					fetchOptions: { signal: controller.signal },
				});

				clearTimeout(timeoutId);

				if (response.status !== 200)
					throw new Error(t("s3ConfigPage.error.test"));

				return response;
			} catch (error) {
				clearTimeout(timeoutId);

				if (error instanceof Error) {
					if (error.name === "AbortError")
						throw new Error(t("s3ConfigPage.error.timeout"));
				}

				throw error;
			}
		},
		onSuccess: async () => {
			await commands.globalMessageDialog(t("s3ConfigPage.success.test"));
		},
	}));

	const [s3Config, setS3Config] = createWritableMemo(
		() => _s3Config.latest?.config ?? DEFAULT_CONFIG,
	);

	const renderInput = (
		label: string,
		key: keyof ReturnType<typeof s3Config>,
		placeholder: string,
		type: "text" | "password" = "text",
	) => (
		<div class="space-y-2">
			<label class="text-[13px] text-gray-12">{label}</label>
			<Input
				class="bg-gray-3!"
				type={type}
				value={s3Config()[key] ?? ""}
				disabled={!!managedByOrganization()}
				onInput={(e: InputEvent & { currentTarget: HTMLInputElement }) =>
					setS3Config({
						...s3Config(),
						[key]: e.currentTarget.value,
					})
				}
				placeholder={placeholder}
				autocomplete="off"
				autocapitalize="off"
				autocorrect="off"
				spellcheck={false}
			/>
		</div>
	);

	return (
		<div class="cap-settings-page flex flex-col h-full custom-scroll">
			<SettingsPageContent>
				<IntegrationConfigHeader
					title={t("integrationsPage.apps.s3Config.name")}
				/>
				<Section
					title="Configuration"
					description={
						<>
							{t("s3ConfigPage.guideTextPre")}
							<a
								href="https://cap.so/docs/s3-config"
								target="_blank"
								class="underline text-gray-12"
								rel="noopener"
							>
								{t("s3ConfigPage.guideLink")}
							</a>
							{t("s3ConfigPage.guideTextPost")}
						</>
					}
				>
					<SectionCard padded class="custom-scroll">
						<Suspense
							fallback={
								<div class="flex justify-center items-center w-full h-screen">
									<IconCapLogo class="animate-spin size-16" />
								</div>
							}
						>
							<div class="space-y-4 animate-in fade-in">
								<Show when={managedByOrganization()}>
									{(organization) => (
										<p class="text-xs leading-relaxed text-gray-10">
											{t("s3ConfigPage.managedBy", {
												name: organization().name,
											})}
										</p>
									)}
								</Show>

								<div class="space-y-2">
									<label class="text-[13px] text-gray-12">
										{t("s3ConfigPage.storageProvider")}
									</label>
									<div class="relative">
										<select
											value={s3Config().provider}
											disabled={!!managedByOrganization()}
											onChange={(e) =>
												setS3Config((config) => ({
													...config,
													provider: e.currentTarget.value,
												}))
											}
											class="px-3 py-2 pr-10 w-full rounded-lg border border-transparent transition-all duration-200 appearance-none outline-hidden bg-gray-3 focus:border-gray-8"
										>
											<option value="aws">
												{t("s3ConfigPage.providers.aws")}
											</option>
											<option value="cloudflare">
												{t("s3ConfigPage.providers.cloudflare")}
											</option>
											<option value="supabase">
												{t("s3ConfigPage.providers.supabase")}
											</option>
											<option value="minio">
												{t("s3ConfigPage.providers.minio")}
											</option>
											<option value="other">
												{t("s3ConfigPage.providers.other")}
											</option>
										</select>
										<div class="flex absolute inset-y-0 right-0 items-center px-2 pointer-events-none">
											<svg
												class="w-4 h-4 text-gray-11"
												xmlns="http://www.w3.org/2000/svg"
												viewBox="0 0 20 20"
												fill="currentColor"
											>
												<path
													fill-rule="evenodd"
													d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
													clip-rule="evenodd"
												/>
											</svg>
										</div>
									</div>
								</div>

								{renderInput(
									t("s3ConfigPage.labels.accessKeyId"),
									"accessKeyId",
									"PL31OADSQNK",
									"password",
								)}
								{renderInput(
									t("s3ConfigPage.labels.secretAccessKey"),
									"secretAccessKey",
									"PL31OADSQNK",
									"password",
								)}
								{renderInput(
									t("s3ConfigPage.labels.endpoint"),
									"endpoint",
									"https://s3.amazonaws.com",
								)}
								{renderInput(
									t("s3ConfigPage.labels.bucketName"),
									"bucketName",
									"my-bucket",
								)}
								{renderInput(
									t("s3ConfigPage.labels.region"),
									"region",
									"us-east-1",
								)}
							</div>
						</Suspense>
					</SectionCard>
				</Section>
				<div class="shrink-0">
					<fieldset
						class="flex justify-between items-center"
						disabled={
							_s3Config.loading ||
							saveConfig.isPending ||
							deleteConfig.isPending ||
							testConfig.isPending ||
							!!managedByOrganization()
						}
					>
						<div class="flex gap-2">
							{!_s3Config.loading && hasConfig() && (
								<Button
									variant="destructive"
									onClick={() => deleteConfig.mutate()}
								>
									{deleteConfig.isPending
										? t("s3ConfigPage.buttons.removing")
										: t("s3ConfigPage.buttons.remove")}
								</Button>
							)}
							<Button
								variant="gray"
								onClick={() => testConfig.mutate(s3Config())}
							>
								{testConfig.isPending
									? t("s3ConfigPage.buttons.testing")
									: t("s3ConfigPage.buttons.test")}
							</Button>
						</div>
						<Button
							class="min-w-[72px]"
							variant="primary"
							onClick={() => saveConfig.mutate(s3Config())}
						>
							{saveConfig.isPending
								? t("s3ConfigPage.buttons.saving")
								: t("s3ConfigPage.buttons.save")}
						</Button>
					</fieldset>
				</div>
			</SettingsPageContent>
		</div>
	);
}
