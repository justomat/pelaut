import { execSync } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync, copyFileSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const CLI = join(ROOT, 'src/cli/index.js');
const DEMO_DIR = join(ROOT, 'demo-app');
const WORKTREE_DIR = join(ROOT, 'demo-app-wt');

function run(cmd, cwd = ROOT) {
    console.log(`> ${cmd}`);
    execSync(cmd, { stdio: 'inherit', cwd });
}

function setup() {
    console.log('🚧 Setting up Pelaut Demo Environment...');

    // 1. Clean up
    if (existsSync(DEMO_DIR)) rmSync(DEMO_DIR, { recursive: true, force: true });
    if (existsSync(WORKTREE_DIR)) rmSync(WORKTREE_DIR, { recursive: true, force: true });

    // 2. Setup Main Demo Repo
    mkdirSync(DEMO_DIR);
    copyFileSync(join(ROOT, 'examples/server.js'), join(DEMO_DIR, 'index.js'));
    writeFileSync(join(DEMO_DIR, 'package.json'), JSON.stringify({
        name: "demo-app",
        version: "1.0.0",
        scripts: { "start": "node index.js" }
    }, null, 2));
    writeFileSync(join(DEMO_DIR, '.gitignore'), 'node_modules\n');

    run('git init', DEMO_DIR);
    run('git config user.email "demo@example.com"', DEMO_DIR);
    run('git config user.name "Demo User"', DEMO_DIR);
    run('git branch -m main', DEMO_DIR); // Ensure branch is main
    run('git add .', DEMO_DIR);
    run('git commit -m "Initial commit"', DEMO_DIR);

    // 3. Setup Worktree
    // Create a new branch 'feat/login' and check it out in a worktree
    run(`git worktree add -b feat/login ${WORKTREE_DIR}`, DEMO_DIR);

    // 4. Register with Pelaut
    // First, ensure daemon is running (implied by user action usually, but good to check or start)
    // We'll just run 'pelaut add' which fails if daemon isn't running, but that's fine for now.
    // Actually, 'pelaut add' might auto-start daemon? No, 'pelaut add' requires daemon.
    // Let's assume daemon is running or let the user handle it.

    console.log('\n🚢 Registering demo servers with Pelaut...');

    try {
        // Add Main
        run(`node ${CLI} add 'npm start'`, DEMO_DIR);

        // Add Worktree
        // Explicitly name it demo-app--feat-login so it groups with demo-app
        run(`node ${CLI} add 'npm start' -n demo-app--feat-login`, WORKTREE_DIR);

        console.log('\n✅ Demo setup complete!');
        console.log('Open the dashboard to see:');
        console.log('  1. demo-app (main)');
        console.log('  2. demo-app--feat-login (worktree)');
    } catch (e) {
        console.error('\n❌ Failed to register servers. Is the pelaut daemon running?');
        console.error('Run "pelaut start" and try again.');
    }
}

setup();
