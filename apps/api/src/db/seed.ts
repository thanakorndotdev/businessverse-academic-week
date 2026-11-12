import { eq } from "drizzle-orm";
import { db, sqlClient } from "./index";
import { departments, questions, users } from "./schema";
import { referenceDepartments } from "../game/engine";
const slugs = [
  "management",
  "marketing",
  "esport",
  "digital-marketing",
  "innovation",
  "international",
  "logistics",
  "finance",
];
const thai = [
  "การจัดการ",
  "การตลาด",
  "ธุรกิจอีสปอร์ต",
  "การตลาดดิจิทัล",
  "ดิจิทัลและนวัตกรรม",
  "ธุรกิจระหว่างประเทศ",
  "โลจิสติกส์",
  "การเงิน",
];
const codes = ["MGT", "MKT", "ESP", "DMK", "INN", "INT", "LOG", "FIN"];
await db.transaction(async (tx) => {
  for (const [i, entry] of referenceDepartments.entries()) {
    await tx
      .insert(departments)
      .values({
        slug: slugs[i],
        name: entry.discipline.split(" · ")[1],
        nameTh: thai[i],
        code: codes[i],
        description: entry.learning,
        displayOrder: i + 1,
      })
      .onConflictDoNothing();
    const [department] = await tx
      .select()
      .from(departments)
      .where(eq(departments.slug, slugs[i]));
    for (const [j, q] of entry.questions.entries())
      await tx
        .insert(questions)
        .values({
          departmentId: department.id,
          questionNumber: j + 1,
          title: q.title,
          type: q.type,
          multi: q.multi ?? false,
          budget: q.budget,
          prompt: q.scenario,
          options: q.options,
          correctOptionIndex: Math.max(
            0,
            q.options.findIndex((o) => o.knowledge === 5),
          ),
          explanation:
            q.type === "check"
              ? (q.options.find((o) => o.knowledge === 5)?.detail ?? "")
              : "การตัดสินใจถูกบันทึกและอัปเดตสถานะธุรกิจแล้ว",
          pointsReward: 5,
        })
        .onConflictDoNothing();
  }
});
if (
  !process.env.ADMIN_EMAIL ||
  !process.env.ADMIN_PASSWORD ||
  process.env.ADMIN_PASSWORD.length < 12
)
  throw new Error(
    "Set ADMIN_EMAIL and ADMIN_PASSWORD (at least 12 characters) to seed the organizer account.",
  );
await db
  .insert(users)
  .values({
    teamNumber: 0,
    studentId: "ORGANIZER",
    email: process.env.ADMIN_EMAIL.toLowerCase(),
    fullName: "Event Organizer",
    passwordHash: await Bun.password.hash(process.env.ADMIN_PASSWORD),
    role: "admin",
  })
  .onConflictDoNothing();
console.log(
  "Seeded original 24 decisions, four targets and organizer. Existing answers, gates and credentials preserved.",
);
await sqlClient.end();
