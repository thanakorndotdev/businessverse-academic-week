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
    // Older local Bun versions register hooks even inside a skipped suite.
    // Register DB hooks only in the explicitly enabled integration runtime.
    if (!enabled) return;
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
    test("department reset requires organizer, exact code and no later answers", async () => {
      const d = departments[0];
      const path = `/api/admin/departments/${d.id}/reset`;
      const before = await sqlClient`select * from user_answers order by id`;
      expect((await call(path, { confirm: d.code })).response.status).toBe(401);
      expect(
        (await call(path, { confirm: d.code }, playerToken)).response.status,
      ).toBe(403);
      expect(
        (await call(path, { confirm: "WRONG" }, adminToken)).response.status,
      ).toBe(400);
      expect(
        (
          await call(
            "/api/admin/departments/00000000-0000-0000-0000-000000000000/reset",
            { confirm: d.code },
            adminToken,
          )
        ).response.status,
      ).toBe(404);
      const blocked = await call(path, { confirm: d.code }, adminToken);
      expect(blocked.response.status).toBe(409);
      expect(blocked.data.error).toContain(departments[1].nameTh);
      expect(await sqlClient`select * from user_answers order by id`).toEqual(
        before,
      );
    });
    test("reset last discipline preserves earlier answers, codes and scores; fresh Q1 can be replayed", async () => {
      const d = departments[7];
      const before =
        await sqlClient`select * from user_answers where department_id <> ${d.id} order by id`;
      const reviewBefore = (
        await call(
          `/api/admin/participants/${playerId}/answers`,
          undefined,
          adminToken,
        )
      ).data;
      const { simulate } = await import("../apps/api/src/game/engine");
      const saved = reviewBefore.answers.filter((a: any) => a.stage > 21);
      const result = await call(
        `/api/admin/departments/${d.id}/reset`,
        { confirm: d.code },
        adminToken,
      );
      expect(result.response.status).toBe(200);
      expect(result.data.deletedAnswers).toBe(3);
      expect(result.data.teams).toBe(1);
      expect(result.data.department.isQ1Unlocked).toBe(false);
      expect(result.data.department.q1UnlockedAt).toBeNull();
      expect(
        await sqlClient`select * from user_answers where department_id <> ${d.id} order by id`,
      ).toEqual(before);
      const remaining =
        await sqlClient`select (d.display_order - 1) * 3 + a.question_number as stage, a.option_ids as "optionIds" from user_answers a join departments d on d.id = a.department_id where a.user_id = ${playerId}`;
      const [team] =
        await sqlClient`select total_points, last_submission_at, access_code from users where id = ${playerId}`;
      const [last] =
        await sqlClient`select max(answered_at) as at from user_answers where user_id = ${playerId}`;
      expect(team.total_points).toBeCloseTo(
        simulate("growth", remaining as any).total,
        8,
      );
      expect(team.last_submission_at).toEqual(last.at);
      expect(team.access_code).toBe(codes[1]);
      const state = (
        await call(`/api/departments/${d.id}/state`, undefined, playerToken)
      ).data;
      expect(state.status).toBe("locked");
      expect(state.answered).toBe(0);
      expect(state.timer).toBeNull();
      const review = (
        await call(
          `/api/admin/participants/${playerId}/answers`,
          undefined,
          adminToken,
        )
      ).data;
      expect(review.answers).toHaveLength(21);
      expect(review.answers).toEqual(reviewBefore.answers.slice(0, 21));
      await call(`/api/admin/departments/${d.id}/start-q1`, {}, adminToken);
      const opened = (
        await call(`/api/departments/${d.id}/state`, undefined, playerToken)
      ).data;
      expect(opened.unlockedQuestion).toBe(1);
      expect(
        new Date(opened.timer.deadline).getTime() -
          new Date(opened.timer.serverNow).getTime(),
      ).toBeGreaterThan(175_000);
      for (const answer of saved) {
        const q = bank.find(
          (q) =>
            q.departmentId === d.id &&
            q.questionNumber === answer.questionNumber,
        );
        const optionIds = answer.choices.map(
          (title: string) => q.options.find((o: any) => o.title === title).id,
        );
        const replay = await call(
          `/api/departments/${d.id}/answer`,
          { questionId: q.id, optionIds, reason: answer.reason },
          playerToken,
        );
        expect(replay.response.status).toBe(200);
      }
      expect(
        (await call("/api/passport", undefined, playerToken)).data.answered,
      ).toBe(24);
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
      expect(
        (
          await call(
            `/api/admin/departments/${departments[7].id}/reset`,
            { confirm: departments[7].code },
            adminToken,
          )
        ).response.status,
      ).toBe(409);
      const f = (await call("/api/final", undefined, playerToken)).data;
      expect(f.isFinalist).toBe(true);
      expect(f.open).toBe(true);
      expect(f.timer.seconds).toBe(180);
      expect(f.question.sections).toHaveLength(8);
      for (const section of f.question.sections)
        for (const option of section.options) {
          expect(Object.keys(option).sort()).toEqual([
            "benefit",
            "coins",
            "id",
            "title",
            "tradeoff",
          ]);
        }
      const selections = [
        ["management", "stabilize"],
        ["marketing", "retain"],
        ["esport", "community"],
        ["digitalMarketing", "context"],
        ["innovation", "contain"],
        ["international", "pilot"],
        ["logistics", "dual"],
        ["finance", "credit"],
      ].map(([sectionId, optionId]) => ({ sectionId, optionId }));
      const body = {
        selections,
        reason: "stabilize first, controlled growth with reserves",
      };
      expect(
        (
          await call(
            "/api/final/answer",
            { ...body, selections: selections.slice(1) },
            playerToken,
          )
        ).response.status,
      ).toBe(400);
      expect(
        (
          await call(
            "/api/final/answer",
            { ...body, selections: [...selections.slice(0, 7), selections[0]] },
            playerToken,
          )
        ).response.status,
      ).toBe(400);
      expect(
        (
          await call(
            "/api/final/answer",
            {
              ...body,
              selections: selections.map((s, i) =>
                i === 0 ? { ...s, optionId: "contain" } : s,
              ),
            },
            playerToken,
          )
        ).response.status,
      ).toBe(400);
      expect(
        (await call("/api/final/answer", body, adminToken)).response.status,
      ).toBe(403);
      const overspend = selections.map((s) => ({
        ...s,
        optionId:
          s.sectionId === "international"
            ? "launch"
            : s.sectionId === "esport"
              ? "arena"
              : s.sectionId === "finance"
                ? "weekly"
                : s.optionId,
      }));
      expect(
        (
          await call(
            "/api/final/answer",
            { ...body, selections: overspend },
            playerToken,
          )
        ).response.status,
      ).toBe(400);
      // Qualifier closes when the Final opens.
      const t3 = await teamToken(3);
      const s3 = (
        await call(`/api/departments/${departments[0].id}/state`, undefined, t3)
      ).data;
      expect(s3.status).toBe("closed");
      // An overdue plan is rejected without writing an answer or awarding points.
      await sqlClient`update competition set final_opened_at = now() - interval '4 minutes' where id = 1`;
      expect((await call("/api/final", undefined, playerToken)).data.open).toBe(
        false,
      );
      expect(
        (await call("/api/final/answer", body, playerToken)).response.status,
      ).toBe(409);
      expect(
        (await sqlClient`select count(*)::int as n from final_answers`)[0].n,
      ).toBe(0);
      await sqlClient`update competition set final_opened_at = now() where id = 1`;
      const attempts = await Promise.all([
        call("/api/final/answer", body, playerToken),
        call("/api/final/answer", body, playerToken),
      ]);
      expect(attempts.map((a) => a.response.status).sort()).toEqual([200, 409]);
      const saved = attempts.find((a) => a.response.status === 200)!;
      expect(saved.response.status).toBe(200);
      expect(saved.data.saved.selections).toEqual(selections);
      expect(saved.data.saved.assessment).toBeUndefined();
      expect(saved.data.saved.fit).toBeUndefined();
      expect(saved.data.saved.total).toBeUndefined();
      expect(
        (
          await call(
            "/api/final/answer",
            { ...body, reason: "second try" },
            playerToken,
          )
        ).response.status,
      ).toBe(409);
      const audience = await call(
        "/api/final/answer",
        { ...body, reason: "audience view" },
        t3,
      );
      expect(audience.response.status).toBe(200);
      expect(audience.data.isFinalist).toBe(false);
      const board = (
        await call("/api/admin/leaderboard", undefined, adminToken)
      ).data.leaderboard;
      const team1 = board.find((r: any) => r.id === playerId);
      expect(team1.finalPoints).toBe(20);
      expect(team1.totalPoints).toBeCloseTo(team1.qualifierPoints + 20, 8);
      const review = (
        await call(
          `/api/admin/participants/${playerId}/answers`,
          undefined,
          adminToken,
        )
      ).data;
      expect(review.final.selections).toHaveLength(8);
      expect(review.final.assessment.disciplinePoints).toBe(16);
      expect(review.final.assessment.planPoints).toBe(4);
      expect(review.final.assessment.total).toBe(20);
      expect(review.final.assessment.companyState).toEqual(f.companyState);
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
      expect(
        (
          await call(
            `/api/admin/departments/${departments[7].id}/reset`,
            { confirm: departments[7].code },
            adminToken,
          )
        ).response.status,
      ).toBe(409);
      const t2 = await teamToken(2);
      const selections = [
        ["management", "stabilize"],
        ["marketing", "retain"],
        ["esport", "community"],
        ["digitalMarketing", "context"],
        ["innovation", "contain"],
        ["international", "pilot"],
        ["logistics", "dual"],
        ["finance", "credit"],
      ].map(([sectionId, optionId]) => ({ sectionId, optionId }));
      expect(
        (
          await call(
            "/api/final/answer",
            { selections, reason: "too late" },
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
      const board = (
        await call("/api/admin/leaderboard", undefined, adminToken)
      ).data.leaderboard;
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
    test("reset first discipline clears every team's decisions and timeout records, retaining team identities", async () => {
      const d = departments[0];
      await call(`/api/admin/departments/${d.id}/start-q1`, {}, adminToken);
      const q = bank.find(
        (q) => q.departmentId === d.id && q.questionNumber === 1,
      );
      expect(
        (
          await call(
            `/api/departments/${d.id}/answer`,
            { questionId: q.id, optionIds: [q.options[0].id] },
            playerToken,
          )
        ).response.status,
      ).toBe(200);
      await sqlClient`update departments set q1_unlocked_at = now() - interval '200 seconds' where id = ${d.id}`;
      const token2 = await teamToken(2);
      expect(
        (await call(`/api/departments/${d.id}/state`, undefined, token2)).data
          .timedOut,
      ).toBe(1);
      const before =
        await sqlClient`select id, full_name, objective_id, access_code from users order by id`;
      const result = await call(
        `/api/admin/departments/${d.id}/reset`,
        { confirm: d.code },
        adminToken,
      );
      expect(result.response.status).toBe(200);
      expect(result.data.deletedAnswers).toBe(2);
      expect(result.data.teams).toBe(2);
      expect(
        await sqlClient`select id, full_name, objective_id, access_code from users order by id`,
      ).toEqual(before);
      expect(await sqlClient`select id from user_answers`).toHaveLength(0);
      const scores =
        await sqlClient`select total_points, last_submission_at from users where role = 'attendee'`;
      expect(
        scores.every(
          (u: any) => u.total_points === 0 && u.last_submission_at === null,
        ),
      ).toBe(true);
      for (const token of [playerToken, token2]) {
        const state = (
          await call(`/api/departments/${d.id}/state`, undefined, token)
        ).data;
        expect(state.status).toBe("locked");
        expect(state.answered).toBe(0);
        expect(state.timedOut).toBe(0);
      }
      const again = await call(
        `/api/admin/departments/${d.id}/reset`,
        { confirm: d.code },
        adminToken,
      );
      expect(again.response.status).toBe(200);
      expect(again.data.deletedAnswers).toBe(0);
      expect(again.data.teams).toBe(0);
      for (const n of [1, 2, 3, 4]) expect(await teamToken(n)).toBeTruthy();
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
    test("organizer can lower the team count and delete single teams", async () => {
      const roster = async () =>
        (await call("/api/admin/participants", undefined, adminToken)).data
          .participants as any[];
      const grown = await call(
        "/api/admin/teams/generate",
        { count: 6 },
        adminToken,
      );
      expect(grown.response.status).toBe(200);
      expect(grown.data.participants).toHaveLength(6);
      const code5 = grown.data.participants[4].accessCode;
      // Lowering the count removes teams above it without touching the rest.
      const shrunk = await call(
        "/api/admin/teams/generate",
        { count: 4 },
        adminToken,
      );
      expect(shrunk.response.status).toBe(200);
      expect(shrunk.data.participants.map((p: any) => p.teamNumber)).toEqual([
        1, 2, 3, 4,
      ]);
      for (const p of shrunk.data.participants)
        expect(p.accessCode).toBe(codes[p.teamNumber]);
      expect(
        (await call("/api/auth/team", { teamNumber: 5, code: code5 })).response
          .status,
      ).toBe(401);
      // Teams that already answered need the typed confirmation.
      const team4 = shrunk.data.participants[3];
      const q = bank.find((b) => b.departmentId === departments[0].id);
      await sqlClient`insert into user_answers (user_id, department_id, question_id, question_number, selected_option_index, option_ids, is_correct, points_earned)
        values (${team4.id}, ${q.departmentId}, ${q.id}, 1, 0, '[]'::jsonb, false, 0)`;
      const refused = await call(
        "/api/admin/teams/generate",
        { count: 3 },
        adminToken,
      );
      expect(refused.response.status).toBe(409);
      expect(await roster()).toHaveLength(4);
      const confirmed = await call(
        "/api/admin/teams/generate",
        { count: 3, confirm: "DELETE" },
        adminToken,
      );
      expect(confirmed.response.status).toBe(200);
      expect(confirmed.data.participants).toHaveLength(3);
      const [left] =
        await sqlClient`select count(*)::int as n from user_answers where user_id = ${team4.id}`;
      expect(left.n).toBe(0);
      // Single-team delete: organizer only.
      const team3 = confirmed.data.participants[2];
      expect(
        (
          await call(
            `/api/admin/participants/${team3.id}`,
            undefined,
            playerToken,
            "DELETE",
          )
        ).response.status,
      ).toBe(403);
      const deleted = await call(
        `/api/admin/participants/${team3.id}`,
        undefined,
        adminToken,
        "DELETE",
      );
      expect(deleted.response.status).toBe(200);
      expect(deleted.data.participants.map((p: any) => p.teamNumber)).toEqual([
        1, 2,
      ]);
      // Restore the roster for later suites; 1 and 2 keep their codes.
      const restored = await call(
        "/api/admin/teams/generate",
        { count: 4 },
        adminToken,
      );
      expect(restored.data.participants).toHaveLength(4);
      for (const n of [1, 2])
        expect(restored.data.participants[n - 1].accessCode).toBe(codes[n]);
    });
    // Runs last: it wipes the roster and the issued codes.
    test("organizer can delete every team at once", async () => {
      const roster = await call(
        "/api/admin/participants",
        undefined,
        adminToken,
      );
      const team1 = roster.data.participants[0];
      const q = bank.find((b) => b.departmentId === departments[0].id);
      await sqlClient`insert into user_answers (user_id, department_id, question_id, question_number, selected_option_index, option_ids, is_correct, points_earned)
        values (${team1.id}, ${q.departmentId}, ${q.id}, 1, 0, '[]'::jsonb, false, 0)
        on conflict do nothing`;
      expect(
        (
          await call(
            "/api/admin/participants",
            undefined,
            playerToken,
            "DELETE",
          )
        ).response.status,
      ).toBe(403);
      const refused = await call(
        "/api/admin/participants",
        undefined,
        adminToken,
        "DELETE",
      );
      expect(refused.response.status).toBe(409);
      const wiped = await call(
        "/api/admin/participants?confirm=DELETE",
        undefined,
        adminToken,
        "DELETE",
      );
      expect(wiped.response.status).toBe(200);
      expect(wiped.data.participants).toEqual([]);
      const [left] =
        await sqlClient`select count(*)::int as n from users where role = 'attendee'`;
      expect(left.n).toBe(0);
      expect(
        (await call("/api/auth/me", undefined, playerToken)).response.status,
      ).toBe(401);
      const regrown = await call(
        "/api/admin/teams/generate",
        { count: 2 },
        adminToken,
      );
      expect(regrown.data.participants).toHaveLength(2);
    });
  },
);
