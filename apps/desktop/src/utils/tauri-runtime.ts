import {
	type Arch,
	type OsType,
	type Platform,
	arch as tauriArch,
	type as tauriOsType,
	platform as tauriPlatform,
} from "@tauri-apps/plugin-os";

type TauriWindow = Window & {
	__TAURI_INTERNALS__?: unknown;
};

export function isTauriRuntime() {
	if (typeof window === "undefined") return false;
	return "__TAURI_INTERNALS__" in (window as TauriWindow);
}

export function getTauriOsType(): OsType | undefined {
	if (!isTauriRuntime()) return undefined;
	return tauriOsType();
}

export function getTauriPlatform(): Platform | undefined {
	if (!isTauriRuntime()) return undefined;
	return tauriPlatform();
}

export function getTauriArch(): Arch | undefined {
	if (!isTauriRuntime()) return undefined;
	return tauriArch();
}
