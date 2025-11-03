# Repository Guidelines

## Project Structure & Module Organization
- `api/` centralizes HTTP clients (`request.js`) plus role-specific endpoints; adjust `BASE_URL` here when switching environments.
- `pages/` stores role-driven views (`admin/`, `tech/`, `appointment/`, etc.); keep shared UI inside `pages/profile/`.
- `store/` exposes Pinia stores, with `user.js` governing login state and dynamic tab bars—extend this before introducing new roles.
- `static/` holds unprocessed assets; prefer referencing via `@/static/...` so the uni-app bundler resolves paths correctly.
- Build artifacts land in `unpackage/`; do not commit these outputs, but inspect them when debugging platform-specific issues.

## Build, Test, and Development Commands
- `npm install`: install project dependencies for the uni-app CLI workflow.
- `npx @dcloudio/uni-app-cli dev -p mp-weixin`: start the WeChat Mini Program dev build; resulting code appears in `unpackage/dist/dev/mp-weixin/`.
- `npx @dcloudio/uni-app-cli build -p mp-weixin`: produce a release bundle for Mini Program upload (`unpackage/dist/build/mp-weixin/`).
- Use HBuilderX “运行到小程序模拟器” when GUI tooling is faster; it wraps the same build steps above.

## Coding Style & Naming Conventions
- Follow Vue 3 Composition patterns; keep module exports named in lowercase-hyphen files (`admin-crud`, `tech`, etc.).
- Use 4-space indentation in `.vue` and `.js` scripts, 2 spaces in JSON configs; prefer single quotes in JavaScript.
- Register shared helpers in `uni.promisify.adaptor.js` or `store/` rather than duplicating logic across pages.
- Keep TabBar labels concise (≤4 chars) to match existing `pages.json` layout.

## Testing Guidelines
- No automated unit suite exists yet; validate features through the WeChat Developer Tools using the generated `unpackage/dist/dev/mp-weixin` build.
- Before opening a PR, run through the role-specific happy paths: customer booking flow, technician schedule view, and admin CRUD screens.
- Capture console output from both HBuilderX and the WeChat devtools when reporting regressions.

## Commit & Pull Request Guidelines
- Commit messages currently use short, imperative summaries (e.g., “Renew README.MD”); keep a single focus per commit.
- Reference related Trello/Jira tickets with `[#id]` suffixes when applicable, and include context in the body if configuration files change.
- Pull requests should outline the affected roles, list manual verification steps, and attach screenshots for UI changes (WeChat emulator captures are ideal).

## Security & Configuration Tips
- Store secrets outside the repo; set `BASE_URL` and keys via environment-specific manifests rather than hardcoding production values.
- Update `manifest.json` (`mp-weixin.appid`) only with authorized IDs, and confirm CDN domains are added to the Mini Program allowlist before merging.
