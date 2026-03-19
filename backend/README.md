# WorkFlow Manager — Backend

Node.js + Express REST API powering the WorkFlow Manager platform. Handles authentication, workflow/step/rule management, execution engine, email approvals, and notifications.

**API Base URL (production):** `https://workflow-manager-oktk.onrender.com`

---

## Table of Contents

- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Environment Variables](#environment-variables)
- [Local Setup](#local-setup)
- [API Reference](#api-reference)
- [Workflow Engine](#workflow-engine)
- [Rule Engine](#rule-engine)
- [Email Service](#email-service)
- [Notification Service](#notification-service)
- [Models](#models)
- [Middleware](#middleware)
- [Deployment to Render](#deployment-to-render)

---

## Tech Stack

| Package | Version | Purpose |
|---|---|---|
| express | ^4.18 | HTTP server + routing |
| mongoose | ^8.2 | MongoDB ODM |
| zod | ^3.22 | Request body validation |
| jsonwebtoken | ^9.0 | JWT signing + verification |
| bcryptjs | ^3.0 | Password hashing |
| nodemailer | ^8.0 | SMTP email delivery |
| cors | ^2.8 | Cross-origin request handling |
| dotenv | ^16.4 | Environment variable loading |
| nodemon | ^3.1 | Dev auto-restart (devDependency) |

Node.js ESM (`"type": "module"`) — all imports use `import/export` syntax.

---

## Project Structure

```
backend/
├── src/
│   ├── controllers/
│   │   ├── auth.controller.js         # register + login
│   │   ├── workflow.controller.js     # CRUD, per-user scoping
│   │   ├── step.controller.js         # step CRUD, start_step_id management
│   │   ├── rule.controller.js         # rule CRUD
│   │   ├── execution.controller.js    # start, cancel, retry, UI approve
│   │   ├── approve.controller.js      # public email approval link handler
│   │   └── notification.controller.js # list, read-all, clear
│   ├── engine/
│   │   ├── workflowExecutor.js        # step traversal loop
│   │   └── ruleEngine.js              # condition evaluator
│   ├── middleware/
│   │   ├── auth.js                    # JWT verification → req.user
│   │   ├── validate.js                # Zod validation wrapper
│   │   ├── schemas.js                 # all Zod schemas
│   │   └── errorHandler.js            # global error handler
│   ├── models/
│   │   ├── User.js
│   │   ├── Workflow.js
│   │   ├── Step.js
│   │   ├── Rule.js
│   │   ├── Execution.js
│   │   └── Notification.js
│   ├── routes/
│   │   ├── auth.routes.js
│   │   ├── workflow.routes.js
│   │   ├── step.routes.js
│   │   ├── rule.routes.js
│   │   ├── execution.routes.js
│   │   └── notification.routes.js
│   ├── services/
│   │   ├── emailService.js            # Nodemailer transporter + HTML email templates
│   │   └── notificationService.js     # DB write + email trigger
│   ├── seed.js                        # sample data seeder
│   └── index.js                       # app entry point
├── .env
├── .env.example
└── package.json
```

---

## Environment Variables

Copy `.env.example` to `.env` and fill in the values.

```env
# Server
PORT=5000

# MongoDB Atlas connection string
MONGO_URI=mongodb+srv://<user>:<pass>@cluster.mongodb.net/workflow_manager

# JWT — use a long random string (e.g. openssl rand -hex 32)
JWT_SECRET=<random-256-bit-hex>

# SMTP — Gmail recommended
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=you@gmail.com
SMTP_PASS=<gmail-app-password-16-chars-no-spaces>
SMTP_FROM="WorkFlow Manager <you@gmail.com>"

# Public backend URL — used in approval email links
# Must be set to your Render URL in production so links work on any device
BACKEND_URL=https://workflow-manager-api.onrender.com

# Frontend URL — used in CORS allowlist and notification email links
FRONTEND_URL=https://work-flow-manager-4dle.vercel.app
```

> `BACKEND_URL` is critical. Approval email links are built as `${BACKEND_URL}/approve?...`. If this is `localhost`, links only work on the developer's machine. Set it to your Render URL before deploying.

> Gmail App Password: go to Google Account → Security → 2-Step Verification → App Passwords. Generate a 16-character password. Do not include spaces.

---

## Local Setup

```bash
cd backend
cp .env.example .env
# Fill in MONGO_URI, JWT_SECRET, and SMTP_* values
npm install
npm run dev
# API runs on http://localhost:5000
```

`nodemon` watches for file changes and restarts automatically.

To seed sample data:

```bash
node src/seed.js
```

---

## API Reference

All protected endpoints require `Authorization: Bearer <token>` header.

### Auth (public)

| Method | Endpoint | Body | Response |
|---|---|---|---|
| POST | `/auth/register` | `{ username, email, password }` | `{ token, user }` |
| POST | `/auth/login` | `{ email, password }` | `{ token, user }` |

### Workflows

All endpoints scoped to `req.user.id` — users only see their own workflows.

| Method | Endpoint | Notes |
|---|---|---|
| GET | `/workflows` | Supports `?search=` and `?page=` / `?limit=` |
| POST | `/workflows` | Creates at version 1 |
| GET | `/workflows/:id` | Returns workflow with steps and rules populated |
| PUT | `/workflows/:id` | Auto-increments version on every save |
| DELETE | `/workflows/:id` | Cascades — deletes all steps and rules |

### Steps

| Method | Endpoint | Notes |
|---|---|---|
| GET | `/workflows/:id/steps` | Ordered by `order` field |
| POST | `/workflows/:id/steps` | Sets `start_step_id` on workflow if first step |
| PUT | `/steps/:id` | Update name, type, order, approver_email |
| DELETE | `/steps/:id` | Also deletes associated rules; updates `start_step_id` if needed |

### Rules

| Method | Endpoint | Notes |
|---|---|---|
| GET | `/steps/:id/rules` | Ordered by `priority` |
| POST | `/steps/:id/rules` | `condition` is a string expression |
| PUT | `/rules/:id` | Update condition, next_step_id, priority |
| DELETE | `/rules/:id` | — |

### Executions

| Method | Endpoint | Body | Notes |
|---|---|---|---|
| POST | `/workflows/:id/execute` | `{ data, triggered_by }` | Validates input against workflow schema |
| GET | `/executions` | — | Paginated, current user only |
| GET | `/executions/:id` | — | Full logs + approval history |
| POST | `/executions/:id/cancel` | — | Sets status to `canceled` |
| POST | `/executions/:id/retry` | — | Resets failed execution and re-runs |
| POST | `/executions/:id/approve` | `{ approver_id, approved }` | UI-based approve/reject |

### Notifications

| Method | Endpoint | Notes |
|---|---|---|
| GET | `/notifications` | Returns latest 50 + `unreadCount` |
| POST | `/notifications/read-all` | Marks all as read for current user |
| DELETE | `/notifications` | Clears all notifications for current user |

### Public (no auth)

| Method | Endpoint | Notes |
|---|---|---|
| GET | `/approve` | Email approval link handler — `?executionId=&action=approve&token=` |

---

## Workflow Engine

`src/engine/workflowExecutor.js` — the core execution loop.

```
runExecution(executionId)
  │
  ├── Load execution + workflow + owner user from MongoDB
  ├── Set status = in_progress
  │
  └── while (currentStepId && iterations < 50)
        │
        ├── Find step by ID
        ├── Skip if already completed (resume support after approval)
        │
        ├── [task / notification step]
        │     ├── Load rules for this step, sorted by priority
        │     ├── evaluateRules(rules, execution.data) → matchedRule
        │     ├── Log step as completed with timestamps + rule eval results
        │     └── Advance currentStepId = matchedRule.next_step_id
        │
        ├── [approval step]
        │     ├── Log step as in_progress
        │     ├── crypto.randomBytes(32) → 64-char hex token
        │     ├── Store token + 10-min expiry on execution document
        │     ├── Send approval email to step.approver_email
        │     ├── Fire "approval required" notification to workflow owner
        │     └── PAUSE — return execution (resume via /approve or UI)
        │
        └── [no more steps]
              ├── status = completed
              └── Fire "workflow completed" notification
```

Max iterations: 50. Exceeding this marks the execution as `failed` with "Max iterations reached — possible infinite loop".

Execution state is written to MongoDB at every step, so the engine can resume safely after a server restart or approval pause.

---

## Rule Engine

`src/engine/ruleEngine.js` — evaluates an ordered list of rules against the execution's input data.

Rules are evaluated in ascending `priority` order (1 = highest). The first matching rule wins. If no rule matches and there is no `DEFAULT` rule, the execution fails.

Supported condition syntax:

```
# Comparisons
amount > 100
country == "US"
priority != "Low"
score >= 90

# Logical operators (left-to-right, no parentheses)
amount > 100 && country == "US"
priority == "High" || priority == "Medium"

# String functions
contains(department, "Finance")
startsWith(country, "U")
endsWith(email, ".com")

# Guaranteed fallback — always matches
DEFAULT
```

The evaluator resolves field names against `execution.data` at runtime. String values in conditions must be quoted. Number values are unquoted.

---

## Email Service

`src/services/emailService.js` — Nodemailer-based email delivery with two exported functions.

### `sendApprovalEmail({ to, workflowName, stepName, inputData, executionId, token, baseUrl })`

Sends a styled HTML email to the step's `approver_email` with:
- Workflow name, step name, and full input data table
- **Accept Task** (green) and **Decline Task** (red) buttons
- Links built as `${baseUrl}/approve?executionId=...&action=...&token=...`
- 10-minute expiry warning

### `sendNotificationEmail({ to, message, type, execution_id, emailExtra })`

Sends a notification email to the workflow owner. `type` controls the color scheme (`success` = green, `error` = red, `info` = blue). If `emailExtra.approveUrl` and `emailExtra.rejectUrl` are provided, approval action buttons are included instead of a generic "View Execution" link.

### Transporter

On startup, `getTransporter()` checks for `SMTP_USER` and `SMTP_PASS`:
- If present → creates a real Gmail SMTP transporter and verifies the connection
- If absent → creates an [Ethereal](https://ethereal.email) test account and logs a preview URL to the console — useful for development without real SMTP credentials

---

## Notification Service

`src/services/notificationService.js` — single exported function `createNotification()`.

```js
createNotification({
  user_id,      // MongoDB ObjectId string
  user_email,   // recipient email address
  message,      // notification text
  type,         // 'success' | 'error' | 'info'
  execution_id, // for navigation link in email
  emailExtra,   // optional { approveUrl, rejectUrl } for approval notifications
})
```

This function:
1. Writes a `Notification` document to MongoDB (for the bell icon)
2. Calls `sendNotificationEmail()` to deliver the same message by email

Both happen together. Email failures are caught and logged — they do not prevent the DB write from succeeding.

### Events that trigger notifications

| Event | Type | Triggered in |
|---|---|---|
| Approval required | info | `workflowExecutor.js` |
| Workflow completed | success | `workflowExecutor.js` |
| Workflow failed | error | `workflowExecutor.js` |
| Task approved | success | `approve.controller.js`, `execution.controller.js` |
| Task rejected | error | `approve.controller.js`, `execution.controller.js` |

---

## Models

### User
```
username    String, unique
email       String, unique
password    String (bcrypt hash)
createdAt   Date
```

### Workflow
```
name           String
description    String
version        Number (auto-increments on update)
is_active      Boolean
input_schema   Map<String, { type, required, allowed_values }>
start_step_id  ObjectId → Step
created_by     ObjectId → User
```

### Step
```
workflow_id    ObjectId → Workflow
name           String
step_type      'task' | 'approval' | 'notification'
order          Number
approver_email String (approval steps only)
```

### Rule
```
step_id        ObjectId → Step
condition      String (rule expression)
next_step_id   ObjectId → Step (null = end of workflow)
priority       Number
```

### Execution
```
workflow_id              ObjectId → Workflow
workflow_version         Number
status                   'pending' | 'in_progress' | 'completed' | 'failed' | 'canceled'
data                     Object (input data)
logs[]                   Array of step log objects
current_step_id          ObjectId → Step
triggered_by             String
started_at / ended_at    Date
retries                  Number
approval_token           String
approval_token_expires_at Date
approval_token_step_id   ObjectId → Step
approval_history[]       Array of { step_id, step_name, approver_email, action, timestamp }
```

### Notification
```
user_id       ObjectId → User
user_email    String
message       String
type          'success' | 'error' | 'info'
execution_id  String
read          Boolean
createdAt     Date
```

---

## Middleware

### `auth.js` — `authMiddleware`
Reads `Authorization: Bearer <token>`, verifies with `JWT_SECRET`, attaches decoded payload to `req.user`. Returns 401 if missing or invalid.

### `validate.js` — `validate(schema)`
Express middleware factory. Parses `req.body` through a Zod schema. On failure, returns 400 with a structured error list. On success, replaces `req.body` with the parsed (coerced) value.

### `schemas.js`
Centralised Zod schemas for all request bodies: `registerSchema`, `loginSchema`, `workflowSchema`, `stepSchema`, `ruleSchema`, `executeSchema`.

### `errorHandler.js`
Global Express error handler. Catches unhandled errors, logs them, and returns a consistent `{ error: message }` JSON response.

---

## Deployment to Render

The `render.yaml` in the repo root configures automatic deployment.

1. Push the repo to GitHub
2. Go to [render.com](https://render.com) → New → Web Service → connect the repo
3. Render detects `render.yaml` automatically — sets root dir to `backend`, build command to `npm install`, start command to `node src/index.js`
4. Set these environment variables in the Render dashboard (marked `sync: false` in `render.yaml` — they are not committed to git):

| Variable | Value |
|---|---|
| `MONGO_URI` | MongoDB Atlas connection string |
| `JWT_SECRET` | Random 256-bit hex string |
| `SMTP_USER` | Gmail address |
| `SMTP_PASS` | Gmail App Password (16 chars, no spaces) |
| `SMTP_FROM` | `"WorkFlow Manager <you@gmail.com>"` |
| `BACKEND_URL` | Your Render service URL |
| `FRONTEND_URL` | `https://work-flow-manager-4dle.vercel.app` |

After the first deploy, copy the Render service URL and set it as `BACKEND_URL` — this makes approval email links work from any device.
