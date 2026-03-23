# WorkFlow Manager

A full-stack workflow automation platform that lets you design, execute, and monitor multi-step business processes with conditional routing, email-based human approvals, real-time execution tracking, and a dual-channel notification system.

## Overview

WorkFlow Manager is a full-stack web application that enables users to build and automate multi-step business workflows without writing code. Users can define workflows with a typed input schema, attach sequential steps of three types — task, approval, and notification — and configure conditional routing rules between them using a simple expression language.

When a workflow is executed, the engine traverses each step automatically. Task and notification steps resolve instantly based on rule evaluation. Approval steps pause the execution and send a secure HTML email to the designated approver, who can accept or decline directly from the email using one-time tokenized links. Once acted upon, the workflow resumes from where it left off.

Every execution is fully persisted to MongoDB at each step, making it safe to resume after server restarts or approval delays. All workflow events — completions, failures, approvals, rejections — trigger simultaneous in-app bell notifications and emails to the workflow owner.

The frontend is a React 18 single-page application with a guided 3-step wizard for building workflows, a live execution view with auto-polling, a full audit log, and a real-time notification bell. The backend is a Node.js + Express REST API with JWT authentication, Zod validation, and a custom rule engine that supports comparisons, logical operators, string functions, and a DEFAULT fallback.

## 🎥 Demo Video

[Watch Demo](./demo.mp4)

---

## Sub-READMEs

- [backend/README.md](./backend/README.md) — backend setup, engine internals, models, middleware, Render deployment
- [frontend/README.md](./frontend/README.md) — frontend setup, routing, components, API client, Vercel deployment

---

## Table of Contents

- [Features](#features)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Core Concepts](#core-concepts)
- [Workflow Engine](#workflow-engine)
- [Email Approval System](#email-approval-system)
- [Notification System](#notification-system)
- [API Reference](#api-reference)
- [Local Development](#local-development)
- [Deployment](#deployment)
- [Environment Variables](#environment-variables)
- [Sample Workflow](#sample-workflow)
- [Conclusion](#conclusion)
- [License](#license)

---

## Features

### Workflow Builder
- Create named, versioned workflows with an optional typed input schema
- Define fields as `string`, `number`, or `boolean` with required flags and allowed value constraints
- Enable or disable workflows with a live toggle — inactive workflows cannot be executed
- Every save increments the version number, and executions record which version they ran against

### Step Designer
- Three step types with distinct behavior:
  - **Task** — auto-executes and moves to the next step based on rules
  - **Approval** — pauses execution, sends an email to the assigned approver, and waits for a response
  - **Notification** — auto-executes and semantically represents an alert or message event
- Steps are ordered and can be edited or deleted inline
- Approval steps accept an `approver_email` field that drives the email delivery

### Rule Engine
- Attach conditional rules to any step to control routing
- Rules are evaluated in priority order — the first match wins
- Supports comparisons (`==`, `!=`, `<`, `>`, `<=`, `>=`), logical operators (`&&`, `||`), and string functions (`contains`, `startsWith`, `endsWith`)
- A `DEFAULT` keyword acts as a guaranteed fallback
- Drag-and-drop reordering of rules in the UI via `@dnd-kit`

### Execution Engine
- Start a workflow execution by submitting input data validated against the workflow's schema
- The engine traverses steps automatically, evaluating rules at each node
- Execution state is persisted to MongoDB at every step — safe to resume after interruption
- Full per-step logs including rule evaluation results, selected next step, timestamps, and error messages
- Cancel in-progress executions or retry failed ones from the UI

### Email Approval System
- When an approval step is reached, a secure HTML email is sent to the approver
- The email contains the workflow name, step name, full input data, and two action buttons: **Accept Task** and **Decline Task**
- Each link carries a cryptographically random 64-char token with a 10-minute expiry
- Tokens are one-time use — invalidated immediately on click
- Links use the public `BACKEND_URL` so they work from any device on any network
- Clicking a link returns a styled confirmation page and automatically resumes the workflow

### Notification System
- Every significant workflow event triggers a notification in two places simultaneously:
  - **In-app bell icon** — persisted to MongoDB, shown in a dropdown panel
  - **Email** — sent to the workflow owner's registered address
- Events covered: workflow completed, workflow failed, approval required, task approved, task rejected
- The bell icon shows an unread count badge and polls every 8 seconds
- Notifications are marked as read when the dropdown is opened
- Clicking a notification navigates directly to the execution

### Authentication & Authorization
- JWT-based authentication with 7-day token expiry
- Passwords hashed with bcrypt
- All workflow, execution, and notification data is scoped to the authenticated user — users cannot see each other's data
- 401 responses automatically redirect to the sign-in page without a hard reload

### Audit Log
- Full execution history table with status, triggered-by, start time, end time, and version
- Click any row to view the detailed execution log
- Stats panel showing total, completed, failed, and running counts

### UI / UX
- Dark theme throughout with a consistent design system built on TailwindCSS
- 3-step guided wizard for building a workflow: Details → Steps → Rules
- Inline editing for steps and rules — no separate pages needed
- User dropdown menu in the header with avatar initials
- Responsive layout that works on desktop and mobile browsers

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT (Browser)                         │
│                                                                 │
│   React 18 + Vite + TailwindCSS + React Router + Axios         │
│                                                                 │
│   Pages: WorkflowList │ WorkflowEditor │ StepsPage             │
│          RulesPage    │ ExecutionView  │ AuditLog              │
│                                                                 │
│   Components: NotificationBell │ AddStepModal │ StepCard       │
│               RuleEditor       │ ExecuteModal │ Toggle         │
└────────────────────────┬────────────────────────────────────────┘
                         │ HTTPS (Axios + JWT Bearer)
                         │
┌────────────────────────▼────────────────────────────────────────┐
│                    BACKEND (Render)                             │
│                                                                 │
│   Express.js REST API — Node.js ESM                            │
│                                                                 │
│   ┌─────────────┐  ┌──────────────┐  ┌──────────────────────┐ │
│   │  Auth       │  │  Middleware  │  │  Error Handler       │ │
│   │  JWT+bcrypt │  │  authMiddle  │  │  Zod validation      │ │
│   └─────────────┘  └──────────────┘  └──────────────────────┘ │
│                                                                 │
│   Routes:                                                       │
│   POST /auth/register   POST /auth/login                       │
│   /workflows  /steps  /rules  /executions  /notifications      │
│   GET  /approve  (public — email approval links)               │
│                                                                 │
│   ┌──────────────────────────────────────────────────────────┐ │
│   │               Workflow Engine                            │ │
│   │                                                          │ │
│   │  workflowExecutor.js                                     │ │
│   │  ┌──────────┐   ┌──────────┐   ┌──────────────────────┐ │ │
│   │  │  task    │   │ approval │   │   notification       │ │ │
│   │  │ auto-run │   │  pause + │   │     auto-run         │ │ │
│   │  │          │   │  email   │   │                      │ │ │
│   │  └────┬─────┘   └────┬─────┘   └──────────┬───────────┘ │ │
│   │       │              │                     │             │ │
│   │       └──────────────▼─────────────────────┘             │ │
│   │                 ruleEngine.js                             │ │
│   │         (priority-ordered condition eval)                 │ │
│   └──────────────────────────────────────────────────────────┘ │
│                                                                 │
│   Services:                                                     │
│   emailService.js        — Nodemailer (Gmail SMTP)             │
│   notificationService.js — DB write + email trigger            │
└────────────────────────┬────────────────────────────────────────┘
                         │ Mongoose ODM
                         │
┌────────────────────────▼────────────────────────────────────────┐
│                  MongoDB Atlas                                   │
│                                                                 │
│   Collections:                                                  │
│   users │ workflows │ steps │ rules │ executions │ notifications│
└─────────────────────────────────────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────────────┐
│                  Gmail SMTP                                      │
│   Approval emails with Accept / Decline links                   │
│   Notification emails for all workflow events                   │
└─────────────────────────────────────────────────────────────────┘
```

### Request Flow

```
User Action (UI)
      │
      ▼
React Page / Component
      │  axios + JWT Bearer token
      ▼
Express Route
      │
      ▼
authMiddleware  →  verify JWT, attach req.user
      │
      ▼
Controller  →  validate input (Zod), query MongoDB
      │
      ▼
Mongoose Model (MongoDB Atlas)
      │
      ▼  (on execution start or approval action)
workflowExecutor.js
      │
      ├──▶ ruleEngine.js          evaluate conditions → next step ID
      │
      ├──▶ emailService.js        send approval or notification email
      │
      └──▶ notificationService.js persist notification + trigger email
```

---

## Tech Stack

| Layer | Technology | Purpose |
|---|---|---|
| Frontend | React 18 | UI component tree |
| Frontend | Vite | Dev server + production bundler |
| Frontend | TailwindCSS | Utility-first styling |
| Frontend | React Router v6 | Client-side routing |
| Frontend | Axios | HTTP client with interceptors |
| Frontend | @dnd-kit | Drag-and-drop rule reordering |
| Backend | Node.js (ESM) | JavaScript runtime |
| Backend | Express.js | REST API framework |
| Backend | Zod | Request schema validation |
| Database | MongoDB Atlas | Document store |
| Database | Mongoose | ODM + schema enforcement |
| Auth | jsonwebtoken | JWT signing and verification |
| Auth | bcryptjs | Password hashing |
| Email | Nodemailer | SMTP email delivery |
| Email | Gmail SMTP | Email transport |
| Deploy (FE) | Vercel | Frontend hosting + SPA rewrites |
| Deploy (BE) | Render | Backend hosting + env management |

---

## Project Structure

```
WorkFlow-Manager/
├── backend/
│   ├── src/
│   │   ├── controllers/
│   │   │   ├── auth.controller.js        # register / login
│   │   │   ├── workflow.controller.js    # CRUD + per-user scoping
│   │   │   ├── step.controller.js        # step CRUD
│   │   │   ├── rule.controller.js        # rule CRUD
│   │   │   ├── execution.controller.js   # start / cancel / retry / approve
│   │   │   ├── approve.controller.js     # public email approval handler
│   │   │   └── notification.controller.js
│   │   ├── engine/
│   │   │   ├── workflowExecutor.js       # step traversal loop
│   │   │   └── ruleEngine.js             # condition evaluator
│   │   ├── middleware/
│   │   │   ├── auth.js                   # JWT verification
│   │   │   ├── validate.js               # Zod request validation
│   │   │   ├── schemas.js                # Zod schemas
│   │   │   └── errorHandler.js
│   │   ├── models/
│   │   │   ├── User.js
│   │   │   ├── Workflow.js
│   │   │   ├── Step.js
│   │   │   ├── Rule.js
│   │   │   ├── Execution.js
│   │   │   └── Notification.js
│   │   ├── routes/
│   │   │   ├── auth.routes.js
│   │   │   ├── workflow.routes.js
│   │   │   ├── step.routes.js
│   │   │   ├── rule.routes.js
│   │   │   ├── execution.routes.js
│   │   │   └── notification.routes.js
│   │   ├── services/
│   │   │   ├── emailService.js           # Nodemailer transporter + HTML templates
│   │   │   └── notificationService.js    # DB write + email trigger
│   │   ├── seed.js                       # Sample data seeder
│   │   └── index.js                      # Express app entry point
│   ├── .env
│   ├── .env.example
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── api/
│   │   │   └── client.js                 # Axios instance + all API call exports
│   │   ├── components/
│   │   │   ├── AddStepModal.jsx          # Step type selector + approver email input
│   │   │   ├── ExecuteModal.jsx          # Dynamic input form generated from schema
│   │   │   ├── InputSchemaEditor.jsx     # Field builder for workflow input schema
│   │   │   ├── NotificationBell.jsx      # Bell icon + unread badge + dropdown panel
│   │   │   ├── RuleEditor.jsx            # Drag-to-reorder rule builder
│   │   │   ├── StepCard.jsx              # Inline step edit + collapsible rules panel
│   │   │   └── Toggle.jsx                # Active/inactive toggle switch
│   │   ├── context/
│   │   │   └── AuthContext.jsx           # JWT state management + login / logout
│   │   ├── pages/
│   │   │   ├── LandingPage.jsx           # Public marketing page
│   │   │   ├── SignIn.jsx
│   │   │   ├── SignUp.jsx
│   │   │   ├── WorkflowList.jsx          # Searchable, paginated workflow table
│   │   │   ├── WorkflowEditor.jsx        # Create / edit workflow + input schema
│   │   │   ├── StepsPage.jsx             # Wizard step 2 — add and manage steps
│   │   │   ├── RulesPage.jsx             # Wizard step 3 — configure routing rules
│   │   │   ├── StepsRulesPage.jsx        # Combined steps + rules view
│   │   │   ├── ExecutionView.jsx         # Live logs + approval UI + auto-polling
│   │   │   └── AuditLog.jsx              # Full execution history with stats
│   │   ├── App.jsx                       # Route definitions + AppLayout with bell + user menu
│   │   ├── main.jsx
│   │   └── index.css
│   ├── vercel.json                       # SPA rewrite rules
│   ├── vite.config.js                    # Dev proxy + build config
│   └── package.json
│
├── render.yaml                           # Render deployment config
├── .gitignore
└── README.md
```

---

## Core Concepts

### Entities

**Workflow** — a named, versioned process with an optional input schema. Each workflow belongs to the user who created it. Workflows are isolated per user — no cross-user visibility.

**Step** — a single node in the workflow graph. Three types:
- `task` — auto-executes, moves to next step via rules
- `approval` — pauses execution, sends email to `approver_email`, waits for accept/reject
- `notification` — auto-executes like a task, semantically represents an alert

**Rule** — a condition attached to a step that determines the next step. Evaluated in priority order (1 = highest). A `DEFAULT` rule acts as a guaranteed fallback.

**Execution** — a runtime instance of a workflow. Stores full step logs, input data, approval history, and current status. Persisted at every step so it can survive server restarts.

**Notification** — an in-app and email alert generated for every significant workflow event, scoped to the workflow owner.

### Data Models

```
User
  username, email, passwordHash

Workflow
  name, description, version, is_active
  input_schema: { fieldName: { type, required, allowed_values } }
  start_step_id, created_by → User

Step
  workflow_id, name, step_type, order, approver_email

Rule
  step_id, condition, next_step_id, priority

Execution
  workflow_id, workflow_version, status, data
  logs[]          → per-step records with rule eval results
  current_step_id, triggered_by, started_at, ended_at
  approval_token, approval_token_expires_at, approval_token_step_id
  approval_history[]  → { step_id, step_name, approver_email, action, timestamp }
  retries

Notification
  user_id, user_email, message, type, execution_id, read
```

### Execution Statuses

| Status | Meaning |
|---|---|
| `pending` | Created, not yet started |
| `in_progress` | Currently running or paused at an approval step |
| `completed` | All steps finished successfully |
| `failed` | A step failed or was rejected |
| `canceled` | Manually canceled by the user |

---

## Workflow Engine

### Execution Loop (`workflowExecutor.js`)

```
runExecution(executionId)
  │
  ├── Load execution + workflow + owner user
  │
  └── while (currentStepId && iterations < 50)
        │
        ├── Find step by ID
        │
        ├── Skip if already completed (resume support)
        │
        ├── [task / notification]
        │     ├── Evaluate rules → find next step ID
        │     ├── Log step as completed with timestamps
        │     └── Advance to next step
        │
        ├── [approval]
        │     ├── Log step as in_progress
        │     ├── Generate crypto.randomBytes(32) token
        │     ├── Store token + 10-min expiry on execution
        │     ├── Send approval email with Accept / Decline links
        │     ├── Fire "approval required" notification to owner
        │     └── PAUSE — return execution (resume on approve/reject)
        │
        └── [end — no more steps]
              ├── status = completed
              └── Fire "workflow completed" notification
```

### Rule Engine (`ruleEngine.js`)

Rules are evaluated in ascending priority order. The first matching rule wins. If no rule matches and there is no `DEFAULT`, the execution fails with a clear error.

Supported syntax:

```
# Comparisons
amount > 100
country == "US"
priority != "Low"
score >= 90

# Logical operators
amount > 100 && country == "US"
priority == "High" || priority == "Medium"

# String functions
contains(department, "Finance")
startsWith(country, "U")
endsWith(email, ".com")

# Guaranteed fallback
DEFAULT
```

### Resume After Approval

When an approver clicks Accept or Reject in the email:

```
GET /approve?executionId=&action=approve&token=
  │
  ├── Validate: token exists, matches stored value, not expired
  ├── Invalidate token immediately (one-time use)
  ├── Update step log: status = completed (approve) or failed (reject)
  ├── Append record to approval_history
  ├── Evaluate rules on the approval step → find next step ID
  ├── Call runExecution() to resume from next step
  ├── Fire "task approved / rejected" notification to owner
  └── Return styled HTML confirmation page to approver
```

The same logic applies when approving via the UI (`POST /executions/:id/approve`), with the addition of invalidating any pending email token to prevent double-processing.

### Loop Protection

The executor enforces a maximum of 50 iterations per execution. If this limit is reached, the execution is marked as `failed` with the message "Max iterations reached — possible infinite loop".

---

## Email Approval System

Every `approval` step with an `approver_email` configured will:

1. Generate a 64-character hex token using `crypto.randomBytes(32)`
2. Store the token and a 10-minute expiry timestamp on the execution document
3. Send a styled HTML email to the approver containing:
   - Workflow name and step name
   - Full input data as a formatted table and JSON block
   - **Accept Task** button (green) and **Decline Task** button (red)
   - A warning that links expire in 10 minutes
4. The links point to `BACKEND_URL/approve?executionId=...&action=...&token=...`
5. On click, the token is validated and immediately invalidated (one-time use)
6. Expired links return a clear error page — no silent failures
7. The approver sees a styled confirmation page after acting

Because links use `BACKEND_URL` from the environment variable, they work from any device — mobile, laptop, or any browser — with no dependency on localhost.

---

## Notification System

Every workflow event fires a notification that is simultaneously:
- Written to the `notifications` MongoDB collection
- Emailed to the workflow owner's registered address

### Events

| Event | Type | Email includes |
|---|---|---|
| Workflow completed | success | Link to execution view |
| Workflow failed | error | Link to execution view |
| Approval required | info | Accept and Decline action buttons |
| Task approved | success | Link to execution view |
| Task rejected | error | Link to execution view |

### Bell Icon Behavior

- Polls the `/notifications` endpoint every 8 seconds
- Displays an unread count badge (capped at 99+)
- Opens a dropdown panel showing the latest 50 notifications, newest first
- Unread notifications are visually highlighted
- All notifications are marked as read when the dropdown is opened
- Clicking a notification navigates directly to the relevant execution
- "Clear all" removes all notifications for the current user

---

## API Reference

All protected endpoints require an `Authorization: Bearer <token>` header.

### Auth

| Method | Endpoint | Body | Description |
|---|---|---|---|
| POST | /auth/register | `{ username, email, password }` | Create account, returns JWT |
| POST | /auth/login | `{ email, password }` | Sign in, returns JWT |

### Workflows

| Method | Endpoint | Description |
|---|---|---|
| GET | /workflows | List with pagination and search — current user only |
| POST | /workflows | Create workflow |
| GET | /workflows/:id | Get workflow with steps and rules |
| PUT | /workflows/:id | Update — auto-increments version |
| DELETE | /workflows/:id | Delete workflow and all steps/rules |

### Steps

| Method | Endpoint | Description |
|---|---|---|
| GET | /workflows/:id/steps | List steps for a workflow |
| POST | /workflows/:id/steps | Add a step |
| PUT | /steps/:id | Update step name, type, or approver email |
| DELETE | /steps/:id | Delete step and its rules |

### Rules

| Method | Endpoint | Description |
|---|---|---|
| GET | /steps/:id/rules | List rules for a step |
| POST | /steps/:id/rules | Add a rule |
| PUT | /rules/:id | Update condition, next step, or priority |
| DELETE | /rules/:id | Delete rule |

### Executions

| Method | Endpoint | Body | Description |
|---|---|---|---|
| POST | /workflows/:id/execute | `{ data, triggered_by }` | Start execution |
| GET | /executions | — | List all (paginated) — current user only |
| GET | /executions/:id | — | Get execution with full logs |
| POST | /executions/:id/cancel | — | Cancel in-progress execution |
| POST | /executions/:id/retry | — | Retry from failed step |
| POST | /executions/:id/approve | `{ approver_id, approved }` | Approve or reject via UI |

### Notifications

| Method | Endpoint | Description |
|---|---|---|
| GET | /notifications | List latest 50 + unread count |
| POST | /notifications/read-all | Mark all as read |
| DELETE | /notifications | Clear all notifications |

### Public (no auth required)

| Method | Endpoint | Description |
|---|---|---|
| GET | /approve | Email approval link handler — validates token, resumes execution |

---

## Local Development

### Prerequisites

- Node.js >= 18
- MongoDB running locally, or a MongoDB Atlas URI

### Backend

```bash
cd backend
cp .env.example .env
# Edit .env — fill in MONGO_URI, JWT_SECRET, and SMTP_* values
npm install
npm run dev
# API runs on http://localhost:5000
```

### Frontend

```bash
cd frontend
npm install
npm run dev
# UI runs on http://localhost:3000
```

The Vite dev server proxies all API paths (`/auth`, `/workflows`, `/steps`, `/rules`, `/executions`, `/notifications`, `/approve`) to `http://localhost:5000`, so there are no CORS issues during development and no need to set `VITE_API_URL` locally.

---

## Deployment

### Backend → Render

1. Push this repo to GitHub
2. Go to [render.com](https://render.com) → New → Web Service → connect the repo
3. Render auto-detects `render.yaml` — sets root dir to `backend`, build command to `npm install`, start command to `node src/index.js`
4. Set the following environment variables in the Render dashboard:

| Variable | Value |
|---|---|
| `MONGO_URI` | MongoDB Atlas connection string |
| `JWT_SECRET` | Random 256-bit hex string |
| `SMTP_USER` | Gmail address |
| `SMTP_PASS` | Gmail App Password (16 chars, no spaces) |
| `SMTP_FROM` | `"WorkFlow Manager <you@gmail.com>"` |
| `BACKEND_URL` | Your Render service URL, e.g. `https://workflow-manager-api.onrender.com` |
| `FRONTEND_URL` | `https://work-flow-manager-4dle.vercel.app` |

### Frontend → Vercel

1. Import the repo on [vercel.com](https://vercel.com)
2. Set the root directory to `frontend`
3. Add one environment variable:

| Variable | Value |
|---|---|
| `VITE_API_URL` | Your Render backend URL, e.g. `https://workflow-manager-api.onrender.com` |

4. Deploy — `vercel.json` handles SPA routing rewrites so direct URL access and page refreshes work correctly

---

## Environment Variables

### Backend (`backend/.env`)

```env
PORT=5000
MONGO_URI=mongodb+srv://<user>:<pass>@cluster.mongodb.net/workflow_manager

JWT_SECRET=<random-256-bit-hex>

SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=you@gmail.com
SMTP_PASS=<gmail-app-password-no-spaces>
SMTP_FROM="WorkFlow Manager <you@gmail.com>"

# Set to your Render service URL after deploying
BACKEND_URL=https://<your-render-service>.onrender.com

# Set to your Vercel frontend URL
FRONTEND_URL=https://<your-vercel-app>.vercel.app
```

### Frontend (`frontend/.env`)

```env
VITE_API_URL=https://<your-render-service>.onrender.com
```

> Omit `VITE_API_URL` for local development — the Vite proxy handles routing to `localhost:5000` automatically.

---

## Sample Workflow

**Expense Approval** — a realistic multi-step workflow that routes based on amount, country, and priority.

Input schema:

```json
{
  "amount":     { "type": "number", "required": true },
  "country":    { "type": "string", "required": true },
  "department": { "type": "string", "required": false },
  "priority":   { "type": "string", "required": true, "allowed_values": ["High", "Medium", "Low"] }
}
```

Steps and routing logic:

```
[Manager Approval]
  ├── amount > 100 && country == "US" && priority == "High"  →  [Finance Notification]
  ├── amount <= 100                                          →  [CEO Approval]
  └── DEFAULT                                               →  [Task Rejection]

[Finance Notification]
  └── DEFAULT  →  END

[CEO Approval]
  └── DEFAULT  →  END

[Task Rejection]
  └── (no rules)  →  END
```

Sample execution input:

```json
{
  "amount": 250,
  "country": "US",
  "department": "Finance",
  "priority": "High",
  "triggered_by": "john.doe"
}
```

Expected execution path: **Manager Approval → Finance Notification → completed**

What happens step by step:
1. Execution is created with the input data above
2. Engine starts at Manager Approval (approval step) — pauses, sends email to the configured approver
3. Approver clicks **Accept Task** in the email
4. Token is validated, step is marked completed, rules are evaluated
5. `amount > 100 && country == "US" && priority == "High"` matches → next step is Finance Notification
6. Finance Notification auto-executes (notification step)
7. No further steps — execution status becomes `completed`
8. Owner receives a "Workflow completed" notification in the bell and by email

---

## Conclusion

WorkFlow Manager is a production-ready workflow automation system built to demonstrate a complete full-stack engineering implementation — from database schema design and a custom rule engine, through secure email-based human-in-the-loop approvals, to a polished React frontend with real-time notifications.

The project covers a wide range of real-world engineering concerns:

- **Custom execution engine** — a stateful, resumable step traversal loop with loop protection and full audit logging
- **Security** — JWT authentication, bcrypt password hashing, one-time cryptographic approval tokens with expiry, per-user data isolation
- **Reliability** — execution state persisted at every step, email failures are non-fatal, token invalidation prevents double-processing
- **Developer experience** — typed input schemas with runtime validation, Zod on the backend, environment-driven configuration, and a Vite proxy that eliminates CORS friction in development
- **Production deployment** — `render.yaml` for zero-config Render deploys, `vercel.json` for SPA routing, CORS configured for the exact Vercel origin

It serves as a strong foundation for building more advanced workflow systems — adding webhook triggers, parallel step execution, role-based access control, or a visual drag-and-drop workflow canvas would all be natural next steps.

---

## License

MIT License

Copyright (c) 2026 Rafiq Ahamed

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
