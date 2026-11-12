import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  Clock3,
  CloudLightning,
  LockKeyhole,
  Radio,
  Trophy,
} from "lucide-react";
import { api } from "../../api";
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
            ? t("Final Business Crisis เปิดแล้ว", "The Final Business Crisis is open")
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
  const [selected, setSelected] = useState("");
  const [reason, setReason] = useState("");
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
  const submit = useMutation({
    mutationFn: () =>
      api.finalAnswer({ optionId: selected, reason: reason.trim() }),
    onSuccess: (state) => cache.setQueryData(["final"], state),
  });
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
          <span className={`final-eyebrow ${f.isFinalist ? "finalist" : ""}`}>
            {f.isFinalist ? <Trophy size={14} /> : <Radio size={14} />}
            {f.isFinalist ? "FINALIST" : "AUDIENCE CHALLENGE"} · FINAL BUSINESS
            CRISIS
          </span>
          <h1>{q?.title ?? "FINAL BUSINESS CRISIS"}</h1>
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
                <p>
                  <b>
                    {q.options.find((o) => o.id === f.saved!.optionId)?.title}
                  </b>{" "}
                  — “{f.saved.reason}”
                </p>
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
              <>
                <fieldset className="answer-options">
                  <legend className="sr-only">
                    {t("เลือกแผน", "Choose a plan")}
                  </legend>
                  {q.options.map((o, i) => (
                    <label
                      key={o.id}
                      className={`answer-option ${selected === o.id ? "selected" : ""}`}
                    >
                      <input
                        type="radio"
                        name="final"
                        value={o.id}
                        checked={selected === o.id}
                        disabled={submit.isPending || expired}
                        onChange={() => {
                          submit.reset();
                          setSelected(o.id);
                        }}
                      />
                      <span className="option-letter">
                        {String.fromCharCode(65 + i)}
                      </span>
                      <div>
                        <strong>{o.title}</strong>
                        <p>{o.detail}</p>
                      </div>
                      <span className="option-check">
                        {selected === o.id && <Check size={13} />}
                      </span>
                    </label>
                  ))}
                </fieldset>
                <label className="reason-field">
                  <span>
                    {t("เหตุผลของทีม", "Your team’s reasoning")}{" "}
                    <small>
                      {t(
                        "อธิบายว่าทำไมแผนนี้เหมาะกับสถานะธุรกิจของทีม",
                        "Explain why this plan fits your business state.",
                      )}
                    </small>
                  </span>
                  <textarea
                    value={reason}
                    maxLength={300}
                    rows={3}
                    disabled={submit.isPending || expired}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder={t("เราเลือกทางนี้เพราะ…", "We chose this because…")}
                  />
                  <em>{reason.length} / 300</em>
                </label>
                {submit.error && <ErrorState error={submit.error} />}
                <div className="question-submit">
                  <p>
                    <LockKeyhole size={14} />
                    {t(
                      "ยืนยันแล้วเปลี่ยนคำตอบไม่ได้ · จำกัดเวลา 3 นาที",
                      "Final once confirmed · 3-minute limit",
                    )}
                  </p>
                  <button
                    className="button primary"
                    disabled={
                      !selected ||
                      reason.trim().length < 3 ||
                      submit.isPending ||
                      expired
                    }
                    onClick={() => submit.mutate()}
                  >
                    {submit.isPending
                      ? t("กำลังบันทึก…", "Saving…")
                      : t("ยืนยัน Final Crisis", "Confirm Final decision")}
                    <ArrowRight size={18} />
                  </button>
                </div>
              </>
            )}
          </>
        )}
      </section>
    </div>
  );
}
