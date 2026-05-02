# AGENTS.md

## Project

Musical Rater — a platform for rating songs and albums, with social interaction and recommendations.

---

## Stack

* Frontend: React (pnpm)
* Backend: Django Ninja (Python 3.11+)
* Database: PostgreSQL
* Auth: JWT + OAuth

---

## Repository Structure

* `/frontend` → React app
* `/backend` → Django API
* `/docs` → documentation

---

## Setup Commands

### Backend

```bash
cd backend
uv sync
uv run python manage.py migrate
```

### Frontend

```bash
cd frontend
pnpm install
```

### Run project

```bash
just dev
```

---

## Development Rules

* Do not introduce new frameworks or libraries without necessity
* Follow existing project patterns before creating new ones
* Keep functions small and composable
* Avoid duplication

---

## Backend Conventions

* Use service layer for business logic
* Keep views/routes thin
* Validate data using schemas (Pydantic)
* Prefer explicit queries over magic ORM behavior

---

## Frontend Conventions

* Use functional components only
* Keep components small and reusable
* Separate UI from logic (hooks/services)
* Avoid unnecessary global state

---

## Database

* PostgreSQL is the source of truth
* Always create migrations for schema changes
* Avoid N+1 queries

---

## Lint & Format

* Backend: Ruff
* Frontend: ESLint + Prettier
* All code must pass pre-commit

---

## Testing & Validation

Before finishing any task:

* Run linters
* Ensure project builds
* Do not break existing features

---

## What NOT to do

* Do not refactor unrelated code
* Do not change project structure without reason
* Do not guess conventions — follow existing code

---

## Priority Order

1. Existing code patterns
2. This file (AGENTS.md)
3. General best practices
