import { timingSafeEqual } from "node:crypto";
import { and, asc, eq, gt, inArray, sql } from "drizzle-orm";
import { db } from "../db";
import {
  users,
  departments,
  questions,
  userAnswers,
  competition,
  finalAnswers,
} from "../db/schema";
import {
  FINALIST_COUNT,
  QUESTION_SECONDS,
  QUESTION_GRACE_SECONDS,
  objectiveForTeam,
  objectives,
  simulate,
  type ObjectiveId,
} from "../game/engine";
import {
  ApiError,
  getAnswers,
  getCompetition,
  leaderboard,
  type User,
} from "./game";
import {
  FINAL_VERSION,
  finalSections,
  publicFinalScenario,
  scoreFinalPlan,
  validateFinalPlan,
  type FinalSelection,
} from "../game/final";

// Unambiguous characters only: no 0/O, 1/I/L.
const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
export function newAccessCode(length = 6) {
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(bytes, (b) => CODE_ALPHABET[b % CODE_ALPHABET.length]).join(
    "",
  );
}
export const teamLabel = (n: number) => `TEAM ${String(n).padStart(3, "0")}`;

/** Team numbers that can sign in (shown on the join screen). */
export async function teamNumbers() {
  const rows = await db
    .select({ teamNumber: users.teamNumber })
    .from(users)
    .where(
      and(eq(users.role, "attendee"), sql`${users.accessCode} is not null`),
    )
    .orderBy(asc(users.teamNumber));
  return rows.map((r) => r.teamNumber);
}

/** Sign-in for a team: number + organizer-issued code (case-insensitive). */
export async function teamLogin(teamNumber: number, code: string) {
  const [team] = await db
    .select()
    .from(users)
    .where(and(eq(users.teamNumber, teamNumber), eq(users.role, "attendee")));
  const expected = team?.accessCode ?? "";
  const given = code.trim().toUpperCase();
  const a = Buffer.from(expected.padEnd(32).slice(0, 32));
  const b = Buffer.from(given.padEnd(32).slice(0, 32));
  const same =
    !!team &&
    expected.length > 0 &&
    given.length === expected.length &&
    timingSafeEqual(a, b);
  if (!same) throw new ApiError(401, "หมายเลขทีมหรือรหัสทีมไม่ถูกต้อง");
  return team;
}

/** Typed confirmation required before deleting teams that already have progress. */
export const DELETE_CONFIRM = "DELETE";

/**
 * Removes attendee teams and everything they submitted. Teams that already
 * answered (qualifier or final) are only removed with the typed confirmation.
 */
async function removeTeams(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  ids: string[],
  confirm?: string,
) {
  if (!ids.length) return 0;
  const [answers] = await tx
    .select({ n: sql<number>`count(*)::int` })
    .from(userAnswers)
    .where(inArray(userAnswers.userId, ids));
  const [finals] = await tx
    .select({ n: sql<number>`count(*)::int` })
    .from(finalAnswers)
    .where(inArray(finalAnswers.userId, ids));
  if ((answers.n > 0 || finals.n > 0) && confirm !== DELETE_CONFIRM)
    throw new ApiError(
      409,
      `ทีมที่จะลบมีคำตอบแล้ว (${answers.n + finals.n} คำตอบ) พิมพ์ ${DELETE_CONFIRM} เพื่อยืนยัน`,
    );
  await tx.delete(userAnswers).where(inArray(userAnswers.userId, ids));
  await tx.delete(finalAnswers).where(inArray(finalAnswers.userId, ids));
  await tx
    .delete(users)
    .where(and(inArray(users.id, ids), eq(users.role, "attendee")));
  return ids.length;
}

/**
 * Makes teams 1..count the full roster. Existing teams in range keep their
 * names, targets, answers and codes; only missing codes are issued, because
 * codes are printed and fixed to each team's seat. Teams numbered above
 * count are deleted (with confirmation when they already have answers).
 */
export async function generateTeams(count: number, confirm?: string) {
  await db.transaction(async (tx) => {
    const existing = await tx
      .select()
      .from(users)
      .where(eq(users.role, "attendee"));
    await removeTeams(
      tx,
      existing.filter((u) => u.teamNumber > count).map((u) => u.id),
      confirm,
    );
    for (let n = 1; n <= count; n++) {
      const team = existing.find((u) => u.teamNumber === n);
      if (team) {
        if (!team.accessCode)
          await tx
            .update(users)
            .set({ accessCode: newAccessCode() })
            .where(eq(users.id, team.id));
        continue;
      }
      await tx.insert(users).values({
        teamNumber: n,
        fullName: teamLabel(n),
        accessCode: newAccessCode(),
        objectiveId: objectiveForTeam(n),
        role: "attendee",
      });
    }
    // Keep the serial sequence ahead of explicit team numbers.
    await tx.execute(
      sql`select setval(pg_get_serial_sequence('users', 'team_number'), greatest((select max(team_number) from users), 1))`,
    );
  });
  return adminTeams();
}

/** Deletes one team, its code and its answers. */
export async function deleteTeam(id: string, confirm?: string) {
  await db.transaction(async (tx) => {
    const [team] = await tx
      .select({ id: users.id })
      .from(users)
      .where(and(eq(users.id, id), eq(users.role, "attendee")))
      .for("update");
    if (!team) throw new ApiError(404, "ไม่พบทีม");
    await removeTeams(tx, [team.id], confirm);
  });
  return adminTeams();
}

/** Deletes every attendee team, their codes and answers. */
export async function deleteAllTeams(confirm?: string) {
  await db.transaction(async (tx) => {
    const teams = await tx
      .select({ id: users.id })
      .from(users)
      .where(eq(users.role, "attendee"))
      .for("update");
    await removeTeams(
      tx,
      teams.map((u) => u.id),
      confirm,
    );
  });
  return adminTeams();
}

export async function renameTeam(user: User, name: string) {
  if (user.role !== "attendee") throw new ApiError(403, "เฉพาะทีมผู้เล่น");
  const clean = name.trim().replace(/\s+/g, " ");
  if (clean.length < 2) throw new ApiError(400, "ชื่อทีมต้องมีอย่างน้อย 2 ตัวอักษร");
  const [updated] = await db
    .update(users)
    .set({ fullName: clean.slice(0, 36) })
    .where(eq(users.id, user.id))
    .returning();
  return updated;
}

/** Organizer view of every team, including access codes and progress. */
export async function adminTeams() {
  const rows = await db
    .select({
      id: users.id,
      teamNumber: users.teamNumber,
      fullName: users.fullName,
      email: users.email,
      accessCode: users.accessCode,
      objectiveId: users.objectiveId,
      finalistRank: users.finalistRank,
      answered: sql<number>`(select count(*)::int from user_answers where user_answers.user_id = "users"."id")`,
    })
    .from(users)
    .where(eq(users.role, "attendee"))
    .orderBy(asc(users.teamNumber));
  return rows.map((r) => ({
    ...r,
    objective: objectives.find((o) => o.id === r.objectiveId)!,
  }));
}

/** Every decision a team made, with its written reason, for organizer review. */
export async function teamAnswers(id: string) {
  const [team] = await db
    .select()
    .from(users)
    .where(and(eq(users.id, id), eq(users.role, "attendee")));
  if (!team) throw new ApiError(404, "ไม่พบทีม");
  const rows = await db
    .select({
      department: departments.nameTh,
      displayOrder: departments.displayOrder,
      questionNumber: userAnswers.questionNumber,
      title: questions.title,
      options: questions.options,
      optionIds: userAnswers.optionIds,
      reason: userAnswers.reason,
      answeredAt: userAnswers.answeredAt,
    })
    .from(userAnswers)
    .innerJoin(departments, eq(departments.id, userAnswers.departmentId))
    .innerJoin(questions, eq(questions.id, userAnswers.questionId))
    .where(eq(userAnswers.userId, id))
    .orderBy(asc(departments.displayOrder), asc(userAnswers.questionNumber));
  const [final] = await db
    .select()
    .from(finalAnswers)
    .where(eq(finalAnswers.userId, id));
  return {
    team: { id: team.id, teamNumber: team.teamNumber, fullName: team.fullName },
    answers: rows.map((r) => ({
      stage: (r.displayOrder - 1) * 3 + r.questionNumber,
      department: r.department,
      questionNumber: r.questionNumber,
      title: r.title,
      timedOut: r.optionIds.length === 0,
      choices: r.optionIds.map(
        (oid) => r.options.find((o) => o.id === oid)?.title ?? oid,
      ),
      reason: r.reason,
      answeredAt: r.answeredAt,
    })),
    final: final
      ? {
          choice: final.selections.length ? "แผนกู้ธุรกิจ 12 เดือน" : final.optionId,
          selections: final.selections.map((selection) => ({
            ...selection,
            section:
              finalSections.find((s) => s.id === selection.sectionId)?.title ??
              selection.sectionId,
            title:
              finalSections
                .find((s) => s.id === selection.sectionId)
                ?.options.find((o) => o.id === selection.optionId)?.title ??
              selection.optionId,
          })),
          assessment: final.assessment,
          reason: final.reason,
          isFinalist: final.isFinalist,
          fit: final.fit,
          answeredAt: final.answeredAt,
        }
      : null,
  };
}

/** Snapshots the current Top 10 as finalists and opens the Final round. */
export async function openFinal() {
  return db.transaction(async (tx) => {
    await tx.execute(sql`select 1 from competition where id = 1 for update`);
    const current = await getCompetition(tx);
    if (current.phase !== "qualifier")
      throw new ApiError(409, "เปิดรอบ Final ไปแล้ว");
    const board = (await leaderboard()).filter((r) => r.answered > 0);
    if (!board.length) throw new ApiError(409, "ยังไม่มีทีมที่มีคะแนน");
    const top = board.slice(0, FINALIST_COUNT);
    for (const [i, r] of top.entries())
      await tx
        .update(users)
        .set({ finalistRank: i + 1, finalPoints: 0 })
        .where(eq(users.id, r.id));
    const [row] = await tx
      .update(competition)
      .set({ phase: "final", finalOpenedAt: new Date() })
      .where(eq(competition.id, 1))
      .returning();
    return { competition: row, finalists: top.length };
  });
}

export async function closeCompetition() {
  const [row] = await db
    .update(competition)
    .set({ phase: "closed", closedAt: new Date() })
    .where(eq(competition.id, 1))
    .returning();
  return { competition: row };
}

/** Clears all answers, scores, finalists and gates. Teams and codes stay. */
export async function resetCompetition() {
  await db.transaction(async (tx) => {
    await tx.delete(finalAnswers);
    await tx.delete(userAnswers);
    await tx.update(users).set({
      totalPoints: 0,
      finalPoints: 0,
      finalistRank: null,
      lastSubmissionAt: null,
    });
    await tx
      .update(departments)
      .set({ isQ1Unlocked: false, q1UnlockedAt: null });
    await tx
      .update(competition)
      .set({ phase: "qualifier", finalOpenedAt: null, closedAt: null })
      .where(eq(competition.id, 1));
  });
  return { reset: true };
}

/**
 * Rewinds one discipline to "not started": deletes every team's answers for
 * it, re-scores those teams from their remaining decisions and closes its gate.
 * Decisions carry company state forward, so a discipline can only be reset
 * while no later discipline has answers.
 */
export async function resetDepartment(id: string, confirm: string) {
  return db.transaction(async (tx) => {
    await tx.execute(sql`select 1 from competition where id = 1 for update`);
    if ((await getCompetition(tx)).phase !== "qualifier")
      throw new ApiError(409, "รีเซ็ตรายสาขาได้เฉพาะช่วงรอบคัดเลือก");
    const [dept] = await tx
      .select()
      .from(departments)
      .where(eq(departments.id, id));
    if (!dept) throw new ApiError(404, "ไม่พบสาขานี้");
    if (confirm.trim() !== dept.code)
      throw new ApiError(400, `พิมพ์ ${dept.code} เพื่อยืนยันการรีเซ็ตสาขานี้`);
    // Submissions and timeouts hold their team's row lock, so none is in
    // flight once every team row is locked here.
    const teams = await tx
      .select()
      .from(users)
      .where(eq(users.role, "attendee"))
      .orderBy(asc(users.id))
      .for("update");
    const later = await tx
      .selectDistinct({
        nameTh: departments.nameTh,
        displayOrder: departments.displayOrder,
      })
      .from(userAnswers)
      .innerJoin(departments, eq(departments.id, userAnswers.departmentId))
      .where(gt(departments.displayOrder, dept.displayOrder))
      .orderBy(asc(departments.displayOrder));
    if (later.length)
      throw new ApiError(
        409,
        `ต้องรีเซ็ตสาขาที่อยู่ถัดไปก่อน: ${later.map((d) => d.nameTh).join(", ")}`,
      );
    const removed = await tx
      .delete(userAnswers)
      .where(eq(userAnswers.departmentId, dept.id))
      .returning({ userId: userAnswers.userId });
    const affected = new Set(removed.map((r) => r.userId));
    const remaining = affected.size
      ? await tx
          .select({
            userId: userAnswers.userId,
            optionIds: userAnswers.optionIds,
            stage: sql<number>`(${departments.displayOrder} - 1) * 3 + ${userAnswers.questionNumber}`,
          })
          .from(userAnswers)
          .innerJoin(departments, eq(departments.id, userAnswers.departmentId))
          .where(inArray(userAnswers.userId, [...affected]))
      : [];
    for (const team of teams) {
      if (!affected.has(team.id)) continue;
      const kept = remaining.filter((a) => a.userId === team.id);
      await tx
        .update(users)
        .set({
          totalPoints: kept.length
            ? simulate(team.objectiveId as ObjectiveId, kept).total
            : 0,
          // Preserve PostgreSQL's timestamp precision for ranking tie-breaks.
          lastSubmissionAt: sql`(select max(${userAnswers.answeredAt}) from ${userAnswers} where ${userAnswers.userId} = ${team.id})`,
        })
        .where(eq(users.id, team.id));
    }
    const [department] = await tx
      .update(departments)
      .set({ isQ1Unlocked: false, q1UnlockedAt: null })
      .where(eq(departments.id, dept.id))
      .returning();
    return { department, deletedAnswers: removed.length, teams: affected.size };
  });
}

const finalWindow = (openedAt: Date | null) =>
  openedAt
    ? {
        startsAt: openedAt.toISOString(),
        deadline: new Date(
          openedAt.getTime() + QUESTION_SECONDS * 1000,
        ).toISOString(),
        serverNow: new Date().toISOString(),
        seconds: QUESTION_SECONDS,
      }
    : null;

/** What a team sees for the Final. Never reveals fit or ranks. */
export async function finalStateFor(user: User) {
  const c = await getCompetition();
  const [mine] = await db
    .select()
    .from(finalAnswers)
    .where(eq(finalAnswers.userId, user.id));
  const answers = await getAnswers(user.id);
  const companyState = simulate(user.objectiveId as ObjectiveId, answers).state;
  const timer = c.phase === "final" ? finalWindow(c.finalOpenedAt) : null;
  const expired =
    !!timer &&
    Date.now() >
      new Date(timer.deadline).getTime() + QUESTION_GRACE_SECONDS * 1000;
  return {
    phase: c.phase,
    companyState,
    objective: objectives.find((o) => o.id === user.objectiveId)!,
    isFinalist: user.finalistRank !== null,
    open: c.phase === "final" && !mine && !expired,
    timer: mine || expired ? null : timer,
    saved: mine
      ? {
          selections: mine.selections,
          legacyChoice: mine.selections.length ? null : mine.optionId,
          reason: mine.reason,
          answeredAt: mine.answeredAt,
        }
      : null,
    question: c.phase === "qualifier" ? null : publicFinalScenario(),
  };
}

export async function submitFinal(
  user: User,
  selections: FinalSelection[],
  reason: string,
) {
  if (user.role !== "attendee") throw new ApiError(403, "เฉพาะทีมผู้เล่น");
  const clean = reason.trim();
  if (clean.length < 3)
    throw new ApiError(400, "กรุณาเขียนเหตุผลของทีมอย่างน้อย 3 ตัวอักษร");
  if (clean.length > 300) throw new ApiError(400, "เหตุผลยาวได้ไม่เกิน 300 ตัวอักษร");
  try {
    validateFinalPlan(selections);
  } catch (error) {
    throw new ApiError(400, (error as Error).message);
  }
  await db.transaction(async (tx) => {
    // Serialize phase changes against the entire scoring transaction.
    await tx.execute(sql`select 1 from competition where id = 1 for share`);
    const [locked] = await tx
      .select()
      .from(users)
      .where(eq(users.id, user.id))
      .for("update");
    const c = await getCompetition(tx);
    if (c.phase !== "final" || !c.finalOpenedAt)
      throw new ApiError(403, "ยังไม่เปิดรับคำตอบ Final");
    if (
      Date.now() >
      c.finalOpenedAt.getTime() +
        (QUESTION_SECONDS + QUESTION_GRACE_SECONDS) * 1000
    )
      throw new ApiError(409, "หมดเวลา 3 นาทีของรอบ Final แล้ว");
    const [dup] = await tx
      .select({ id: finalAnswers.userId })
      .from(finalAnswers)
      .where(eq(finalAnswers.userId, user.id));
    if (dup) throw new ApiError(409, "บันทึกคำตอบ Final แล้ว");
    const isFinalist = locked.finalistRank !== null;
    const answers = await tx
      .select({
        optionIds: userAnswers.optionIds,
        stage: sql<number>`(${departments.displayOrder} - 1) * 3 + ${userAnswers.questionNumber}`,
      })
      .from(userAnswers)
      .innerJoin(departments, eq(departments.id, userAnswers.departmentId))
      .where(eq(userAnswers.userId, user.id));
    const state = simulate(locked.objectiveId as ObjectiveId, answers).state;
    const assessment = scoreFinalPlan(
      locked.objectiveId as ObjectiveId,
      state,
      selections,
    );
    const fit = assessment.total;
    await tx.insert(finalAnswers).values({
      userId: user.id,
      optionId: FINAL_VERSION,
      selections,
      assessment,
      reason: clean.slice(0, 300),
      isFinalist,
      fit,
    });
    // Audience teams may answer, but only finalists score.
    if (isFinalist)
      await tx
        .update(users)
        .set({ finalPoints: fit })
        .where(eq(users.id, user.id));
  });
  return finalStateFor(
    (await db.select().from(users).where(eq(users.id, user.id)))[0],
  );
}
