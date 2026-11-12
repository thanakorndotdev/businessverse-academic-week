// Creates local-only credentials without printing them or overwriting existing configuration.
const file = Bun.file(new URL("../.env", import.meta.url));
if (await file.exists()) {
  console.log(".env already exists; existing settings preserved.");
  process.exit(0);
}
const random = (bytes: number) =>
  Buffer.from(crypto.getRandomValues(new Uint8Array(bytes))).toString("hex");
const dbPassword = random(24);
await Bun.write(
  file,
  `POSTGRES_PASSWORD=${dbPassword}\nJWT_SECRET=${random(48)}\nADMIN_EMAIL=organizer@businessverse.local\nADMIN_PASSWORD=${random(18)}\nAPP_URL=http://localhost:8080\nWEB_PORT=8080\nDATABASE_URL=postgres://businessverse:${dbPassword}@localhost:5437/businessverse\n`,
);
await import("node:fs/promises").then((fs) => fs.chmod(file.name!, 0o600));
console.log(
  "Created private .env with generated database, session and organizer credentials.",
);
