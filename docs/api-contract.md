# API contract

All JSON routes use /api. Authentication is an HttpOnly SameSite=Lax JWT cookie, or a Bearer token for API clients. Login returns a token; the web app relies only on the cookie. Mutations reject cross-origin browser requests. Private responses are never cached.

POST /auth/register {fullName, studentId, email, password}: 201 {user, token}. POST /auth/login {email,password}: 200 {user,token}. GET /auth/me: 200 {user}, 401. POST /auth/logout clears cookie.
GET /departments: public discipline metadata only. GET /departments/:id/state: signed-in player's own progress and current question without answer keys. POST /departments/:id/answer {questionId,optionIds} (or selectedOptionIndex for a single choice): 200 {correct,pointsEarned,explanation,state}, 403 locked, 400 out of sequence, 409 duplicate. GET /passport: own completion, assigned objective and business indicators only; no rankings or target-fit scores.
GET /realtime/stream: cookie-authenticated SSE with CONNECTED and DEPT_Q1_UNLOCKED for all authenticated users, SCOREBOARD_UPDATED only for admin. Reconnect refetches current state.
POST /admin/departments/:id/start-q1: admin only; idempotently opens Q1. GET /admin/overview: department gate state, aggregate active and per-question counts. GET /admin/leaderboard: admin only; deterministic score descending, completion time ascending, id ascending; marks top four. All admin routes: 401 anonymous, 403 attendee.
GET /health: 200 only when DB connected, 503 otherwise. Public metadata: /api/meta/sitemap.xml and /api/meta/llms.txt.
