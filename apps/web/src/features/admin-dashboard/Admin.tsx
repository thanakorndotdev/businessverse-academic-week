import { useState, useEffect, useRef, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  LockKeyhole,
  Maximize2,
  Pause,
  Play,
  Radio,
  ShieldCheck,
  Trophy,
  Users,
  X,
  Check,
  Target,
  Flag,
  RotateCcw,
  Download,
  KeyRound,
  MessageSquareText,
  ListChecks,
} from "lucide-react";
import { api, type Ranking, type Phase, type AdminTeam } from "../../api";
import { useUser } from "../../hooks";
import { useText } from "../../store";
import { ErrorState, Loading, SignInPrompt } from "../../components/Common";
type Objective = "growth" | "premium" | "cost" | "customer";
export function Admin() {
  const t = useText();
  const { data: user, isPending } = useUser();
  const cache = useQueryClient();
  const [tab, setTab] = useState("operations");
  const [presentation, setPresentationState] = useState(() => {
    try {
      return sessionStorage.getItem("bv_presentation") === "1";
    } catch {
      return false;
    }
  });
  const setPresentation = (on: boolean) => {
    setPresentationState(on);
    try {
      if (on) sessionStorage.setItem("bv_presentation", "1");
      else sessionStorage.removeItem("bv_presentation");
    } catch {}
  };
  const [fullscreenError, setFullscreenError] = useState(false);
  const isAdmin = user?.role === "admin";
  const overview = useQuery({
    queryKey: ["overview"],
    queryFn: api.overview,
    enabled: isAdmin,
    refetchInterval: 10000,
  });
  const board = useQuery({
    queryKey: ["leaderboard"],
    queryFn: api.leaderboard,
    enabled: isAdmin,
    refetchInterval: 5000,
  });
  const refreshAll = () => {
    for (const key of ["overview", "leaderboard", "participants"])
      cache.invalidateQueries({ queryKey: [key] });
  };
  const start = useMutation({ mutationFn: api.start, onSuccess: refreshAll });
  const stop = useMutation({ mutationFn: api.stop, onSuccess: refreshAll });
  if (isPending) return <Loading />;
  if (!user) return <SignInPrompt next="/admin" />;
  if (!isAdmin)
    return (
      <section className="empty-state">
        <ShieldCheck size={40} />
        <h1>{t("พื้นที่สำหรับผู้จัดงาน", "Organizer access required")}</h1>
        <p>
          {t(
            "บัญชีผู้เล่นไม่สามารถดูคะแนน อันดับ หรือควบคุมการแข่งขันได้",
            "Participant accounts cannot access scores, standings, or competition controls.",
          )}
        </p>
        <Link to="/" className="button primary">
          {t("กลับสู่สนามธุรกิจ", "Back to challenge hub")}
        </Link>
      </section>
    );
  const phase: Phase = overview.data?.phase ?? "qualifier";
  if (presentation)
    return (
      <Presentation
        rankings={board.data?.leaderboard ?? []}
        phase={phase}
        error={board.error}
        fullscreenError={fullscreenError}
        onUnlock={async () => {
          setPresentation(false);
          if (document.fullscreenElement)
            await document.exitFullscreen().catch(() => {});
        }}
      />
    );
  const busyId = start.isPending
    ? start.variables
    : stop.isPending
      ? stop.variables
      : null;
  return (
    <>
      <div className="page-heading">
        <div>
          <h1>{t("ศูนย์ควบคุมการแข่งขัน", "Competition control center")}</h1>
          <p>
            {t(
              "เปิด/พักภารกิจ ติดตามความก้าวหน้า และดูผลแบบเรียลไทม์",
              "Open or pause missions, follow progress, and monitor live standings.",
            )}
          </p>
        </div>
        <button
          className="button primary"
          onClick={async () => {
            setPresentation(true);
            try {
              await document.documentElement.requestFullscreen();
              setFullscreenError(false);
            } catch {
              setFullscreenError(true);
            }
          }}
        >
          <Maximize2 size={17} />
          {t("เปิดจอพรีเซนต์", "Present standings")}
        </button>
      </div>
      <div className="admin-summary">
        <div>
          <Users size={21} />
          <span>{t("ทีมทั้งหมด", "Teams")}</span>
          <strong>{overview.data?.participants ?? "—"}</strong>
        </div>
        <div>
          <Play size={21} />
          <span>{t("เริ่มเล่นแล้ว", "Started playing")}</span>
          <strong>{overview.data?.started ?? "—"}</strong>
        </div>
        <div>
          <ListChecks size={21} />
          <span>{t("การตัดสินใจรอบคัดเลือก", "Qualifying decisions")}</span>
          <strong>
            {overview.data?.decisions ?? "—"}
            <small> / {(overview.data?.participants ?? 0) * 24}</small>
          </strong>
        </div>
        <div>
          <Radio size={21} />
          <span>{t("สาขาที่เปิดอยู่", "Open disciplines")}</span>
          <strong>
            {overview.data?.departments.filter((d) => d.isQ1Unlocked).length ??
              "—"}
            <small> / 8</small>
          </strong>
        </div>
      </div>
      <PhasePanel phase={phase} onChanged={refreshAll} />
      <div className="admin-tabs">
        <button
          className={tab === "operations" ? "selected" : ""}
          onClick={() => setTab("operations")}
        >
          {t("จัดการภารกิจและคะแนน", "Missions & standings")}
        </button>
        <button
          className={tab === "teams" ? "selected" : ""}
          onClick={() => setTab("teams")}
        >
          <KeyRound size={16} />
          {t("ทีม รหัส และเหตุผล", "Teams, codes & reasoning")}
        </button>
      </div>
      {tab === "operations" ? (
        <div className="admin-layout">
          <section className="gate-panel">
            <div className="section-heading">
              <div>
                <h2>{t("ควบคุมการเริ่มภารกิจ", "Mission start controls")}</h2>
                <p>
                  {t(
                    "เปิดข้อแรกหลังวิทยากรสอนจบ ข้อ 2–3 ต่ออัตโนมัติ ข้อละ 3 นาที กดพักเพื่อหยุดรับคำตอบสาขานั้นชั่วคราว",
                    "Open question one after the lecture; questions two and three follow automatically, 3 minutes each. Pause to stop answers for that discipline.",
                  )}
                </p>
              </div>
            </div>
            {overview.isPending ? (
              <Loading />
            ) : overview.error ? (
              <ErrorState
                error={overview.error}
                retry={() => overview.refetch()}
              />
            ) : (
              <div className="gate-list">
                {overview.data?.departments.map((d) => (
                  <div className="gate-row" key={d.id}>
                    <span className="gate-number">
                      {String(d.displayOrder).padStart(2, "0")}
                    </span>
                    <div className="gate-name">
                      <h3>{t(d.nameTh, d.name)}</h3>
                      <span>
                        {d.code} · {d.perQuestion[2]}{" "}
                        {t("ผ่านครบแล้ว", "completed")} · {d.waiting}{" "}
                        {t("รอเริ่ม", "waiting")}
                      </span>
                      <div className="question-counts">
                        {d.perQuestion.map((n, i) => (
                          <span
                            key={i}
                            title={t(
                              "ผ่านแล้ว / กำลังตอบใน 45 วินาทีล่าสุด",
                              "Submitted / active within the last 45 seconds",
                            )}
                          >
                            Q{i + 1}{" "}
                            <b>
                              {n} / {d.activePerQuestion[i]}
                            </b>
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="gate-actions">
                      {d.isQ1Unlocked ? (
                        <>
                          <span className="status-badge live">
                            <i />
                            {t("เปิดอยู่", "Live")}
                          </span>
                          <button
                            className="button small secondary"
                            disabled={busyId !== null || phase !== "qualifier"}
                            onClick={() => stop.mutate(d.id)}
                          >
                            <Pause size={13} />
                            {busyId === d.id
                              ? t("กำลังพัก…", "Pausing…")
                              : t("พัก", "Pause")}
                          </button>
                        </>
                      ) : (
                        <>
                          {d.q1UnlockedAt && (
                            <span className="status-badge waiting">
                              {t("พักอยู่", "Paused")}
                            </span>
                          )}
                          <button
                            className="button small primary"
                            disabled={busyId !== null || phase !== "qualifier"}
                            onClick={() => start.mutate(d.id)}
                          >
                            <Play size={13} />
                            {busyId === d.id
                              ? t("กำลังเปิด…", "Opening…")
                              : d.q1UnlockedAt
                                ? t("เปิดต่อ", "Resume")
                                : t("เริ่มข้อ 1", "Start Q1")}
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
            {start.error && <ErrorState error={start.error} />}
            {stop.error && <ErrorState error={stop.error} />}
          </section>
          <section className="standings-panel">
            <div className="section-heading">
              <div>
                <h2>{t("อันดับสด", "Live standings")}</h2>
                <p>
                  {phase === "qualifier"
                    ? t(
                        "10 อันดับแรกคือทีมที่จะเข้ารอบ Final · รอบคัดเลือกเต็ม 80",
                        "The top 10 advance to the Final · Qualifier out of 80",
                      )
                    : t(
                        "Finalists: คะแนนรอบคัดเลือก 80 + Final Crisis 20",
                        "Finalists: qualifier 80 + Final Crisis 20",
                      )}
                </p>
              </div>
              <span className="live-indicator">
                <i />
                {phase.toUpperCase()}
              </span>
            </div>
            {board.isPending ? (
              <Loading />
            ) : board.error ? (
              <ErrorState error={board.error} retry={() => board.refetch()} />
            ) : (
              <Standings
                rankings={board.data?.leaderboard ?? []}
                phase={phase}
              />
            )}
            <p className="admin-note">
              <LockKeyhole size={14} />
              {t(
                "เฉพาะผู้จัดงาน ผู้เล่นไม่เห็นคะแนนและอันดับ",
                "Organizer-only. Scores and rankings are hidden from participants.",
              )}
            </p>
          </section>
        </div>
      ) : (
        <TeamsPanel rankings={board.data?.leaderboard ?? []} />
      )}
    </>
  );
}
function ConfirmDialog({
  open,
  title,
  body,
  confirmLabel,
  typed,
  pending,
  error,
  onConfirm,
  onClose,
}: {
  open: boolean;
  title: string;
  body: ReactNode;
  confirmLabel: string;
  typed?: string;
  pending: boolean;
  error: unknown;
  onConfirm: () => void;
  onClose: () => void;
}) {
  const t = useText();
  const ref = useRef<HTMLDialogElement>(null);
  const [value, setValue] = useState("");
  useEffect(() => {
    if (open) {
      setValue("");
      ref.current?.showModal();
    } else ref.current?.close();
  }, [open]);
  return (
    <dialog
      ref={ref}
      onCancel={onClose}
      aria-labelledby="confirm-title"
      className="unlock-dialog confirm-dialog"
    >
      <h2 id="confirm-title">{title}</h2>
      <p>{body}</p>
      {typed && (
        <label className="typed-confirm">
          {t(`พิมพ์ ${typed} เพื่อยืนยัน`, `Type ${typed} to confirm`)}
          <input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            autoComplete="off"
            spellCheck={false}
          />
        </label>
      )}
      {Boolean(error) && <ErrorState error={error} />}
      <div>
        <button autoFocus className="button secondary" onClick={onClose}>
          {t("ยกเลิก", "Cancel")}
        </button>
        <button
          className="button primary"
          disabled={pending || (!!typed && value.trim() !== typed)}
          onClick={onConfirm}
        >
          {pending ? t("กำลังดำเนินการ…", "Working…") : confirmLabel}
        </button>
      </div>
    </dialog>
  );
}
function PhasePanel({
  phase,
  onChanged,
}: {
  phase: Phase;
  onChanged: () => void;
}) {
  const t = useText();
  const [dialog, setDialog] = useState<"final" | "close" | "reset" | null>(
    null,
  );
  const done = () => {
    setDialog(null);
    onChanged();
  };
  const final = useMutation({ mutationFn: api.openFinal, onSuccess: done });
  const close = useMutation({
    mutationFn: api.closeCompetition,
    onSuccess: done,
  });
  const reset = useMutation({
    mutationFn: api.resetCompetition,
    onSuccess: done,
  });
  const steps: { id: Phase; label: string }[] = [
    { id: "qualifier", label: t("รอบคัดเลือก · 80", "Qualifier · 80") },
    { id: "final", label: t("Final Top 10 · 20", "Final Top 10 · 20") },
    { id: "closed", label: t("ปิดเกม", "Closed") },
  ];
  const at = steps.findIndex((s) => s.id === phase);
  return (
    <section className="phase-panel">
      <ol className="phase-steps">
        {steps.map((s, i) => (
          <li
            key={s.id}
            className={i < at ? "done" : i === at ? "current" : ""}
          >
            <span>{i < at ? <Check size={13} /> : i + 1}</span>
            {s.label}
          </li>
        ))}
      </ol>
      <div className="phase-actions">
        {phase === "qualifier" && (
          <button
            className="button small primary"
            onClick={() => setDialog("final")}
          >
            <Trophy size={14} />
            {t("ประกาศ Top 10 และเปิด Final", "Announce Top 10 & open Final")}
          </button>
        )}
        {phase !== "closed" && (
          <button
            className="button small secondary"
            onClick={() => setDialog("close")}
          >
            <Flag size={14} />
            {t("ปิดรับคำตอบ / จบเกม", "Close answers / end game")}
          </button>
        )}
        <button
          className="button small danger"
          onClick={() => setDialog("reset")}
        >
          <RotateCcw size={14} />
          {t("รีเซ็ตการแข่งขัน", "Reset competition")}
        </button>
      </div>
      <ConfirmDialog
        open={dialog === "final"}
        title={t("ประกาศ Top 10 และเปิด Final?", "Announce Top 10 and open the Final?")}
        body={t(
          "ระบบจะล็อก 10 ทีมคะแนนสูงสุดเป็น Finalist ปิดรับคำตอบรอบคัดเลือก และเปิดโจทย์ Final Business Crisis (3 นาที) ให้ทุกทีม ทีมอื่นตอบได้แบบ Audience Challenge โดยไม่กระทบผล",
          "The top 10 become finalists, the qualifier closes, and the 3-minute Final Business Crisis opens to every team. Non-finalists can answer as an audience challenge without affecting results.",
        )}
        confirmLabel={t("ยืนยันเปิด Final", "Open the Final")}
        pending={final.isPending}
        error={final.error}
        onConfirm={() => final.mutate()}
        onClose={() => {
          setDialog(null);
          final.reset();
        }}
      />
      <ConfirmDialog
        open={dialog === "close"}
        title={t("ปิดรับคำตอบและจบเกม?", "Close answers and end the game?")}
        body={t(
          "ทุกทีมจะส่งคำตอบไม่ได้อีก อันดับสุดท้ายจะถูกล็อกไว้สำหรับประกาศผล",
          "No team can submit further answers. Final standings stay fixed for the announcement.",
        )}
        confirmLabel={t("ยืนยันจบเกม", "End the game")}
        pending={close.isPending}
        error={close.error}
        onConfirm={() => close.mutate()}
        onClose={() => {
          setDialog(null);
          close.reset();
        }}
      />
      <ConfirmDialog
        open={dialog === "reset"}
        title={t("รีเซ็ตการแข่งขันทั้งหมด?", "Reset the entire competition?")}
        body={t(
          "ลบคำตอบ เหตุผล คะแนน Finalist และปิดทุกสาขา ทีมและรหัสทีมยังอยู่ ย้อนกลับไม่ได้",
          "Deletes all answers, reasons, scores and finalists, and closes every discipline. Teams and codes are kept. This cannot be undone.",
        )}
        typed="RESET"
        confirmLabel={t("รีเซ็ตทั้งหมด", "Reset everything")}
        pending={reset.isPending}
        error={reset.error}
        onConfirm={() => reset.mutate()}
        onClose={() => {
          setDialog(null);
          reset.reset();
        }}
      />
    </section>
  );
}
function downloadCodes(teams: AdminTeam[]) {
  const rows = [
    ["team", "name", "code", "target"],
    ...teams.map((p) => [
      String(p.teamNumber).padStart(3, "0"),
      p.fullName,
      p.accessCode ?? "",
      p.objective.title,
    ]),
  ];
  const csv = rows
    .map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","))
    .join("\n");
  const url = URL.createObjectURL(
    new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = "businessverse-team-codes.csv";
  a.click();
  URL.revokeObjectURL(url);
}
function TeamsPanel({ rankings }: { rankings: Ranking[] }) {
  const t = useText();
  const cache = useQueryClient();
  const [count, setCount] = useState(150);
  const [open, setOpen] = useState<string | null>(null);
  const participants = useQuery({
    queryKey: ["participants"],
    queryFn: api.participants,
  });
  const generate = useMutation({
    mutationFn: api.generateTeams,
    onSuccess: (data) => {
      cache.setQueryData(["participants"], data);
      cache.invalidateQueries({ queryKey: ["overview"] });
    },
  });
  const target = useMutation({
    mutationFn: ({ id, objectiveId }: { id: string; objectiveId: Objective }) =>
      api.objective(id, objectiveId),
    onSuccess: () => cache.invalidateQueries({ queryKey: ["participants"] }),
  });
  const list = participants.data?.participants ?? [];
  return (
    <section className="assignments">
      <div className="teams-toolbar">
        <div>
          <h2>{t("ทีมและรหัสเข้าเกม", "Teams and access codes")}</h2>
          <p>
            {t(
              "สร้างทีม 1 ถึง N พร้อมรหัสสุ่ม แจกรหัสให้แต่ละทีม target วนตามหมายเลขทีม (Growth → Premium → Cost → Customer) เปลี่ยนได้ก่อนทีมเริ่มตอบเท่านั้น",
              "Create teams 1 to N with random codes and hand each team its code. Targets cycle by team number (Growth → Premium → Cost → Customer) and can change only before a team’s first answer.",
            )}
          </p>
        </div>
        <form
          className="generate-form"
          onSubmit={(e) => {
            e.preventDefault();
            generate.mutate(count);
          }}
        >
          <label>
            {t("จำนวนทีม", "Number of teams")}
            <input
              type="number"
              min={1}
              max={300}
              value={count}
              onChange={(e) => setCount(Number(e.target.value))}
            />
          </label>
          <button
            className="button small primary"
            disabled={generate.isPending || count < 1 || count > 300}
          >
            <Users size={14} />
            {generate.isPending
              ? t("กำลังสร้าง…", "Creating…")
              : t("สร้าง/เติมทีม", "Create teams")}
          </button>
          <button
            type="button"
            className="button small secondary"
            disabled={!list.length}
            onClick={() => downloadCodes(list)}
          >
            <Download size={14} />
            CSV
          </button>
        </form>
      </div>
      {generate.error && <ErrorState error={generate.error} />}
      {participants.isPending ? (
        <Loading />
      ) : participants.error ? (
        <ErrorState error={participants.error} />
      ) : !list.length ? (
        <div className="empty-inline">
          {t(
            "ยังไม่มีทีม กดสร้างทีมเพื่อออกรหัส",
            "No teams yet. Create teams to issue codes.",
          )}
        </div>
      ) : (
        <div className="table-scroll">
          <table className="teams-table">
            <thead>
              <tr>
                <th>TEAM</th>
                <th>{t("ชื่อทีม", "Team name")}</th>
                <th>{t("รหัส", "Code")}</th>
                <th>{t("เป้าหมายธุรกิจ", "Strategic target")}</th>
                <th>{t("ข้อ", "Progress")}</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {list.map((p) => (
                <TeamRow
                  key={p.id}
                  team={p}
                  expanded={open === p.id}
                  onToggle={() => setOpen(open === p.id ? null : p.id)}
                  locked={
                    target.isPending ||
                    p.answered > 0 ||
                    (rankings.find((r) => r.id === p.id)?.answered ?? 0) > 0
                  }
                  onTarget={(objectiveId) =>
                    target.mutate({ id: p.id, objectiveId })
                  }
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
      {target.error && <ErrorState error={target.error} />}
    </section>
  );
}
function TeamRow({
  team: p,
  expanded,
  onToggle,
  locked,
  onTarget,
}: {
  team: AdminTeam;
  expanded: boolean;
  onToggle: () => void;
  locked: boolean;
  onTarget: (o: Objective) => void;
}) {
  const t = useText();
  return (
    <>
      <tr>
        <td>{String(p.teamNumber).padStart(3, "0")}</td>
        <td>
          <strong>{p.fullName}</strong>
          {p.finalistRank !== null && (
            <span className="finalist-label">FINALIST</span>
          )}
        </td>
        <td>
          {p.accessCode ? (
            <code className="team-code">{p.accessCode}</code>
          ) : (
            <small>{t("ไม่มีรหัส", "No code")}</small>
          )}
        </td>
        <td>
          <select
            aria-label={`Target for ${p.fullName}`}
            value={p.objective.id}
            disabled={locked}
            onChange={(e) => onTarget(e.target.value as Objective)}
          >
            <option value="growth">Growth Company</option>
            <option value="premium">Premium Brand</option>
            <option value="cost">Cost Leader</option>
            <option value="customer">Customer Champion</option>
          </select>
          <small className="target-rule">{p.objective.target}</small>
        </td>
        <td>
          {p.answered}
          <small> / 24</small>
        </td>
        <td className="row-actions">
          <button
            className="icon-text"
            aria-expanded={expanded}
            onClick={onToggle}
          >
            <MessageSquareText size={14} />
            {expanded ? t("ซ่อน", "Hide") : t("เหตุผล", "Reasons")}
          </button>
        </td>
      </tr>
      {expanded && (
        <tr className="answers-row">
          <td colSpan={6}>
            <TeamAnswersView id={p.id} />
          </td>
        </tr>
      )}
    </>
  );
}
function TeamAnswersView({ id }: { id: string }) {
  const t = useText();
  const q = useQuery({
    queryKey: ["team-answers", id],
    queryFn: () => api.teamAnswers(id),
  });
  if (q.isPending) return <Loading />;
  if (q.error) return <ErrorState error={q.error} />;
  const data = q.data!;
  if (!data.answers.length && !data.final)
    return (
      <p className="empty-inline">
        {t("ทีมนี้ยังไม่ได้ตอบ", "This team hasn’t answered yet.")}
      </p>
    );
  return (
    <ol className="reason-list">
      {data.answers.map((a) => (
        <li key={a.stage}>
          <span className="reason-stage">
            {String(a.stage).padStart(2, "0")}
          </span>
          <div>
            <strong>
              {a.department} · Q{a.questionNumber} · {a.title}
            </strong>
            <p>
              {a.timedOut ? (
                <em className="timeout-note">
                  {t("หมดเวลา ไม่ได้ตอบ", "Timed out")}
                </em>
              ) : (
                <>
                  <b>{a.choices.join(", ")}</b>
                  {a.reason && <> — “{a.reason}”</>}
                </>
              )}
            </p>
          </div>
        </li>
      ))}
      {data.final && (
        <li className="final-reason">
          <span className="reason-stage">F</span>
          <div>
            <strong>
              Final Business Crisis
              {!data.final.isFinalist && " · Audience"} · fit{" "}
              {data.final.fit} / 20
            </strong>
            <p>
              <b>{data.final.choice}</b> — “{data.final.reason}”
            </p>
          </div>
        </li>
      )}
    </ol>
  );
}
function Standings({
  rankings,
  phase,
}: {
  rankings: Ranking[];
  phase: Phase;
}) {
  const t = useText();
  const final = phase !== "qualifier";
  return rankings.length ? (
    <div className="table-scroll">
      <table className="standings-table">
        <thead>
          <tr>
            <th>#</th>
            <th>{t("ทีม", "Team")}</th>
            <th>{t("ข้อ", "Progress")}</th>
            {final && <th>{t("คัดเลือก", "Qualifier")}</th>}
            {final && <th>Final</th>}
            <th>{t("คะแนน", "Score")}</th>
          </tr>
        </thead>
        <tbody>
          {rankings.map((r) => (
            <tr key={r.id} className={r.isTop ? "top-four" : ""}>
              <td>
                <span className="rank-number">{r.rank}</span>
              </td>
              <td>
                <strong>{r.fullName}</strong>
                <span className="team-sub">
                  TEAM {String(r.teamNumber).padStart(3, "0")}
                  {r.isTop && (
                    <span className="finalist-label">
                      {final ? "FINALIST" : "TOP 10"}
                    </span>
                  )}
                </span>
              </td>
              <td>
                {r.answered}
                <small> / 24</small>
              </td>
              {final && <td>{r.qualifierPoints.toFixed(2)}</td>}
              {final && (
                <td>
                  {r.finalistRank === null
                    ? "—"
                    : r.finalAnswered
                      ? r.finalPoints.toFixed(0)
                      : t("รอ", "…")}
                </td>
              )}
              <td className="score-cell">{r.totalPoints.toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  ) : (
    <div className="scoreboard-empty">
      <Trophy size={34} />
      <h3>{t("รอทีมแรก", "Waiting for the first team")}</h3>
      <p>
        {t(
          "อันดับจะปรากฏเมื่อสร้างทีม และอัปเดตทุกครั้งที่มีคำตอบ",
          "Standings appear once teams exist and update with every decision.",
        )}
      </p>
    </div>
  );
}
function Presentation({
  rankings,
  phase,
  error,
  fullscreenError,
  onUnlock,
}: {
  rankings: Ranking[];
  phase: Phase;
  error: unknown;
  fullscreenError: boolean;
  onUnlock: () => void;
}) {
  const t = useText();
  const [confirm, setConfirm] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const unlockButton = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const shell = Array.from(
      document.querySelectorAll<HTMLElement>(
        ".sidebar, .topbar, .page-footer, .mobile-nav, .skip-link",
      ),
    );
    const previous = shell.map((element) => element.inert);
    shell.forEach((element) => {
      element.inert = true;
    });
    unlockButton.current?.focus({ preventScroll: true });
    return () =>
      shell.forEach((element, i) => {
        element.inert = previous[i];
      });
  }, []);

  useEffect(() => {
    if (confirm) dialog.current?.showModal();
    else dialog.current?.close();
  }, [confirm]);
  return (
    <div className="presentation">
      <header>
        <img
          src="/1-UBS-UTCC-1.png"
          width="1557"
          height="650"
          alt="UTCC Business School"
        />
        <span>BUSINESSVERSE · ACADEMIC WEEK 2026</span>
        <span className="live-indicator">
          <i />
          LIVE STANDINGS
        </span>
      </header>
      <div className="presentation-title">
        <div>
          <h1>
            {phase === "qualifier"
              ? t("10 ทีมที่คะแนนนำ", "The top 10 teams")
              : t("FINAL BUSINESS BATTLE · TOP 10", "FINAL BUSINESS BATTLE · TOP 10")}
          </h1>
          <p>
            {phase === "qualifier"
              ? t(
                  "รอบคัดเลือกเต็ม 80 คะแนน · อัปเดตแบบเรียลไทม์",
                  "Qualifier out of 80 · Updates live",
                )
              : t(
                  "คะแนนรอบคัดเลือก 80 + Final Crisis 20",
                  "Qualifier 80 + Final Crisis 20",
                )}
          </p>
        </div>
        <Trophy size={53} strokeWidth={1.1} />
      </div>
      {Boolean(error) && <ErrorState error={error} />}
      <div className="finalist-grid">
        {Array.from({ length: 3 }, (_, i) => {
          const r = rankings[i];
          return (
            <section key={r?.id ?? i} className={`finalist finalist-${i + 1}`}>
              <span className="podium-rank">
                {String(i + 1).padStart(2, "0")}
              </span>
              <span className="finalist-team">
                {r
                  ? `TEAM ${String(r.teamNumber).padStart(3, "0")}`
                  : t("รอผู้เข้าร่วม", "AWAITING PLAYER")}
              </span>
              <h2>{r?.fullName ?? "—"}</h2>
              <strong>{r ? r.totalPoints.toFixed(2) : "—"}</strong>
              <span>{t("คะแนน", "POINTS")}</span>
            </section>
          );
        })}
      </div>
      <ol className="finalist-list" start={4}>
        {Array.from({ length: 7 }, (_, k) => {
          const i = k + 3;
          const r = rankings[i];
          return (
            <li key={r?.id ?? i}>
              <span className="podium-rank">{String(i + 1).padStart(2, "0")}</span>
              <div>
                <span className="finalist-team">
                  {r ? `TEAM ${String(r.teamNumber).padStart(3, "0")}` : t("รอทีม", "AWAITING")}
                </span>
                <h2>{r?.fullName ?? "—"}</h2>
              </div>
              <strong>{r ? r.totalPoints.toFixed(2) : "—"}</strong>
            </li>
          );
        })}
      </ol>
      <footer>
        <span>
          <LockKeyhole size={16} />
          {t("ล็อกจอพรีเซนต์แล้ว", "Presentation controls locked")}
          {fullscreenError && t(" · โหมดเต็มหน้าต่าง", " · Expanded window mode")}
        </span>
        <button
          ref={unlockButton}
          className="unlock-button"
          onClick={() => setConfirm(true)}
        >
          <LockKeyhole size={15} />
          {t("ปลดล็อก", "Unlock")}
        </button>
      </footer>
      <dialog
        ref={dialog}
        onCancel={() => setConfirm(false)}
        aria-modal="true"
        aria-labelledby="unlock-title"
        className="unlock-dialog"
      >
        <LockKeyhole size={30} />
        <h2 id="unlock-title">
          {t("ออกจากจอพรีเซนต์?", "Unlock presentation?")}
        </h2>
        <p>
          {t(
            "ยืนยันเพื่อกลับไปยังหน้าควบคุมการแข่งขัน",
            "Confirm to return to competition controls.",
          )}
        </p>
        <div>
          <button
            autoFocus
            className="button secondary"
            onClick={() => setConfirm(false)}
          >
            {t("แสดงต่อ", "Keep presenting")}
          </button>
          <button className="button primary" onClick={onUnlock}>
            {t("ยืนยันปลดล็อก", "Unlock controls")}
            <X size={16} />
          </button>
        </div>
      </dialog>
    </div>
  );
}
