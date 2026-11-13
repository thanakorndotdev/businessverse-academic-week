import data from "./reference.json";
export type ObjectiveId = "growth" | "premium" | "cost" | "customer";
export interface BusinessState {
  cash: number;
  sales: number;
  customer: number;
  brand: number;
  operations: number;
  risk: number;
  innovation: boolean;
  crm: boolean;
  premium: boolean;
  analytics: boolean;
  cyber: boolean;
}
export interface DecisionOption {
  id: string;
  title: string;
  detail: string;
  effect?: Partial<BusinessState>;
  knowledge?: number;
  fit?: Record<ObjectiveId, number>;
  cost?: number;
}
export interface Decision {
  type: string;
  title: string;
  scenario: string;
  options: DecisionOption[];
  multi?: boolean;
  budget?: number;
}
export const objectives = data.objectives;
/** Teams promoted to the Final Business Crisis. */
export const FINALIST_COUNT = 10;
/** Qualifier is scored out of 80 (40 simulation + 30 decision fit + 10 target). */
export const QUALIFIER_MAX = 80;
/** Final Business Crisis is scored out of 20. */
export const FINAL_MAX = 20;
/** Seconds each question stays open. */
export const QUESTION_SECONDS = 180;
/** Network grace after the visible deadline before the server records a timeout. */
export const QUESTION_GRACE_SECONDS = 5;
export const referenceDepartments = data.departments as {
  discipline: string;
  learning: string;
  questions: Decision[];
}[];
export const allQuestions = referenceDepartments.flatMap((d) => d.questions);
export const objectiveForTeam = (number: number): ObjectiveId =>
  objectives[(number - 1) % 4].id as ObjectiveId;
export function applyEffect(
  state: BusinessState,
  effect: Partial<BusinessState> = {},
): BusinessState {
  const next = { ...state, cash: state.cash + (effect.cash ?? 0) };
  for (const key of [
    "sales",
    "customer",
    "brand",
    "operations",
    "risk",
  ] as const)
    next[key] = Math.max(
      0,
      Math.min(key === "risk" ? 100 : 260, next[key] + (effect[key] ?? 0)),
    );
  for (const key of [
    "innovation",
    "crm",
    "analytics",
    "cyber",
    "premium",
  ] as const)
    if (effect[key]) next[key] = true;
  return next;
}
export function selectionCost(question: Decision, ids: string[]) {
  return ids.reduce((sum, id) => {
    const option = question.options.find((o) => o.id === id);
    return sum + (option?.cost ?? Math.max(0, -(option?.effect?.cash ?? 0)));
  }, 0);
}
export function validateSelection(
  state: BusinessState,
  question: Decision,
  ids: string[],
) {
  if (
    !ids.length ||
    new Set(ids).size !== ids.length ||
    ids.some((id) => !question.options.some((o) => o.id === id))
  )
    throw new Error("ตัวเลือกไม่ถูกต้อง กรุณาเลือกใหม่");
  if (!question.multi && ids.length !== 1)
    throw new Error("โจทย์นี้เลือกได้หนึ่งคำตอบ");
  const cost = selectionCost(question, ids);
  if (question.budget && cost > question.budget)
    throw new Error(`งบประมาณเกิน ${question.budget.toLocaleString()} Coins`);
  if (cost > state.cash) throw new Error("Business Coins ไม่เพียงพอสำหรับตัวเลือกนี้");
}
export function decisionQuality(
  objective: ObjectiveId,
  q: Decision,
  ids: string[],
) {
  if (q.type === "check")
    return q.options.find((o) => o.id === ids[0])?.knowledge ?? 0;
  const fits = ids.map(
    (id) => q.options.find((o) => o.id === id)?.fit?.[objective] ?? 0,
  );
  return q.multi
    ? Math.min(5, fits.reduce((a, b) => a + b, 0) / fits.length)
    : fits[0];
}
export function targetAchieved(objective: ObjectiveId, s: BusinessState) {
  return objective === "growth"
    ? s.sales > 145
    : objective === "premium"
      ? s.brand > 120 && s.risk < 55
      : objective === "cost"
        ? s.cash > 200000 && s.operations > 100
        : s.customer > 130;
}
export function simulate(
  objective: ObjectiveId,
  answers: { stage: number; optionIds: string[] }[],
) {
  let state: BusinessState = { ...data.initialState };
  let fit = 0;
  for (const answer of [...answers].sort((a, b) => a.stage - b.stage)) {
    const q = allQuestions[answer.stage - 1];
    // An empty selection is a timed-out question: no business effect, no fit.
    if (!answer.optionIds.length) continue;
    validateSelection(state, q, answer.optionIds);
    for (const option of q.options.filter((o) =>
      answer.optionIds.includes(o.id),
    ))
      state = applyEffect(state, option.effect);
    fit += decisionQuality(objective, q, answer.optionIds);
  }
  const clamp = (v: number) => Math.max(0, Math.min(1, v));
  const simulation =
    (15 * clamp(state.sales / 155) +
      10 * clamp(state.customer / 140) +
      10 * clamp(state.brand / 135) +
      10 * clamp(state.operations / 125) +
      8 * clamp(state.cash / 500000) +
      7 * (1 - clamp(state.risk / 70))) *
    (40 / 60);
  const quality = fit * (30 / (24 * 5));
  const objectiveScore =
    answers.length === 24 && targetAchieved(objective, state) ? 10 : 0;
  return {
    state,
    simulation,
    quality,
    objectiveScore,
    total: simulation + quality + objectiveScore,
    completed: answers.length === 24,
  };
}
