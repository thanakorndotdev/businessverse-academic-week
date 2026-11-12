import { sql } from "drizzle-orm";
import {
  pgTable,
  pgEnum,
  uuid,
  text,
  integer,
  boolean,
  timestamp,
  smallint,
  serial,
  doublePrecision,
  jsonb,
  uniqueIndex,
  index,
  check,
} from "drizzle-orm/pg-core";
export const roleEnum = pgEnum("role", ["attendee", "admin"]);
export const users = pgTable(
  "users",
  {
    id: uuid().defaultRandom().primaryKey(),
    teamNumber: serial("team_number").unique(),
    objectiveId: text("objective_id").default("growth").notNull(),
    // Organizer accounts sign in with email + password. Teams sign in with
    // their team number + an organizer-issued access code.
    studentId: text("student_id").unique(),
    email: text().unique(),
    fullName: text("full_name").notNull(),
    passwordHash: text("password_hash"),
    accessCode: text("access_code").unique(),
    finalistRank: smallint("finalist_rank"),
    finalPoints: doublePrecision("final_points").default(0).notNull(),
    role: roleEnum().default("attendee").notNull(),
    totalPoints: doublePrecision("total_points").default(0).notNull(),
    lastSubmissionAt: timestamp("last_submission_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    index("ranking_idx").on(
      t.totalPoints.desc(),
      t.lastSubmissionAt.asc(),
      t.id,
    ),
  ],
);
export const departments = pgTable("departments", {
  id: uuid().defaultRandom().primaryKey(),
  slug: text().notNull().unique(),
  name: text().notNull(),
  nameTh: text("name_th").notNull(),
  code: text().notNull(),
  description: text().notNull(),
  isQ1Unlocked: boolean("is_q1_unlocked").default(false).notNull(),
  q1UnlockedAt: timestamp("q1_unlocked_at", { withTimezone: true }),
  displayOrder: integer("display_order").notNull(),
});
export const questions = pgTable(
  "questions",
  {
    id: uuid().defaultRandom().primaryKey(),
    departmentId: uuid("department_id")
      .references(() => departments.id)
      .notNull(),
    questionNumber: smallint("question_number").notNull(),
    title: text().notNull(),
    type: text().notNull(),
    multi: boolean().default(false).notNull(),
    budget: integer(),
    prompt: text().notNull(),
    options: jsonb()
      .$type<import("../game/engine").DecisionOption[]>()
      .notNull(),
    correctOptionIndex: integer("correct_option_index").notNull(),
    explanation: text().notNull(),
    pointsReward: integer("points_reward").default(100).notNull(),
  },
  (t) => [
    uniqueIndex("department_question_unique").on(
      t.departmentId,
      t.questionNumber,
    ),
    check("question_number_range", sql`${t.questionNumber} between 1 and 3`),
    check(
      "valid_correct_option",
      sql`${t.correctOptionIndex} >= 0 and ${t.correctOptionIndex} < jsonb_array_length(${t.options})`,
    ),
  ],
);
export const userAnswers = pgTable(
  "user_answers",
  {
    id: uuid().defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .references(() => users.id)
      .notNull(),
    departmentId: uuid("department_id")
      .references(() => departments.id)
      .notNull(),
    questionId: uuid("question_id")
      .references(() => questions.id)
      .notNull(),
    questionNumber: smallint("question_number").notNull(),
    selectedOptionIndex: integer("selected_option_index").notNull(),
    optionIds: jsonb("option_ids").$type<string[]>().notNull(),
    isCorrect: boolean("is_correct").notNull(),
    reason: text().default("").notNull(),
    pointsEarned: doublePrecision("points_earned").notNull(),
    answeredAt: timestamp("answered_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    uniqueIndex("user_question_unique").on(t.userId, t.questionId),
    index("user_department_idx").on(t.userId, t.departmentId),
  ],
);

export const competition = pgTable(
  "competition",
  {
    id: smallint().primaryKey().default(1),
    phase: text().default("qualifier").notNull(),
    finalistCount: smallint("finalist_count").default(10).notNull(),
    finalOpenedAt: timestamp("final_opened_at", { withTimezone: true }),
    closedAt: timestamp("closed_at", { withTimezone: true }),
  },
  (t) => [
    check("single_competition_row", sql`${t.id} = 1`),
    check(
      "competition_phase",
      sql`${t.phase} in ('qualifier', 'final', 'closed')`,
    ),
  ],
);
export const finalAnswers = pgTable("final_answers", {
  userId: uuid("user_id")
    .references(() => users.id)
    .primaryKey(),
  optionId: text("option_id").notNull(),
  reason: text().default("").notNull(),
  isFinalist: boolean("is_finalist").notNull(),
  fit: doublePrecision().notNull(),
  answeredAt: timestamp("answered_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});
