# Infra Dashboard

The customer-facing dashboard for **Infra by Jetimworks** — a calm, hand-holding control panel where non-technical customers manage their servers, databases, caches, and storage.

The UI is built around a single idea: **customers should feel at home and confident that their resources are safe with us.** Plain language. Generous whitespace. Clear status. No jargon unless we define it inline.

## Tech Stack

- **React 19** + **TypeScript** (with `erasableSyntaxOnly`)
- **Vite 8** for dev + build
- **Tailwind CSS 4** (CSS-first config via `@theme`)
- **React Router 7**
- **TanStack Query 5** for data fetching, mutations, polling, and devtools
- **react-hook-form** + **Zod** for forms and validation
- **sonner** for toasts
- **recharts** for time-series charts (route-level lazy-imported)
- **date-fns** for time formatting
- **lucide-react** for icons
- **@radix-ui/react-tooltip** for tooltips

## Quick start

```bash
# Install dependencies
npm install

# Start the dev server (port 5173)
npm run dev
# or:
./run.sh

# Type-check + production build
npm run build

# Lint
npm run lint
```

## Environment

Create a `.env` (copy from `.env.example`):

```bash
VITE_API_URL=http://localhost:8080
```

The dashboard expects the `infra-backend` service running on `VITE_API_URL` (default `http://localhost:8080`).

## Folder structure

```
src/
├── api/                # Typed wrappers for every backend endpoint
│   ├── client.ts       # Axios instance + single-flight refresh interceptor
│   ├── auth.ts         # login / register / refresh / logout
│   ├── projects.ts     # project CRUD
│   ├── instances.ts    # VPS / RDS / REDIS / STORAGE CRUD + SSH + system action
│   ├── metrics.ts      # latest + history metrics
│   ├── security.ts     # friendly check + admin audits (VPS + RDS)
│   ├── backups.ts      # list / trigger / restore
│   ├── actions.ts      # async action queue polling
│   ├── ssl.ts          # SSL renewal
│   ├── admin.ts        # staff-only user CRUD
│   ├── user.ts         # profile + password
│   ├── errors.ts       # ApiError + normalizeError
│   └── types.ts        # single source of truth for request/response shapes
│
├── auth/               # AuthProvider, useAuth hook, types
├── components/
│   ├── ui/             # Button, Card, Input, Field, Textarea, Badge, StatusPill,
│   │                   # EmptyState, ErrorState, LoadingState, ConfirmDialog,
│   │                   # Drawer, SegmentedControl, Tabs, Tooltip, Toast, Table, …
│   ├── data/           # MetricTile, ChartContainer, InstanceCard, BackupItem, …
│   ├── feedback/       # AsyncActionTracker, RequireAdmin, ErrorBoundary, PageStub
│   ├── layout/         # ConsoleShell, ConsoleTopBar, ConsoleNav, CommandPalette,
│   │                   # AppShell, AdminShell, Breadcrumb, UserMenu,
│   │                   # ProjectSelector, ProtectedRoute, PublicRoute
│   └── theme/          # ThemeToggle
│
├── contexts/           # ThemeContext (light/dark), ConsolePrefsContext
├── hooks/              # useDebounce, useTimeAgo, useConsolePrefs
├── lib/                # cn(), formatRelative, formatDate, formatBytes,
│                       # query-client, query-keys factory
├── pages/
│   ├── Login.tsx, Register.tsx, ForgotPassword.tsx, ChangePassword.tsx
│   ├── Dashboard.tsx
│   ├── ProjectsListPage.tsx, ProjectDetailPage.tsx
│   ├── InstancesListPage.tsx, InstanceDetailPage.tsx,
│   │   InstanceMetricsPage.tsx, InstanceSecurityPage.tsx,
│   │   InstanceBackupsPage.tsx
│   ├── ActivityPage.tsx, AccountPage.tsx, SupportPage.tsx, NotFoundPage.tsx
│   └── admin/          # AdminOverviewPage, AdminUsersPage, AdminProjectsPage,
│                       # AdminInstancesListPage, AdminInstanceCreatePage,
│                       # AdminInstanceEditPage, AdminInstanceSshKeyPage,
│                       # AdminInstanceSystemActionPage, AdminSecurityAuditsPage
│
├── queries/            # TanStack Query hooks (one file per resource)
├── App.tsx             # router
├── main.tsx            # QueryClientProvider + Devtools
├── index.css           # Tailwind 4 theme + design tokens
└── config.ts           # APP_NAME / APP_FULL_NAME
```

## Design system

The interface is a **console** — a Graphite app bar, a grouped nav rail, a context
bar, and hairline-bordered content panels on a light canvas. Google Console / AWS
Console in feel, but far simpler, and written for someone who does not work with
servers for a living.

- **Light-first.** Dark mode is a toggle, not a default.
- **Console chrome.** `ConsoleShell` owns three layers: a fixed graphite app bar
  (full viewport width), a nav rail below it, and a context bar (project selector +
  breadcrumb) over the content column. `ConsoleNav` collapses to a 64px icon rail;
  the state persists in `localStorage`.
- **Calm blue palette, teal admin accent.** `primary` for links, primary actions and
  the customer console; `accent` (teal) marks the staff console's chrome.
- **Status colors.** `success` (green), `warning` (amber — *not* red, calibrated for
  non-technical eyes), `danger` (red, reserved for data-loss / destructive ops).
- **Typography.** Overpass for UI and body, Archivo for headings and uppercase
  micro-labels, JetBrains Mono for machine identifiers only (hosts, IDs, paths).
- **Shape.** `radius-md` = 6px, `radius-lg` = 8px. Cards use a 1px hairline border,
  not a drop shadow. Shadows are for overlays only.
- **Motion.** 150–250ms opacity/transform transitions. Cards lift on hover.
- **Voice.** Second person, short, plain English. Define jargon inline.
  - _"Web server health"_ instead of _"Project list"_.
  - _"We couldn't reach the server. Check your connection."_ instead of _"Error 500."_
- **Banned:** "leverage", "synergy", "robust", "enterprise-grade". No exclamation marks.
  No emojis. No gradient text. No coloured side-stripe accents.

### Tokens

`src/index.css` is the only place colours are defined. The **raw** vars live in
`:root` and `html.dark`; the `@theme inline` block is a pure alias map, so every
Tailwind utility compiles to `var(--token)` and re-themes itself when the raw var
changes. One namespace, so light and dark cannot drift apart.

Colours are **OKLCH** (perceptually uniform) with the neutrals tinted toward the
brand hue. Components reference tokens via Tailwind utilities (`bg-primary`,
`text-fg-muted`, `border-border`, `bg-success-soft`). Never inline hex.

Type sizes use the named scale — `text-micro`, `text-caption`, `text-body`,
`text-lead`, `text-2xl`. `cn()` is configured with `extendTailwindMerge` so
tailwind-merge knows these are sizes and does not strip them when a text colour
follows.

### Explaining things to non-technical people

- **Explain mode** (the lightbulb in the app bar) reveals the plain-English
  definition that normally sits behind a hover. The wording already exists in
  `METRIC_HELP` (`InstanceDetailPage.tsx`) and the metric catalogue
  (`InstanceMetricsPage.tsx`).
- **⌘K command palette** searches pages, projects and servers. It reads data the
  app has already fetched — no extra requests.
- Empty states teach; they never just say "nothing here".

## Async actions

Every backend op that returns a 202 (backup trigger, backup restore, SSL renewal, system action) is tracked through `AsyncActionTracker`:

- Polls the action queue every 2s until terminal state (or 10s after a 5-minute timeout).
- Backdrop does not dismiss while pending/running.
- "Stop waiting" un-mounts the tracker — the action continues server-side.
- On `SUCCESS`: invalidates the relevant queries and toasts.

## Admin views

`/admin/*` is gated by `RequireAdmin` (redirects non-staff to `/dashboard` with a toast).

| Route | What |
|---|---|
| `/admin` | Stat tiles + by-type breakdown + recent activity |
| `/admin/users` | List + Add user drawer (auto-generates password) |
| `/admin/projects` | List + New project drawer |
| `/admin/instances` | List + type filter + search |
| `/admin/instances/new` | Type wizard → VPS or local-service creation |
| `/admin/instances/:id/edit` | Edit details + deactivate + delete |
| `/admin/instances/:id/ssh-key` | Upload / view / copy SSH public key |
| `/admin/instances/:id/system-action` | `systemctl` action + stdout/stderr |
| `/admin/security-audits` | VPS + RDS audit drawer (raw JSON + summary) |

## Scripts

```bash
npm run dev        # Vite dev server (HMR)
npm run build      # tsc -b && vite build
npm run preview    # Serve dist/
npm run lint       # ESLint (React 19 purity rules enforced)
```

## Adding a new page

1. Create the page in `src/pages/`.
2. If it needs data, add a typed wrapper to `src/api/*.ts` and a hook to `src/queries/*.ts`.
3. Add the route in `src/App.tsx`.
4. If it's staff-only, wrap the route in `<RequireAdmin>`.

## Reference

- Bruno API collection: `~/Documents/bruno/infrastructure/`
- Plan document: `~/.claude/plans/linear-leaping-nest.md`