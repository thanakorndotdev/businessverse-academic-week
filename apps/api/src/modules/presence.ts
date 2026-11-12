// Ephemeral activity is intentionally excluded from persistent competition records.
const active = new Map<
  string,
  { departmentId: string; question: number; at: number }
>();
export function markPresence(
  userId: string,
  departmentId: string,
  question: number,
) {
  active.set(userId, { departmentId, question, at: Date.now() });
}
export function presenceFor(departmentId: string) {
  const now = Date.now();
  for (const [id, entry] of active)
    if (now - entry.at > 45000) active.delete(id);
  const rows = [...active.values()].filter(
    (e) => e.departmentId === departmentId,
  );
  return {
    waiting: rows.filter((e) => e.question === 0).length,
    activePerQuestion: [1, 2, 3].map(
      (q) => rows.filter((e) => e.question === q).length,
    ),
  };
}
