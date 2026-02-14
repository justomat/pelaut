import { execSync } from "node:child_process";
import { readFileSync, existsSync, statSync } from "node:fs";
import { join } from "node:path";

/**
 * Run a git command in the given cwd, returning trimmed stdout or null on error.
 */
function gitExec(cmd, cwd) {
    try {
        return execSync(cmd, { cwd, stdio: ["pipe", "pipe", "pipe"], encoding: "utf-8" }).trim();
    } catch {
        return null;
    }
}

/**
 * Get the current branch name.
 */
export function getBranch(cwd) {
    return gitExec("git rev-parse --abbrev-ref HEAD", cwd);
}

/**
 * Check if cwd is inside a git repository.
 */
export function isGitRepo(cwd) {
    return gitExec("git rev-parse --is-inside-work-tree", cwd) === "true";
}

/**
 * Check if cwd is a linked git worktree (not the main working tree).
 * A linked worktree has a `.git` file (not directory) pointing to the main repo.
 */
export function isWorktree(cwd) {
    const dotGit = join(cwd, ".git");
    if (!existsSync(dotGit)) return false;

    const stat = statSync(dotGit);
    if (stat.isFile()) {
        // .git is a file → this is a linked worktree
        const content = readFileSync(dotGit, "utf-8").trim();
        return content.startsWith("gitdir:");
    }

    return false;
}

/**
 * List all worktrees for the repo at cwd.
 * Returns array of { path, branch, bare, head }.
 */
export function listWorktrees(cwd) {
    const raw = gitExec("git worktree list --porcelain", cwd);
    if (!raw) return [];

    const worktrees = [];
    let current = {};

    for (const line of raw.split("\n")) {
        if (line.startsWith("worktree ")) {
            if (current.path) worktrees.push(current);
            current = { path: line.slice("worktree ".length) };
        } else if (line.startsWith("HEAD ")) {
            current.head = line.slice("HEAD ".length);
        } else if (line.startsWith("branch ")) {
            current.branch = line.slice("branch refs/heads/".length);
        } else if (line === "bare") {
            current.bare = true;
        } else if (line === "detached") {
            current.branch = "(detached)";
        }
    }
    if (current.path) worktrees.push(current);

    return worktrees;
}

/**
 * Get comprehensive git info for a directory.
 * Returns null if not a git repo.
 */
export function getGitInfo(cwd) {
    if (!isGitRepo(cwd)) return null;

    const branch = getBranch(cwd);
    const worktree = isWorktree(cwd);
    const worktrees = listWorktrees(cwd);

    return {
        branch,
        isWorktree: worktree,
        worktrees,
    };
}

/**
 * Generate a server name that includes branch context.
 * e.g., "myapp" for main branch, "myapp--feat-login" for feat/login branch.
 */
export function serverNameFromGit(baseName, gitInfo) {
    if (!gitInfo || !gitInfo.branch) return baseName;

    const mainBranches = ["main", "master", "develop"];
    if (mainBranches.includes(gitInfo.branch)) return baseName;

    // Sanitize branch name for use as server name
    const safeBranch = gitInfo.branch.replace(/[/\\]/g, "-").replace(/[^a-zA-Z0-9-_]/g, "");
    return `${baseName}--${safeBranch}`;
}

/**
 * Derive the domain for a server config.
 * Worktree servers use subdomain style: myapp.feat-login.localhost
 * Normal servers: myapp.localhost
 * @param {object} serverConfig - { name, git }
 * @param {string} tld - e.g. "localhost"
 * @returns {string} The domain string
 */
export function serverDomain(serverConfig, tld = "localhost") {
    const { name, git } = serverConfig;

    // If it's a worktree (non-main branch), split name on "--" → subdomain
    if (git && git.isWorktree && name.includes("--")) {
        const idx = name.indexOf("--");
        const base = name.slice(0, idx);
        const branch = name.slice(idx + 2);
        return `${base}.${branch}.${tld}`;
    }

    return `${name}.${tld}`;
}
