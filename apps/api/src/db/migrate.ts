import { migrate } from "drizzle-orm/postgres-js/migrator";
import { db, sqlClient } from "./index";
await migrate(db, {
  migrationsFolder: new URL("../../drizzle", import.meta.url).pathname,
});
console.log("Database migrations applied.");
await sqlClient.end();
