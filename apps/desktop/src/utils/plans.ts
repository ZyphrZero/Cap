const planIds = {
	development: {
		yearly: "price_1Q3esrFJxA1XpeSsFwp486RN",
		monthly: "price_1P9C1DFJxA1XpeSsTwwuddnq",
	},
	production: {
		yearly: "price_1S2al7FJxA1XpeSsJCI5Z2UD",
		monthly: "price_1S2akxFJxA1XpeSsfoAUUbpJ",
	},
};

export const getProPlanId = (billingCycle: "yearly" | "monthly") => {
	const environment =
		import.meta.env.VITE_ENVIRONMENT === "development"
			? "development"
			: "production";
	return planIds[environment]?.[billingCycle] || "";
};

export function isUserOnProPlan({
	subscriptionStatus,
}: {
	subscriptionStatus: string | null;
}): boolean {
	if (
		subscriptionStatus === "active" ||
		subscriptionStatus === "trialing" ||
		subscriptionStatus === "complete" ||
		subscriptionStatus === "paid"
	) {
		return true;
	}
	return false;
}

export function isDesktopPlanPro(
	plan?: { upgraded?: boolean; manual?: boolean } | null,
) {
	return Boolean(plan?.upgraded || plan?.manual);
}

export function hasDesktopCommercialLicense(
	settings?: { commercialLicense?: unknown | null } | null,
) {
	return Boolean(settings?.commercialLicense);
}

export function hasDesktopProAccess(
	auth?: { plan?: { upgraded?: boolean; manual?: boolean } | null } | null,
	settings?: { commercialLicense?: unknown | null } | null,
) {
	return isDesktopPlanPro(auth?.plan) || hasDesktopCommercialLicense(settings);
}

export function isDesktopLicensePro(
	license?: { type?: "pro" | "commercial" | "personal" } | null,
) {
	return license?.type === "pro" || license?.type === "commercial";
}
