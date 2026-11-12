# Businessverse Academic Week

A fullstack UTCC Business School challenge built with Bun, Elysia, PostgreSQL/Drizzle, React 19, TypeScript and Vite. The redesigned interface uses Thai-first copy, an English toggle, a mobile navigation bar, and separate participant and organizer workflows.

## Run locally

```sh
bun install
bun run setup
docker compose up --build -d
```

Open **http://localhost:8080**. Docker serves the production web app, an internal API and an isolated PostgreSQL database with a persistent `pgdata` volume. The web port binds to loopback by default. No existing Docker services or databases are reused.

`bun run setup` creates a private, ignored `.env` with generated credentials. Organizer sign-in is at **http://localhost:8080/join?next=/admin** (the *Organizer* tab). Use `ADMIN_EMAIL` and `ADMIN_PASSWORD` from your local `.env`. Setup and seeds never overwrite existing credentials.

Teams do not self-register. In the control center, open **Teams, codes & reasoning**, enter the number of teams (default 150) and select **Create teams**. Each team gets a random six-character access code; download the CSV to print and hand out codes. Players choose their team number on the sign-in screen and enter the code; teammates share one code. **New code** invalidates a lost code. Teams can rename themselves from their passport. No demo accounts or fabricated leaderboard entries are added.

To supply your own configuration, copy `.env.example` to `.env` and replace the placeholders. Use a URL-safe database password. `JWT_SECRET` needs at least 32 characters; the organizer password needs at least 12. Set `APP_URL` to the actual origin before deploying; build-time SEO metadata uses that origin. For network access set `WEB_BIND` explicitly, configure a TLS reverse proxy, and rebuild. The database and API remain internal.

## Rules preserved from the reference

The original **24 questions, option effects, investment budget, four targets and qualifying score formulas** are imported into `apps/api/src/game/reference.json` from the public reference application. See [reference-rules.md](docs/reference-rules.md) for provenance and the actual rendered department order.

| Team assignment               | Target                              |
| ----------------------------- | ----------------------------------- |
| 1, 5, 9… — Growth Company     | Sales > 145                         |
| 2, 6, 10… — Premium Brand     | Brand > 120 and Risk < 55           |
| 3, 7, 11… — Cost Leader       | Cash > 200,000 and Operations > 100 |
| 4, 8, 12… — Customer Champion | Customer > 130                      |

Targets are persisted when the organizer creates a team, not randomized on login. Only an organizer may reassign a target, and only before the first submitted decision. Question scenarios are shared; decision quality depends on the target. Players can view their own company indicators, capabilities and completed stamps, but never rankings or target-fit scores.

Each department has exactly three decisions. The organizer opens its first question and can **pause** and **resume** a department; resuming gives waiting teams a fresh 3-minute window. Every answer requires a short team rationale (3–300 characters), stored for organizer review and never scored. The second and third appear immediately after submission. Every question has a server-enforced 3-minute window: Q1 starts when the organizer opens the department (or when the player finishes the previous department, if later); Q2 and Q3 start when the previous answer is saved. An overdue question is recorded as a timeout with no effect or decision-fit points, and the next question opens. Departments follow the reference order because decisions carry company state forward. Answers are final and recorded atomically with the updated score. User-row locks, database uniqueness and sequential checks prevent duplicate awards and skipped questions.

The organizer dashboard provides gate controls (start, pause, resume), submitted/active counts, team codes and targets, each team's decisions and reasoning, a live scoreboard with Top 10 highlights, and a fullscreen presentation of the Top 10 with a native unlock-confirmation dialog.

**Competition phases.** *Qualifier* (out of 80) → **Announce Top 10 & open Final** snapshots the ten highest-scoring teams as finalists, closes qualifier answers and opens the **Final Business Crisis** (one decision with reasoning, 3 minutes). Finalists score the plan's fit for their target (out of 20); other teams may answer as an *audience challenge* with no effect on results. **Close answers / end game** locks all submissions. **Reset competition** (type `RESET`) deletes all answers, reasons, scores and finalists and closes every department, keeping teams and codes. After all 24 decisions, a team's passport shows a final business dashboard with whether its target was reached — never scores or ranks. Activity counts mean requests observed in the last 45 seconds. SSE reconnects refresh authoritative state; polling provides recovery if a connection drops.

Rankings remain organizer-only, unlike the reference's public Top 10 tab.

## Development

```sh
bun run dev
bun run typecheck
bun run build
bun test tests/engine.test.ts
```

Vite runs on port 5173 and proxies `/api` to Bun on port 3000. For local development, set `APP_URL=http://localhost:5173` and `DATABASE_URL` to a reachable development PostgreSQL instance. The production Compose database deliberately has no host port; use Docker for the default complete setup.

```sh
bun run db:generate
bun run db:migrate
bun run db:seed
```

Migrations are committed SQL under `apps/api/drizzle`. The runtime migrator applies only pending migrations before startup. Seeds insert missing reference content and preserve existing answers, gates and organizer passwords.

## Verification

The integration suite uses **only `businessverse_test`**, a separate disposable database. Create it once after the app database becomes healthy:

```sh
docker compose exec -T db createdb -U businessverse businessverse_test
bun run test:integration
```

The suite resets only that test database. It exercises all 24 decisions, preset targets and persistence, target edit locks, gate enforcement, automatic progression, concurrent duplicate answers, hidden answer keys, admin authorization, score calculation and SSE event isolation.

For a real HTTP Postman run against a fresh test service:

```sh
docker compose --profile test up -d test-api
bun run test:postman
docker compose --profile test stop test-api
```

Do not run the mutation collection against a live competition. The runner injects organizer credentials through a private temporary environment and removes it afterward. It disables cloud reporting. Committed Postman environments contain no credentials. OpenAPI documentation is available at `/api/docs`.

## Public metadata and operations

The app includes bilingual metadata, self-hosted fonts and the supplied UBS logo, canonical/OG/Twitter tags, Event/EducationalOrganization/FAQ JSON-LD, robots rules, dynamic sitemap and LLM summaries with static fallbacks. Private routes use `noindex, nofollow` response headers and client metadata; API responses use `no-store`. Event date and venue remain unspecified because no confirmed values were supplied.

```sh
docker compose ps
docker compose logs --tail 100 api
docker compose exec -T db pg_dump -U businessverse businessverse > businessverse-backup.sql
```

`docker compose stop` stops the app while preserving data. Keep `.env` and backups private. Review [the validation report](docs/validation.md) for checks actually performed and remaining limits.
