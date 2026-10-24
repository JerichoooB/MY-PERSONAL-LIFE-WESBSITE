# LifeOS

A responsive personal workspace with a charcoal dotted canvas, rounded top navigation, coral task cards, a mint diary feature, and a blue reminders card. Built with React, Vite, Tailwind CSS, Lucide, Recharts, React Router, and Framer Motion. Start with a clean workspace and add your own data; statistics come from recorded activity.

## Develop

Requires Node.js 22.12+ (tested with 24.19) and npm.

```sh
npm ci --cache /workspace/.npm-cache
npm run dev
```

Open the development server on your own machine. In this cloud environment, use local HTTP requests for validation. Each cloud task is isolated; use the existing checkout rather than creating a worktree.

```sh
npm test
npm run build
npm run preview -- --port 4173
```

`npm test` checks backup validation and date/streak calculations. `npm run test:browser` runs the real Chromium workflow checks against the production preview (start it first). Set `LIFEOS_BASE_URL` or `CHROMIUM_PATH` if needed; by default the test uses port 4173 and `/usr/bin/chromium`. Otherwise install Playwright's Chromium with `npx playwright install chromium` and set `CHROMIUM_PATH` to its executable.

## Features

- Overview with actual task activity, goals, spending, mini calendar, habits, and quick actions.
- Tasks with dates/times, priorities, categories, filters, sorting, editing, and completion.
- Month/week calendar with events and due tasks.
- Notes with tags, pinning, autosave, Markdown, and live preview.
- Diary with dated entries, moods, search, monthly filters, Markdown, and autosave.
- Goals with milestones and progress; daily habits with real current/best streaks and monthly history.
- Income, expenses, monthly budgets, category charts, and savings goals.
- Projects with stack, status, dates, links, notes, and checklists.
- Dark/light appearance, accents, profile, date/currency/week preferences, JSON export/import, and confirmed reset.
- Search palette with Ctrl/⌘ K, type filters, highlighted matches, keyboard navigation, and page shortcuts. Existing title/content search matching is preserved.
- Personalization uses Save changes and Cancel; appearance updates still save immediately.
- Custom task categories appear as wrapping chips and are selected after creation.
- Reminders for due/overdue tasks.

## Offline phone use

Build and deploy the contents of `dist/` to an HTTPS static host. Hash routes work without server rewrite rules, including on subpaths. Do not serve `src/` as the production app. Keep the deployment at a stable origin and path: browser storage is origin-specific. The manifest, icons, fonts, code, and styles are bundled locally; no external CDN is required.

1. Visit the published HTTPS website on your phone while online.
2. Open **Settings → LifeOS on your phone** and wait for **Ready to use offline**.
3. Android Chrome: menu → **Install app**. iPhone Safari: Share → **Add to Home Screen** → **Open as Web App**.
4. Open the installed app once while online. Then it can reopen and edit data without internet.

Offline caching is enabled in production builds, not the development server. New releases show an explicit update button in Settings. Installing does not sync data between devices. Export backups regularly: clearing browser/site data or removing the app can erase data. This app has no login, encryption, or server backup; someone with access to your browser profile can view its records, including diary entries. Browser storage has a size limit; large images and backups should be avoided.

## Data and future backend

`src/data.js` owns the versioned persistence adapter, import validation, and date calculations. `src/App.jsx` contains the application views; `src/Offline.jsx` handles installation/offline/update state. Data is stored under `lifeos.v1` in localStorage. Imports validate every record collection before asking to replace current data; older v1 backups without diary entries migrate to an empty diary.

PHP/MySQL is reserved for a future backend phase, as specified in the brief. No PHP server, database, account system, or cross-device synchronization is included. Replace the storage adapter with a PHP 8+ JSON REST API using PDO prepared statements when adding a backend. To retain offline editing, keep local storage and design authenticated synchronization, change tracking, and conflict resolution rather than relying solely on remote API calls.

## Hosting

`npm run build` creates a static deployable `dist/` directory. It has not been published to a public host by this setup. HTTPS is required for phone installation and service workers (localhost is allowed for local testing). On an HTTPS host, serve `sw.js` without a long-lived immutable cache; use hashed asset files for immutable caching. Avoid changing paths between deployments to preserve installed-app scope and local data access.

### Vercel deployment

`vercel.json` selects Vite, builds with `npm run build`, and publishes `dist/`. No application environment variables or database are required. The service worker and HTML must revalidate so app updates can be detected. Hash routes require no rewrite rules.

With Vercel access, run `npx vercel login` and `npx vercel --prod` in this checkout. In this cloud environment, Node CLI requests must use `NODE_USE_ENV_PROXY=1` and writable cache/config locations, e.g. `XDG_CACHE_HOME=/workspace/vercel-cache` and `--global-config /workspace/vercel-config`. The environment network policy must allow Vercel's API/auth hosts and the deployment hostname. Do not commit Vercel credentials or `.vercel/`.

A stable production URL preserves access to local browser data. Preview deployment URLs have their own browser storage; export/import backups when changing to the production domain.

`npm run test:ui` checks the search palette, Personalization save/cancel behavior, and custom category visibility using an isolated Chromium context against the production preview.

### Import a weekly class schedule

Open Calendar → Import schedule. The included Second Year Schedule was transcribed from the supplied timetable image. Enter the first and last class dates (up to a year), choose Cordillera section A/B and PATHFIT morning/afternoon, and optionally exclude holidays. Review the class/time preview, then import. Events are added to School; existing workspace data is preserved, and reimporting skips existing occurrences, including ones you edited. Overlapping events require explicit acknowledgment. Times are local wall-clock Philippine class times; use Philippines time on your device. MWF/TTH are expanded into the corresponding weekdays, and F2F notes are kept in event descriptions. Holiday exclusions are manual.

You can download the template from that dialog and import a compatible schedule JSON later. This is an additive calendar import, separate from Settings → Import workspace (which restores a complete backup). `npm run test:schedule` verifies the import UI against the production preview in an isolated browser context.

Graphics Designing (ITW 213) is scheduled Monday 1:00–2:00 PM in the current template. If the earlier Tue/Thu 1:00–2:30 PM template was imported, Calendar offers **Apply class change** with replacement counts and overlap warnings. It updates recognizable imported slots only and preserves unrelated events. Monday replacements are limited to dates present in the imported schedule, so excluded holidays and partial-week boundaries are respected.
