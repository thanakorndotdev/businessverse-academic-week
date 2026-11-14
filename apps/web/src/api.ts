import { treaty } from "@elysiajs/eden";
import type { App } from "../../api/src/index";
import type {
  passportFor,
  stateFor,
  listDepartments,
  leaderboard,
  publicUser,
} from "../../api/src/modules/game";
import type {
  adminTeams,
  teamAnswers,
  finalStateFor,
} from "../../api/src/modules/competition";
export type User = ReturnType<typeof publicUser>;
export type Department = Awaited<ReturnType<typeof listDepartments>>[number];
export type Passport = Awaited<ReturnType<typeof passportFor>>;
export type QuizState = Awaited<ReturnType<typeof stateFor>>;
export type Ranking = Awaited<ReturnType<typeof leaderboard>>[number];
export type Phase = "qualifier" | "final" | "closed";
export type AdminTeam = Awaited<ReturnType<typeof adminTeams>>[number];
export type TeamAnswers = Awaited<ReturnType<typeof teamAnswers>>;
export type FinalState = Awaited<ReturnType<typeof finalStateFor>>;
export interface Overview {
  participants: number;
  started: number;
  decisions: number;
  phase: Phase;
  finalistCount: number;
  finalOpenedAt: string | null;
  departments: (Department & {
    perQuestion: number[];
    activePerQuestion: number[];
    waiting: number;
  })[];
}
export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export const apiBase = (import.meta.env.VITE_API_URL || "/api").replace(
  /\/$/,
  "",
);
const origin = new URL(apiBase, window.location.origin).href.replace(
  /\/api$/,
  "",
);
const client = treaty<App>(origin, { fetch: { credentials: "include" } });
async function read<T>(
  result: PromiseLike<{ data: unknown; error: unknown; status: number }>,
): Promise<T> {
  const response = await result;
  if (response.error) {
    const e = response.error as { value?: { error?: string } };
    throw new ApiError(
      response.status,
      e.value?.error || "เชื่อมต่อไม่สำเร็จ กรุณาลองอีกครั้ง",
    );
  }
  return response.data as T;
}
export const api = {
  me: () => read<{ user: User }>(client.api.auth.me.get()),
  login: (body: { email: string; password: string }) =>
    read<{ user: User }>(client.api.auth.login.post(body)),
  teams: () => read<{ teams: number[] }>(client.api.teams.get()),
  teamLogin: (body: { teamNumber: number; code: string }) =>
    read<{ user: User }>(client.api.auth.team.post(body)),
  rename: (name: string) =>
    read<{ user: User }>(client.api.team.name.patch({ name })),
  competition: () =>
    read<{ phase: Phase; finalistCount: number }>(client.api.competition.get()),
  final: () => read<FinalState>(client.api.final.get()),
  finalAnswer: (body: {
    selections: { sectionId: string; optionId: string }[];
    reason: string;
  }) => read<FinalState>(client.api.final.answer.post(body)),
  logout: () => read(client.api.auth.logout.post()),
  departments: () =>
    read<{ departments: Department[] }>(client.api.departments.get()),
  passport: () => read<Passport>(client.api.passport.get()),
  state: (id: string) =>
    read<QuizState>(client.api.departments({ id }).state.get()),
  answer: (
    id: string,
    body: { questionId: string; optionIds: string[]; reason: string },
  ) =>
    read<{ saved: boolean; state: QuizState }>(
      client.api.departments({ id }).answer.post(body),
    ),
  overview: () => read<Overview>(client.api.admin.overview.get()),
  leaderboard: () =>
    read<{ leaderboard: Ranking[] }>(client.api.admin.leaderboard.get()),
  start: (id: string) =>
    read(client.api.admin.departments({ id })["start-q1"].post()),
  stop: (id: string) => read(client.api.admin.departments({ id }).stop.post()),
  resetDepartment: ({ id, code }: { id: string; code: string }) =>
    read<{ deletedAnswers: number; teams: number }>(
      client.api.admin.departments({ id }).reset.post({ confirm: code }),
    ),
  participants: () =>
    read<{ participants: AdminTeam[] }>(client.api.admin.participants.get()),
  generateTeams: ({ count, confirm }: { count: number; confirm?: string }) =>
    read<{ participants: AdminTeam[] }>(
      client.api.admin.teams.generate.post({ count, confirm }),
    ),
  deleteTeam: ({ id, confirm }: { id: string; confirm?: string }) =>
    read<{ participants: AdminTeam[] }>(
      client.api.admin
        .participants({ id })
        .delete(undefined, { query: { confirm } }),
    ),
  deleteAllTeams: ({ confirm }: { confirm?: string }) =>
    read<{ participants: AdminTeam[] }>(
      client.api.admin.participants.delete(undefined, { query: { confirm } }),
    ),
  teamAnswers: (id: string) =>
    read<TeamAnswers>(client.api.admin.participants({ id }).answers.get()),
  openFinal: () =>
    read<{ finalists: number }>(client.api.admin.final.open.post()),
  closeCompetition: () => read(client.api.admin.close.post()),
  resetCompetition: () =>
    read(client.api.admin.reset.post({ confirm: "RESET" })),
  objective: (
    id: string,
    objectiveId: "growth" | "premium" | "cost" | "customer",
  ) =>
    read(
      client.api.admin.participants({ id }).objective.patch({ objectiveId }),
    ),
};
