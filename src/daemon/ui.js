/**
 * Generates the single-page Web UI HTML for the Pelaut dashboard.
 */
export function getUiHtml() {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Pelaut — Dev Server Manager</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    :root {
      --bg-base: #0b0e14;
      --bg-surface: #12161f;
      --bg-elevated: #1a1f2e;
      --bg-hover: #222839;
      --border: #2a3042;
      --text-primary: #e2e8f0;
      --text-secondary: #8892a8;
      --text-muted: #5a6378;
      --accent: #38bdf8;
      --accent-glow: rgba(56, 189, 248, 0.15);
      --green: #4ade80;
      --green-glow: rgba(74, 222, 128, 0.15);
      --red: #f87171;
      --red-glow: rgba(248, 113, 113, 0.12);
      --orange: #fb923c;
      --purple: #a78bfa;
      --teal: #2dd4bf;
      --radius: 12px;
      --radius-sm: 8px;
    }

    body {
      font-family: 'Inter', system-ui, -apple-system, sans-serif;
      background: var(--bg-base);
      color: var(--text-primary);
      min-height: 100vh;
      line-height: 1.5;
    }

    /* ── Header ────────────────────────────── */
    .header {
      padding: 2rem 2rem 1.5rem;
      border-bottom: 1px solid var(--border);
      background: linear-gradient(180deg, rgba(56, 189, 248, 0.04) 0%, transparent 100%);
    }
    .header-inner {
      max-width: 1200px;
      margin: 0 auto;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .logo {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }
    .logo-icon { font-size: 1.75rem; }
    .logo h1 {
      font-size: 1.5rem;
      font-weight: 700;
      letter-spacing: -0.02em;
      background: linear-gradient(135deg, var(--accent), #818cf8);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    .logo span {
      font-size: 0.75rem;
      color: var(--text-muted);
      font-family: 'JetBrains Mono', monospace;
    }
    .stats { display: flex; gap: 1.5rem; }
    .stat { text-align: center; }
    .stat-value {
      font-size: 1.25rem;
      font-weight: 600;
      font-family: 'JetBrains Mono', monospace;
    }
    .stat-label {
      font-size: 0.7rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--text-muted);
    }

    /* ── Main Content ──────────────────────── */
    .main {
      max-width: 1200px;
      margin: 0 auto;
      padding: 1.5rem 2rem 3rem;
    }
    .empty-state {
      text-align: center;
      padding: 4rem 2rem;
      color: var(--text-secondary);
    }
    .empty-state h2 {
      font-size: 1.25rem;
      margin-bottom: 0.75rem;
      color: var(--text-primary);
    }
    .empty-state code {
      display: inline-block;
      margin-top: 1rem;
      padding: 0.75rem 1.25rem;
      background: var(--bg-elevated);
      border: 1px solid var(--border);
      border-radius: var(--radius-sm);
      font-family: 'JetBrains Mono', monospace;
      font-size: 0.85rem;
      color: var(--accent);
    }

    /* ── Group Cards ──────────────────────── */
    .servers {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }
    .group-card {
      background: var(--bg-surface);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      overflow: hidden;
      transition: border-color 0.2s ease;
    }
    .group-card:hover {
      border-color: #3a4058;
    }
    .group-card.has-running {
      border-left: 3px solid var(--green);
    }
    .group-card.all-stopped {
      border-left: 3px solid var(--text-muted);
    }

    /* ── Group Header ─────────────────────── */
    .group-header {
      padding: 1rem 1.5rem;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
    }
    .group-info {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      min-width: 0;
    }
    .group-name {
      font-weight: 700;
      font-size: 1.05rem;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      color: var(--text-primary);
    }
    .group-badges {
      display: flex;
      align-items: center;
      gap: 0.4rem;
      flex-shrink: 0;
    }
    .group-meta {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      font-size: 0.72rem;
      color: var(--text-muted);
      font-family: 'JetBrains Mono', monospace;
    }

    /* ── Variant Rows ─────────────────────── */
    .variant-rows {
      border-top: 1px solid var(--border);
    }
    .variant-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      padding: 0.65rem 1.5rem 0.65rem 2.25rem;
      position: relative;
      transition: background 0.15s ease;
    }
    .variant-row:hover {
      background: var(--bg-elevated);
    }
    .variant-row + .variant-row {
      border-top: 1px solid rgba(42, 48, 66, 0.5);
    }
    /* tree connector */
    .variant-row::before {
      content: '';
      position: absolute;
      left: 1.25rem;
      top: 0;
      bottom: 50%;
      width: 1px;
      background: var(--border);
    }
    .variant-row::after {
      content: '';
      position: absolute;
      left: 1.25rem;
      top: 50%;
      width: 0.5rem;
      height: 1px;
      background: var(--border);
    }
    .variant-row:first-child::before {
      top: 0;
    }
    .variant-row:last-child::before {
      bottom: 50%;
    }

    .variant-info {
      display: flex;
      align-items: center;
      gap: 0.65rem;
      flex: 1;
      min-width: 0;
    }
    .status-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      flex-shrink: 0;
    }
    .status-dot.running {
      background: var(--green);
      box-shadow: 0 0 6px var(--green-glow);
      animation: pulse 2s infinite;
    }
    .status-dot.stopped {
      background: var(--text-muted);
    }
    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }

    .variant-label {
      font-size: 0.8rem;
      font-family: 'JetBrains Mono', monospace;
      color: var(--text-secondary);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .variant-label a {
      color: var(--text-secondary);
      text-decoration: none;
    }
    .variant-label a:hover {
      color: var(--accent);
    }
    .variant-badges {
      display: flex;
      align-items: center;
      gap: 0.35rem;
    }
    .variant-detail {
      font-size: 0.68rem;
      color: var(--text-muted);
      font-family: 'JetBrains Mono', monospace;
      white-space: nowrap;
    }

    /* ── Badges ────────────────────────────── */
    .badge {
      display: inline-flex;
      align-items: center;
      gap: 0.3rem;
      padding: 0.15rem 0.5rem;
      border-radius: 20px;
      font-size: 0.65rem;
      font-family: 'JetBrains Mono', monospace;
      font-weight: 500;
      white-space: nowrap;
    }
    .badge-branch {
      background: rgba(167, 139, 250, 0.12);
      color: var(--purple);
      border: 1px solid rgba(167, 139, 250, 0.2);
    }
    .badge-pm {
      background: rgba(251, 146, 60, 0.12);
      color: var(--orange);
      border: 1px solid rgba(251, 146, 60, 0.2);
    }
    .badge-port {
      background: var(--accent-glow);
      color: var(--accent);
      border: 1px solid rgba(56, 189, 248, 0.2);
    }
    .badge-worktree {
      background: rgba(74, 222, 128, 0.1);
      color: var(--green);
      border: 1px solid rgba(74, 222, 128, 0.2);
    }
    .badge-variant {
      background: rgba(45, 212, 191, 0.12);
      color: var(--teal);
      border: 1px solid rgba(45, 212, 191, 0.2);
      font-weight: 600;
    }

    /* ── Actions ───────────────────────────── */
    .actions {
      display: flex;
      gap: 0.35rem;
      flex-shrink: 0;
    }
    .btn {
      display: inline-flex;
      align-items: center;
      gap: 0.3rem;
      padding: 0.3rem 0.65rem;
      border: 1px solid var(--border);
      border-radius: var(--radius-sm);
      background: var(--bg-elevated);
      color: var(--text-secondary);
      font-family: 'Inter', sans-serif;
      font-size: 0.7rem;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.15s ease;
    }
    .btn:hover {
      background: var(--bg-hover);
      color: var(--text-primary);
      border-color: #4a5068;
    }
    .btn:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }
    .btn-start:hover { border-color: var(--green); color: var(--green); }
    .btn-stop:hover { border-color: var(--red); color: var(--red); }
    .btn-restart:hover { border-color: var(--accent); color: var(--accent); }
    .btn-log {
      background: none;
      border: none;
      color: var(--text-muted);
      padding: 0.3rem;
      font-size: 0.8rem;
    }
    .btn-log:hover { color: var(--text-primary); }
    .btn-log.active { color: var(--accent); }

    /* ── Log pane ──────────────────────────── */
    .variant-log {
      margin: 0.25rem 0 0.5rem 2.25rem;
      display: none;
    }
    .variant-log.open { display: block; }
    .log-content {
      background: var(--bg-base);
      border: 1px solid var(--border);
      border-radius: var(--radius-sm);
      padding: 0.75rem 1rem;
      font-family: 'JetBrains Mono', monospace;
      font-size: 0.7rem;
      line-height: 1.6;
      color: var(--text-secondary);
      max-height: 250px;
      overflow-y: auto;
      white-space: pre-wrap;
      word-break: break-all;
    }

    /* ── Standalone row (single entry, no variants) ── */
    .standalone-row {
      padding: 0.85rem 1.5rem;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="header-inner">
      <div class="logo">
        <span class="logo-icon">🚢</span>
        <div>
          <h1>Pelaut</h1>
          <span>dev server manager</span>
        </div>
      </div>
      <div class="stats">
        <div class="stat">
          <div class="stat-value" id="stat-total">-</div>
          <div class="stat-label">Servers</div>
        </div>
        <div class="stat">
          <div class="stat-value" style="color: var(--green)" id="stat-running">-</div>
          <div class="stat-label">Running</div>
        </div>
      </div>
    </div>
  </div>

  <div class="main">
    <div id="servers" class="servers">
      <div class="empty-state">
        <h2>No servers registered</h2>
        <p>Add a server with the CLI:</p>
        <code>pelaut add 'npm run dev'</code>
      </div>
    </div>
  </div>

  <script>
    const POLL_INTERVAL = 2000;
    let openLogs = new Set();

    function formatUptime(ms) {
      if (!ms) return '-';
      const s = Math.floor(ms / 1000);
      if (s < 60) return s + 's';
      const m = Math.floor(s / 60);
      if (m < 60) return m + 'm ' + (s % 60) + 's';
      const h = Math.floor(m / 60);
      return h + 'h ' + (m % 60) + 'm';
    }

    function escapeHtml(str) {
      const div = document.createElement('div');
      div.textContent = str;
      return div.innerHTML;
    }

    async function apiCall(path, method = 'GET') {
      try {
        const res = await fetch('/api' + path, { method });
        return await res.json();
      } catch (e) {
        console.error('API error:', e);
        return null;
      }
    }

    function cardKey(srv) {
      return srv.variant ? srv.name + ':' + srv.variant : srv.name;
    }

    async function fetchLog(srv) {
      const qs = srv.variant ? '&variant=' + encodeURIComponent(srv.variant) : '';
      const data = await apiCall('/servers/' + srv.name + '/log?lines=80' + qs);
      return data ? data.log : '';
    }

    async function doAction(name, action, variant) {
      const key = variant ? name + ':' + variant : name;
      document.querySelectorAll('[data-key="' + key + '"] .btn').forEach(b => b.disabled = true);
      const qs = variant ? '?variant=' + encodeURIComponent(variant) : '';
      await apiCall('/servers/' + name + '/' + action + qs, 'POST');
      await refresh();
    }

    function toggleLog(key) {
      if (openLogs.has(key)) openLogs.delete(key);
      else openLogs.add(key);
      refresh();
    }

    /**
     * Derive the grouping key for a server entry.
     * - For worktree servers (name contains --), group under the base name before --
     * - Otherwise group under the server name
     */
    function groupKey(srv) {
      if (srv.git && srv.git.isWorktree && srv.name.includes('--')) {
        return srv.name.slice(0, srv.name.indexOf('--'));
      }
      return srv.name;
    }

    /**
     * Build a label string for a variant row.
     * Combines branch info + env overrides into a concise label.
     */
    function variantLabel(srv) {
      const parts = [];
      if (srv.git && srv.git.branch) {
        parts.push('BRANCH=' + srv.git.branch);
      }
      if (srv.envOverrides) {
        for (const [k, v] of Object.entries(srv.envOverrides)) {
          parts.push(k + '=' + v);
        }
      }
      return parts.join(' ');
    }

    function renderVariantRow(srv) {
      const key = cardKey(srv);
      const isRunning = srv.status.running;
      const statusClass = isRunning ? 'running' : 'stopped';
      const logOpen = openLogs.has(key);
      const domain = srv.domain || (srv.name + '.localhost');
      // domain is always the display label
      const variantArg = srv.variant ? ', \\'' + srv.variant + '\\'' : '';

      // Build badge list for variant-specific info
      let badges = '';
      if (srv.envOverrides) {
        for (const [k, v] of Object.entries(srv.envOverrides)) {
          badges += '<span class="badge badge-variant">' + k + '=' + v + '</span>';
        }
      }
      if (srv.git && srv.git.branch) {
        badges += '<span class="badge badge-branch">⎇ ' + escapeHtml(srv.git.branch) + '</span>';
      }
      if (srv.git && srv.git.isWorktree) {
        badges += '<span class="badge badge-worktree">⌥ wt</span>';
      }
      if (isRunning) {
        badges += '<span class="badge badge-port">:' + srv.status.port + '</span>';
      }

      let html = '<div class="variant-row" data-key="' + escapeHtml(key) + '">';
      html += '<div class="variant-info">';
      html += '<div class="status-dot ' + statusClass + '"></div>';
      html += '<div class="variant-label">';
      html += '<a href="https://' + escapeHtml(domain) + '" target="_blank">' + escapeHtml(domain) + '</a>';
      html += '</div>';
      html += '<div class="variant-badges">' + badges + '</div>';
      if (isRunning) {
        html += '<span class="variant-detail">' + formatUptime(srv.status.uptime) + '</span>';
      }
      html += '</div>';

      // Actions
      html += '<div class="actions">';
      if (isRunning) {
        html += '<button class="btn btn-stop" onclick="doAction(\\'' + srv.name + '\\', \\'stop\\'' + variantArg + ')">■</button>';
        html += '<button class="btn btn-restart" onclick="doAction(\\'' + srv.name + '\\', \\'restart\\'' + variantArg + ')">↻</button>';
      } else {
        html += '<button class="btn btn-start" onclick="doAction(\\'' + srv.name + '\\', \\'start\\'' + variantArg + ')">▶</button>';
      }
      html += '<button class="btn btn-log ' + (logOpen ? 'active' : '') + '" onclick="toggleLog(\\'' + escapeHtml(key) + '\\')" title="Toggle logs">☰</button>';
      html += '</div>';
      html += '</div>';

      // Log pane
      html += '<div class="variant-log ' + (logOpen ? 'open' : '') + '" id="log-' + escapeHtml(key) + '">';
      html += '<div class="log-content" id="log-content-' + escapeHtml(key) + '">Loading...</div>';
      html += '</div>';

      return html;
    }

    async function refresh() {
      const servers = await apiCall('/servers');
      if (!servers) return;

      const total = servers.length;
      const running = servers.filter(s => s.status.running).length;
      document.getElementById('stat-total').textContent = total;
      document.getElementById('stat-running').textContent = running;

      const container = document.getElementById('servers');

      if (total === 0) {
        container.innerHTML = '<div class="empty-state"><h2>No servers registered</h2><p>Add a server with the CLI:</p><code>pelaut add \\'npm run dev\\'</code></div>';
        return;
      }

      // Group servers by base name
      const groups = new Map();
      for (const srv of servers) {
        const gk = groupKey(srv);
        if (!groups.has(gk)) groups.set(gk, []);
        groups.get(gk).push(srv);
      }

      let html = '';
      for (const [gk, entries] of groups) {
        const anyRunning = entries.some(e => e.status.running);
        const stateClass = anyRunning ? 'has-running' : 'all-stopped';

        // Shared metadata from the first entry
        const first = entries[0];
        const pm = first.packageManager || '-';

        html += '<div class="group-card ' + stateClass + '">';

        // Group header
        html += '<div class="group-header">';
        html += '<div class="group-info">';
        html += '<span class="group-name">' + escapeHtml(gk) + '</span>';
        html += '<div class="group-badges">';
        html += '<span class="badge badge-pm">' + escapeHtml(pm) + '</span>';
        html += '</div>';
        html += '</div>';
        html += '<div class="group-meta">';
        html += '<span>cmd ' + escapeHtml(first.cmd) + '</span>';
        html += '<span>cwd ' + escapeHtml(first.cwd) + '</span>';
        html += '</div>';
        html += '</div>';

        // Variant rows
        html += '<div class="variant-rows">';
        for (const srv of entries) {
          html += renderVariantRow(srv);
        }
        html += '</div>';

        html += '</div>';
      }

      container.innerHTML = html;

      // Fetch logs for open log panels
      for (const key of openLogs) {
        const srv = servers.find(s => cardKey(s) === key);
        if (!srv) continue;
        const log = await fetchLog(srv);
        const el = document.getElementById('log-content-' + key);
        if (el) {
          el.textContent = log || '(no logs yet)';
          el.scrollTop = el.scrollHeight;
        }
      }
    }

    // Initial load + polling
    refresh();
    setInterval(refresh, POLL_INTERVAL);
  </script>
</body>
</html>`;
}
