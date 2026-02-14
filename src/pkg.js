import { existsSync } from "node:fs";
import { join } from "node:path";

const LOCKFILE_MAP = [
    { file: "bun.lockb", pm: "bun" },
    { file: "bun.lock", pm: "bun" },
    { file: "pnpm-lock.yaml", pm: "pnpm" },
    { file: "yarn.lock", pm: "yarn" },
    { file: "package-lock.json", pm: "npm" },
];

/**
 * Detect which package manager a project uses based on lockfiles.
 * @param {string} cwd - Project directory
 * @returns {string} "npm" | "yarn" | "pnpm" | "bun"
 */
export function detectPackageManager(cwd) {
    for (const { file, pm } of LOCKFILE_MAP) {
        if (existsSync(join(cwd, file))) {
            return pm;
        }
    }
    return "npm";
}

/**
 * Get the run command for a given package manager and script.
 * e.g., getRunCommand("pnpm", "dev") → "pnpm run dev"
 */
export function getRunCommand(pm, script) {
    switch (pm) {
        case "bun":
            return `bun run ${script}`;
        case "pnpm":
            return `pnpm run ${script}`;
        case "yarn":
            return `yarn run ${script}`;
        case "npm":
        default:
            return `npm run ${script}`;
    }
}

/**
 * Get the install command for a given package manager.
 */
export function getInstallCommand(pm) {
    switch (pm) {
        case "bun":
            return "bun install";
        case "pnpm":
            return "pnpm install";
        case "yarn":
            return "yarn install";
        case "npm":
        default:
            return "npm install";
    }
}
