---
name: academic-verse-builder
description: End-to-end architecture, implementation, SEO/GEO optimization, and Docker deployment skill for building an interactive gamified Academic Week / Department Challenge platform (inspired by Businessverse Academic Week) using React (TypeScript), ElysiaJS (Bun), PostgreSQL, and Docker Compose. Orchestrates uipromax, impeccable, figma, caveman, postman, backend, frontend, and database skills.
---

# AcademicVerse Platform Builder (UTCC Businessverse Edition)

Build and containerize a high-engagement, gamified Academic Week & Department Challenge web application featuring 3-question department stages, admin-controlled stage gates, hidden player leaderboards, a real-time Admin Live Scoreboard with Top-4 highlighting, Fullscreen Presentation Lock mode, and full SEO & GEO (Generative Engine Optimization) readiness.

## 1. Tech Stack & Environment Enforcement
- **Runtime:** Bun (Strictly use `bun` and `bunx` for local development, package management, and backend container runtime).
- **Frontend:** React 19+, TypeScript (strict mode), Vite, Tailwind CSS, TanStack Query, Zustand (client state), Framer Motion (micro-interactions).
- **Backend:** ElysiaJS (running on Bun) with `@elysiajs/swagger`, `@elysiajs/cors`, `@elysiajs/jwt`, SSE/WebSocket real-time streams, and TypeBox (`t`) for end-to-end type safety (Eden Treaty).
- **Database:** PostgreSQL 16+ managed via **Drizzle ORM** (`postgres.js`) with strict schema migrations.
- **Deployment:** Docker & Docker Compose (Multi-stage builds, persistent named volumes, internal bridge network, healthchecks).
- **Brand Asset:** Official logo located at `./image/1-UBS-UTCC-1.png` (bundle cleanly into `apps/web/public/1-UBS-UTCC-1.png` so it resolves reliably across UI, Open Graph previews, and Docker Nginx builds).

---

## 2. Core Business Logic & Game Rules (Mandatory)

1. **Department 3-Question Progression (`1 Department = 3 Questions`):**
   - Every department (`departments`) contains **exactly 3 sequential questions** (`order_index`: `1`, `2`, `3`).
   - **Gate on Question 1 (Admin-Triggered):** Question 1 of every department starts in a `locked` state (`is_q1_unlocked = false`). Players entering a department see a real-time waiting lobby until an Admin explicitly clicks **"Start / Unlock Question 1"** for that department.
   - **Auto-Advance on Questions 2 & 3:** Immediately upon submitting an answer to Question 1, Question 2 unlocks automatically for that player (`auto-advance`). Upon submitting Question 2, Question 3 unlocks automatically. Completing Question 3 marks the department stamp as completed.
2. **Leaderboard Visibility & Admin Top-4 Presentation Mode:**
   - **Player Restriction:** Regular players (`role = 'attendee'`) MUST NOT see the live leaderboard, total rankings, or other players' scores during the competition. API endpoints serving rankings must enforce `admin` role authorization (`403 Forbidden` for players). Players only see their own department completion status / stamps.
   - **Admin Real-Time Live Scoreboard:** Only accessible in the Admin Dashboard. Streams real-time score updates (via SSE or WebSocket) as players submit answers.
   - **Top-4 Highlighting:** Automatically visually mark and badge the **Top 4 highest-scoring players** (Ranks #1–#4) with distinct podium/finalist styling.
   - **Fullscreen Presentation Lock Mode:** Provide a dedicated **"Preview / Lock Fullscreen Leaderboard"** toggle in the Admin Dashboard that enters browser Fullscreen API, hides all admin control sidebars/buttons, locks accidental clicks (requires explicit unlock confirmation), and renders a stage-ready Top-4 & Live Standings display.
3. **Admin Control Center:**
   - Dedicated `/admin` dashboard enabling admins to:
     - Toggle/trigger **Question 1 Start** individually per department (with live status indicators: `Waiting` vs `Live`, plus live participant counts per question).
     - Monitor real-time live scores with Top-4 finalist markers.
     - Launch Fullscreen Presentation Lock mode.
4. **SEO & GEO (Generative Engine Optimization) Standards:**
   - **Search Engine Discovery (SEO):** Complete semantic HTML5 (`<main>`, `<header>`, `<article>`, `<section>`, `<nav>`), bilingual Thai/English meta titles & descriptions, canonical URLs, Open Graph (`og:title`, `og:description`, `og:image` pointing to `/1-UBS-UTCC-1.png`), Twitter/X Cards, `robots.txt`, and `sitemap.xml`.
   - **AI Search Engine Readiness (GEO):** Provide machine-readable `/llms.txt` and `/llms-full.txt` files summarizing the UTCC Businessverse Academic Week event, participating departments, and activity structure, alongside rich Schema.org JSON-LD (`Event`, `EducationalOrganization`, `FAQPage`) so LLM crawlers (ChatGPT, Gemini, Perplexity, Google AI Overviews) accurately index and cite the event.
   - **Route Indexing Hygiene:** Explicitly apply `<meta name="robots" content="noindex, nofollow" />` and `X-Robots-Tag: noindex, nofollow` on `/admin` and private player session routes so internal dashboards never leak into search results.

---

## 3. Sub-Skill Orchestration Pipeline

Execute tasks in the following strict sequence, invoking the designated skill rules at each phase:

### Phase 0: Communication & Token Discipline (`caveman`)
- **Rule:** Apply `caveman` style for all internal reasoning, progress logs, and terminal status updates.
- **Format:** Terse, high-signal, zero-fluff, no filler words, direct technical statements. Keep generated code, SQL, Dockerfiles, and API specs clean and production-grade.

### Phase 1: Design System, Branding & UI/UX (`figma` + `uipromax` + `impeccable`)
1. **`figma` & Branding:**
   - Place and reference `./image/1-UBS-UTCC-1.png` across the top navigation bar, player login/welcome screen, digital stamp passport header, and Admin Fullscreen Leaderboard header.
   - Extract/define cohesive design tokens (`tokens.json` & CSS variables) harmonized with the UBS-UTCC brand identity.
2. **`uipromax`:** Architect the visual experience:
   - **Player Hub:** Department selector cards showing lock status (`Waiting for Admin` vs `Live`), interactive 3-step question stepper (Q1 -> Q2 -> Q3), and stamp collection animations (strictly no global leaderboard visible).
   - **Admin Dashboard:** Split operational view — Left/Top panel for **Department Q1 Gate Controls** (one-click "Start Q1" triggers with live state sync); Right/Bottom panel for **Real-Time Live Scoreboard** highlighting Ranks #1–#4.
   - **Fullscreen Presentation Lock View:** High-contrast, large-typography stage view highlighting the Top 4 finalists with animated rank transitions and zero admin clutter.
3. **`impeccable`:** Enforce visual, UX, and Core Web Vitals perfection before moving to code:
   - Zero layout shift (CLS = 0), explicit `width`/`height` attributes on images (including `1-UBS-UTCC-1.png` with `fetchpriority="high"`), and skeleton loaders matching exact component dimensions.
   - WCAG AA+ contrast compliance, accessible keyboard navigation, descriptive `alt` text on all images, and consistent 4px/8px grid alignment.
   - Instant visual state transition when Admin unlocks Q1 (players in waiting room advance immediately without manual page refresh).

### Phase 2: Database Architecture (`database`)
- Design normalized PostgreSQL schemas using Drizzle ORM (`apps/api/src/db/schema.ts`):
  - `users`: `id`, `student_id`, `email`, `full_name`, `role` (`attendee`, `admin`), `total_points`, `last_submission_at` (for tie-breaking), `created_at`.
  - `departments`: `id`, `slug`, `name`, `code`, `description`, `is_q1_unlocked` (`boolean`, default `false`), `q1_unlocked_at` (`timestamp`), `display_order`.
  - `questions`: `id`, `department_id`, `question_number` (`smallint`: `1`, `2`, or `3` with unique constraint on `(department_id, question_number)`), `prompt`, `options` (JSONB array), `correct_option_index` (`integer`), `points_reward` (`integer`).
  - `user_answers`: `id`, `user_id`, `department_id`, `question_id`, `question_number` (`1`, `2`, `3`), `selected_option_index`, `is_correct`, `points_earned`, `answered_at` (composite unique index on `(user_id, question_id)` to prevent duplicate submissions).
- Include database indexing on `(total_points DESC, last_submission_at ASC)` for fast deterministic Top-4 ranking, plus an idempotent seed script (`bun run db:seed`) populating sample departments, 3 questions per department, and a default Admin account.

### Phase 3: Backend API & Real-Time Engine (`backend` + `postman`)
1. **`backend`:** Build modular ElysiaJS plugins (`apps/api/src/modules/{auth,departments,quiz,admin,realtime}`):
   - Expose `/health` endpoint returning `{ status: "ok", db: "connected" }` for Docker healthchecks.
   - **Dynamic SEO/GEO Metadata Endpoints:** Expose `/api/meta/sitemap.xml` (dynamically listing public event & department slugs) and `/api/meta/llms.txt` (dynamically populated with live department descriptions and event overview from PostgreSQL).
   - **Real-Time Broadcast Channel (SSE `/api/realtime/stream`):**
     - Broadcasts `DEPT_Q1_UNLOCKED` events to waiting players so Q1 opens automatically on their screen.
     - Broadcasts `SCOREBOARD_UPDATED` events exclusively to authenticated `admin` streams whenever points are awarded.
   - **Quiz Progression Enforcement:**
     - `GET /api/departments/:id/state`: Returns current player progress (`unlocked_question`: `1`, `2`, `3`, or `completed`). Returns `locked` if `question_number === 1 && !department.is_q1_unlocked`.
     - `POST /api/departments/:id/answer`: Validates sequential order (cannot answer Q2 before Q1, or Q3 before Q2), computes points inside an atomic PostgreSQL transaction (`user_answers` insert + `users.total_points` update), unlocks next question (`2` or `3`) automatically in response payload, and emits admin scoreboard update.
   - **Admin Endpoints (JWT `role === 'admin'` guard):**
     - `POST /api/admin/departments/:id/start-q1`: Sets `is_q1_unlocked = true` and broadcasts `DEPT_Q1_UNLOCKED`.
     - `GET /api/admin/leaderboard`: Returns live sorted rankings with `is_top_4: rank <= 4` flag. (Ensure NO public/attendee leaderboard endpoint exists).
   - Export `App` type (`export type App = typeof app`) for frontend Eden Treaty consumption.
2. **`postman`:** Generate a complete Postman Collection (`postman/AcademicVerse.postman_collection.json`) and Environment (`postman/Docker.postman_environment.json`):
   - Include automated test scripts (`pm.test(...)`) asserting HTTP status codes, JSON schema structure, and automatic `{{player_token}}` / `{{admin_token}}` extraction.
   - Cover happy paths and edge cases: player attempting Q1 before admin unlock (`403 Locked`), player skipping Q1 to answer Q2 (`400 Bad Request`), auto-advance Q1 -> Q2 -> Q3, duplicate answer (`409 Conflict`), and player attempting to access `/api/admin/leaderboard` (`403 Forbidden`).

### Phase 4: Frontend Implementation, SEO & GEO (`frontend` + `uipromax` + `impeccable`)
- Build the React + TypeScript application (`apps/web`) consuming the Elysia backend via `@elysiajs/eden` (`edenTreaty<App>`), reading API base URL from `import.meta.env.VITE_API_URL` (default `/api`).
- Copy/mount `./image/1-UBS-UTCC-1.png` into `apps/web/public/1-UBS-UTCC-1.png` and render it as the primary brand logo.
- **Implement SEO & GEO Layer (`apps/web/index.html` + `src/components/SeoHead.tsx` + `apps/web/public/`):**
  - Inject semantic `<title>`, `<meta name="description">`, `<html lang="th">`, canonical link, Open Graph tags (`og:site_name`, `og:title`, `og:description`, `og:image` -> `/1-UBS-UTCC-1.png`, `og:locale` -> `th_TH`), and Twitter summary large image tags.
  - Embed structured JSON-LD (`<script type="application/ld+json">`) defining `@graph` with `EducationalOrganization` (University of the Thai Chamber of Commerce - UTCC Business School), `Event` (Businessverse Academic Week), and `FAQPage` (how to participate, department challenges, stamp collection) for AI Generative Engine citation.
  - Include static fallback `apps/web/public/robots.txt` (allowing public pages and `/llms.txt`, disallowing `/admin` and `/api/`), `apps/web/public/llms.txt`, and `apps/web/public/llms-full.txt` formatted in clean Markdown for LLM ingestion.
  - Dynamically update document title, meta description, and `robots` (`noindex, nofollow` on `/admin`) per route via `SeoHead`.
- Structure cleanly by feature:
  - `src/features/player-hub`: Department grid showing live unlock status (`Waiting for Admin` / `Active` / `Completed`), personal stamp progress (without global rank/leaderboard), plus an accessible "About & Event Guide" section with semantic headings (`<h1>`–`<h3>`) for search/AI crawlers.
  - `src/features/department-quiz`: Real-time waiting lobby (listens to SSE `DEPT_Q1_UNLOCKED`) + seamless 3-question flow where submitting Q1 immediately transitions to Q2, and Q2 immediately transitions to Q3.
  - `src/features/admin-dashboard`:
    - **Department Gate Controller:** Cards/rows for every department with one-click **"Start Question 1"** button, status badge, and active solver metrics.
    - **Live Score Monitor:** Real-time updating table with distinct visual markers/badges for **Top 4 (#1–#4)**.
    - **Fullscreen Presentation Lock Mode:** Dedicated button to enter fullscreen scoreboard preview, locking out admin controls behind an explicit unlock toggle so it can safely be projected live on stage.

### Phase 5: Containerization & Docker Deployment
Generate production-ready Docker configurations with zero hardcoded secrets:
1. **`apps/api/Dockerfile` (Backend):**
   - Multi-stage build using `oven/bun:1-alpine`.
   - Install dependencies with `--frozen-lockfile`, run as non-root `bun` user, expose port `3000`.
   - Entrypoint script runs `bunx drizzle-kit migrate` safely before starting `bun run src/index.ts`.
2. **`apps/web/Dockerfile` & `nginx.conf` (Frontend):**
   - Stage 1: Build Vite production bundle (`oven/bun:1-alpine`), ensuring `./image/1-UBS-UTCC-1.png` is included in the static build output.
   - Stage 2: Serve static assets via `nginx:alpine` with:
     - SPA fallback (`try_files $uri $uri/ /index.html;`) and clean `Content-Type` headers (`text/plain; charset=utf-8` for `/llms.txt` and `/llms-full.txt`, `application/xml` for `/sitemap.xml`).
     - Proxy `/sitemap.xml` and `/llms.txt` to dynamic backend endpoints (`/api/meta/sitemap.xml`, `/api/meta/llms.txt`) with static fallback so crawlers always receive fresh department data.
     - Security & SEO headers (`X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, and `X-Robots-Tag: noindex, nofollow` on `/admin`).
     - Gzip/Brotli compression, immutable cache headers for `/assets/*`, and reverse proxy `/api/*` -> `http://api:3000/*` (`proxy_buffering off;` for SSE real-time streams).
3. **`docker-compose.yml` & `.env.example`:**
   - Services:
     - `db`: `postgres:16-alpine` with named volume `pgdata:/var/lib/postgresql/data` and `pg_isready` healthcheck.
     - `api`: Depends on `db` (`condition: service_healthy`), internal network access only, healthcheck hitting `/health`.
     - `web`: Depends on `api` (`condition: service_healthy`), exposes port `${WEB_PORT:-8080}:80`.
   - Include `.dockerignore` files excluding `node_modules`, `.git`, `.env`, and `dist`.

---

## 4. Execution Checklist & Definition of Done
Before concluding the task, verify:
- [ ] Logo `./image/1-UBS-UTCC-1.png` is properly bundled and visible in UI, Open Graph tags, and Docker Nginx builds.
- [ ] Question 1 of every department cannot be accessed by players until Admin triggers Start in `/admin`, while Questions 2 and 3 auto-advance immediately upon submission.
- [ ] Players have zero visibility into the live leaderboard; `/api/admin/leaderboard` rejects non-admin tokens (`403`).
- [ ] Admin Dashboard displays real-time scores, clearly highlights the **Top 4 ranks**, and supports **Fullscreen Presentation Lock** mode.
- [ ] SEO & GEO assets (`/robots.txt`, `/sitemap.xml`, `/llms.txt`, `/llms-full.txt`, Open Graph tags, and Schema.org JSON-LD) render valid output, while `/admin` serves `noindex, nofollow`.
- [ ] `docker compose config` validates cleanly and `docker compose up --build -d` brings up `db`, `api`, and `web` to `healthy` status with persistent PostgreSQL storage.
