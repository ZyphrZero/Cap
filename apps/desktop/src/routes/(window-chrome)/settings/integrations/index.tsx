import { Button } from "@cap/ui-solid";
import { useNavigate } from "@solidjs/router";
import { For, onMount } from "solid-js";
import IconLucideDatabase from "~icons/lucide/database";

import "@total-typescript/ts-reset/filter-boolean";
import { t } from "~/components/I18nProvider";
import { authStore } from "~/store";
import { commands } from "~/utils/tauri";

export default function AppsTab() {
	const navigate = useNavigate();
	const auth = authStore.createQuery();

	const isPro = () => auth.data?.plan?.upgraded;

	onMount(() => {
		void commands.checkUpgradedAndUpdate();
	});

	const apps = [
		{
			name: t("integrationsPage.apps.s3Config.name"),
			description: t("integrationsPage.apps.s3Config.description"),
			icon: IconLucideDatabase,
			url: "/settings/integrations/s3-config",
		},
	];

	const handleAppClick = async (app: (typeof apps)[number]) => {
		try {
			navigate(app.url);
		} catch (error) {
			console.error("Error handling app click:", error);
		}
	};

	return (
		<div class="p-4 space-y-4">
			<div class="flex flex-col pb-4 border-b border-gray-2">
				<h2 class="text-lg font-medium text-gray-12">
					{t("integrationsPage.title")}
				</h2>
				<p class="text-sm text-gray-10">{t("integrationsPage.description")}</p>
			</div>
			<For each={apps}>
				{(app) => (
					<div class="px-4 py-2 rounded-lg border bg-gray-2 border-gray-3">
						<div class="flex justify-between items-center pb-2 mb-3 border-b border-gray-3">
							<div class="flex gap-2 items-center">
								<app.icon class="w-4 h-4 text-gray-12" />
								<p class="text-sm font-medium text-gray-12">{app.name}</p>
							</div>
							<Button
								size="sm"
								variant="primary"
								onClick={() => handleAppClick(app)}
							>
								{t("integrationsPage.buttons.configure")}
							</Button>
						</div>
						<p class="text-[13px] text-gray-11">{app.description}</p>
					</div>
				)}
			</For>
		</div>
	);
}
