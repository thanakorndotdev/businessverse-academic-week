import { mkdtemp, chmod, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
if (!process.env.ADMIN_EMAIL || !process.env.ADMIN_PASSWORD)
  throw Error("ADMIN_EMAIL and ADMIN_PASSWORD are required");
const directory = await mkdtemp(join(tmpdir(), "businessverse-postman-"));
const environment = join(directory, "environment.json");
try {
  const template = await Bun.file(
    new URL("../postman/Docker.postman_environment.json", import.meta.url),
  ).json();
  for (const entry of template.values) {
    if (entry.key === "admin_email") entry.value = process.env.ADMIN_EMAIL;
    if (entry.key === "admin_password")
      entry.value = process.env.ADMIN_PASSWORD;
  }
  await Bun.write(environment, JSON.stringify(template));
  await chmod(environment, 0o600);
  const child = Bun.spawn(
    [
      "postman",
      "collection",
      "run",
      "postman/AcademicVerse.postman_collection.json",
      "-e",
      environment,
      "--no-report-events",
    ],
    { stdout: "inherit", stderr: "inherit" },
  );
  process.exitCode = await child.exited;
} finally {
  await rm(directory, { recursive: true });
}
