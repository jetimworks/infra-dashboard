# Infra Dashboard

The customer-facing dashboard for **Infra by Jetimworks** — a calm, hand-holding control panel where non-technical customers manage their servers, databases, caches, and storage. Built for the [infra-backend](https://github.com/jetimworks/infra-backend) Go service.

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
│   ├── layout/         # AppShell, Sidebar, TopNav, Breadcrumb, UserMenu, AdminLayout,
│   │                   # ProtectedRoute, PublicRoute
│   └── theme/          # ThemeToggle
│
├── contexts/           # ThemeContext (light/dark)
├── hooks/              # useDebounce, useTimeAgo
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

- **Light-first.** Dark mode is a toggle, not a default.
- **Calm blue palette.** `primary` = blue-600, accent = teal-600.
- **Status colors.** `success` (green-600), `warning` (amber-600 — *not* red, calibrated for non-technical eyes), `danger` (red-600, reserved for data-loss / destructive ops).
- **Typography.** Inter (variable). Generous line-height, never cramped.
- **Shape.** `radius-md` = 10px, `radius-lg` = 14px.
- **Motion.** 150–250ms opacity/transform transitions. Cards lift on hover.
- **Voice.** Second person, short, plain English. Define jargon inline.
  - _"Web server health"_ instead of _"Project list"_.
  - _"We couldn't reach the server. Check your connection."_ instead of _"Error 500."_
- **Banned:** "leverage", "synergy", "robust", "enterprise-grade". No exclamation marks. No emojis.

All colors and shapes are defined as HSL triplets in `src/index.css` under `@theme`, with matching `:root` variables for alpha modifiers. Components reference tokens via Tailwind utilities (`bg-primary`, `text-fg-muted`, `border-border`, `bg-success-soft`). Never inline hex.

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

- Backend source of truth: `infra-backend/internal/rest/*.go`
- Bruno API collection: `~/Documents/bruno/infrastructure/`
- Plan document: `~/.claude/plans/linear-leaping-nest.md`