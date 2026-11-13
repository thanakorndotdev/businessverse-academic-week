import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Coins,
  CheckCircle2,
  Clock3,
  CloudLightning,
  LockKeyhole,
  Radio,
  Trophy,
} from "lucide-react";
import { api, type FinalState } from "../../api";
import { useCompetition, useUser } from "../../hooks";
import { useText } from "../../store";
import { ErrorState, Loading, SignInPrompt } from "../../components/Common";

/** Final round entry shown on the hub once the organizer opens the Final. */
export function FinalBanner() {
  const t = useText();
  const { data: user } = useUser();
  const { data } = useCompetition();
  if (!user || user.role !== "attendee" || !data || data.phase === "qualifier")
    return null;
  return (
    <Link to="/final" className="final-banner">
      <CloudLightning size={24} />
      <div>
        <strong>
          {data.phase === "final"
            ? t(
                "Final Business Crisis เปิดแล้ว",
                "The Final Business Crisis is open",
              )
            : t("การแข่งขันจบแล้ว", "The competition has ended")}
        </strong>
        <span>
          {data.phase === "final"
            ? t("ตอบภายใน 3 นาที", "Answer within 3 minutes")
            : t("ดูคำตอบ Final ของทีม", "See your team’s Final answer")}
        </span>
      </div>
      <ArrowRight size={18} />
    </Link>
  );
}

export function Final() {
  const t = useText();
  const cache = useQueryClient();
  const { data: user, isPending } = useUser();
  const query = useQuery({
    queryKey: ["final"],
    queryFn: api.final,
    enabled: !!user && user.role === "attendee",
    refetchInterval: 15000,
  });
  const [now, setNow] = useState(() => Date.now());
  const timer = query.data?.timer ?? null;
  useEffect(() => {
    if (!timer) return;
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, [timer]);
  const remaining = timer
    ? Math.ceil(
        (new Date(timer.deadline).getTime() -
          (now + new Date(timer.serverNow).getTime() - query.dataUpdatedAt)) /
          1000,
      )
    : null;
  const expired = remaining !== null && remaining <= 0;
  useEffect(() => {
    if (!expired) return;
    const id = setTimeout(
      () => cache.invalidateQueries({ queryKey: ["final"] }),
      6500,
    );
    return () => clearTimeout(id);
  }, [expired, cache]);
  if (isPending) return <Loading />;
  if (!user) return <SignInPrompt next="/final" />;
  if (user.role !== "attendee")
    return (
      <section className="empty-state">
        <p>{t("หน้านี้สำหรับทีมผู้เล่น", "This page is for teams.")}</p>
        <Link to="/admin" className="button primary">
          {t("ไปศูนย์ควบคุม", "Go to control center")}
        </Link>
      </section>
    );
  if (query.isPending) return <Loading />;
  if (query.error)
    return <ErrorState error={query.error} retry={() => query.refetch()} />;
  const f = query.data!;
  const q = f.question;
  return (
    <div className="quiz-page final-page">
      <Link to="/" className="back-link">
        <ArrowLeft size={16} />
        {t("สนามธุรกิจ", "Challenge hub")}
      </Link>
      <div className="quiz-heading">
        <div>
          <h1>{q?.title ?? "The Perfect Storm"}</h1>
          <p>
            {f.isFinalist ? <Trophy size={14} /> : <Radio size={14} />}{" "}
            {f.isFinalist
              ? t(
                  "Finalist · คะแนน Final รวมในผลรางวัล",
                  "Finalist · Final counts toward awards",
                )
              : t(
                  "ทุกทีมร่วมส่งแผนได้ · รวมคะแนนรางวัลเฉพาะ Top 10",
                  "Every team can submit · Only Top 10 count toward awards",
                )}
          </p>
        </div>
      </div>
      <section className="question-panel">
        {f.phase === "qualifier" || !q ? (
          <div className="waiting-room">
            <span className="waiting-symbol">
              <Clock3 size={38} />
            </span>
            <h2>{t("รอบ Final ยังไม่เปิด", "The Final hasn’t opened yet")}</h2>
            <p>
              {t(
                "เมื่อจบรอบคัดเลือก ผู้จัดงานจะประกาศ Top 10 และเปิดโจทย์ Final ที่หน้านี้",
                "After the qualifier, the organizer announces the Top 10 and opens the Final here.",
              )}
            </p>
          </div>
        ) : (
          <>
            <p className="scenario">{q.scenario}</p>
            {!f.isFinalist && (
              <p className="audience-note">
                {t(
                  "ทีมของคุณร่วมตอบได้เพื่อเปรียบเทียบกลยุทธ์ แต่คะแนนจะไม่กระทบผลการแข่งขัน Top 10",
                  "Your team can answer to compare strategies, but it won’t affect the Top 10 results.",
                )}
              </p>
            )}
            <section
              className="final-context"
              aria-label={t(
                "เป้าหมายและสถานะบริษัทเดิม",
                "Objective and existing company state",
              )}
            >
              <div>
                <h2>{f.objective.title}</h2>
                <p>{f.objective.description}</p>
                <strong>{f.objective.target}</strong>
              </div>
              <dl>
                {(
                  [
                    "cash",
                    "sales",
                    "customer",
                    "brand",
                    "operations",
                    "risk",
                  ] as const
                ).map((key) => (
                  <div key={key}>
                    <dt>
                      {key === "cash" ? t("Coins เดิม", "Existing Coins") : key}
                    </dt>
                    <dd>{f.companyState[key].toLocaleString()}</dd>
                  </div>
                ))}
              </dl>
              <p>
                {t("ความสามารถเดิม", "Existing capabilities")}:{" "}
                {(
                  [
                    "innovation",
                    "crm",
                    "premium",
                    "analytics",
                    "cyber",
                  ] as const
                )
                  .filter((key) => f.companyState[key])
                  .join(" · ") || t("ยังไม่มี", "None yet")}
              </p>
            </section>
            {remaining !== null && !f.saved && (
              <div
                className={`question-timer ${remaining <= 30 ? "urgent" : ""} ${expired ? "expired" : ""}`}
                role="timer"
              >
                <Clock3 size={17} />
                <span>
                  {expired
                    ? t("หมดเวลา", "Time is up")
                    : t("เวลาที่เหลือ", "Time left")}
                </span>
                <strong>
                  {Math.floor(Math.max(0, remaining) / 60)}:
                  {String(Math.max(0, remaining) % 60).padStart(2, "0")}
                </strong>
                <i
                  style={{
                    width: `${(Math.max(0, remaining) / (timer?.seconds ?? 180)) * 100}%`,
                  }}
                />
              </div>
            )}
            {f.saved ? (
              <div className="waiting-room completion">
                <span className="completion-stamp">
                  <CheckCircle2 size={49} />
                </span>
                <h2>
                  {t("บันทึก Final Business Crisis แล้ว", "Final answer saved")}
                </h2>
                <ul className="final-saved-plan">
                  {f.saved.selections.map((selection) => {
                    const section = q.sections.find(
                      (s) => s.id === selection.sectionId,
                    );
                    return (
                      <li key={selection.sectionId}>
                        <strong>{section?.title}</strong>
                        <span>
                          {
                            section?.options.find(
                              (o) => o.id === selection.optionId,
                            )?.title
                          }
                        </span>
                      </li>
                    );
                  })}
                </ul>
                {f.saved.legacyChoice && <p>{f.saved.legacyChoice}</p>}
                <p>“{f.saved.reason}”</p>
                <p>
                  {t(
                    "รอผู้จัดงานประกาศผลบนจอหลัก",
                    "Wait for the organizer to announce results on the main screen.",
                  )}
                </p>
              </div>
            ) : !f.open && !timer ? (
              <div className="waiting-room">
                <LockKeyhole size={38} />
                <h2>{t("ปิดรับ Final แล้ว", "The Final is closed")}</h2>
                <p>
                  {t(
                    "ทีมของคุณไม่ได้ส่งคำตอบ Final ทันเวลา",
                    "Your team did not submit a Final answer in time.",
                  )}
                </p>
              </div>
            ) : (
              <FinalPlanForm
                key={`${user.id}:${f.timer?.startsAt}`}
                state={f}
                expired={expired}
                draftKey={`businessverse-final:${user.id}:${f.timer?.startsAt}`}
              />
            )}
          </>
        )}
      </section>
    </div>
  );
}

function FinalPlanForm({
  state,
  expired,
  draftKey,
}: {
  state: FinalState;
  expired: boolean;
  draftKey: string;
}) {
  const t = useText();
  const cache = useQueryClient();
  const q = state.question!;
  const [draft, setDraft] = useState<{
    selected: Record<string, string>;
    reason: string;
  }>(() => {
    try {
      const saved = JSON.parse(sessionStorage.getItem(draftKey) ?? "null");
      if (
        saved &&
        typeof saved.reason === "string" &&
        saved.selected &&
        typeof saved.selected === "object"
      ) {
        const selected = Object.fromEntries(
          q.sections.flatMap((s) =>
            s.options.some((o) => o.id === saved.selected[s.id])
              ? [[s.id, saved.selected[s.id]]]
              : [],
          ),
        );
        return { selected, reason: saved.reason.slice(0, 300) };
      }
    } catch {
      /* A private browser may disable storage. The form remains usable. */
    }
    return { selected: {}, reason: "" };
  });
  const update = (next: typeof draft) => {
    setDraft(next);
    try {
      sessionStorage.setItem(draftKey, JSON.stringify(next));
    } catch {
      /* Optional recovery only. */
    }
  };
  const selectedOptions = q.sections.flatMap((s) =>
    s.options.filter((o) => o.id === draft.selected[s.id]),
  );
  const allocated = selectedOptions.reduce(
    (sum, o) => sum + Math.max(0, o.coins),
    0,
  );
  const received = selectedOptions.reduce(
    (sum, o) => sum + Math.max(0, -o.coins),
    0,
  );
  const remaining = q.budget + received - allocated;
  const complete = selectedOptions.length === q.sections.length;
  const submit = useMutation({
    mutationFn: () =>
      api.finalAnswer({
        selections: q.sections.map((s) => ({
          sectionId: s.id,
          optionId: draft.selected[s.id],
        })),
        reason: draft.reason.trim(),
      }),
    onSuccess: (result) => {
      cache.setQueryData(["final"], result);
      try {
        sessionStorage.removeItem(draftKey);
      } catch {
        /* Optional recovery only. */
      }
    },
  });
  const disabled = submit.isPending || expired || !state.open;
  return (
    <form
      className="final-plan"
      onSubmit={(event) => {
        event.preventDefault();
        if (
          complete &&
          remaining >= 0 &&
          draft.reason.trim().length >= 3 &&
          !disabled
        )
          submit.mutate();
      }}
    >
      <div className="final-budget" role="status" aria-live="polite">
        <div>
          <Coins size={18} />
          <strong>
            {t("วงเงิน Final", "Final allocation")}: {q.budget.toLocaleString()}{" "}
            Coins
          </strong>
        </div>
        <p>
          {t("จัดสรร", "Allocated")} {allocated.toLocaleString()} ·{" "}
          {t("ได้รับ", "Received")} {received.toLocaleString()} ·{" "}
          <strong>
            {t("คงเหลือ", "Remaining")} {remaining.toLocaleString()}
          </strong>
        </p>
        <span>
          {selectedOptions.length} / 8 {t("ส่วน", "sections")}
          {remaining < 0 &&
            ` · ${t("เกินวงเงิน กรุณาปรับแผน", "Over budget. Revise your plan.")}`}
        </span>
      </div>
      <p>
        {t(
          "เลือกหนึ่งการกระทำในแต่ละสาขา แล้วสรุปเหตุผลทั้งแผนครั้งเดียว วงเงินนี้สำหรับแผน Final เท่ากันทุกทีม สถานะบริษัทเดิมมีผลต่อความเหมาะสมและเงินสำรองที่ควรเก็บ",
          "Choose one action per discipline and explain the whole plan once. Every team receives the same Final allocation. Your existing company state affects suitability and required cash reserves.",
        )}
      </p>
      {q.sections.map((section, index) => (
        <fieldset
          key={section.id}
          className="final-section"
          disabled={disabled}
        >
          <legend>
            <span>{index + 1} / 8</span> {section.title}
          </legend>
          <p>{section.prompt}</p>
          <div className="answer-options">
            {section.options.map((option, i) => (
              <label
                key={option.id}
                className={`answer-option ${draft.selected[section.id] === option.id ? "selected" : ""}`}
              >
                <input
                  type="radio"
                  name={section.id}
                  value={option.id}
                  required
                  checked={draft.selected[section.id] === option.id}
                  onChange={() => {
                    submit.reset();
                    update({
                      ...draft,
                      selected: { ...draft.selected, [section.id]: option.id },
                    });
                  }}
                />
                <span className="option-letter" aria-hidden="true">
                  {String.fromCharCode(65 + i)}
                </span>
                <div>
                  <strong>{option.title}</strong>
                  <p>
                    {t("ข้อดี", "Benefit")}: {option.benefit}
                  </p>
                  <p>
                    {t("ข้อแลกเปลี่ยน", "Tradeoff")}: {option.tradeoff}
                  </p>
                  <span className="final-action-coins">
                    {option.coins < 0 ? t("ได้รับ", "Receive") : t("ใช้", "Use")}{" "}
                    {Math.abs(option.coins).toLocaleString()} Coins
                  </span>
                </div>
                <span className="option-check" aria-hidden="true">
                  {draft.selected[section.id] === option.id && (
                    <Check size={13} />
                  )}
                </span>
              </label>
            ))}
          </div>
        </fieldset>
      ))}
      <label className="reason-field">
        <span>
          {t("สรุปเหตุผลของแผนทั้งชุด", "Explain your complete plan")}{" "}
          <small>
            {t(
              "เชื่อมลำดับการทำงาน เงินสำรอง สถานะบริษัท และ Objective ของทีม",
              "Connect timing, cash reserves, company state and your objective.",
            )}
          </small>
        </span>
        <textarea
          value={draft.reason}
          required
          minLength={3}
          maxLength={300}
          rows={4}
          disabled={disabled}
          onChange={(e) => update({ ...draft, reason: e.target.value })}
          placeholder={t(
            "เราจะแก้…ก่อน แล้วจึง… เพื่อ…",
            "We will address… first, then… to achieve…",
          )}
        />
        <em>{draft.reason.length} / 300</em>
      </label>
      {submit.error && <ErrorState error={submit.error} />}
      <div className="question-submit">
        <p>
          <LockKeyhole size={14} />
          {t(
            "ส่งแผนครั้งเดียว · ยืนยันแล้วแก้ไม่ได้ · เวลา 3 นาที",
            "Submit once · No changes after confirmation · 3 minutes",
          )}
        </p>
        <button
          type="submit"
          className="button primary"
          disabled={
            disabled ||
            !complete ||
            remaining < 0 ||
            draft.reason.trim().length < 3
          }
        >
          {submit.isPending
            ? t("กำลังบันทึก…", "Saving…")
            : t("ยืนยันแผน 8 ส่วน", "Submit all 8 decisions")}
          <ArrowRight size={18} />
        </button>
      </div>
    </form>
  );
}
