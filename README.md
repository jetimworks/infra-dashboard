# React + TypeScript + Vite Auth Template

A production-ready, reusable React template with a complete authentication flow against a Go/Chi backend.

## Tech Stack

- **Vite 6** + **React 18** + **TypeScript 5**
- **React Router v7** (data router API)
- **Tailwind CSS v4** (via `@tailwindcss/vite` plugin)
- **Axios** for HTTP
- **React Hook Form** + **Zod** for validation
- **lucide-react** for icons
- **sonner** for toast notifications

## Color Palette

| Token | Value | Usage |
|-------|-------|-------|
| Primary | `#2563eb` (blue-600) | Buttons, links, accents |
| Background | `#ffffff` (white) | Page background |
| Foreground | `#000000` (black) | Text, borders |

## Setup

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

## Environment Variables

Create a `.env` file (copy from `.env.example`):

```bash
VITE_API_URL=http://localhost:8080
```

| Variable | Default | Description |
|----------|---------|-------------|
| `VITE_API_URL` | `http://localhost:8080` | Backend API base URL |

## Folder Structure

```
src/
├── api/
│   ├── client.ts          # Axios instance + interceptors
│   ├── auth.ts            # Auth API calls
│   └── user.ts            # Profile / password API calls
├── auth/
│   ├── AuthProvider.tsx   # Context + provider
│   ├── useAuth.ts         # Hook
│   └── types.ts           # User, Tokens, etc.
├── components/
│   ├── ui/                # Button, Input, Card, Label, Spinner
│   └── layout/
│       ├── Navbar.tsx
│       └── ProtectedRoute.tsx
├── hooks/
│   └── useLocalStorage.ts
├── pages/
│   ├── Login.tsx
│   ├── Register.tsx
│   ├── Dashboard.tsx
│   ├── Profile.tsx
│   └── ChangePassword.tsx
├── lib/
│   └── utils.ts           # cn() helper
├── App.tsx
├── main.tsx
├── index.css
└── config.ts              # APP_NAME export
```

## Adding a New Protected Page

1. Create your page in `src/pages/YourPage.tsx`
2. Add the route in `src/App.tsx`:

```tsx
{
  element: <ProtectedRoute />,
  children: [
    // ...existing routes
    {
      path: "/your-page",
      element: <YourPage />,
    },
  ],
},
```

3. The page will automatically be protected and have access to the auth context.

## Rebranding

### 1. App Name

Edit `src/config.ts`:

```ts
export const APP_NAME = "Your App Name"
```

### 2. Colors

Edit the CSS variables in `src/index.css`:

```css
:root {
  --color-primary: 37 99 235;      /* Your primary color */
  --color-bg: 255 255 255;         /* Your background color */
  --color-fg: 0 0 0;               /* Your text color */
}
```

### 3. Update tailwind.config.ts if needed

The Tailwind config uses `theme.extend.colors` to expose `primary`, `bg`, and `fg` as utilities. If you change the variable names, update the config accordingly.

## API Endpoints

### Auth

| Method | Path | Description |
|--------|------|-------------|
| POST | `/auth/register` | Register new user |
| POST | `/auth/login` | Login |
| POST | `/auth/refresh` | Refresh tokens |
| POST | `/auth/logout` | Logout |

### User (auth required)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/users/profile` | Get profile |
| PUT | `/users/profile` | Update profile |
| PUT | `/users/password` | Change password |

## Development

```bash
# Development server
npm run dev

# Build for production
npm run build

# Lint
npm run lint
```
