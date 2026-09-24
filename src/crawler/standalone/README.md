# engine-harvester

**Full-Automation GitHub Engine Crawler & Sanitizer**

`engine-harvester` is a single-repository autonomous worker that crawls GitHub repositories, isolates **only their underlying runtime engines**, sanitizes vendor branding, enforces a persistent blacklist, and applies granular cool-down timers anywhere during execution.

---

## Key Features

1. **Persistent Blacklist (`blacklist.json`)**
   - Automatically tracks every repository already processed, blacklisted, or marked as incompatible.
   - Dedupes instantaneously to eliminate redundant API calls and prevent infinite loops.

2. **Anywhere Cool-Down Timers**
   - **Intra-Repository Cool-Down Timer**: Enforces customizable pauses (default: 1500ms) between inspecting AST files and isolating engines within a single repository.
   - **Inter-Repository Cool-Down Timer**: Enforces a safety interval (default: 6000ms) between consecutive repositories.
   - **Rate-Limit Reactive Backoff**: Automatically enters exponential backoff if GitHub 403 or 429 occurs.

3. **Massive Error Handling & Resilience**
   - Per-repository error isolation: A broken repository never crashes the crawler queue.
   - Automatic retry with jitter up to `MAX_RETRIES`.
   - Terminal failure blacklisting: If a repository fails repeatedly, it is logged to `blacklist.json` with its stack trace and the crawler safely advances to the next target.

4. **Sanitized `.md` Catalogue Output**
   - Outputs clean Markdown files (`catalogue/<name>-sanitized-engine.md`) containing:
     - The engine's exact architectural role.
     - "What it does" (plain and technical summary of invariants and state changes).
     - Full sanitized implementation code with zero vendor leaks or proprietary tokens.

---

## Quick Start

```bash
# Install dependencies
npm install

# Run autonomous harvester
npm start

# Inspect current blacklist
npm run blacklist:list
```

## Configuration (Environment Variables)

- `COOLDOWN_INTRA_REPO_MS`: Milliseconds between internal steps in one repository (default: `1500`)
- `COOLDOWN_INTER_REPO_MS`: Milliseconds between consecutive repositories (default: `6000`)
- `GEMINI_API_KEY`: API key for Gemini 3.1 Pro Preview high-thinking engine extraction
