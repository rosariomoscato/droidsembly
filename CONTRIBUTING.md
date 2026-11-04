# Contributing

**English** · [Italiano](CONTRIBUTING.it.md)

How to develop Droidsembly, the fork of [leonvanzyl/cubefarm](https://github.com/leonvanzyl/cubefarm). The published package/CLI is `droidsembly`; the internal entry file remains `bin/cubefarm.js` for checkout compatibility. Agent sessions working on this repo also follow [CLAUDE.md](CLAUDE.md), whose historical npm examples refer to the upstream package.

## Ways to contribute

- Report reproducible bugs or suggest improvements using the [English/Italian issue forms](https://github.com/rosariomoscato/droidsembly/issues/new/choose). Search existing issues first and keep one problem or proposal per issue. For bugs, include the installed version, environment, steps, expected and actual results. A blank issue remains available if no form fits.
- Issues are public: remove credentials, private project information and personal data from text, logs and screenshots; never attach full state/configuration files. For sensitive details or suspected vulnerabilities, use the contact form on [the website](https://droidsembly.com/en/) first, without credentials or public exploit details. If GitHub Issues is unavailable, the website contact form is also the fallback for feedback. You do not need to run paid agents or change real data to report a problem.
- Help with documentation, translations, accessibility and desktop/mobile usability.
- Before a substantial change, open an issue to agree on scope. Submit focused pull requests against this fork's `main`, explain the change and report the checks you ran and any failures. Preserve English/Italian coverage and original license notices.

Project code is [MIT licensed](LICENSE). Original CubeFarm attribution and third-party license notices remain applicable. See [credits and license](README.md#credits-and-license).

For installation and isolated demo commands, start with the [English README](README.md) or [README italiano](README.it.md). The development launcher below can update its own checkout; use a separate development copy and dedicated data/ports as described in `CLAUDE.md`. In PowerShell, use `npm.cmd` in place of `npm`.

## Run it from source

```bash
git clone https://github.com/rosariomoscato/droidsembly.git
cd droidsembly
npm install
npm run dev    # or: npm run demo
```

Open http://localhost:5317 (`SWARM_CLIENT_PORT` moves Vite, `SWARM_PORT` the server). The server restarts when code in `server/` or `shared/` changes, and the client reloads itself.

For the build that gets published: `npm run build && npm start`.

All three run `scripts/office.mjs`, the launcher: `--dev` runs the server from source plus Vite, and without it (`npm start`) it runs `bin/cubefarm.js` on the build. It also keeps the checkout up to date: when the office has finished its work and a new commit is on `origin`, or when you type `u` + Enter in its terminal, it stops the office, fast-forwards, installs and builds as needed, and starts it again. See [Updating the office](docs/how-it-works.md#updating-the-office).

## Testing

```bash
npm test             # run every test once (Vitest)
npm run test:watch   # re-run tests as you edit
npm run typecheck
npm run build
npm run test:e2e     # optional browser smoke tests (Playwright): builds, boots a demo office and drives it
```

- Tests sit next to the code they cover as `*.test.ts`, anywhere under `client/`, `server/`, `shared/` or `scripts/` (e.g. `shared/issues.test.ts`). Vitest finds them through `vitest.config.ts`; `tsc` type-checks them and the Vite build leaves them out, since nothing in the app imports them.
- Keep them fast and offline: no network, no GitHub (`gh`), no Claude sessions and no real `~/.cubefarm`. Test pure logic directly, fake anything that would spend usage, and use a temp `SWARM_HOME` and random free ports for anything that needs a server. `npm test` already points `SWARM_HOME` at a temp folder.
- e2e is not part of CI. Before a pull request, `typecheck`, `test` and `build` must pass. Don't run `test:e2e` unless an issue asks for it. If your change shows up in the office, boot your own demo office, check it in a real browser with the Playwright tools, and put screenshots in the pull request. QA then tests every pull request in a real browser in a demo office.
- `npm run test:e2e` is an optional local tool. It runs `e2e/*.spec.ts` headless with software WebGL against a demo office on port 4399 (`E2E_PORT` changes it) with a temp `SWARM_HOME`. It uses your installed Google Chrome when there is one, otherwise (or with `E2E_BROWSER=chromium`) Playwright's Chromium. If that browser is missing it stops at once and says so: run `npx playwright install chromium` once, into the shared cache (leave `PLAYWRIGHT_BROWSERS_PATH` unset). Just built? `E2E_SKIP_BUILD=1` reuses `dist/` instead of building again. Wait on what the page shows rather than sleeping, and don't rely on pointer lock, which a headless browser may not grant.
- One e2e spec file per feature (`e2e/coffee.spec.ts`, `toys.spec.ts`, …), sharing `e2e/helpers.ts` (the `test` that fails on console errors and failed requests, `enterOffice`, `startAt`). New e2e tests go in their feature's spec file or a new one, never appended to `smoke.spec.ts`, which keeps only the core boot and runs first (`playwright.config.ts`).
- GitHub Actions (`.github/workflows/ci.yml`) runs `npm ci`, `npm run typecheck`, `npm test` and `npm run build` for every pull request and every push to `main`, then packs the npm package, installs it into an empty folder and boots it in demo mode (`scripts/smoke-package.mjs`). That `check` job always runs on Ubuntu, and on Windows and macOS for every push to `main`, every manual run and every pull request that touches something OS-sensitive (`server/`, `shared/`, `scripts/`, `bin/`, `.github/`, `package.json`, the lockfile or the root configs); a pull request that only changes `client/`, `e2e/` or docs shows `check (windows-latest)` and `check (macos-latest)` as skipped, which counts as passing. CI runs no browser tests. It needs no secrets.

### The agents' browser tool

Agents test in a browser through the Playwright MCP server, a pinned dependency (`@playwright/mcp` at an exact version in `package.json`) started as `node <its cli.js>` from the installed package (`server/browser.ts`), so a session never runs npx or touches the npm registry. It drives the installed Google Chrome. To bump it:

```bash
npm install --save-exact @playwright/mcp@<version>
node node_modules/@playwright/mcp/cli.js --help   # the flags in server/browser.ts still exist
npm test && npm run build && node scripts/smoke-package.mjs
```

Read its release notes first: a release that moves to a new Playwright may change which Chrome versions it supports.

## Architecture

```
client/  Vite + React + react-three-fiber (toon materials, canvas textures)
  src/world/   the 3D building: floors, desks, characters, laptops, whiteboard, elevator, player
  src/ui/      HUD and panels: terminal, Kanban, elevator, manager's console
  src/photo/   photo mode: a free camera over a frozen office, filters, shots, clips and instant replay
bin/cubefarm.js  the `droidsembly` command: checks the machine, starts the server, opens the browser
scripts/office.mjs  the launcher for a checkout (npm run dev / demo / start): runs the office and updates it
server/  Node + Express + ws
  swarm.ts        orchestrator: floors, agents, scheduling, persistence, websocket fan-out
  agentRunner.ts  the older Agent SDK runtime (Settings → How agents run): Claude Code through the SDK, as a log
  cliRunner.ts    the default: one agent as the real CLI (Claude Code, Codex, OpenCode) in a pseudo-terminal: hooks, turn endings, the CEO's tools over MCP
  ptyHost.ts      the terminal keeper: its own process holding the CLIs' terminals and hooks through office restarts
  ptyClient.ts    the office's side of the keeper (ptyProtocol.ts: their messages)
  clis.ts         the CLIs agents can run (Claude Code, Codex, OpenCode): finding them, their command lines
  terminal.ts     each agent's terminal: a headless xterm mirror, its viewers, keystrokes to the running CLI
  github.ts       everything GitHub, via the gh CLI
  workspace.ts    clones + per-agent git worktrees
  previews.ts     one preview per floor, and the PR theatre's PR previews: ports, statuses, start / stop
  previewRunner.ts  checkout, install and run a floor's app in its preview worktree
  demo.ts         fake GitHub and fake agents for `npm run demo`
shared/types.ts   the websocket / REST contract
```

The server streams everything to the browser over one websocket (`/ws`); an open terminal panel has its own (`/ws/term?agent=<id>`). Laptop screens and the whiteboard are canvases drawn from that data and used as textures. They only repaint when something changed, and less often when you're far away.

## Publishing

**Fork status:** [`droidsembly@0.4.0-beta.1`](https://www.npmjs.com/package/droidsembly) is published; use the explicit `next` channel. See the [GitHub prerelease](https://github.com/rosariomoscato/droidsembly/releases/tag/droidsembly-v0.4.0-beta.1) for release notes and known validation limits. The sole public command is `droidsembly`. See [the release guide](docs/NPM_RELEASE.md) for validation and the manual release process. Publication, tags and remote workflow execution require explicit maintainer authorization.

The npm package holds `bin/cubefarm.js` (the command), `dist/` (the built client) and `dist-server/` (the server, bundled into plain JavaScript by `scripts/build-server.mjs`, because Node won't run TypeScript from inside `node_modules`). The client's libraries are bundled into `dist/`, so users only install the server's dependencies.

The prepared workflow `.github/workflows/release.yml` is manual-only on the fork's `main`. It accepts an existing `droidsembly-v<version>` tag, requires matching package/lock metadata and a commit belonging to main's history, and verifies typecheck, tests, build and installed-package demo on Windows, macOS and Linux before the publish job. It does not bump versions, push main, create Git tags or run on a tag push. Version changes are reviewed through PRs.

The publish job is prepared for [trusted publishing](https://docs.npmjs.com/trusted-publishers) with npm 11 on Node 24. OIDC setup and validation are still pending for a future release; the first beta was published manually with maintainer authentication. Configure the package's trusted publisher for this fork and `release.yml`; the upstream configuration does not transfer. No credentials belong in repository files. Beta releases go to `next`, stable versions to `latest`; `publishConfig.tag` must agree with the version.

`npm pack --dry-run --ignore-scripts` lists package contents without publishing. After building, `node scripts/smoke-package.mjs` packs into a temporary folder, installs the tarball there, exercises the installed command, and starts a demo with an isolated home and unused loopback port. It disables update registry checks and deletes only its own temporary installation. Windows shells use `npm.cmd`.
