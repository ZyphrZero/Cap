import { Button } from "@cap/ui-solid";

import type { ComponentProps } from "solid-js";
import { t } from "~/components/I18nProvider";
import { createSignInMutation } from "~/utils/auth";

export function SignInButton(
	props: Omit<ComponentProps<typeof Button>, "onClick">,
) {
	const signIn = createSignInMutation();

	return (
		<Button
			size="md"
			class="flex grow justify-center items-center"
			{...props}
			variant={signIn.isPending ? "gray" : "primary"}
			onClick={() => {
				if (signIn.isPending) {
					signIn.variables.abort();
					signIn.reset();
				} else {
					signIn.mutate(new AbortController());
				}
			}}
		>
			{signIn.isPending
				? t("actions.cancelSignIn")
				: (props.children ?? t("nav.signIn"))}
		</Button>
	);
}
