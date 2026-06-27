// @ts-check

import * as fs from "node:fs/promises";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "../../..");
const targetDir = path.join(repoRoot, "target");
const windowsFfmpegRequiredDlls = [
	"avcodec-61.dll",
	"avdevice-61.dll",
	"avfilter-10.dll",
	"avformat-61.dll",
	"avutil-59.dll",
	"swresample-5.dll",
	"swscale-8.dll",
];

/**
 * Creates a Microsoft Windows Installer (TM) compatible version from the provided crate's semver version.
 * `major.minor.patch.build`
 *
 * @see {@link https://tauri.app/reference/config/#version-1}
 * @param {string} cargoFilePath
 * @returns {Promise<string>}
 */
async function semverToWIXCompatibleVersion(cargoFilePath) {
	const config = await fs.readFile(cargoFilePath, "utf-8");
	const match = /version\s*=\s*"([\w.-]+)"/.exec(config);
	if (!match)
		throw new Error(
			'Failed to extract version from "Cargo.toml". Have you removed the main crate version by accident?',
		);

	const ver = match[1];
	const [core, buildOrPrerelease] = ver.includes("+")
		? ver.split("+")
		: ver.split("-");
	const [major, minor, patch] = core.split(".");
	let build = 0;
	if (buildOrPrerelease) {
		const numMatch = buildOrPrerelease.match(/\d+$/);
		build = numMatch ? parseInt(numMatch[0], 10) : 0;
	}
	const wixVersion = `${major}.${minor}.${patch}${
		build === 0 ? "" : `.${build}`
	}`;
	if (wixVersion !== ver)
		console.log(`Using wix-compatible version ${ver} --> ${wixVersion}`);
	return wixVersion;
}
/**
 * Deeply merges two objects
 *
 * @param {Object} target
 * @param {Object} source
 * @returns {Object}
 */
function deepMerge(target, source) {
	for (const key of Object.keys(source)) {
		if (
			source[key] instanceof Object &&
			key in target &&
			target[key] instanceof Object
		) {
			Object.assign(source[key], deepMerge(target[key], source[key]));
		}
	}
	return { ...target, ...source };
}

async function fileExists(filePath) {
	return fs
		.access(filePath)
		.then(() => true)
		.catch(() => false);
}

async function copyFileIfChanged(sourcePath, destPath) {
	if (await filesHaveSameContents(sourcePath, destPath)) return false;

	try {
		await fs.copyFile(sourcePath, destPath);
		return true;
	} catch (error) {
		if (error?.code === "EBUSY") {
			throw new Error(
				`Cannot update ${destPath} because it is currently in use. Close Cap, cap-desktop.exe, and any process loading FFmpeg DLLs, then rerun the command.`,
			);
		}

		throw error;
	}
}

async function filesHaveSameContents(sourcePath, destPath) {
	const [sourceStat, destStat] = await Promise.all([
		fs.stat(sourcePath),
		fs.stat(destPath).catch(() => null),
	]);

	if (!destStat || sourceStat.size !== destStat.size) return false;

	const [source, dest] = await Promise.all([
		fs.readFile(sourcePath),
		fs.readFile(destPath).catch(() => null),
	]);

	return dest !== null && source.equals(dest);
}

/**
 * Writes platform-specific tauri configs
 *
 * @param {NodeJS.Platform} platform
 * @param {{} | undefined} configOptions
 */
export async function createTauriPlatformConfigs(
	platform,
	configOptions = undefined,
) {
	const srcTauri = path.join(__dirname, "../src-tauri/");
	let baseConfig = {};
	let configFileName = null;

	console.log(`Updating Platform (${platform}) Tauri config...`);
	if (platform === "win32") {
		configFileName = "tauri.windows.conf.json";
		await syncWindowsFfmpegDlls();
		baseConfig = {
			...baseConfig,
			bundle: {
				externalBin: [
					"binaries/cap-muxer",
					"binaries/cap-exporter",
					"binaries/cap-cli",
				],
				resources: {
					"../../../target/ffmpeg/bin/*.dll": "./",
				},
				windows: {
					wix: {
						version: await semverToWIXCompatibleVersion(
							path.join(srcTauri, "Cargo.toml"),
						),
					},
				},
			},
		};
	}

	if (platform === "darwin") {
		configFileName = "tauri.macos.conf.json";
		baseConfig = {
			...baseConfig,
			bundle: {
				externalBin: [
					"binaries/cap-muxer",
					"binaries/cap-exporter",
					"binaries/cap-cli",
				],
				resources: {
					"../../../target/native-deps/onnxruntime/lib/libonnxruntime.dylib":
						"onnxruntime/lib/libonnxruntime.dylib",
				},
			},
		};
	}

	if (!configFileName) return;

	const mergedConfig = configOptions
		? deepMerge(baseConfig, configOptions)
		: baseConfig;
	await writeFileIfChanged(
		`${srcTauri}/${configFileName}`,
		JSON.stringify(mergedConfig, null, 2),
	);
}

async function syncWindowsFfmpegDlls() {
	const ffmpegBin = path.join(targetDir, "ffmpeg", "bin");
	const sourceNames = await fs.readdir(ffmpegBin).catch(() => {
		throw new Error(
			`FFmpeg DLL directory not found at ${ffmpegBin}. Run "pnpm -w cap-setup" before building the desktop app.`,
		);
	});
	const dllNames = sourceNames.filter((name) =>
		name.toLowerCase().endsWith(".dll"),
	);
	const available = new Set(dllNames.map((name) => name.toLowerCase()));
	const missing = windowsFfmpegRequiredDlls.filter(
		(name) => !available.has(name),
	);

	if (missing.length > 0) {
		throw new Error(
			`FFmpeg setup is incomplete; missing ${missing.join(", ")} in ${ffmpegBin}. Run "pnpm -w cap-setup" before building the desktop app.`,
		);
	}

	const runtimeDirs = await windowsFfmpegRuntimeDirs();
	for (const runtimeDir of runtimeDirs) {
		await fs.mkdir(runtimeDir, { recursive: true });
		for (const dllName of dllNames) {
			await copyFileIfChanged(
				path.join(ffmpegBin, dllName),
				path.join(runtimeDir, dllName),
			);
		}
	}

	console.log(
		`Synced ${dllNames.length} FFmpeg DLLs to ${runtimeDirs.length} Windows runtime directories`,
	);
}

async function windowsFfmpegRuntimeDirs() {
	const runtimeDirs = [
		path.join(targetDir, "debug"),
		path.join(targetDir, "release"),
	];
	const entries = await fs
		.readdir(targetDir, { withFileTypes: true })
		.catch(() => []);

	for (const entry of entries) {
		if (!entry.isDirectory()) continue;
		if (
			entry.name === "debug" ||
			entry.name === "release" ||
			entry.name === "ffmpeg" ||
			entry.name === "native-deps"
		) {
			continue;
		}

		for (const profile of ["debug", "release"]) {
			const dir = path.join(targetDir, entry.name, profile);
			if (await fileExists(dir)) runtimeDirs.push(dir);
		}
	}

	return [...new Set(runtimeDirs.map((dir) => path.normalize(dir)))];
}

async function main() {
	console.log("--- Preparing sidecars and configs...");
	await createTauriPlatformConfigs(process.platform);
	console.log("--- Preparation finished");
}

main().catch((err) => {
	console.error("\n--- Preparation Failed");
	console.error(err);
	console.error("---");
});

async function writeFileIfChanged(filePath, contents) {
	const currentContents = await fs
		.readFile(filePath, "utf-8")
		.catch(() => undefined);

	if (currentContents !== contents) await fs.writeFile(filePath, contents);
}
