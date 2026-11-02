# ApplyWise AI — Production Deployment & Architecture Guide

## 1. System Architecture Overview

ApplyWise AI is an enterprise-grade full-stack web application designed for public deployment:

```mermaid
graph TD
    Client["React 19 + Vite Frontend (Light Glassmorphism & Neumorphism)"]
    API["Express API Server (Auth, Security Headers, Rate Limiting)"]
    Store["Relational Store (PostgreSQL / SQLite WAL Engine)"]
    Gemini["Google Gemini 3.8 Flash (Structured ATS Intelligence)"]
    Adapters["Live Aggregator Adapters (Remotive, Arbeitnow, Jobicy)"]
    DocGen["Document Studio (docx generation & ATS rendering)"]

    Client <-->|HTTPS / JSON / JWT| API
    API <-->|SQL Queries / UUIDs| Store
    API <-->|Zero-Hallucination Prompts| Gemini
    API <-->|REST API / Normalization| Adapters
    API -->|DOCX Buffer Export| DocGen
```

---

## 2. Environment Configuration

Copy `.env.example` to `.env` and configure appropriate secrets:

```bash
cp .env.example .env
```

| Variable | Required | Default | Description |
|---|---|---|---|
| `PORT` | Optional | `3000` | Port for Express web and API server |
| `NODE_ENV` | Optional | `development` | Set to `production` in live environments |
| `GEMINI_API_KEY` | **Yes** | — | Google Gemini API key for resume parsing & tailoring |
| `APP_URL` | Optional | `http://localhost:3000` | Publicly reachable domain / URL |
| `DATABASE_URL` | Optional | `data/applywise.sqlite` | PostgreSQL connection string (if using external PostgreSQL) |
| `SESSION_SECRET` | Recommended | — | Secret string used for auth token hashing |

---

## 3. Database Setup & Migrations

### Embedded Relational Database (Default)
ApplyWise AI includes an embedded SQLite relational database powered by Node's built-in `node:sqlite` engine (`applywise.sqlite`). It automatically creates all relational tables, indexes, and constraints upon startup with write-ahead logging (WAL) and foreign keys enabled.

### Production PostgreSQL
To deploy with PostgreSQL:
1. Provision a PostgreSQL 14+ database.
2. Run the migration script:
```bash
psql -d applywise -U postgres -f server/schema.sql
```
3. Set `DATABASE_URL` in your environment:
```env
DATABASE_URL="postgresql://user:password@hostname:5432/applywise"
```

---

## 4. Production Build & Execution

### 1. Install Dependencies
```bash
npm install --legacy-peer-deps
```

### 2. Run Tests & Validation
```bash
npm test
npm run lint
```

### 3. Build Production Bundle
```bash
npm run build
```
This builds optimized client assets into `dist/`.

### 4. Start Server
```bash
npm start
```
The server will run on `0.0.0.0:${PORT}` and serve the API routes at `/api/*` and static SPA assets for all other routes.

---

## 5. Security & Isolation Controls

- **Per-User Isolation**: Every database write and read is strictly scoped to the authenticated user ID (`req.user.id`).
- **Cryptographic Hashing**: User passwords are encrypted with `bcrypt` (10-12 salt rounds).
- **Session Tokens**: Bearer tokens and HTTP-only cookies with expiring sessions.
- **File Upload Safeguards**: Multer memory storage validates PDF/DOCX magic bytes, limits file size to 10MB, and prevents binary stream dumping.
- **Rate Limiting**: Public endpoints (`/api/auth/*`, `/api/jobs/search`) enforce sliding-window rate limits.
- **Safety Emergency Stop**: Instant user-controlled circuit breaker halting background submissions and automation.
