import { describe, test, expect } from "bun:test";
import {
  allQuestions,
  referenceDepartments,
  objectiveForTeam,
  targetAchieved,
  simulate,
  validateSelection,
  applyEffect,
  decisionQuality,
  selectionCost,
  type BusinessState,
} from "../apps/api/src/game/engine";
const initial: BusinessState = {
  cash: 1200000,
  sales: 50,
  customer: 50,
  brand: 50,
  operations: 50,
  risk: 5,
  innovation: false,
  crm: false,
  premium: false,
  analytics: false,
  cyber: false,
};
describe("Original Businessverse target mechanics", () => {
  test("24 original questions, in the reference rendered stage order", () => {
    expect(referenceDepartments).toHaveLength(8);
    expect(allQuestions).toHaveLength(24);
    for (const d of referenceDepartments) expect(d.questions).toHaveLength(3);
    expect(referenceDepartments[4].discipline).toContain(
      "DIGITAL & INNOVATION",
    );
    expect(referenceDepartments[6].discipline).toContain("LOGISTICS");
  });
  test("targets repeat by team number and do not depend on login", () => {
    expect(
      Array.from({ length: 8 }, (_, i) => objectiveForTeam(i + 1)),
    ).toEqual([
      "growth",
      "premium",
      "cost",
      "customer",
      "growth",
      "premium",
      "cost",
      "customer",
    ]);
  });
  test("target thresholds use strict inequalities", () => {
    expect(targetAchieved("growth", { ...initial, sales: 145 })).toBe(false);
    expect(targetAchieved("growth", { ...initial, sales: 146 })).toBe(true);
    expect(
      targetAchieved("premium", { ...initial, brand: 121, risk: 55 }),
    ).toBe(false);
    expect(
      targetAchieved("premium", { ...initial, brand: 121, risk: 54 }),
    ).toBe(true);
    expect(
      targetAchieved("cost", { ...initial, cash: 200000, operations: 101 }),
    ).toBe(false);
    expect(
      targetAchieved("cost", { ...initial, cash: 200001, operations: 101 }),
    ).toBe(true);
    expect(targetAchieved("customer", { ...initial, customer: 130 })).toBe(
      false,
    );
  });
  test("the same strategic decision has different quality for different targets", () => {
    const q = allQuestions[1];
    expect(decisionQuality("growth", q, ["mass"])).toBe(5);
    expect(decisionQuality("premium", q, ["mass"])).toBe(1);
    expect(decisionQuality("premium", q, ["premium"])).toBe(5);
  });
  test("effects clamp indicators and retain acquired capabilities", () => {
    const s = applyEffect(
      { ...initial, analytics: true },
      { sales: 300, risk: -20, cash: -100, innovation: true },
    );
    expect(s.sales).toBe(260);
    expect(s.risk).toBe(0);
    expect(s.cash).toBe(1199900);
    expect(s.analytics).toBe(true);
    expect(s.innovation).toBe(true);
    expect(applyEffect(s, { innovation: false }).innovation).toBe(true);
  });
  test("multi-select validates budget, funds, duplicates and unknown options", () => {
    const q = allQuestions[10];
    expect(q.multi).toBe(true);
    const ids = q.options.map((o) => o.id);
    expect(selectionCost(q, ids)).toBeGreaterThan(q.budget!);
    expect(() => validateSelection(initial, q, ids)).toThrow("งบประมาณเกิน");
    expect(() => validateSelection(initial, q, [ids[0], ids[0]])).toThrow();
    expect(() =>
      validateSelection({ ...initial, cash: 0 }, q, [ids[0]]),
    ).toThrow("ไม่เพียงพอ");
    expect(() => validateSelection(initial, q, ["not-real"])).toThrow();
    expect(() =>
      validateSelection(initial, allQuestions[0], ["direction", "activity"]),
    ).toThrow();
  });
  test("knowledge checks do not change company resources", () => {
    const result = simulate("growth", [{ stage: 1, optionIds: ["direction"] }]);
    expect(result.state).toEqual(initial);
    expect(result.quality).toBe(1.25);
    expect(result.objectiveScore).toBe(0);
  });
  test("target bonus cannot be earned before completing all 24 decisions", () => {
    const result = simulate("growth", [{ stage: 2, optionIds: ["mass"] }]);
    expect(result.objectiveScore).toBe(0);
    expect(result.completed).toBe(false);
  });
  test("all four targets have a valid 24-decision path with bounded scores", () => {
    for (const objective of [
      "growth",
      "premium",
      "cost",
      "customer",
    ] as const) {
      let answers: { stage: number; optionIds: string[] }[] = [];
      for (const [i, q] of allQuestions.entries()) {
        const prior = simulate(objective, answers);
        const options = [...q.options].sort(
          (a, b) =>
            (b.knowledge ?? b.fit?.[objective] ?? 0) -
            (a.knowledge ?? a.fit?.[objective] ?? 0),
        );
        const choice = options.find(
          (o) => selectionCost(q, [o.id]) <= prior.state.cash,
        );
        expect(choice).toBeDefined();
        answers.push({ stage: i + 1, optionIds: [choice!.id] });
      }
      const result = simulate(objective, answers);
      expect(result.completed).toBe(true);
      expect(result.total).toBeGreaterThan(0);
      expect(result.total).toBeLessThanOrEqual(80);
    }
  });
});

test("timed-out question (empty selection) adds no effect and no fit", async () => {
  const { simulate } = await import("../apps/api/src/game/engine");
  const base = simulate("growth", []);
  const skipped = simulate("growth", [{ stage: 1, optionIds: [] }]);
  expect(skipped.state).toEqual(base.state);
  expect(skipped.quality).toBe(0);
  expect(skipped.completed).toBe(false);
});
