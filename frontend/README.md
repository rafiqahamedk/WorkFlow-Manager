# WorkFlow Manager — Frontend

React 18 + Vite + TailwindCSS single-page application for the WorkFlow Manager platform. Provides the full UI for building workflows, managing steps and rules, executing workflows, and monitoring results in real time.

**Live URL:** `https://work-flow-manager-4dle.vercel.app`

---

## Table of Contents

- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Environment Variables](#environment-variables)
- [Local Setup](#local-setup)
- [Vite Config and Dev Proxy](#vite-config-and-dev-proxy)
- [Routing](#routing)
- [AuthContext](#authcontext)
- [API Client](#api-client)
- [Pages](#pages)
- [Components](#components)
- [Deployment to Vercel](#deployment-to-vercel)

---

## Tech Stack

| Package | Version | Purpose |
|---|---|---|
| react | ^18.2 | UI component tree |
| react-dom | ^18.2 | DOM rendering |
| react-router-dom | ^6.22 | Client-side routing |
| axios | ^1.6 | HTTP client with interceptors |
| @dnd-kit/core | ^6.1 | Drag-and-drop primitives |
| @dnd-kit/sortable | ^8.0 | Sortable list abstraction |
| @dnd-kit/utilities | ^3.2 | CSS transform utilities |
| vite | ^5.1 | Dev server + production bundler |
| tailwindcss | ^3.4 | Utility-first CSS framework |
| @vitejs/plugin-react | ^4.2 | Vite React plugin (Fast Refresh) |

---

## Project Structure

```
frontend/
├── src/
│   ├── api/
│   │   └── client.js              # Axios instance + all API call exports
│   ├── components/
│   │   ├── AddStepModal.jsx        # Step type selector + approver email input
│   │   ├── ExecuteModal.jsx        # Dynamic input form from workflow schema
│   │   ├── InputSchemaEditor.jsx   # Field builder for workflow input schema
│   │   ├── NotificationBell.jsx    # Bell icon + unread badge + dropdown panel
│   │   ├── RuleEditor.jsx          # Drag-to-reorder rule builder
│   │   ├── StepCard.jsx            # Inline step edit + collapsible rules panel
│   │   └── Toggle.jsx              # Active/inactive toggle switch
│   ├── context/
│   │   └── AuthContext.jsx         # JWT state + login / logout helpers
│   ├── pages/
│   │   ├── LandingPage.jsx         # Public marketing page
│   │   ├── SignIn.jsx              # Login form
│   │   ├── SignUp.jsx              # Registration form
│   │   ├── WorkflowList.jsx        # Searchable, paginated workflow table
│   │   ├── WorkflowEditor.jsx      # Create / edit workflow + input schema
│   │   ├── StepsPage.jsx           # Add and manage steps (wizard step 2)
│   │   ├── RulesPage.jsx           # Configure routing rules (wizard step 3)
│   │   ├── StepsRulesPage.jsx      # Combined steps + rules view
│   │   ├── ExecutionView.jsx       # Live logs + approval UI + auto-polling
│   │   └── AuditLog.jsx            # Full execution history with stats
│   ├── App.jsx                     # Route definitions + AppLayout
│   ├── main.jsx                    # React root mount
│   └── index.css                   # Tailwind directives + global styles
├── index.html
├── vercel.json                     # SPA rewrite rules
├── vite.config.js                  # Dev proxy + build config
├── tailwind.config.js
├── postcss.config.js
└── package.json
```

---

## Environment Variables

For local development, no environment variables are needed — the Vite proxy handles all API routing automatically.

For production (Vercel), set one variable in the Vercel dashboard:

```env
VITE_API_URL=https://workflow-manager-api.onrender.com
```

This is read in `src/api/client.js` as `import.meta.env.VITE_API_URL`. When not set (local dev), the Axios base URL defaults to `/`, which the Vite proxy forwards to `localhost:5000`.

---

## Local Setup

```bash
cd frontend
npm install
npm run dev
# UI runs on http://localhost:3000
```

The backend must also be running on `http://localhost:5000` for API calls to work. See `backend/README.md` for backend setup.

Other available scripts:

```bash
npm run build    # production build → dist/
npm run preview  # preview the production build locally
```

---

## Vite Config and Dev Proxy

`vite.config.js` sets the dev server port to `3000` and proxies all API paths to the backend:

```js
proxy: {
  '/auth':          'http://localhost:5000',
  '/workflows':     'http://localhost:5000',
  '/steps':         'http://localhost:5000',
  '/rules':         'http://localhost:5000',
  '/executions':    'http://localhost:5000',
  '/notifications': 'http://localhost:5000',
  '/approve':       'http://localhost:5000',
}
```

This means during development, a request to `/workflows` from the browser is transparently forwarded to `http://localhost:5000/workflows` — no CORS issues, no need to set `VITE_API_URL` locally.

---

## Routing

`App.jsx` defines all routes using React Router v6.

Public routes (no auth required):

| Path | Component |
|---|---|
| `/` | `LandingPage` |
| `/signin` | `SignIn` |
| `/signup` | `SignUp` |

Protected routes (wrapped in `ProtectedRoute` + `AppLayout`):

| Path | Component |
|---|---|
| `/workflows` | `WorkflowList` |
| `/workflows/new` | `WorkflowEditor` |
| `/workflows/:id/edit` | `WorkflowEditor` |
| `/workflows/:id/steps` | `StepsPage` |
| `/workflows/:id/steps-rules` | `StepsRulesPage` |
| `/workflows/:id/rules` | `RulesPage` |
| `/executions/:id` | `ExecutionView` |
| `/audit` | `AuditLog` |

`ProtectedRoute` reads `isAuthenticated` from `AuthContext`. If not authenticated, it redirects to `/signin`. While auth state is loading, it renders nothing to avoid a flash.

`AppLayout` renders the sticky top navigation bar (logo, nav links, notification bell, user dropdown) and wraps the page content in a centered container.

---

## AuthContext

`src/context/AuthContext.jsx` — provides authentication state to the entire app via React Context.

State stored in `localStorage`:
- `wfm_token` — JWT string
- `wfm_user` — serialized user object `{ _id, username, email }`

Exported values from `useAuth()`:

| Value | Type | Description |
|---|---|---|
| `user` | Object | `{ _id, username, email }` or null |
| `isAuthenticated` | Boolean | true if token exists |
| `loading` | Boolean | true during initial hydration |
| `login(token, user)` | Function | Stores token + user, updates state |
| `logout()` | Function | Clears localStorage + state |

The `loading` flag prevents `ProtectedRoute` from redirecting before the stored token has been read from `localStorage` on first render.

---

## API Client

`src/api/client.js` — a configured Axios instance with all API call exports.

The instance is created with `baseURL: import.meta.env.VITE_API_URL || '/'`. In production, `VITE_API_URL` points to the Render backend. In development, `/` is proxied by Vite.

### Request interceptor

Reads `wfm_token` from `localStorage` and attaches it as `Authorization: Bearer <token>` on every outgoing request.

### Response interceptor

On a `401` response:
- Skips public paths (`/`, `/signin`, `/signup`)
- Clears `wfm_token` and `wfm_user` from `localStorage`
- Uses `window.history.pushState` + `PopStateEvent` to navigate to `/signin` without a hard page reload — React Router picks up the navigation cleanly

### Exported functions

```js
// Auth
register(data)          // POST /auth/register
login(data)             // POST /auth/login

// Workflows
getWorkflows(params)    // GET  /workflows
getWorkflow(id)         // GET  /workflows/:id
createWorkflow(data)    // POST /workflows
updateWorkflow(id,data) // PUT  /workflows/:id
deleteWorkflow(id)      // DELETE /workflows/:id

// Steps
getSteps(workflowId)           // GET  /workflows/:id/steps
createStep(workflowId, data)   // POST /workflows/:id/steps
updateStep(id, data)           // PUT  /steps/:id
deleteStep(id)                 // DELETE /steps/:id

// Rules
getRules(stepId)               // GET  /steps/:id/rules
createRule(stepId, data)       // POST /steps/:id/rules
updateRule(id, data)           // PUT  /rules/:id
deleteRule(id)                 // DELETE /rules/:id

// Executions
executeWorkflow(workflowId, data) // POST /workflows/:id/execute
getExecution(id)                  // GET  /executions/:id
getExecutions(params)             // GET  /executions
cancelExecution(id)               // POST /executions/:id/cancel
retryExecution(id)                // POST /executions/:id/retry
approveStep(id, data)             // POST /executions/:id/approve

// Notifications
getNotifications()          // GET    /notifications
markNotificationsRead()     // POST   /notifications/read-all
clearNotifications()        // DELETE /notifications
```

---

## Pages

### LandingPage
Public marketing page. Shows the product name, tagline, and links to Sign In / Sign Up. No auth required.

### SignIn / SignUp
Authentication forms. On success, call `login()` from `AuthContext` to store the token and navigate to `/workflows`.

### WorkflowList
Searchable, paginated table of the current user's workflows. Each row shows name, version, status (active/inactive toggle), and action buttons (edit, steps, execute, delete). The execute button opens `ExecuteModal`.

### WorkflowEditor
Create or edit a workflow. Fields: name, description, active toggle, and an `InputSchemaEditor` for defining the input schema. On create, navigates to `/workflows/:id/steps` to continue the wizard.

### StepsPage
Wizard step 2. Lists existing steps for the workflow and provides an "Add Step" button that opens `AddStepModal`. Each step is rendered as a `StepCard`.

### RulesPage
Wizard step 3. Shows all steps for the workflow. Each step has a `RuleEditor` for adding and reordering rules.

### StepsRulesPage
Combined view showing both steps and their rules on one page. Used as an alternative to the two-page wizard flow.

### ExecutionView
Detailed view of a single execution. Shows:
- Status badge, timestamps, triggered-by, workflow version
- Per-step log cards with rule evaluation results
- Approval UI when a step is pending and no email token is active
- "Waiting for Email" panel when an approval token is still valid
- Approval history section
- Auto-polls every 4 seconds while an approval is pending — stops when resolved

### AuditLog
Full execution history table for the current user. Stats panel at the top shows total, completed, failed, and running counts. Click any row to navigate to `ExecutionView`.

---

## Components

### NotificationBell
Bell icon in the app header. Polls `/notifications` every 8 seconds. Shows an unread count badge (capped at 99). On click, opens a dropdown panel with the latest 50 notifications. Unread items are highlighted. Opening the dropdown marks all as read. Clicking a notification navigates to the relevant execution. "Clear all" button removes all notifications.

### AddStepModal
Modal for adding a new step. Shows three step type cards (Task, Approval, Notification) with icon, label, and description. Selecting "Approval" reveals an `approver_email` input field. Submits to `createStep()`.

### StepCard
Displays a single step inline. Shows step type icon, name, order, and approver email (if set). Supports inline editing of name and type. Has a collapsible rules panel that renders a `RuleEditor` for that step.

### RuleEditor
Drag-to-reorder list of rules for a step, built with `@dnd-kit/sortable`. Each rule row has: condition input, next step selector (dropdown of other steps in the workflow), priority input, and a delete button. Supports adding new rules inline.

### ExecuteModal
Dynamic form generated from the workflow's `input_schema`. Renders the correct input type for each field (`text`, `number`, `checkbox`). Validates required fields before submitting. Calls `executeWorkflow()` and navigates to the new execution on success.

### InputSchemaEditor
Field builder used inside `WorkflowEditor`. Allows adding, editing, and removing schema fields. Each field has: name, type (`string` / `number` / `boolean`), required toggle, and an optional comma-separated allowed values list.

### Toggle
Controlled toggle switch component. Accepts `checked` and `onChange` props. Used for the workflow `is_active` field.

---

## Deployment to Vercel

1. Import the repo on [vercel.com](https://vercel.com)
2. Set the root directory to `frontend`
3. Add the environment variable:

| Variable | Value |
|---|---|
| `VITE_API_URL` | `https://workflow-manager-api.onrender.com` |

4. Deploy

`vercel.json` contains a catch-all rewrite rule that sends all paths to `index.html`, enabling React Router to handle client-side navigation correctly on direct URL access and page refreshes:

```json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```

Without this, refreshing a page like `/workflows/abc/steps` would return a 404 from Vercel's CDN.
