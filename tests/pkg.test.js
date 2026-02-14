import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, writeFileSync, existsSync, rmSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

// ── Package Manager Detection ─────────────────────────────
import { detectPackageManager, getRunCommand, getInstallCommand } from "../src/pkg.js";

describe("detectPackageManager", () => {
    let dir;

    beforeEach(() => {
        dir = mkdtempSync(join(tmpdir(), "pelaut-test-pkg-"));
    });

    afterEach(() => {
        rmSync(dir, { recursive: true, force: true });
    });

    it("returns 'bun' when bun.lockb exists", () => {
        writeFileSync(join(dir, "bun.lockb"), "");
        expect(detectPackageManager(dir)).toBe("bun");
    });

    it("returns 'bun' when bun.lock exists", () => {
        writeFileSync(join(dir, "bun.lock"), "");
        expect(detectPackageManager(dir)).toBe("bun");
    });

    it("returns 'pnpm' when pnpm-lock.yaml exists", () => {
        writeFileSync(join(dir, "pnpm-lock.yaml"), "");
        expect(detectPackageManager(dir)).toBe("pnpm");
    });

    it("returns 'yarn' when yarn.lock exists", () => {
        writeFileSync(join(dir, "yarn.lock"), "");
        expect(detectPackageManager(dir)).toBe("yarn");
    });

    it("returns 'npm' when package-lock.json exists", () => {
        writeFileSync(join(dir, "package-lock.json"), "{}");
        expect(detectPackageManager(dir)).toBe("npm");
    });

    it("returns 'npm' as fallback when no lockfile exists", () => {
        expect(detectPackageManager(dir)).toBe("npm");
    });

    it("prefers bun over pnpm/yarn/npm", () => {
        writeFileSync(join(dir, "bun.lockb"), "");
        writeFileSync(join(dir, "pnpm-lock.yaml"), "");
        writeFileSync(join(dir, "yarn.lock"), "");
        expect(detectPackageManager(dir)).toBe("bun");
    });
});

describe("getRunCommand", () => {
    it("returns correct commands for each pm", () => {
        expect(getRunCommand("bun", "dev")).toBe("bun run dev");
        expect(getRunCommand("pnpm", "dev")).toBe("pnpm run dev");
        expect(getRunCommand("yarn", "dev")).toBe("yarn run dev");
        expect(getRunCommand("npm", "dev")).toBe("npm run dev");
    });
});

describe("getInstallCommand", () => {
    it("returns correct commands for each pm", () => {
        expect(getInstallCommand("bun")).toBe("bun install");
        expect(getInstallCommand("pnpm")).toBe("pnpm install");
        expect(getInstallCommand("yarn")).toBe("yarn install");
        expect(getInstallCommand("npm")).toBe("npm install");
    });
});
