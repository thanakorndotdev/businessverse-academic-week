import { describe, beforeAll, afterAll, test, expect } from "bun:test";
const enabled = process.env.RUN_INTEGRATION === "1";
if (enabled) {
  const url = new URL(process.env.DATABASE_URL!);
  url.pathname = "/businessverse_test";
  process.env.DATABASE_URL = url.href;
}
let app: typeof import("../apps/api/src/index").app;
let db: typeof import("../apps/api/src/db").db;
let sqlClient: typeof import("../apps/api/src/db").sqlClient;
let schema: typeof import("../apps/api/src/db/schema");
let playerToken = "",
  adminToken = "",
  playerId = "",
  departments: any[] = [],
  bank: any[] = [],
  playerCookie = "";
const codes: Record<number, string> = {};
const teamToken = async (n: number) =>
  (await call("/api/auth/team", { teamNumber: n, code: codes[n] })).data
    .token as string;
const call = async (
  path: string,
  body?: unknown,
  token?: string,
  method?: string,
) => {
  if (
    body &&
    typeof body === "object" &&
    path.endsWith("/answer") &&
    !("reason" in body)
  )
    body = { ...body, reason: "integration reason" };
  const response = await app.handle(
    new Request(`http://localhost${path}`, {
      method: method ?? (body ? "POST" : "GET"),
      headers: {
        ...(body ? { "content-type": "application/json" } : {}),
        ...(token ? { authorization: `Bearer ${token}` } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    }),
  );
  const data = await response.json();
  return { response, data };
};
describe.skipIf(!enabled)(
  "Database + real Elysia route integration (isolated businessverse_test)",
  () => {
    beforeAll(async () => {
      if (!process.env.DATABASE_URL?.includes("/businessverse_test"))
        throw Error("Refusing to reset a non-test database");
      ({ db, sqlClient } = await import("../apps/api/src/db"));
      schema = await import("../apps/api/src/db/schema");
      const { migrate } = await import("drizzle-orm/postgres-js/migrator");
      await migrate(db, {
        migrationsFolder: new URL("../apps/api/drizzle", import.meta.url)
          .pathname,
      });
      await sqlClient`truncate table final_answers, user_answers, questions, departments, users, competition restart identity cascade`;
      await sqlClient`insert into competition (id) values (1)`;
      const seed = Bun.spawn(["bun", "src/db/seed.ts"], {
        cwd: new URL("../apps/api", import.meta.url).pathname,
        stdout: "ignore",
        stderr: "pipe",
        env: process.env,
      });
      if ((await seed.exited) !== 0)
        throw Error(await new Response(seed.stderr).text());
      ({ app } = await import("../apps/api/src/index"));
      const admin = await call("/api/auth/login", {
        email: process.env.ADMIN_EMAIL,
        password: process.env.ADMIN_PASSWORD,
      });
      expect(admin.response.status).toBe(200);
      adminToken = admin.data.token;
      const generated = await call(
        "/api/admin/teams/generate",
        { count: 4 },
        adminToken,
      );
      expect(generated.response.status).toBe(200);
      expect(generated.data.participants).toHaveLength(4);
      for (const team of generated.data.participants) {
        expect(team.accessCode).toMatch(/^[A-Z2-9]{6}$/);
        expect(team.objective.id).toBe(
          ["growth", "premium", "cost", "customer"][team.teamNumber - 1],
        );
        codes[team.teamNumber] = team.accessCode;
      }
      const r = await call("/api/auth/team", {
        teamNumber: 1,
        code: codes[1].toLowerCase(),
      });
      expect(r.response.status).toBe(200);
      expect(r.data.user.role).toBe("attendee");
      expect(r.data.user.fullName).toBe("TEAM 001");
      playerToken = r.data.token;
      playerId = r.data.user.id;
      playerCookie = r.response.headers.get("set-cookie")!;
      departments = (await call("/api/departments")).data.departments;
      bank = (await call("/api/admin/questions", undefined, adminToken)).data
        .questions;
    }, 30000);
    afterAll(async () => {
      await sqlClient?.end();
    });
    test("healthy DB, eight departments, exactly three questions each", async () => {
      expect((await call("/health")).data).toEqual({
        status: "ok",
        db: "connected",
      });
      expect(departments).toHaveLength(8);
      for (const d of departments)
        expect(bank.filter((q) => q.departmentId === d.id)).toHaveLength(3);
    });
    test("HttpOnly cookie, no password hash or scores in attendee profile", async () => {
      expect(playerCookie).toContain("HttpOnly");
      expect(playerCookie).toContain("SameSite=Lax");
      const r = await call("/api/auth/me", undefined, playerToken);
      expect(r.data.user.passwordHash).toBeUndefined();
      expect(r.data.user.totalPoints).toBeUndefined();
      expect(r.response.headers.get("cache-control")).toBe("no-store");
    });
    test("rankings and answer bank reject anonymous and attendee access", async () => {
      for (const p of [
        "/api/admin/leaderboard",
        "/api/admin/questions",
        "/api/admin/overview",
        "/api/admin/participants",
      ]) {
        expect((await call(p)).response.status).toBe(401);
        expect((await call(p, undefined, playerToken)).response.status).toBe(
          403,
        );
      }
    });
    test("wrong team code, self-registration and cross-origin mutation reject", async () => {
      expect(
        (
          await call("/api/auth/team", {
            teamNumber: 1,
            code: codes[2] === codes[1] ? "ZZZZZZ" : codes[2],
          })
        ).response.status,
      ).toBe(401);
      expect(
        (await call("/api/auth/team", { teamNumber: 99, code: codes[1] }))
          .response.status,
      ).toBe(401);
      expect(
        (
          await call("/api/auth/register", {
            email: "x@integration.test",
            password: "Integration-Password-123",
            fullName: "Self",
            studentId: "SELF",
          })
        ).response.status,
      ).toBe(404);
      expect((await call("/api/teams")).data.teams).toEqual([1, 2, 3, 4]);
      const r = await app.handle(
        new Request("http://localhost/api/auth/logout", {
          method: "POST",
          headers: { origin: "https://untrusted.example" },
        }),
      );
      expect(r.status).toBe(403);
    });
    test("Q1 cannot be submitted before admin opens the gate", async () => {
      const d = departments[0],
        q = bank.find((q) => q.departmentId === d.id && q.questionNumber === 1);
      const state = await call(
        `/api/departments/${d.id}/state`,
        undefined,
        playerToken,
      );
      expect(state.data.status).toBe("locked");
      expect(state.data.question).toBeNull();
      expect(
        (
          await call(
            `/api/departments/${d.id}/answer`,
            { questionId: q.id, optionIds: [q.options[0].id] },
            playerToken,
          )
        ).response.status,
      ).toBe(403);
      expect(
        (await call(`/api/admin/departments/${d.id}/start-q1`, {}, playerToken))
          .response.status,
      ).toBe(403);
    });
    test("organizer can override a target before play; assignment survives login", async () => {
      const path = `/api/admin/participants/${playerId}/objective`;
      expect(
        (await call(path, { objectiveId: "premium" }, adminToken, "PATCH"))
          .response.status,
      ).toBe(200);
      expect(
        (await call("/api/auth/team", { teamNumber: 1, code: codes[1] })).data
          .user.objective.id,
      ).toBe("premium");
      expect(
        (await call(path, { objectiveId: "growth" }, adminToken, "PATCH"))
          .response.status,
      ).toBe(200);
    });
    test("Q1 gate, sequential enforcement, concurrency, auto-advance and completion stamp", async () => {
      const d = departments[0];
      expect(
        (await call(`/api/admin/departments/${d.id}/start-q1`, {}, adminToken))
          .response.status,
      ).toBe(200);
      const qs = bank
        .filter((q) => q.departmentId === d.id)
        .sort((a, b) => a.questionNumber - b.questionNumber);
      expect(
        (
          await call(
            `/api/departments/${d.id}/answer`,
            { questionId: qs[1].id, optionIds: [qs[1].options[0].id] },
            playerToken,
          )
        ).response.status,
      ).toBe(400);
      const state = (
        await call(`/api/departments/${d.id}/state`, undefined, playerToken)
      ).data;
      expect(state.question.options[0].knowledge).toBeUndefined();
      expect(state.question.options[0].fit).toBeUndefined();
      expect(state.question.options[0].effect).toBeUndefined();
      const submissions = await Promise.all(
        [1, 2].map(() =>
          call(
            `/api/departments/${d.id}/answer`,
            { questionId: qs[0].id, optionIds: [qs[0].options[0].id] },
            playerToken,
          ),
        ),
      );
      expect(submissions.map((r) => r.response.status).sort()).toEqual([
        200, 409,
      ]);
      expect(
        submissions.find((r) => r.response.status === 200)!.data.state
          .unlockedQuestion,
      ).toBe(2);
      const q2 = await call(
        `/api/departments/${d.id}/answer`,
        { questionId: qs[1].id, optionIds: [qs[1].options[0].id] },
        playerToken,
      );
      expect(q2.data.state.unlockedQuestion).toBe(3);
      const q3 = await call(
        `/api/departments/${d.id}/answer`,
        { questionId: qs[2].id, optionIds: [qs[2].options[0].id] },
        playerToken,
      );
      expect(q3.data.state.status).toBe("completed");
      const passport = (await call("/api/passport", undefined, playerToken))
        .data;
      expect(passport.departments[0].answered).toBe(3);
      expect(passport.answered).toBe(3);
      expect(passport.totalPoints).toBeUndefined();
    });
    test("target override is forbidden after play; participant cannot override it", async () => {
      const path = `/api/admin/participants/${playerId}/objective`;
      expect(
        (await call(path, { objectiveId: "customer" }, adminToken, "PATCH"))
          .response.status,
      ).toBe(409);
      expect(
        (await call(path, { objectiveId: "customer" }, playerToken, "PATCH"))
          .response.status,
      ).toBe(403);
    });
    test("complete original 24-question run, authoritative score, no double awards", async () => {
      const { simulate, selectionCost } =
        await import("../apps/api/src/game/engine");
      const answers = bank
        .filter((q) => q.departmentId === departments[0].id)
        .sort((a, b) => a.questionNumber - b.questionNumber)
        .map((q) => ({
          stage: q.questionNumber,
          optionIds: [q.options[0].id],
        }));
      for (const d of departments.slice(1)) {
        await call(`/api/admin/departments/${d.id}/start-q1`, {}, adminToken);
        for (let n = 1; n <= 3; n++) {
          const state = (
            await call(`/api/departments/${d.id}/state`, undefined, playerToken)
          ).data;
          expect(state.status).toBe("active");
          const q = bank.find((q) => q.id === state.question.id);
          const business = simulate("growth", answers).state;
          const choice = q.options.find(
            (o: any) => selectionCost(q, [o.id]) <= business.cash,
          );
          expect(choice).toBeDefined();
          const r = await call(
            `/api/departments/${d.id}/answer`,
            { questionId: q.id, optionIds: [choice.id] },
            playerToken,
          );
          expect(r.response.status).toBe(200);
          answers.push({
            stage: (d.displayOrder - 1) * 3 + n,
            optionIds: [choice.id],
          });
        }
      }
      const passport = (await call("/api/passport", undefined, playerToken))
        .data;
      expect(passport.completed).toBe(true);
      expect(passport.answered).toBe(24);
      expect(passport.departments.every((d: any) => d.answered === 3)).toBe(
        true,
      );
      const board = (
        await call("/api/admin/leaderboard", undefined, adminToken)
      ).data.leaderboard;
      expect(board).toHaveLength(4);
      expect(board.every((r: any) => r.isTop)).toBe(true);
      expect(board.find((r: any) => r.id === playerId).answered).toBe(24);
      expect(board.find((r: any) => r.id === playerId).totalPoints).toBeCloseTo(
        simulate("growth", answers).total,
        8,
      );
    });
    test("each question has a 3-minute window; overdue questions time out and advance", async () => {
      const d = departments[0];
      const token = await teamToken(2);
      await sqlClient`update departments set q1_unlocked_at = now() - interval '200 seconds' where id = ${d.id}`;
      const qs = bank
        .filter((q) => q.departmentId === d.id)
        .sort((a, b) => a.questionNumber - b.questionNumber);
      const state = (
        await call(`/api/departments/${d.id}/state`, undefined, token)
      ).data;
      expect(state.status).toBe("active");
      expect(state.timedOut).toBe(1);
      expect(state.question.id).toBe(qs[1].id);
      const remaining =
        new Date(state.timer.deadline).getTime() -
        new Date(state.timer.serverNow).getTime();
      expect(state.timer.seconds).toBe(180);
      expect(remaining).toBeGreaterThan(150_000);
      expect(remaining).toBeLessThanOrEqual(161_000);
      const late = await call(
        `/api/departments/${d.id}/answer`,
        { questionId: qs[0].id, optionIds: [qs[0].options[0].id] },
        token,
      );
      expect(late.response.status).toBe(409);
      expect(late.data.error).toContain("หมดเวลา");
      const q2 = await call(
        `/api/departments/${d.id}/answer`,
        { questionId: qs[1].id, optionIds: [qs[1].options[0].id] },
        token,
      );
      expect(q2.response.status).toBe(200);
      const q3Remaining =
        new Date(q2.data.state.timer.deadline).getTime() -
        new Date(q2.data.state.timer.serverNow).getTime();
      expect(q3Remaining).toBeGreaterThan(170_000);
      const passport = (await call("/api/passport", undefined, token)).data;
      expect(passport.answered).toBe(2);
    });
    test("answers require a team reason", async () => {
      const token = await teamToken(4);
      const d = departments[0];
      const q = bank.find(
        (q) => q.departmentId === d.id && q.questionNumber === 1,
      );
      expect(
        (
          await call(
            `/api/departments/${d.id}/answer`,
            { questionId: q.id, optionIds: [q.options[0].id], reason: " " },
            token,
          )
        ).response.status,
      ).toBe(400);
    });
    test("organizer can pause and resume a discipline with a fresh 3-minute clock", async () => {
      const token = await teamToken(2);
      const d = departments[0];
      const qs = bank
        .filter((q) => q.departmentId === d.id)
        .sort((a, b) => a.questionNumber - b.questionNumber);
      expect(
        (await call(`/api/admin/departments/${d.id}/stop`, {}, token)).response
          .status,
      ).toBe(403);
      expect(
        (await call(`/api/admin/departments/${d.id}/stop`, {}, adminToken))
          .response.status,
      ).toBe(200);
      const paused = (
        await call(`/api/departments/${d.id}/state`, undefined, token)
      ).data;
      expect(paused.status).toBe("locked");
      expect(paused.answered).toBe(2);
      expect(
        (
          await call(
            `/api/departments/${d.id}/answer`,
            { questionId: qs[2].id, optionIds: [qs[2].options[0].id] },
            token,
          )
        ).response.status,
      ).toBe(403);
      await call(`/api/admin/departments/${d.id}/start-q1`, {}, adminToken);
      const resumed = (
        await call(`/api/departments/${d.id}/state`, undefined, token)
      ).data;
      expect(resumed.status).toBe("active");
      expect(
        new Date(resumed.timer.deadline).getTime() -
          new Date(resumed.timer.serverNow).getTime(),
      ).toBeGreaterThan(175_000);
      expect(
        (
          await call(
            `/api/departments/${d.id}/answer`,
            { questionId: qs[2].id, optionIds: [qs[2].options[0].id] },
            token,
          )
        ).response.status,
      ).toBe(200);
    });
    test("organizer can review every decision and reason; teams cannot", async () => {
      const path = `/api/admin/participants/${playerId}/answers`;
      expect((await call(path, undefined, playerToken)).response.status).toBe(
        403,
      );
      const review = (await call(path, undefined, adminToken)).data;
      expect(review.answers).toHaveLength(24);
      expect(review.answers[0].reason).toBe("integration reason");
      expect(review.answers[0].choices.length).toBeGreaterThan(0);
      const participants = (
        await call("/api/admin/participants", undefined, adminToken)
      ).data.participants;
      const team2 = participants.find((p: any) => p.teamNumber === 2);
      const review2 = (
        await call(
          `/api/admin/participants/${team2.id}/answers`,
          undefined,
          adminToken,
        )
      ).data;
      expect(review2.answers[0].timedOut).toBe(true);
    });
    test("Top 10 final: snapshot finalists, closed qualifier, finalist-only scoring", async () => {
      expect(
        (await call("/api/admin/final/open", {}, playerToken)).response.status,
      ).toBe(403);
      const before = (await call("/api/final", undefined, playerToken)).data;
      expect(before.phase).toBe("qualifier");
      expect(before.question).toBeNull();
      const opened = await call("/api/admin/final/open", {}, adminToken);
      expect(opened.response.status).toBe(200);
      expect(opened.data.finalists).toBe(2);
      expect(
        (await call("/api/admin/final/open", {}, adminToken)).response.status,
      ).toBe(409);
      expect((await call("/api/competition")).data.phase).toBe("final");
      const f = (await call("/api/final", undefined, playerToken)).data;
      expect(f.isFinalist).toBe(true);
      expect(f.open).toBe(true);
      expect(f.timer.seconds).toBe(180);
      expect(f.question.options[0].fit).toBeUndefined();
      expect(f.question.options[0].effect).toBeUndefined();
      // Qualifier closes when the Final opens.
      const t3 = await teamToken(3);
      const s3 = (
        await call(`/api/departments/${departments[0].id}/state`, undefined, t3)
      ).data;
      expect(s3.status).toBe("closed");
      const saved = await call(
        "/api/final/answer",
        { optionId: "protect", reason: "keep cash safe" },
        playerToken,
      );
      expect(saved.response.status).toBe(200);
      expect(saved.data.saved.optionId).toBe("protect");
      expect(
        (
          await call(
            "/api/final/answer",
            { optionId: "transform", reason: "second try" },
            playerToken,
          )
        ).response.status,
      ).toBe(409);
      const audience = await call(
        "/api/final/answer",
        { optionId: "selective", reason: "audience view" },
        t3,
      );
      expect(audience.response.status).toBe(200);
      expect(audience.data.isFinalist).toBe(false);
      const board = (await call("/api/admin/leaderboard", undefined, adminToken))
        .data.leaderboard;
      const team1 = board.find((r: any) => r.id === playerId);
      // Team 1 target is growth: Protect the Core fits growth at 12 / 20.
      expect(team1.finalPoints).toBe(12);
      expect(team1.totalPoints).toBeCloseTo(team1.qualifierPoints + 12, 8);
      expect(team1.isTop).toBe(true);
      const team3 = board.find((r: any) => r.teamNumber === 3);
      expect(team3.isTop).toBe(false);
      expect(team3.totalPoints).toBe(0);
      expect(board.slice(0, 2).every((r: any) => r.finalistRank !== null)).toBe(
        true,
      );
    });
    test("closing locks answers; reset needs RESET and keeps team codes", async () => {
      expect(
        (await call("/api/admin/close", {}, adminToken)).response.status,
      ).toBe(200);
      const t2 = await teamToken(2);
      expect(
        (
          await call(
            "/api/final/answer",
            { optionId: "protect", reason: "too late" },
            t2,
          )
        ).response.status,
      ).toBe(403);
      expect(
        (await call("/api/admin/reset", { confirm: "reset" }, adminToken))
          .response.status,
      ).toBe(400);
      expect(
        (await call("/api/admin/reset", { confirm: "RESET" }, playerToken))
          .response.status,
      ).toBe(403);
      expect(
        (await call("/api/admin/reset", { confirm: "RESET" }, adminToken))
          .response.status,
      ).toBe(200);
      const board = (await call("/api/admin/leaderboard", undefined, adminToken))
        .data.leaderboard;
      expect(board).toHaveLength(4);
      expect(
        board.every(
          (r: any) =>
            r.answered === 0 && r.totalPoints === 0 && r.finalistRank === null,
        ),
      ).toBe(true);
      expect((await call("/api/competition")).data.phase).toBe("qualifier");
      expect(
        (await call("/api/departments")).data.departments.every(
          (d: any) => !d.isQ1Unlocked,
        ),
      ).toBe(true);
      expect(await teamToken(4)).toBeTruthy();
    });
    test("real-time stream authenticates and never sends scoreboard events to players", async () => {
      const { broadcast } = await import("../apps/api/src/modules/realtime");
      const a = new AbortController(),
        p = new AbortController();
      const open = async (token: string, signal: AbortSignal) => {
        const r = await app.handle(
          new Request("http://localhost/api/realtime/stream", {
            headers: { authorization: `Bearer ${token}` },
            signal,
          }),
        );
        expect(r.headers.get("content-type")).toContain("text/event-stream");
        return r.body!.getReader();
      };
      const ar = await open(adminToken, a.signal),
        pr = await open(playerToken, p.signal);
      const decode = new TextDecoder();
      expect(decode.decode((await ar.read()).value)).toContain("CONNECTED");
      expect(decode.decode((await pr.read()).value)).toContain("CONNECTED");
      broadcast("SCOREBOARD_UPDATED", { at: 1 });
      broadcast("DEPT_Q1_UNLOCKED", { departmentId: departments[0].id });
      expect(decode.decode((await ar.read()).value)).toContain(
        "SCOREBOARD_UPDATED",
      );
      const playerEvent = decode.decode((await pr.read()).value);
      expect(playerEvent).toContain("DEPT_Q1_UNLOCKED");
      expect(playerEvent).not.toContain("SCOREBOARD_UPDATED");
      a.abort();
      p.abort();
      await ar.cancel();
      await pr.cancel();
    });
  },
);
