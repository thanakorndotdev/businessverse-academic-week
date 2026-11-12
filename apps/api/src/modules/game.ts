import { and, asc, eq, sql } from "drizzle-orm";
import { db } from "../db";
import {
  users,
  departments,
  questions,
  userAnswers,
  competition,
} from "../db/schema";
import { markPresence } from "./presence";
import { broadcast } from "./realtime";
import {
  objectives,
  simulate,
  targetAchieved,
  QUESTION_SECONDS,
  QUESTION_GRACE_SECONDS,
  FINALIST_COUNT,
  type ObjectiveId,
} from "../game/engine";
type Executor = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];
export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export type User = typeof users.$inferSelect;
export const requireUser = (user: User | null) => {
  if (!user) throw new ApiError(401, "กรุณาเข้าสู่ระบบเพื่อเล่นต่อ");
  return user;
};
export const requireAdmin = (user: User | null) => {
  const u = requireUser(user);
  if (u.role !== "admin") throw new ApiError(403, "เฉพาะผู้จัดงานเท่านั้น");
  return u;
};
export type Phase = "qualifier" | "final" | "closed";
/** The single competition row; created by migration, re-created defensively. */
export async function getCompetition(ex: Executor = db) {
  const [row] = await ex.select().from(competition).where(eq(competition.id, 1));
  if (row) return { ...row, phase: row.phase as Phase };
  const [created] = await ex
    .insert(competition)
    .values({ id: 1 })
    .onConflictDoNothing()
    .returning();
  return { ...(created ?? (await ex.select().from(competition))[0]), phase: "qualifier" as Phase };
}
export const publicUser = (u: User) => ({
  id: u.id,
  fullName: u.fullName,
  teamNumber: u.teamNumber,
  role: u.role,
  objective: objectives.find((o) => o.id === u.objectiveId)!,
});
export async function listDepartments() {
  return db.select().from(departments).orderBy(asc(departments.displayOrder));
}
export async function getAnswers(userId: string) {
  return db
    .select({
      departmentId: userAnswers.departmentId,
      questionId: userAnswers.questionId,
      questionNumber: userAnswers.questionNumber,
      optionIds: userAnswers.optionIds,
      stage: sql<number>`(${departments.displayOrder} - 1) * 3 + ${userAnswers.questionNumber}`,
    })
    .from(userAnswers)
    .innerJoin(departments, eq(departments.id, userAnswers.departmentId))
    .where(eq(userAnswers.userId, userId))
    .orderBy(asc(departments.displayOrder), asc(userAnswers.questionNumber));
}
async function loadAnswers(ex: Executor, userId: string) {
  return ex
    .select({
      departmentId: userAnswers.departmentId,
      questionNumber: userAnswers.questionNumber,
      optionIds: userAnswers.optionIds,
      answeredAt: userAnswers.answeredAt,
      stage: sql<number>`(${departments.displayOrder} - 1) * 3 + ${userAnswers.questionNumber}`,
    })
    .from(userAnswers)
    .innerJoin(departments, eq(departments.id, userAnswers.departmentId))
    .where(eq(userAnswers.userId, userId));
}
/**
 * The question the player must answer next and its 3-minute window.
 * Q1 opens when the organizer starts the department (or when the player
 * finishes the previous department, whichever is later). Q2 and Q3 open the
 * moment the previous answer is saved.
 */
async function openWindow(
  ex: Executor,
  answers: Awaited<ReturnType<typeof loadAnswers>>,
) {
  if (answers.length >= 24) return null;
  const deps = await ex
    .select()
    .from(departments)
    .orderBy(asc(departments.displayOrder));
  const dept = deps[Math.floor(answers.length / 3)];
  if (!dept?.isQ1Unlocked || !dept.q1UnlockedAt) return null;
  const last = Math.max(0, ...answers.map((a) => a.answeredAt.getTime()));
  const startsAt = new Date(Math.max(dept.q1UnlockedAt.getTime(), last));
  return {
    dept,
    stage: answers.length + 1,
    questionNumber: (answers.length % 3) + 1,
    startsAt,
    deadline: new Date(startsAt.getTime() + QUESTION_SECONDS * 1000),
  };
}
/** Records a timed-out (empty, zero-fit) answer for every overdue question. */
async function expireOverdue(tx: Executor, user: User) {
  if ((await getCompetition(tx)).phase !== "qualifier") return 0;
  const answers = await loadAnswers(tx, user.id);
  let inserted = 0;
  let total = user.totalPoints;
  let lastAt: Date | null = null;
  for (;;) {
    const w = await openWindow(tx, answers);
    if (
      !w ||
      Date.now() < w.deadline.getTime() + QUESTION_GRACE_SECONDS * 1000
    )
      break;
    const [q] = await tx
      .select({ id: questions.id })
      .from(questions)
      .where(
        and(
          eq(questions.departmentId, w.dept.id),
          eq(questions.questionNumber, w.questionNumber),
        ),
      );
    if (!q) break;
    answers.push({
      departmentId: w.dept.id,
      questionNumber: w.questionNumber,
      optionIds: [],
      answeredAt: w.deadline,
      stage: w.stage,
    });
    const next = simulate(user.objectiveId as ObjectiveId, answers).total;
    await tx.insert(userAnswers).values({
      userId: user.id,
      departmentId: w.dept.id,
      questionId: q.id,
      questionNumber: w.questionNumber,
      selectedOptionIndex: -1,
      optionIds: [],
      isCorrect: false,
      pointsEarned: next - total,
      answeredAt: w.deadline,
    });
    total = next;
    lastAt = w.deadline;
    inserted++;
  }
  if (inserted)
    await tx
      .update(users)
      .set({ totalPoints: total, lastSubmissionAt: lastAt })
      .where(eq(users.id, user.id));
  return inserted;
}
/** Settles overdue questions for one player in its own locked transaction. */
export async function settleTimeouts(user: User) {
  if (user.role !== "attendee") return user;
  const inserted = await db.transaction(async (tx) => {
    const [locked] = await tx
      .select()
      .from(users)
      .where(eq(users.id, user.id))
      .for("update");
    return expireOverdue(tx, locked);
  });
  if (!inserted) return user;
  broadcast("SCOREBOARD_UPDATED", { at: Date.now() });
  const [fresh] = await db.select().from(users).where(eq(users.id, user.id));
  return fresh;
}
export async function passportFor(user: User) {
  await settleTimeouts(user);
  const answers = await getAnswers(user.id);
  const deps = await listDepartments();
  const result = simulate(user.objectiveId as ObjectiveId, answers);
  const { phase } = await getCompetition();
  return {
    user: publicUser(user),
    business: result.state,
    completed: result.completed,
    phase,
    // Revealed only once all 24 decisions are in; never scores or ranks.
    targetAchieved: result.completed
      ? targetAchieved(user.objectiveId as ObjectiveId, result.state)
      : null,
    timedOut: answers.filter((a) => !a.optionIds.length).length,
    answered: answers.length,
    departments: deps.map((d) => ({
      ...d,
      answered: answers.filter((a) => a.departmentId === d.id).length,
    })),
  };
}
export async function stateFor(user: User, id: string) {
  await settleTimeouts(user);
  const deps = await listDepartments();
  const dept = deps.find((d) => d.id === id || d.slug === id);
  if (!dept) throw new ApiError(404, "ไม่พบสาขานี้");
  const answers = await getAnswers(user.id);
  const mine = answers.filter((a) => a.departmentId === dept.id);
  const prerequisite = deps.find(
    (d) =>
      d.displayOrder < dept.displayOrder &&
      answers.filter((a) => a.departmentId === d.id).length < 3,
  );
  const phase = (await getCompetition()).phase;
  const status =
    mine.length === 3
      ? "completed"
      : phase !== "qualifier"
        ? "closed"
        : prerequisite
        ? "prerequisite"
        : !dept.isQ1Unlocked
          ? "locked"
          : "active";
  const [q] =
    status === "active"
      ? await db
          .select()
          .from(questions)
          .where(
            and(
              eq(questions.departmentId, dept.id),
              eq(questions.questionNumber, mine.length + 1),
            ),
          )
      : [];
  const window =
    status === "active" ? await openWindow(db, await loadAnswers(db, user.id)) : null;
  const timer =
    window && window.dept.id === dept.id
      ? {
          startsAt: window.startsAt.toISOString(),
          deadline: window.deadline.toISOString(),
          serverNow: new Date().toISOString(),
          seconds: QUESTION_SECONDS,
        }
      : null;
  const timedOut = mine.filter((a) => !a.optionIds.length).length;
  if (user.role === "attendee" && status !== "completed")
    markPresence(user.id, dept.id, status === "active" ? mine.length + 1 : 0);
  return {
    department: dept,
    objective: objectives.find((o) => o.id === user.objectiveId)!,
    business: simulate(user.objectiveId as ObjectiveId, answers).state,
    status,
    answered: mine.length,
    timedOut,
    timer,
    unlockedQuestion: status === "active" ? mine.length + 1 : status,
    prerequisite: prerequisite
      ? { slug: prerequisite.slug, name: prerequisite.nameTh }
      : null,
    question: q
      ? {
          id: q.id,
          questionNumber: q.questionNumber,
          title: q.title,
          type: q.type,
          prompt: q.prompt,
          multi: q.multi,
          budget: q.budget,
          options: q.options.map((o) => ({
            id: o.id,
            title: o.title,
            detail: o.detail,
            cost: o.cost ?? Math.max(0, -(o.effect?.cash ?? 0)),
          })),
        }
      : null,
  };
}
export async function submitAnswer(
  user: User,
  id: string,
  questionId: string,
  optionIds: string[] | undefined,
  selectedOptionIndex: number | undefined,
  reason = "",
) {
  const trimmedReason = reason.trim();
  if (trimmedReason.length < 3)
    throw new ApiError(400, "กรุณาเขียนเหตุผลของทีมอย่างน้อย 3 ตัวอักษร");
  await db.transaction(async (tx) => {
    const [beforeTimeouts] = await tx
      .select()
      .from(users)
      .where(eq(users.id, user.id))
      .for("update");
    const [lockedUser] = (await expireOverdue(tx, beforeTimeouts))
      ? await tx.select().from(users).where(eq(users.id, user.id))
      : [beforeTimeouts];
    const [q] = await tx
      .select()
      .from(questions)
      .where(eq(questions.id, questionId));
    const [dept] = await tx
      .select()
      .from(departments)
      .where(
        id.includes("-") && id.length === 36
          ? eq(departments.id, id)
          : eq(departments.slug, id),
      );
    if (!q || !dept || q.departmentId !== dept.id)
      throw new ApiError(400, "คำถามไม่ตรงกับสาขานี้");
    const [duplicate] = await tx
      .select({ id: userAnswers.id, optionIds: userAnswers.optionIds })
      .from(userAnswers)
      .where(
        and(
          eq(userAnswers.userId, user.id),
          eq(userAnswers.questionId, questionId),
        ),
      );
    if (duplicate)
      throw new ApiError(
        409,
        duplicate.optionIds.length
          ? "คำตอบนี้บันทึกแล้ว กรุณาทำข้อต่อไป"
          : "หมดเวลา 3 นาทีของข้อนี้แล้ว ระบบไปยังข้อถัดไป",
      );
    if (!dept.isQ1Unlocked) throw new ApiError(403, "รอผู้จัดงานเปิดคำถามแรก");
    if ((await getCompetition(tx)).phase !== "qualifier")
      throw new ApiError(403, "ปิดรับคำตอบรอบคัดเลือกแล้ว");
    const existing = await tx
      .select({
        departmentId: userAnswers.departmentId,
        questionNumber: userAnswers.questionNumber,
        optionIds: userAnswers.optionIds,
        stage: sql<number>`(${departments.displayOrder} - 1) * 3 + ${userAnswers.questionNumber}`,
      })
      .from(userAnswers)
      .innerJoin(departments, eq(departments.id, userAnswers.departmentId))
      .where(eq(userAnswers.userId, user.id));
    const stage = (dept.displayOrder - 1) * 3 + q.questionNumber;
    if (existing.length !== stage - 1)
      throw new ApiError(400, "กรุณาทำคำถามก่อนหน้าให้ครบตามลำดับ");
    const ids =
      optionIds ??
      (selectedOptionIndex !== undefined && q.options[selectedOptionIndex]
        ? [q.options[selectedOptionIndex].id]
        : []);
    if (!ids.length) throw new ApiError(400, "กรุณาเลือกคำตอบ");
    let result;
    try {
      result = simulate(lockedUser.objectiveId as ObjectiveId, [
        ...existing,
        { stage, optionIds: ids },
      ]);
    } catch (error) {
      throw new ApiError(
        400,
        error instanceof Error ? error.message : "ตัวเลือกไม่ถูกต้อง",
      );
    }
    await tx.insert(userAnswers).values({
      userId: user.id,
      departmentId: dept.id,
      questionId,
      questionNumber: q.questionNumber,
      selectedOptionIndex: q.options.findIndex((o) => o.id === ids[0]),
      optionIds: ids,
      isCorrect:
        q.type === "check" &&
        q.options.find((o) => o.id === ids[0])?.knowledge === 5,
      reason: trimmedReason.slice(0, 300),
      pointsEarned: result.total - lockedUser.totalPoints,
    });
    await tx
      .update(users)
      .set({ totalPoints: result.total, lastSubmissionAt: new Date() })
      .where(eq(users.id, user.id));
  });
  const [currentUser] = await db
    .select()
    .from(users)
    .where(eq(users.id, user.id));
  return { saved: true, state: await stateFor(currentUser, id) };
}
export async function leaderboard() {
  const { phase } = await getCompetition();
  const rows = await db
    .select({
      id: users.id,
      fullName: users.fullName,
      teamNumber: users.teamNumber,
      qualifierPoints: users.totalPoints,
      finalPoints: users.finalPoints,
      finalistRank: users.finalistRank,
      lastSubmissionAt: users.lastSubmissionAt,
      objectiveId: users.objectiveId,
      answered: sql<number>`(select count(*)::int from user_answers where user_answers.user_id = "users"."id")`,
      finalAnswered: sql<boolean>`exists(select 1 from final_answers where final_answers.user_id = "users"."id")`,
    })
    .from(users)
    .where(eq(users.role, "attendee"))
    .orderBy(
      sql`${users.totalPoints} desc`,
      sql`${users.lastSubmissionAt} asc nulls last`,
      asc(users.id),
    );
  const withTotal = rows.map((r) => ({
    ...r,
    totalPoints:
      r.finalistRank !== null ? r.qualifierPoints + r.finalPoints : r.qualifierPoints,
  }));
  // During and after the Final, finalists are ranked by qualifier + final;
  // everyone else keeps their qualifier order below them.
  const ordered =
    phase === "qualifier"
      ? withTotal
      : [
          ...withTotal
            .filter((r) => r.finalistRank !== null)
            .sort(
              (a, b) =>
                b.totalPoints - a.totalPoints || a.finalistRank! - b.finalistRank!,
            ),
          ...withTotal.filter((r) => r.finalistRank === null),
        ];
  return ordered.map((row, i) => ({
    ...row,
    rank: i + 1,
    isTop: phase === "qualifier" ? i < FINALIST_COUNT : row.finalistRank !== null,
  }));
}
