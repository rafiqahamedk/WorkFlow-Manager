# Workflow Manager

A full-stack workflow automation system built with Node.js, Express, MongoDB, and React + Vite.

## Stack

- **Backend**: Node.js + Express.js + MongoDB (Mongoose) + Zod
- **Frontend**: React 18 + Vite + TailwindCSS + @dnd-kit

## Setup

### Prerequisites
- Node.js >= 18
- MongoDB running locally (or a MongoDB Atlas URI)

### Backend

```bash
cd backend
cp .env.example .env
# Edit .env with your MONGO_URI if needed
npm install
npm run dev
```

Server runs on `http://localhost:5000`

### Frontend

```bash
cd frontend
npm install
npm run dev
```

UI runs on `http://localhost:3000`

---

## Workflow Engine Design

### Core Entities
- **Workflow** — named process with versioning and an input schema
- **Step** — single action (`task`, `approval`, `notification`)
- **Rule** — conditional logic per step, evaluated by priority
- **Execution** — runtime instance with full step logs

### Rule Engine
Rules are evaluated in priority order (lowest = highest priority). The engine supports:
- Comparison: `==`, `!=`, `<`, `>`, `<=`, `>=`
- Logical: `&&`, `||`
- String functions: `contains(field, "val")`, `startsWith(field, "prefix")`, `endsWith(field, "suffix")`
- `DEFAULT` keyword as fallback (required)

### Execution Flow
1. Execution created with input data
2. Engine starts at `start_step_id`
3. `task` and `notification` steps auto-execute; rules evaluated to find next step
4. `approval` steps pause execution — user must approve/reject via UI
5. On approval, rules are evaluated and execution continues
6. Execution ends when `next_step_id` is `null` or no more steps

### Versioning
Every `PUT /workflows/:id` increments the version. Executions record the version they ran against.

### Loop Protection
Max 50 iterations per execution to prevent infinite loops.

---

## API Reference

### Workflows
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /workflows | Create workflow |
| GET | /workflows | List (pagination + search) |
| GET | /workflows/:id | Get with steps & rules |
| PUT | /workflows/:id | Update (new version) |
| DELETE | /workflows/:id | Delete |

### Steps
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /workflows/:workflow_id/steps | Add step |
| GET | /workflows/:workflow_id/steps | List steps |
| PUT | /steps/:id | Update step |
| DELETE | /steps/:id | Delete step |

### Rules
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /steps/:step_id/rules | Add rule |
| GET | /steps/:step_id/rules | List rules |
| PUT | /rules/:id | Update rule |
| DELETE | /rules/:id | Delete rule |

### Executions
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /workflows/:workflow_id/execute | Start execution |
| GET | /executions | List all (audit log) |
| GET | /executions/:id | Get status & logs |
| POST | /executions/:id/cancel | Cancel |
| POST | /executions/:id/retry | Retry failed step |
| POST | /executions/:id/approve | Approve/reject approval step |

---

## Sample Workflow: Expense Approval

**Input Schema:**
```json
{
  "amount": { "type": "number", "required": true },
  "country": { "type": "string", "required": true },
  "department": { "type": "string", "required": false },
  "priority": { "type": "string", "required": true, "allowed_values": ["High", "Medium", "Low"] }
}
```

**Steps:**
1. Manager Approval (approval)
2. Finance Notification (notification)
3. CEO Approval (approval)
4. Task Rejection (task)

**Rules on Manager Approval:**
| Priority | Condition | Next Step |
|----------|-----------|-----------|
| 1 | `amount > 100 && country == "US" && priority == "High"` | Finance Notification |
| 2 | `amount <= 100` | CEO Approval |
| 3 | `priority == "Low" && country != "US"` | Task Rejection |
| 4 | `DEFAULT` | Task Rejection |

**Sample Execution Input:**
```json
{
  "amount": 250,
  "country": "US",
  "department": "Finance",
  "priority": "High"
}
```

**Expected Flow:** Manager Approval → Finance Notification → (end)
