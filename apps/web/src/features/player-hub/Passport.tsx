import { Link } from "react-router-dom";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowRight,
  Check,
  LockKeyhole,
  Fingerprint,
  Coins,
  Target,
  Pencil,
  Trophy,
} from "lucide-react";
import { api } from "../../api";
import { useUser } from "../../hooks";
import { useText } from "../../store";
import { Loading, ErrorState, SignInPrompt } from "../../components/Common";
import { ObjectiveStrip, departmentIcons } from "./Hub";
export function Passport() {
  const t = useText();
  const { data: user, isPending } = useUser();
  const query = useQuery({
    queryKey: ["passport"],
    queryFn: api.passport,
    enabled: !!user,
    refetchInterval: 30000,
  });
  if (isPending) return <Loading />;
  if (!user) return <SignInPrompt next="/passport" />;
  if (query.isPending) return <Loading />;
  if (query.error)
    return <ErrorState error={query.error} retry={() => query.refetch()} />;
  if (!query.data) return null;
  const p = query.data;
  const next = p.departments.find((d) => d.answered < 3);
  return (
    <>
      <div className="page-heading">
        <div>
          <h1>{t("พาสปอร์ตธุรกิจของฉัน", "My business passport")}</h1>
          <p>
            {t(
              "เส้นทางการเรียนรู้ของคุณ เก็บไว้ครบทุกการตัดสินใจ",
              "Your learning journey, saved one decision at a time.",
            )}
          </p>
        </div>
        <span className="passport-id">
          TEAM {String(user.teamNumber).padStart(3, "0")}
        </span>
      </div>
      <section className="passport-cover">
        <div>
          <Fingerprint size={35} />
          <TeamName name={user.fullName} />
          <p>
            {p.answered} / 24 {t("การตัดสินใจ", "decisions saved")}
          </p>
        </div>
        <div className="passport-completion">
          <strong>
            {p.departments.filter((d) => d.answered === 3).length}
            <span> / 8</span>
          </strong>
          <span>{t("ตราประทับธุรกิจ", "DISCIPLINE STAMPS")}</span>
        </div>
      </section>
      <ObjectiveStrip progress={p} />
      <section className="passport-stamps">
        {p.departments.map((d, i) => {
          const Icon = departmentIcons[i];
          return (
            <Link
              key={d.id}
              to={`/play/${d.slug}`}
              className={`passport-stamp ${d.answered === 3 ? "earned" : ""}`}
            >
              <span className="stamp-ring">
                {d.answered === 3 ? (
                  <Check size={33} />
                ) : (
                  <Icon size={32} strokeWidth={1.3} />
                )}
              </span>
              <strong>{d.code}</strong>
              <span>{t(d.nameTh, d.name)}</span>
              <small>
                {d.answered === 3
                  ? t("สำเร็จแล้ว", "Completed")
                  : `${d.answered} / 3`}
              </small>
            </Link>
          );
        })}
      </section>
      {p.completed && (
        <section className="business-summary" aria-label="Final dashboard">
          <span
            className={`target-result ${p.targetAchieved ? "met" : "missed"}`}
          >
            <Target size={20} />
            {p.targetAchieved
              ? t(
                  `บรรลุเป้าหมาย ${user.objective.title}`,
                  `${user.objective.title} target achieved`,
                )
              : t(
                  `ยังไม่ถึงเป้าหมาย ${user.objective.title}`,
                  `${user.objective.title} target not reached`,
                )}
          </span>
          <small>
            {user.objective.target}
            {p.timedOut > 0 &&
              t(
                ` · หมดเวลา ${p.timedOut} ข้อ`,
                ` · ${p.timedOut} timed out`,
              )}
          </small>
          {p.phase !== "qualifier" && (
            <Link className="button small gold" to="/final">
              <Trophy size={14} />
              Final Business Crisis
            </Link>
          )}
        </section>
      )}
      <div className="section-heading">
        <div>
          <h2>
            {p.completed
              ? t("Final Dashboard ธุรกิจของคุณ", "Your business final dashboard")
              : t("ธุรกิจของคุณตอนนี้", "Your business, right now")}
          </h2>
          <p>
            {t(
              "ผลสะสมจากการตัดสินใจของทีมคุณเท่านั้น",
              "The cumulative impact of your team’s own decisions.",
            )}
          </p>
        </div>
        <span className="private-label">
          <LockKeyhole size={13} />
          {t("ข้อมูลส่วนตัวของทีม", "Private to your team")}
        </span>
      </div>
      <section className="business-metrics">
        <div className="cash-metric">
          <Coins size={22} />
          <span>Business Coins</span>
          <strong>{p.business.cash.toLocaleString()}</strong>
        </div>
        {(["sales", "customer", "brand", "operations", "risk"] as const).map(
          (key) => (
            <div key={key}>
              <span>{key}</span>
              <strong>{p.business[key]}</strong>
              <div className="metric-bar">
                <i
                  style={{
                    width: `${Math.min(100, p.business[key] / (key === "risk" ? 1 : 2.6))}%`,
                  }}
                />
              </div>
            </div>
          ),
        )}
      </section>
      <div className="passport-next">
        <p>
          {p.completed
            ? t(
                "คุณทำครบทุกภารกิจแล้ว รอผู้จัดงานประกาศผลการแข่งขัน",
                "All missions complete. Wait for the organizer to announce the results.",
              )
            : t(
                "อีกหนึ่งการตัดสินใจ คืออีกก้าวของธุรกิจคุณ",
                "One more decision. One more step for your business.",
              )}
        </p>
        <Link className="button primary" to={next ? `/play/${next.slug}` : "/"}>
          {next
            ? t("ไปต่อที่ภารกิจถัดไป", "Continue your next mission")
            : t("กลับสู่สนามธุรกิจ", "Back to the hub")}
          <ArrowRight size={18} />
        </Link>
      </div>
    </>
  );
}

function TeamName({ name }: { name: string }) {
  const t = useText();
  const cache = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(name);
  const rename = useMutation({
    mutationFn: () => api.rename(value),
    onSuccess: ({ user }) => {
      cache.setQueryData(["user"], user);
      setEditing(false);
    },
  });
  if (!editing)
    return (
      <h2 className="team-name">
        {name}
        <button
          className="icon-button"
          aria-label={t("เปลี่ยนชื่อทีม", "Rename team")}
          onClick={() => {
            setValue(name);
            setEditing(true);
          }}
        >
          <Pencil size={15} />
        </button>
      </h2>
    );
  return (
    <form
      className="rename-form"
      onSubmit={(e) => {
        e.preventDefault();
        rename.mutate();
      }}
    >
      <input
        autoFocus
        value={value}
        maxLength={36}
        minLength={2}
        onChange={(e) => setValue(e.target.value)}
        aria-label={t("ชื่อทีม", "Team name")}
      />
      <button
        className="button small primary"
        disabled={rename.isPending || value.trim().length < 2 || value.trim() === name}
      >
        {t("บันทึก", "Save")}
      </button>
      <button
        type="button"
        className="button small secondary"
        onClick={() => setEditing(false)}
      >
        {t("ยกเลิก", "Cancel")}
      </button>
      {rename.error && <ErrorState error={rename.error} />}
    </form>
  );
}
