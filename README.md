# Accounts Web

React SPA front-end for the accounts-project. Built with Vite, TypeScript, and Material UI.

## Overview

Single-page application that provides the user interface for the multi-workspace accounting system. Communicates with backend services through a Vite dev proxy.

### Tech Stack

- **React 18** + **TypeScript**
- **Vite** -- build tool and dev server
- **Material UI (MUI)** -- component library
- **TanStack React Query** -- server state management
- **Zustand** -- client state management
- **React Router** -- routing
- **react-i18next** -- internationalization (EN/ES)
- **openapi-fetch** + **openapi-typescript** -- type-safe API client generated from OpenAPI specs

## Prerequisites

- **Node.js 20+**
- **npm**
- Backend services running (or at least the ones you need to test against)

## Setup

```bash
npm install
```

## Development

```bash
npm run dev
```

Opens at http://localhost:5173. The Vite dev server proxies API requests:

| Path | Target | Service |
|---|---|---|
| `/api/command/*` | `http://localhost:8081` | accounts-command-service |
| `/api/query/*` | `http://localhost:8082` | accounts-query-service |
| `/api/workspace/*` | `http://localhost:8083` | workspace-service |

## Build

```bash
npm run build
```

Output goes to `dist/`.

## Run Tests

```bash
npm test
```

Tests use **Vitest** + **React Testing Library** + **jsdom**.

## Generate API Types

```bash
npm run generate:api
```

Generates TypeScript types from the OpenAPI specs in [`accounts/docs/api/`](../accounts/docs/api/).

## Project Structure

```
src/
  components/   # Reusable UI components
  pages/        # Page-level components (routed)
  api/          # API client and generated types
  hooks/        # Custom React hooks
  i18n/         # Internationalization (EN/ES)
  store/        # Zustand stores
  types/        # TypeScript type definitions
```

## Related Repositories

- Consumes APIs from [`accounts-command-service`](../accounts-command-service), [`accounts-query-service`](../accounts-query-service), and [`workspace-service`](../workspace-service)
- API contracts defined in [`accounts/docs/api/`](../accounts/docs/api/)

Part of [accounts-project](../accounts). See the [main README](../accounts/README.md) for the full system architecture.
