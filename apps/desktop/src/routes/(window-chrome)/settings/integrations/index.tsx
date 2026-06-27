import { Button } from "@cap/ui-solid";
import { useNavigate } from "@solidjs/router";
import { createResource, For } from "solid-js";
import IconLucideDatabase from "~icons/lucide/database";

import "@total-typescript/ts-reset/filter-boolean";
import { t } from "~/components/I18nProvider";
import { generalSettingsStore } from "~/store";
import { createStoredSelectedOrganizationId } from "~/utils/organization-branding";
import { hasDesktopProAccess } from "~/utils/plans";
import { commands } from "~/utils/tauri";
import { Section, SectionCard, SettingsPageContent } from "../Setting";

const GoogleDriveIcon = (props: { class?: string }) => (
	<svg
		class={props.class}
		viewBox="0 0 87.3 78"
		xmlns="http://www.w3.org/2000/svg"
		aria-hidden="true"
	>
		<path
			d="m6.6 66.85 3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8h-27.5c0 1.55.4 3.1 1.2 4.5z"
			fill="#0066da"
		/>
		<path
			d="m43.65 25-13.75-23.8c-1.35.8-2.5 1.9-3.3 3.3l-25.4 44a9.06 9.06 0 0 0 -1.2 4.5h27.5z"
			fill="#00ac47"
		/>
		<path
			d="m73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.25c.8-1.4 1.2-2.95 1.2-4.5h-27.502l5.852 11.5z"
			fill="#ea4335"
		/>
		<path
			d="m43.65 25 13.75-23.8c-1.35-.8-2.9-1.2-4.5-1.2h-18.5c-1.6 0-3.15.45-4.5 1.2z"
			fill="#00832d"
		/>
		<path
			d="m59.8 53h-32.3l-13.75 23.8c1.35.8 2.9 1.2 4.5 1.2h50.8c1.6 0 3.15-.45 4.5-1.2z"
			fill="#2684fc"
		/>
		<path
			d="m73.4 26.5-12.7-22c-.8-1.4-1.95-2.5-3.3-3.3l-13.75 23.8 16.15 28h27.45c0-1.55-.4-3.1-1.2-4.5z"
			fill="#ffba00"
		/>
	</svg>
);

export default function AppsTab() {
	const navigate = useNavigate();
	const organizationSelection = createStoredSelectedOrganizationId();
	const [generalSettings] = createResource(() => generalSettingsStore.get());

	const isPro = () =>
		hasDesktopProAccess(organizationSelection.auth(), generalSettings());

	const apps = [
		{
			name: t("integrationsPage.apps.googleDrive.name"),
			description: t("integrationsPage.apps.googleDrive.description"),
			icon: GoogleDriveIcon,
			url: "/settings/integrations/google-drive-config",
			pro: true,
		},
		{
			name: t("integrationsPage.apps.s3Config.name"),
			description: t("integrationsPage.apps.s3Config.description"),
			icon: IconLucideDatabase,
			url: "/settings/integrations/s3-config",
			pro: true,
		},
	];

	const handleAppClick = async (app: (typeof apps)[number]) => {
		try {
			if (app.pro && !isPro()) {
				await commands.showWindow("Upgrade");
				return;
			}
			navigate(app.url);
		} catch (error) {
			console.error("Error handling app click:", error);
		}
	};

	return (
		<div class="cap-settings-page flex flex-col h-full custom-scroll">
			<SettingsPageContent>
				<Section
					title={t("integrationsPage.title")}
					description={t("integrationsPage.description")}
				>
					<div class="space-y-3">
						<For each={apps}>
							{(app) => (
								<SectionCard padded class="space-y-3">
									<div class="flex justify-between items-center gap-3">
										<div class="flex gap-2 items-center min-w-0">
											<app.icon class="w-4 h-4 shrink-0 text-gray-12" />
											<p class="text-[13px] text-gray-12">{app.name}</p>
										</div>
										<Button
											size="sm"
											variant="primary"
											onClick={() => handleAppClick(app)}
										>
											{app.pro && !isPro()
												? t("integrationsPage.buttons.upgradeToPro")
												: t("integrationsPage.buttons.configure")}
										</Button>
									</div>
									<p class="text-xs leading-snug text-gray-10">
										{app.description}
									</p>
								</SectionCard>
							)}
						</For>
					</div>
				</Section>
			</SettingsPageContent>
		</div>
	);
}
