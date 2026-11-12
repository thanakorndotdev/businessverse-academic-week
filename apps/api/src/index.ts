import { Elysia, t } from "elysia";
import { cors } from "@elysiajs/cors";
import { jwt } from "@elysiajs/jwt";
import { swagger } from "@elysiajs/swagger";
import { and, eq, sql } from "drizzle-orm";
import { db } from "./db";
import { users, departments, userAnswers, questions } from "./db/schema";
import {
  ApiError,
  requireUser,
  requireAdmin,
  publicUser,
  listDepartments,
  passportFor,
  stateFor,
  submitAnswer,
  leaderboard,
  getCompetition,
} from "./modules/game";
import {
  teamLogin,
  teamNumbers,
  generateTeams,
  renameTeam,
  adminTeams,
  teamAnswers,
  openFinal,
  closeCompetition,
  resetCompetition,
  finalStateFor,
  submitFinal,
} from "./modules/competition";
import { broadcast, streamFor } from "./modules/realtime";
import { presenceFor } from "./modules/presence";
import { objectives, FINALIST_COUNT } from "./game/engine";
const secret = process.env.JWT_SECRET;
if (!secret || secret.length < 32)
  throw new Error("JWT_SECRET must contain at least 32 characters");
const appUrl = process.env.APP_URL || "http://localhost:5173";
const allowedOrigins = new Set([
  appUrl,
  ...(process.env.NODE_ENV !== "production"
    ? ["http://localhost:5173", "http://127.0.0.1:5173"]
    : []),
]);
const attempts = new Map<string, { count: number; until: number }>();
function throttle(key: string) {
  const now = Date.now();
  for (const [k, v] of attempts) if (v.until < now) attempts.delete(k);
  const entry = attempts.get(key) ?? { count: 0, until: now + 15 * 60000 };
  entry.count++;
  attempts.set(key, entry);
  if (entry.count > 20)
    throw new ApiError(429, "ลองเข้าสู่ระบบหลายครั้งเกินไป กรุณารอ 15 นาที");
}
export const app = new Elysia()
  .use(cors({ origin: [...allowedOrigins], credentials: true }))
  .use(jwt({ name: "jwt", secret, exp: "12h" }))
  .use(
    swagger({
      path: "/api/docs",
      documentation: {
        info: { title: "Businessverse API", version: "1.0.0" },
        tags: [{ name: "Academic Week" }],
      },
    }),
  )
  .onRequest(({ request, set }) => {
    set.headers["X-Content-Type-Options"] = "nosniff";
    if (new URL(request.url).pathname.startsWith("/api")) {
      set.headers["Cache-Control"] = "no-store";
      set.headers["X-Robots-Tag"] = "noindex, nofollow";
    }
    if (!["GET", "HEAD", "OPTIONS"].includes(request.method)) {
      const origin = request.headers.get("origin");
      if (origin && !allowedOrigins.has(origin))
        throw new ApiError(403, "Origin is not allowed");
    }
  })
  .onError(({ error, set, code }) => {
    if (error instanceof ApiError) {
      set.status = error.status;
      return { error: error.message };
    }
    if (code === "VALIDATION" || code === "PARSE") {
      set.status = 400;
      return { error: "ข้อมูลไม่ถูกต้อง กรุณาตรวจสอบอีกครั้ง" };
    }
    if (code === "NOT_FOUND") {
      set.status = 404;
      return { error: "ไม่พบข้อมูลที่ต้องการ" };
    }
    console.error("Request failed", error);
    set.status = 500;
    return { error: "ระบบขัดข้องชั่วคราว กรุณาลองอีกครั้ง" };
  })
  .derive({ as: "global" }, async ({ jwt, cookie, headers }) => {
    const token =
      headers.authorization?.replace(/^Bearer /i, "") ??
      (typeof cookie.bv_session?.value === "string"
        ? cookie.bv_session.value
        : undefined);
    const claims = token ? await jwt.verify(token) : false;
    const [user] =
      claims && typeof claims.sub === "string"
        ? await db.select().from(users).where(eq(users.id, claims.sub))
        : [];
    return { user: user ?? null };
  })
  .get("/health", async ({ set }) => {
    try {
      await db.execute(sql`select 1`);
      return { status: "ok", db: "connected" };
    } catch {
      set.status = 503;
      return { status: "error", db: "unavailable" };
    }
  })
  .get("/api/teams", async () => ({ teams: await teamNumbers() }))
  .post(
    "/api/auth/team",
    async ({ body, jwt, cookie }) => {
      throttle("team:" + body.teamNumber);
      const user = await teamLogin(body.teamNumber, body.code);
      const token = await jwt.sign({ sub: user.id });
      cookie.bv_session.set({
        value: token,
        httpOnly: true,
        secure: appUrl.startsWith("https:"),
        sameSite: "lax",
        path: "/",
        maxAge: 43200,
      });
      return { user: publicUser(user), token };
    },
    {
      body: t.Object({
        teamNumber: t.Integer({ minimum: 1, maximum: 999 }),
        code: t.String({ minLength: 4, maxLength: 12 }),
      }),
    },
  )
  .post(
    "/api/auth/login",
    async ({ body, jwt, cookie, request }) => {
      throttle("login:" + body.email.trim().toLowerCase());
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.email, body.email.trim().toLowerCase()));
      if (
        !user ||
        !user.passwordHash ||
        !(await Bun.password.verify(body.password, user.passwordHash))
      )
        throw new ApiError(401, "อีเมลหรือรหัสผ่านไม่ถูกต้อง");
      const token = await jwt.sign({ sub: user.id });
      cookie.bv_session.set({
        value: token,
        httpOnly: true,
        secure: appUrl.startsWith("https:"),
        sameSite: "lax",
        path: "/",
        maxAge: 43200,
      });
      return { user: publicUser(user), token };
    },
    {
      body: t.Object({
        email: t.String({ format: "email" }),
        password: t.String({ minLength: 1, maxLength: 128 }),
      }),
    },
  )
  .get("/api/auth/me", ({ user }) => ({ user: publicUser(requireUser(user)) }))
  .patch(
    "/api/team/name",
    async ({ user, body }) => ({
      user: publicUser(await renameTeam(requireUser(user), body.name)),
    }),
    { body: t.Object({ name: t.String({ minLength: 2, maxLength: 36 }) }) },
  )
  .get("/api/competition", async () => {
    const c = await getCompetition();
    return { phase: c.phase, finalistCount: FINALIST_COUNT };
  })
  .get("/api/final", ({ user }) => finalStateFor(requireUser(user)))
  .post(
    "/api/final/answer",
    async ({ user, body }) => {
      const result = await submitFinal(
        requireUser(user),
        body.optionId,
        body.reason,
      );
      broadcast("SCOREBOARD_UPDATED", { at: Date.now() });
      return result;
    },
    {
      body: t.Object({
        optionId: t.String({ maxLength: 64 }),
        reason: t.String({ minLength: 3, maxLength: 300 }),
      }),
    },
  )
  .post("/api/auth/logout", ({ cookie }) => {
    cookie.bv_session.set({
      value: "",
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      secure: appUrl.startsWith("https:"),
      maxAge: 0,
    });
    return { ok: true };
  })
  .get("/api/departments", async () => ({
    departments: await listDepartments(),
  }))
  .get("/api/passport", ({ user }) => passportFor(requireUser(user)))
  .get("/api/departments/:id/state", ({ user, params }) =>
    stateFor(requireUser(user), params.id),
  )
  .post(
    "/api/departments/:id/answer",
    async ({ user, params, body }) => {
      const result = await submitAnswer(
        requireUser(user),
        params.id,
        body.questionId,
        body.optionIds,
        body.selectedOptionIndex,
        body.reason,
      );
      broadcast("SCOREBOARD_UPDATED", { at: Date.now() });
      return result;
    },
    {
      body: t.Object({
        questionId: t.String({ format: "uuid" }),
        optionIds: t.Optional(
          t.Array(t.String({ maxLength: 64 }), { minItems: 1, maxItems: 10 }),
        ),
        selectedOptionIndex: t.Optional(t.Integer({ minimum: 0, maximum: 9 })),
        reason: t.String({ minLength: 3, maxLength: 300 }),
      }),
    },
  )
  .get("/api/realtime/stream", ({ user, request }) =>
    streamFor(requireUser(user).role, request, requireUser(user).id),
  )
  .get("/api/admin/leaderboard", async ({ user }) => {
    requireAdmin(user);
    return { leaderboard: await leaderboard() };
  })
  .get("/api/admin/overview", async ({ user }) => {
    requireAdmin(user);
    const deps = await listDepartments();
    const rows = await db
      .select({
        departmentId: userAnswers.departmentId,
        q: userAnswers.questionNumber,
        count: sql<number>`count(*)::int`,
      })
      .from(userAnswers)
      .groupBy(userAnswers.departmentId, userAnswers.questionNumber);
    const [totals] = await db
      .select({
        participants: sql<number>`count(*)::int`,
        started: sql<number>`count(*) filter (where ${users.lastSubmissionAt} is not null)::int`,
      })
      .from(users)
      .where(eq(users.role, "attendee"));
    const [{ decisions }] = await db
      .select({ decisions: sql<number>`count(*)::int` })
      .from(userAnswers);
    const c = await getCompetition();
    return {
      ...totals,
      decisions,
      phase: c.phase,
      finalistCount: FINALIST_COUNT,
      finalOpenedAt: c.finalOpenedAt,
      departments: deps.map((d) => ({
        ...d,
        ...presenceFor(d.id),
        perQuestion: [1, 2, 3].map(
          (q) =>
            rows.find((r) => r.departmentId === d.id && r.q === q)?.count ?? 0,
        ),
      })),
    };
  })
  .post(
    "/api/admin/departments/:id/start-q1",
    async ({ user, params }) => {
      requireAdmin(user);
      const [department] = await db
        .update(departments)
        .set({
          isQ1Unlocked: true,
          // Re-opening restarts the clock so paused players get a full 3 minutes.
          q1UnlockedAt: sql`now()`,
        })
        .where(eq(departments.id, params.id))
        .returning();
      if (!department) throw new ApiError(404, "ไม่พบสาขานี้");
      broadcast("DEPT_Q1_UNLOCKED", { departmentId: department.id });
      return { department };
    },
    { params: t.Object({ id: t.String({ format: "uuid" }) }) },
  )
  .post(
    "/api/admin/departments/:id/stop",
    async ({ user, params }) => {
      requireAdmin(user);
      const [department] = await db
        .update(departments)
        .set({ isQ1Unlocked: false })
        .where(eq(departments.id, params.id))
        .returning();
      if (!department) throw new ApiError(404, "ไม่พบสาขานี้");
      broadcast("DEPT_Q1_UNLOCKED", {
        departmentId: department.id,
        open: false,
      });
      return { department };
    },
    { params: t.Object({ id: t.String({ format: "uuid" }) }) },
  )
  .get("/api/admin/questions", async ({ user }) => {
    requireAdmin(user);
    return { questions: await db.select().from(questions) };
  })
  .get("/api/admin/participants", async ({ user }) => {
    requireAdmin(user);
    return { participants: await adminTeams() };
  })
  .post(
    "/api/admin/teams/generate",
    async ({ user, body }) => {
      requireAdmin(user);
      const participants = await generateTeams(body.count);
      broadcast("TARGET_UPDATED", { userId: "*" });
      return { participants };
    },
    { body: t.Object({ count: t.Integer({ minimum: 1, maximum: 300 }) }) },
  )
  .get(
    "/api/admin/participants/:id/answers",
    async ({ user, params }) => {
      requireAdmin(user);
      return teamAnswers(params.id);
    },
    { params: t.Object({ id: t.String({ format: "uuid" }) }) },
  )
  .post("/api/admin/final/open", async ({ user }) => {
    requireAdmin(user);
    const result = await openFinal();
    broadcast("COMPETITION_UPDATED", { phase: "final" });
    broadcast("SCOREBOARD_UPDATED", { at: Date.now() });
    return result;
  })
  .post("/api/admin/close", async ({ user }) => {
    requireAdmin(user);
    const result = await closeCompetition();
    broadcast("COMPETITION_UPDATED", { phase: "closed" });
    return result;
  })
  .post(
    "/api/admin/reset",
    async ({ user }) => {
      requireAdmin(user);
      const result = await resetCompetition();
      broadcast("COMPETITION_UPDATED", { phase: "qualifier" });
      broadcast("SCOREBOARD_UPDATED", { at: Date.now() });
      return result;
    },
    { body: t.Object({ confirm: t.Literal("RESET") }) },
  )
  .patch(
    "/api/admin/participants/:id/objective",
    async ({ user, params, body }) => {
      requireAdmin(user);
      const result = await db.transaction(async (tx) => {
        const [player] = await tx
          .select()
          .from(users)
          .where(and(eq(users.id, params.id), eq(users.role, "attendee")))
          .for("update");
        if (!player) throw new ApiError(404, "ไม่พบผู้เล่น");
        const [answered] = await tx
          .select({ id: userAnswers.id })
          .from(userAnswers)
          .where(eq(userAnswers.userId, player.id))
          .limit(1);
        if (answered)
          throw new ApiError(409, "เปลี่ยน target ได้เฉพาะก่อนเริ่มตอบคำถาม");
        const [updated] = await tx
          .update(users)
          .set({ objectiveId: body.objectiveId })
          .where(eq(users.id, player.id))
          .returning();
        return { user: publicUser(updated) };
      });
      broadcast("TARGET_UPDATED", { userId: params.id });
      return result;
    },
    {
      params: t.Object({ id: t.String({ format: "uuid" }) }),
      body: t.Object({
        objectiveId: t.Union([
          t.Literal("growth"),
          t.Literal("premium"),
          t.Literal("cost"),
          t.Literal("customer"),
        ]),
      }),
    },
  )
  .get("/api/meta/sitemap.xml", async ({ set }) => {
    set.headers["Content-Type"] = "application/xml; charset=utf-8";
    const origin = appUrl.replace(/\/$/, "").replace(/[<>&"']/g, "");
    return `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${["/", "/guide", ...(await listDepartments()).map((d) => "/departments/" + d.slug)].map((p) => `<url><loc>${origin}${p}</loc></url>`).join("")}</urlset>`;
  })
  .get("/api/meta/llms.txt", async ({ set }) => {
    set.headers["Content-Type"] = "text/plain; charset=utf-8";
    return (
      "# Businessverse Academic Week\n\nUTCC Business School — มหาวิทยาลัยหอการค้าไทย คณะบริหารธุรกิจ\n\n8 departments, 24 sequential business decisions. Organizers unlock each department; players collect stamps. Four persistent strategic targets: Growth, Premium, Cost, Customer. Rankings are admin-only. Event date and venue are not confirmed.\n\n" +
      (await listDepartments())
        .map((d) => `- ${d.name} (${d.nameTh}): ${d.description}`)
        .join("\n")
    );
  })
  .get("/sitemap.xml", ({ set }) => {
    set.headers["Content-Type"] = "application/xml";
    return `<?xml version="1.0"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>${appUrl}/</loc></url><url><loc>${appUrl}/guide</loc></url></urlset>`;
  })
  .get("/llms.txt", ({ set }) => {
    set.headers["Content-Type"] = "text/plain; charset=utf-8";
    return "# Businessverse Academic Week\nUTCC Business School\n8 disciplines, 24 sequential decisions, four persistent team targets. Rankings are organizer-only.";
  });
export type App = typeof app;
if (import.meta.main) app.listen(Number(process.env.PORT ?? 3000));
