// Disposable test service only. Never points at or resets the app database.
const url = new URL(process.env.DATABASE_URL!);
url.pathname = "/businessverse_test";
process.env.DATABASE_URL = url.href;
if (!url.pathname.endsWith("_test")) throw Error("A test database is required");
const { db, sqlClient } = await import("../apps/api/src/db");
const { migrate } = await import("drizzle-orm/postgres-js/migrator");
await migrate(db, {
  migrationsFolder: new URL("../apps/api/drizzle", import.meta.url).pathname,
});
await sqlClient`truncate table user_answers, questions, departments, users restart identity cascade`;
const seed = Bun.spawn(["bun", "src/db/seed.ts"], {
  cwd: new URL("../apps/api", import.meta.url).pathname,
  stdout: "ignore",
  stderr: "inherit",
  env: process.env,
});
if ((await seed.exited) !== 0) throw Error("Test seed failed");
const { app } = await import("../apps/api/src/index");
app.listen(3000);
console.log("Disposable test API listening on port 3000.");
