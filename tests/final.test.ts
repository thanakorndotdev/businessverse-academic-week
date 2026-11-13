import { describe, expect, test } from "bun:test";
import {
  finalSections,
  publicFinalScenario,
  scoreFinalPlan,
  validateFinalPlan,
  FINAL_BUDGET,
  type FinalSelection,
} from "../apps/api/src/game/final";
import {
  allQuestions,
  simulate,
  selectionCost,
  type BusinessState,
  type ObjectiveId,
} from "../apps/api/src/game/engine";
const initial = simulate("growth", []).state;
const plan = (overrides: Record<string, string> = {}): FinalSelection[] =>
  finalSections.map((s) => ({
    sectionId: s.id,
    optionId:
      overrides[s.id] ??
      (
        {
          management: "stabilize",
          marketing: "retain",
          esport: "community",
          digitalMarketing: "context",
          innovation: "contain",
          international: "pilot",
          logistics: "dual",
          finance: "credit",
        } as Record<string, string>
      )[s.id],
  }));
const fullPlans = function* (
  index = 0,
  selected: FinalSelection[] = [],
): Generator<FinalSelection[]> {
  if (index === finalSections.length) {
    yield selected;
    return;
  }
  const section = finalSections[index];
  for (const o of section.options)
    yield* fullPlans(index + 1, [
      ...selected,
      { sectionId: section.id, optionId: o.id },
    ]);
};

describe("The Perfect Storm integrated Final", () => {
  test("one shared scenario, eight disciplines, four tradeoffs each; public DTO has no scoring keys", () => {
    const publicData = publicFinalScenario();
    expect(publicData.sections).toHaveLength(8);
    expect(publicData.budget).toBe(FINAL_BUDGET);
    expect(publicData.scenario).toContain("25%");
    for (const section of publicData.sections) {
      expect(section.options).toHaveLength(4);
      for (const o of section.options) {
        expect(Object.keys(o).sort()).toEqual([
          "benefit",
          "coins",
          "id",
          "title",
          "tradeoff",
        ]);
        expect(o.benefit.length).toBeGreaterThan(0);
        expect(o.tradeoff.length).toBeGreaterThan(0);
        expect(["growth", "premium", "cost", "customer"]).not.toContain(o.id);
      }
    }
  });
  test("rejects missing, duplicate, unknown, cross-discipline choices and overspend", () => {
    expect(() => validateFinalPlan(plan().slice(1))).toThrow("8");
    expect(() => validateFinalPlan([...plan().slice(0, 7), plan()[0]])).toThrow(
      "8",
    );
    expect(() => validateFinalPlan(plan({ management: "unknown" }))).toThrow(
      "Management",
    );
    expect(() => validateFinalPlan(plan({ management: "contain" }))).toThrow(
      "Management",
    );
    expect(() =>
      validateFinalPlan(
        plan({ international: "launch", esport: "arena", finance: "weekly" }),
      ),
    ).toThrow("งบรวม");
    expect(() =>
      validateFinalPlan([...plan(), { sectionId: "extra", optionId: "x" }]),
    ).toThrow("8");
  });
  test("financing is received once and order of the eight choices does not change a plan", () => {
    const result = validateFinalPlan(plan());
    expect(result.spent).toBe(210000);
    expect(result.remaining).toBe(90000);
    expect(scoreFinalPlan("growth", initial, plan().reverse())).toEqual(
      scoreFinalPlan("growth", initial, plan()),
    );
  });
  test("large event + full overseas launch + no supplier fix + drained reserves is incoherent even under budget", () => {
    const bad = plan({
      management: "stage",
      marketing: "value",
      esport: "arena",
      digitalMarketing: "owned",
      innovation: "audit",
      international: "launch",
      logistics: "wait",
      finance: "drain",
    });
    const result = scoreFinalPlan("growth", initial, bad);
    expect(result.spent).toBeLessThanOrEqual(FINAL_BUDGET);
    expect(result.checks.coherence).toBe(false);
    expect(result.checks.budgetAndLiquidity).toBe(false);
    expect(
      result.disciplines.find((d) => d.sectionId === "international")!.points,
    ).toBe(0);
    expect(result.issues.length).toBeGreaterThanOrEqual(3);
    expect(result.total).toBeLessThan(20);
  });
  test("customer data use requires incident containment, even if CRM was already acquired", () => {
    const result = scoreFinalPlan(
      "customer",
      { ...initial, crm: true },
      plan({ digitalMarketing: "consent", innovation: "ignore" }),
    );
    expect(result.checks.coherence).toBe(false);
    expect(
      result.disciplines.find((d) => d.sectionId === "digitalMarketing")!
        .points,
    ).toBe(0);
  });
  test("existing operations and cyber risk change the quality of the same plan", () => {
    const healthy = { ...initial, customer: 100, operations: 100, cyber: true };
    const selection = plan({ logistics: "repair", innovation: "audit" });
    const a = scoreFinalPlan("growth", healthy, selection);
    const b = scoreFinalPlan(
      "growth",
      { ...healthy, operations: 40, risk: 60 },
      selection,
    );
    expect(a.checks.companyState).toBe(true);
    expect(b.checks.companyState).toBe(false);
    expect(a.disciplinePoints - b.disciplinePoints).toBe(2);
  });
  test("liquidity reserve responds to inherited cash and prevents 20 for spending every Coin", () => {
    const selection = plan({ finance: "reserve" });
    const healthy = { ...initial, cash: 300000 };
    const result = scoreFinalPlan("growth", healthy, selection);
    expect(result.remaining).toBe(40000);
    expect(result.checks.budgetAndLiquidity).toBe(true);
    const stressed = scoreFinalPlan(
      "growth",
      { ...healthy, cash: 0 },
      selection,
    );
    expect(stressed.checks.budgetAndLiquidity).toBe(false);
    expect(
      stressed.disciplines.find((d) => d.sectionId === "finance")!.points,
    ).toBe(1);
    expect(stressed.total).toBeLessThan(20);
  });
  test("objective only contributes to the integrated plan, rather than replacing eight discipline scores", () => {
    const selection = plan({
      esport: "pause",
      digitalMarketing: "owned",
      international: "defer",
      finance: "reserve",
    });
    const growth = scoreFinalPlan("growth", initial, selection);
    const cost = scoreFinalPlan("cost", initial, selection);
    expect(growth.disciplines).toEqual(cost.disciplines);
    expect(growth.checks.objective).toBe(false);
    expect(cost.checks.objective).toBe(true);
    expect(cost.total - growth.total).toBe(1);
  });
  test("each objective has a 20-point witness across every company-state scoring branch", () => {
    for (const cash of [0, 200000])
      for (const operations of [0, 70])
        for (const risk of [0, 55])
          for (const cyber of [false, true])
            for (const customer of [0, 70]) {
              const state = {
                ...initial,
                cash,
                operations,
                risk,
                cyber,
                customer,
              };
              for (const objective of [
                "growth",
                "premium",
                "cost",
                "customer",
              ] as const) {
                const selection =
                  objective === "growth"
                    ? plan({ digitalMarketing: "consent" })
                    : plan({
                        digitalMarketing: "consent",
                        international: "research",
                        finance: "reserve",
                      });
                expect(scoreFinalPlan(objective, state, selection).total).toBe(
                  20,
                );
              }
            }
  });
  test("exhaustive 4^8 plans: every objective reaches the same 20-point ceiling in healthy, distressed and actual qualifier states", () => {
    const objectives: ObjectiveId[] = ["growth", "premium", "cost", "customer"];
    const states: BusinessState[] = [
      initial,
      { ...initial, cash: 0, risk: 100, customer: 0, operations: 0 },
      { ...initial, cash: 300000, operations: 100, customer: 100, cyber: true },
    ];
    for (const objective of objectives) {
      const answers: { stage: number; optionIds: string[] }[] = [];
      for (const [i, q] of allQuestions.entries()) {
        const prior = simulate(objective, answers);
        const choice = [...q.options]
          .sort(
            (a, b) =>
              (b.knowledge ?? b.fit?.[objective] ?? 0) -
              (a.knowledge ?? a.fit?.[objective] ?? 0),
          )
          .find((o) => selectionCost(q, [o.id]) <= prior.state.cash)!;
        answers.push({ stage: i + 1, optionIds: [choice.id] });
      }
      const candidates = [...states, simulate(objective, answers).state];
      const best = candidates.map(() => 0);
      const fullCount = candidates.map(() => 0);
      for (const selections of fullPlans()) {
        try {
          validateFinalPlan(selections);
        } catch {
          continue;
        }
        for (const [i, state] of candidates.entries()) {
          const result = scoreFinalPlan(objective, state, selections);
          if (
            result.total < 0 ||
            result.total > 20 ||
            result.disciplinePoints > 16 ||
            result.planPoints > 4
          )
            throw new Error("Score outside rubric");
          best[i] = Math.max(best[i], result.total);
          if (result.total === 20) fullCount[i]++;
        }
      }
      expect(best).toEqual([20, 20, 20, 20]);
      expect(fullCount.every((count) => count > 1)).toBe(true);
    }
  }, 30000);
});
