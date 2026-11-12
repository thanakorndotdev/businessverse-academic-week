import { useState, useEffect, useRef } from "react";
import { Link, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Clock3,
  Coins,
  LockKeyhole,
  Radio,
  Target,
  CheckCircle2,
} from "lucide-react";
import { motion } from "framer-motion";
import { api } from "../../api";
import { useUser } from "../../hooks";
import { useText } from "../../store";
import {
  Steps,
  ErrorState,
  Loading,
  SignInPrompt,
} from "../../components/Common";
import { departmentIcons } from "../player-hub/Hub";
export function DepartmentDetail() {
  const { slug = "" } = useParams();
  const t = useText();
  const { data: user } = useUser();
  const { data, error, isPending, refetch } = useQuery({
    queryKey: ["departments"],
    queryFn: api.departments,
  });
  const department = data?.departments.find((d) => d.slug === slug);
  const Icon = departmentIcons[(department?.displayOrder ?? 1) - 1];
  if (isPending) return <Loading />;
  if (error) return <ErrorState error={error} retry={() => refetch()} />;
  if (!department) return <ErrorState error={new Error("ไม่พบสาขานี้")} />;
  return (
    <div className="reading-page">
      <Link to="/" className="back-link">
        <ArrowLeft size={16} />
        {t("กลับสู่สนามธุรกิจ", "Back to challenge hub")}
      </Link>
      <div className={`detail-cover tone-${department.displayOrder}`}>
        <Icon size={74} strokeWidth={1} />
        <span>{String(department.displayOrder).padStart(2, "0")}</span>
      </div>
      <h1>{t(department.nameTh, department.name)}</h1>
      <p className="lead">{department.description}</p>
      <p>
        {t(
          "ฝึกคิดแบบผู้บริหารผ่านโจทย์ความรู้ การตัดสินใจเชิงกลยุทธ์ และวิกฤตธุรกิจ ตัวเลือกของคุณส่งผลต่อบริษัทและเป้าหมายที่ได้รับ",
          "Practice business knowledge, strategic decisions, and crisis response. Your choices shape the company and its assigned target.",
        )}
      </p>
      <Steps answered={0} />
      <div className="detail-action">
        <span className="inline-status">
          <i className={department.isQ1Unlocked ? "live-dot" : "waiting-dot"} />
          {department.isQ1Unlocked
            ? t("ผู้จัดงานเปิดภารกิจแล้ว", "The organizer has opened this mission")
            : t(
                "รอผู้จัดงานเปิดคำถามแรก",
                "Waiting for the organizer to open question one",
              )}
        </span>
        <Link
          className="button primary"
          to={user ? `/play/${slug}` : `/join?next=/play/${slug}`}
        >
          {user
            ? t("เข้าสู่ภารกิจ", "Enter mission")
            : t("เข้าสู่ระบบเพื่อเล่น", "Sign in to play")}
          <ArrowRight size={18} />
        </Link>
      </div>
    </div>
  );
}
export function Quiz() {
  const { slug = "" } = useParams();
  const t = useText();
  const cache = useQueryClient();
  const { data: user, isPending: checking } = useUser();
  const query = useQuery({
    queryKey: ["quiz", slug],
    queryFn: () => api.state(slug),
    enabled: !!user,
    refetchInterval: 15000,
  });
  const [selected, setSelected] = useState<string[]>([]);
  const [reason, setReason] = useState("");
  const [saved, setSaved] = useState(false);
  const remaining = useCountdown(
    query.data?.timer ?? null,
    query.dataUpdatedAt,
  );
  const expired = remaining !== null && remaining <= 0;
  useEffect(() => {
    if (!expired) return;
    // Server records the timeout after a short grace period, then moves on.
    const id = setTimeout(() => {
      setSelected([]);
      setReason("");
      setSaved(false);
      cache.invalidateQueries({ queryKey: ["quiz", slug] });
      cache.invalidateQueries({ queryKey: ["passport"] });
    }, 6500);
    return () => clearTimeout(id);
  }, [expired, query.data?.question?.id, slug, cache]);
  const nextHeading = useRef<HTMLHeadingElement>(null);
  const moveFocus = useRef(false);
  useEffect(() => {
    if (moveFocus.current) {
      nextHeading.current?.focus();
      moveFocus.current = false;
    }
  }, [query.data?.question?.id, query.data?.status]);
  const answer = useMutation({
    mutationFn: () =>
      api.answer(slug, {
        questionId: query.data!.question!.id,
        optionIds: selected,
        reason: reason.trim(),
      }),
    onSuccess: (result) => {
      moveFocus.current = true;
      cache.setQueryData(["quiz", slug], result.state);
      cache.invalidateQueries({ queryKey: ["passport"] });
      setSelected([]);
      setReason("");
      setSaved(true);
    },
    onError: () => {
      cache.invalidateQueries({ queryKey: ["quiz", slug] });
    },
  });
  if (checking) return <Loading />;
  if (!user) return <SignInPrompt next={`/play/${slug}`} />;
  if (query.isPending) return <Loading />;
  if (query.error)
    return <ErrorState error={query.error} retry={() => query.refetch()} />;
  if (!query.data) return null;
  const s = query.data,
    q = s.question;
  return (
    <div className="quiz-page">
      <Link to="/" className="back-link">
        <ArrowLeft size={16} />
        {t("สนามธุรกิจ", "Challenge hub")}
      </Link>
      <div className="quiz-heading">
        <div>
          <h1>{t(s.department.nameTh, s.department.name)}</h1>
          <span className="department-english">{s.department.name}</span>
        </div>
        <span className="quiet-label">
          {t("ภารกิจ", "MISSION")}{" "}
          {String(s.department.displayOrder).padStart(2, "0")} / 08
        </span>
      </div>
      <MissionRoute order={s.department.displayOrder} />
      <Steps answered={s.answered} />
      <div className="quiz-layout">
        <aside className="mission-aside">
          <div className="mission-target">
            <Target size={25} />
            <h3>{s.objective.title}</h3>
            <span>{t("เป้าหมายธุรกิจของคุณ", "Your strategic target")}</span>
            <p>{s.objective.description}</p>
            <strong>{s.objective.target}</strong>
            <small>
              {t(
                "บรรลุเป้าหมายเมื่อครบ 24 ข้อ รับโบนัส 10 คะแนน",
                "Reach your target after 24 decisions for a 10-point bonus.",
              )}
            </small>
          </div>
          <div className="quiz-business">
            <h3>{t("สถานะธุรกิจของคุณ", "Your business state")}</h3>
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
                  <dt>{key === "cash" ? "Business Coins" : key}</dt>
                  <dd>{s.business[key].toLocaleString()}</dd>
                </div>
              ))}
            </dl>
            <div className="capabilities">
              {(["innovation", "crm", "premium", "analytics", "cyber"] as const)
                .filter((key) => s.business[key])
                .map((key) => (
                  <span key={key}>
                    <Check size={11} />
                    {key}
                  </span>
                ))}
            </div>
          </div>
          <div className="mission-help">
            <h3>{t("คิดก่อนเลือก", "Before you decide")}</h3>
            <p>
              {t(
                "พิจารณาผลต่อธุรกิจและเป้าหมายของทีม ไม่ใช่แค่ผลลัพธ์ระยะสั้น",
                "Consider your business and team target, alongside short-term results.",
              )}
            </p>
            <Link to="/guide">
              {t("ทบทวนกติกา", "Review the rules")}
              <ArrowUpRightIcon />
            </Link>
          </div>
        </aside>
        <section className="question-panel">
          {s.status === "locked" ? (
            <div className="waiting-room">
              <span className="waiting-symbol">
                <Radio size={38} />
              </span>
              <h2>
                {s.answered > 0
                  ? t("ผู้จัดงานพักภารกิจนี้ชั่วคราว", "This mission is paused")
                  : t("ภารกิจของคุณกำลังจะเริ่ม", "Your mission is about to begin")}
              </h2>
              <p>
                {s.answered > 0
                  ? t(
                      "คำตอบที่ส่งแล้วถูกบันทึกไว้ เมื่อผู้จัดงานเปิดอีกครั้ง คุณจะได้เวลา 3 นาทีเต็มสำหรับข้อถัดไป",
                      "Your saved answers are kept. When the organizer reopens it, you get a full 3 minutes for the next question.",
                    )
                  : t(
                      "รอวิทยากรสอนจบ ผู้จัดงานจะเปิดคำถามแรก หน้านี้จะเปิดโจทย์ให้อัตโนมัติ",
                      "After the lecture, the organizer opens question one. It will appear here automatically.",
                    )}
              </p>
              <div className="waiting-message">
                <Clock3 size={16} />
                {t("รอสัญญาณเริ่มจากผู้จัดงาน", "Waiting for the organizer’s start")}
              </div>
            </div>
          ) : s.status === "closed" ? (
            <div className="waiting-room">
              <LockKeyhole size={38} />
              <h2>{t("ปิดรับคำตอบรอบคัดเลือกแล้ว", "The qualifying round is closed")}</h2>
              <p>
                {t(
                  "คำตอบที่บันทึกไว้ทั้งหมดถูกนำไปคำนวณผลแล้ว ติดตามประกาศจากผู้จัดงาน",
                  "Every saved decision has been counted. Follow the organizer’s announcement.",
                )}
              </p>
              <Link to="/final" className="button primary">
                {t("ไปที่รอบ Final", "Go to the Final")}
                <ArrowRight size={17} />
              </Link>
            </div>
          ) : s.status === "prerequisite" ? (
            <div className="waiting-room">
              <LockKeyhole size={38} />
              <h2>
                {t("ทำภารกิจก่อนหน้าให้สำเร็จ", "Finish the previous mission first")}
              </h2>
              <p>
                {t(
                  "ทุกการตัดสินใจต่อยอดจากสถานะธุรกิจเดิมของคุณ จึงต้องทำภารกิจตามลำดับ",
                  "Each decision builds on your business, so missions follow a sequence.",
                )}
              </p>
              <Link
                to={`/play/${s.prerequisite?.slug}`}
                className="button primary"
              >
                {s.prerequisite?.name}
                <ArrowRight size={17} />
              </Link>
            </div>
          ) : s.status === "completed" ? (
            <motion.div
              initial={{ scale: 0.96 }}
              animate={{ scale: 1 }}
              className="waiting-room completion"
            >
              <span className="completion-stamp">
                <CheckCircle2 size={49} />
              </span>
              <h2 ref={nextHeading} tabIndex={-1}>
                {t(
                  "ภารกิจสำเร็จ เก็บอีกหนึ่งทักษะ",
                  "Mission complete. A new skill earned.",
                )}
              </h2>
              <p>
                {t(
                  "บันทึกครบทั้ง 3 การตัดสินใจ และเพิ่มตราประทับในพาสปอร์ตของคุณแล้ว",
                  "All three decisions are saved. Your passport has a new stamp.",
                )}
              </p>
              <Link to="/" className="button primary">
                {t("เลือกภารกิจถัดไป", "Continue your journey")}
                <ArrowRight size={17} />
              </Link>
              <Link to="/passport" className="text-button">
                {t("ดูพาสปอร์ตของฉัน", "View my passport")}
              </Link>
            </motion.div>
          ) : (
            q && (
              <div key={q.id}>
                <h2 ref={nextHeading} tabIndex={-1}>
                  {q.title}
                </h2>
                <div className="question-type">
                  <span>
                    {q.type === "check"
                      ? t("ความรู้ธุรกิจ", "BUSINESS CHECK")
                      : q.type === "strategy"
                        ? t("ตัดสินใจเชิงกลยุทธ์", "STRATEGIC DECISION")
                        : t("รับมือวิกฤต", "CRISIS RESPONSE")}
                  </span>
                  <span>{q.questionNumber} / 3</span>
                </div>
                {remaining !== null && (
                  <div
                    className={`question-timer ${remaining <= 30 ? "urgent" : ""} ${expired ? "expired" : ""}`}
                    role="timer"
                    aria-live={remaining <= 30 ? "assertive" : "off"}
                  >
                    <Clock3 size={17} />
                    <span>
                      {expired
                        ? t("หมดเวลา กำลังไปข้อถัดไป…", "Time is up. Moving on…")
                        : t("เวลาที่เหลือ", "Time left")}
                    </span>
                    <strong>{formatClock(Math.max(0, remaining))}</strong>
                    <i
                      style={{
                        width: `${(Math.max(0, remaining) / (s.timer?.seconds ?? 180)) * 100}%`,
                      }}
                    />
                  </div>
                )}
                {s.timedOut > 0 && (
                  <p className="timeout-note">
                    {t(
                      `สาขานี้หมดเวลาไปแล้ว ${s.timedOut} ข้อ (ไม่ได้คะแนนข้อนั้น)`,
                      `${s.timedOut} question(s) in this mission timed out (no points).`,
                    )}
                  </p>
                )}
                <p className="scenario">{q.prompt}</p>
                {q.multi && (
                  <p className="budget-note">
                    <Coins size={17} />
                    {t(
                      "เลือกได้หลายข้อ ภายในงบ",
                      "Choose multiple options. Budget:",
                    )}{" "}
                    {q.budget?.toLocaleString()} Coins
                  </p>
                )}
                {saved && (
                  <div className="saved-note" role="status">
                    <Check size={16} />
                    {t(
                      "บันทึกแล้ว พร้อมสำหรับการตัดสินใจถัดไป",
                      "Saved. Ready for your next decision.",
                    )}
                  </div>
                )}
                <fieldset className="answer-options">
                  <legend className="sr-only">
                    {t("เลือกคำตอบ", "Select your answer")}
                  </legend>
                  {q.options.map((option, i) => (
                    <label
                      key={option.id}
                      className={`answer-option ${selected.includes(option.id) ? "selected" : ""}`}
                    >
                      <input
                        type={q.multi ? "checkbox" : "radio"}
                        name="answer"
                        value={option.id}
                        checked={selected.includes(option.id)}
                        onChange={() => {
                          answer.reset();
                          setSelected(
                            q.multi
                              ? selected.includes(option.id)
                                ? selected.filter((id) => id !== option.id)
                                : [...selected, option.id]
                              : [option.id],
                          );
                        }}
                        disabled={answer.isPending || expired}
                      />
                      <span className="option-letter">
                        {String.fromCharCode(65 + i)}
                      </span>
                      <div>
                        <strong>{option.title}</strong>
                        <p>{option.detail}</p>
                        {option.cost > 0 && (
                          <small>{option.cost.toLocaleString()} Coins</small>
                        )}
                      </div>
                      <span className="option-check">
                        {selected.includes(option.id) && <Check size={13} />}
                      </span>
                    </label>
                  ))}
                </fieldset>
                <label className="reason-field">
                  <span>
                    {t("เหตุผลของทีม", "Your team’s reasoning")}{" "}
                    <small>
                      {t(
                        "บันทึกเพื่อทบทวน ไม่นำไปคิดคะแนน",
                        "Saved for review. Not scored.",
                      )}
                    </small>
                  </span>
                  <textarea
                    value={reason}
                    maxLength={300}
                    rows={3}
                    disabled={answer.isPending || expired}
                    onChange={(e) => {
                      answer.reset();
                      setReason(e.target.value);
                    }}
                    placeholder={t(
                      "เราเลือกทางนี้เพราะ…",
                      "We chose this because…",
                    )}
                  />
                  <em>{reason.length} / 300</em>
                </label>
                {answer.error && <ErrorState error={answer.error} />}
                <div className="question-submit">
                  {q.multi && (
                    <div className="investment-total" aria-live="polite">
                      <span>{t("เงินลงทุนที่เลือก", "Selected investment")}</span>
                      <strong>
                        {q.options
                          .filter((o) => selected.includes(o.id))
                          .reduce((sum, o) => sum + o.cost, 0)
                          .toLocaleString()}{" "}
                        /{" "}
                        {Math.min(
                          q.budget ?? Infinity,
                          s.business.cash,
                        ).toLocaleString()}{" "}
                        Coins
                      </strong>
                    </div>
                  )}
                  <p>
                    <LockKeyhole size={14} />
                    {t(
                      "ยืนยันแล้วไม่สามารถแก้ไขคำตอบได้",
                      "Decisions are final once submitted.",
                    )}
                  </p>
                  <button
                    className="button primary"
                    disabled={
                      !selected.length ||
                      reason.trim().length < 3 ||
                      answer.isPending ||
                      expired ||
                      q.options
                        .filter((o) => selected.includes(o.id))
                        .reduce((sum, o) => sum + o.cost, 0) >
                        Math.min(q.budget ?? Infinity, s.business.cash)
                    }
                    onClick={() => answer.mutate()}
                  >
                    {answer.isPending
                      ? t("กำลังบันทึก…", "Saving…")
                      : t("ยืนยันการตัดสินใจ", "Confirm decision")}
                    <ArrowRight size={18} />
                  </button>
                </div>
              </div>
            )
          )}
        </section>
      </div>
    </div>
  );
}
/** Where the team is in the eight-discipline sequence: this mission, then the next one. */
function MissionRoute({ order }: { order: number }) {
  const t = useText();
  const { data } = useQuery({
    queryKey: ["departments"],
    queryFn: api.departments,
  });
  const list = data?.departments ?? [];
  const current = list.find((d) => d.displayOrder === order);
  if (!current) return null;
  const next = list.find((d) => d.displayOrder === order + 1);
  const number = (n: number) => String(n).padStart(2, "0");
  return (
    <div
      className="mission-route"
      role="group"
      aria-label={t("ลำดับสาขา", "Discipline sequence")}
    >
      <div className="route-now">
        <small>{t("ตอนนี้", "Now")}</small>
        <strong>
          <em>{number(current.displayOrder)}</em>
          <span>{t(current.nameTh, current.name)}</span>
        </strong>
      </div>
      <ArrowRight size={18} aria-hidden="true" />
      <div className="route-next">
        <small>{t("สาขาถัดไป", "Up next")}</small>
        <strong>
          {next ? (
            <>
              <em>{number(next.displayOrder)}</em>
              <span>{t(next.nameTh, next.name)}</span>
            </>
          ) : (
            <span>{t("สาขาสุดท้าย · สรุปผลในพาสปอร์ต", "Last one · Passport summary")}</span>
          )}
        </strong>
      </div>
    </div>
  );
}
function formatClock(seconds: number) {
  const m = Math.floor(seconds / 60);
  const sec = Math.floor(seconds % 60);
  return `${m}:${String(sec).padStart(2, "0")}`;
}
/** Seconds left on the server deadline, corrected for client clock skew. */
function useCountdown(
  timer: { deadline: string; serverNow: string } | null,
  receivedAt: number,
) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!timer) return;
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, [timer]);
  if (!timer) return null;
  const skew = new Date(timer.serverNow).getTime() - receivedAt;
  return Math.ceil(
    (new Date(timer.deadline).getTime() - (now + skew)) / 1000,
  );
}
function ArrowUpRightIcon() {
  return <ArrowRight size={15} />;
}
