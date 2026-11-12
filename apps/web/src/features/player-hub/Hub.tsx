import { FinalBanner } from "../final-round/Final";
import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  ArrowUpRight,
  LockKeyhole,
  Check,
  Target,
  Users,
  Megaphone,
  Gamepad2,
  MousePointer2,
  Truck,
  Globe2,
  Lightbulb,
  Landmark,
  Flag,
  ChevronRight,
  Fingerprint,
} from "lucide-react";
import { api, type Department, type Passport } from "../../api";
import { useUser } from "../../hooks";
import { useText } from "../../store";
import { Loading, ErrorState } from "../../components/Common";
export const departmentIcons = [
  Users,
  Megaphone,
  Gamepad2,
  MousePointer2,
  Lightbulb,
  Globe2,
  Truck,
  Landmark,
];
function Orbit() {
  return (
    <div className="hero-orbit" aria-hidden="true">
      <svg viewBox="0 0 340 300" fill="none">
        <circle cx="176" cy="146" r="114" stroke="#5a7074" />
        <circle cx="176" cy="146" r="83" stroke="#5a7074" />
        <path
          d="M62 146h228M176 32v228M95 65l162 162M95 227 257 65"
          stroke="#5a7074"
        />
        <circle cx="176" cy="146" r="48" fill="#eac15c" />
        <path
          d="M157 127h22c20 0 20 20 4 20 21 0 20 20-1 20h-25v-40Z"
          stroke="#173540"
          strokeWidth="5"
        />
        <circle cx="176" cy="32" r="15" fill="#eac15c" />
        <circle cx="257" cy="65" r="15" fill="#b9d8cf" />
        <circle cx="290" cy="146" r="15" fill="#b9d8cf" />
        <circle cx="257" cy="227" r="15" fill="#eac15c" />
        <circle cx="176" cy="260" r="15" fill="#b9d8cf" />
        <circle cx="95" cy="227" r="15" fill="#b9d8cf" />
        <circle cx="62" cy="146" r="15" fill="#eac15c" />
        <circle cx="95" cy="65" r="15" fill="#b9d8cf" />
        {[
          [176, 32],
          [257, 65],
          [290, 146],
          [257, 227],
          [176, 260],
          [95, 227],
          [62, 146],
          [95, 65],
        ].map(([x, y], i) => (
          <text
            key={i}
            x={x}
            y={y + 4}
            textAnchor="middle"
            fontSize="11"
            fontWeight="600"
            fill="#173540"
          >
            {String(i + 1).padStart(2, "0")}
          </text>
        ))}
      </svg>
      <span>CONNECTED BY YOUR DECISIONS</span>
    </div>
  );
}
export function Hub() {
  const t = useText(),
    { data: user } = useUser();
  const [filter, setFilter] = useState("all");
  const departments = useQuery({
    queryKey: ["departments"],
    queryFn: api.departments,
  });
  const passport = useQuery({
    queryKey: ["passport"],
    queryFn: api.passport,
    enabled: !!user,
    refetchInterval: 30000,
  });
  const progress = passport.data;
  const completed =
    progress?.departments.filter((d) => d.answered === 3).length ?? 0;
  const next = progress?.departments.find((d) => d.answered < 3);
  const rows =
    departments.data?.departments.filter(
      (d) =>
        filter === "all" ||
        (filter === "live" && d.isQ1Unlocked) ||
        (filter === "completed" &&
          progress?.departments.find((p) => p.id === d.id)?.answered === 3),
    ) ?? [];
  return (
    <>
      <div className="page-heading">
        <div>
          <h1>{t("สนามธุรกิจของคุณ", "Your business playground")}</h1>
          <p>
            {t(
              "คิดให้ต่าง ตัดสินใจให้ชัด แล้วสร้างธุรกิจในแบบของคุณ",
              "Think boldly. Decide with purpose. Build a business that’s yours.",
            )}
          </p>
        </div>
        <span className="edition-label">
          <span />
          ACADEMIC WEEK 2026
        </span>
      </div>
      <FinalBanner />
      <section className="hero">
        <div className="hero-copy">
          <h2>
            8 skills.
            <br />
            <span>1 business.</span>
            <span className="hero-period"> Mission to win.</span>
          </h2>
          <p>
            {t(
              "24 การตัดสินใจ เป้าหมายเฉพาะทีมของคุณเอง ทุกคำตอบเชื่อมต่อเป็นอนาคตของธุรกิจ",
              "24 decisions. Your own strategic target. Every choice shapes the future of your business.",
            )}
          </p>
          <Link
            to={user ? (next ? `/play/${next.slug}` : "/passport") : "/join"}
            className="button gold"
          >
            {user
              ? t("ไปยังภารกิจถัดไป", "Continue your mission")
              : t("เข้าสู่สนามธุรกิจ", "Enter the challenge")}
            <ArrowUpRight size={19} />
          </Link>
          <div className="hero-detail">
            <span>8 {t("สาขา", "DISCIPLINES")}</span>
            <i />
            <span>24 {t("การตัดสินใจ", "DECISIONS")}</span>
            <i />
            <span>4 {t("เป้าหมายธุรกิจ", "STRATEGIC TARGETS")}</span>
          </div>
        </div>
        <Orbit />
      </section>
      <section className="journey-strip" aria-label="Your progress">
        <div className="journey-label">
          <span className="passport-icon">
            <Fingerprint size={25} />
          </span>
          <div>
            <h3>{t("พาสปอร์ตธุรกิจ", "Your business passport")}</h3>
            <p>
              {user
                ? t(
                    "ทุกสาขาที่ผ่าน คืออีกทักษะที่คุณได้เรียนรู้",
                    "Every completed discipline is a new skill unlocked.",
                  )
                : t(
                    "เข้าสู่ระบบเพื่อเริ่มสะสมตราประทับ",
                    "Sign in to start collecting your stamps.",
                  )}
            </p>
          </div>
        </div>
        <div className="stamp-preview" aria-label={`${completed} of 8 stamps`}>
          {Array.from({ length: 8 }, (_, i) => (
            <span key={i} className={i < completed ? "collected" : ""}>
              {i < completed ? (
                <Check size={14} />
              ) : (
                String(i + 1).padStart(2, "0")
              )}
            </span>
          ))}
        </div>
        <Link to="/passport">
          <strong>
            {completed}
            <small> / 8</small>
          </strong>
          <ChevronRight size={18} />
        </Link>
      </section>
      {progress && <ObjectiveStrip progress={progress} />}
      <section className="departments-section">
        <div className="section-heading">
          <div>
            <h2>{t("เลือกภารกิจ เริ่มสร้างทักษะ", "Explore the disciplines")}</h2>
            <p>
              {t(
                "แต่ละสาขามี 3 โจทย์ ทำตามลำดับและรอสัญญาณเริ่มจากผู้จัดงาน",
                "Three decisions per discipline. Follow the sequence and wait for the organizer’s start.",
              )}
            </p>
          </div>
          <div className="filters" aria-label="Filter disciplines">
            {[
              ["all", t("ทั้งหมด", "All")],
              ["live", t("เปิดแล้ว", "Open")],
              ["completed", t("สำเร็จ", "Completed")],
            ].map(([value, label]) => (
              <button
                key={value}
                className={filter === value ? "selected" : ""}
                onClick={() => setFilter(value)}
                aria-pressed={filter === value}
              >
                {label}
                {value === "all" && <span>8</span>}
              </button>
            ))}
          </div>
        </div>
        {departments.isPending ? (
          <Loading cards />
        ) : departments.error ? (
          <ErrorState
            error={departments.error}
            retry={() => departments.refetch()}
          />
        ) : rows.length ? (
          <div className="department-grid">
            {rows.map((d) => (
              <DepartmentCard
                key={d.id}
                department={d}
                answered={
                  progress?.departments.find((p) => p.id === d.id)?.answered ??
                  0
                }
              />
            ))}
          </div>
        ) : (
          <div className="empty-inline">
            <Flag size={24} />
            <p>
              {filter === "live"
                ? t(
                    "ยังไม่มีสาขาเปิด รอสัญญาณเริ่มจากผู้จัดงาน",
                    "No disciplines are open yet. The organizer will start the first mission.",
                  )
                : t(
                    "ยังไม่มีตราประทับ เริ่มภารกิจแรกของคุณได้เลย",
                    "Your stamps will appear here after completing a discipline.",
                  )}
            </p>
            <button className="text-button" onClick={() => setFilter("all")}>
              {t("ดูทุกสาขา", "View all disciplines")}
              <ArrowRight size={16} />
            </button>
          </div>
        )}
      </section>
      <section className="guide-teaser">
        <div>
          <span className="guide-symbol">
            <BookIcon />
          </span>
          <h2>
            {t("หนึ่งธุรกิจ หลายความเป็นไปได้", "One business. Many possibilities.")}
          </h2>
          <p>
            {t(
              "คำตอบที่ดีขึ้นอยู่กับเป้าหมายของคุณ ทำความรู้จักกติกา ก่อนตัดสินใจครั้งแรก",
              "The right decision depends on your target. Get to know the rules before your first move.",
            )}
          </p>
          <Link className="text-button" to="/guide">
            {t("อ่านคู่มือการเล่น", "Read the field guide")}
            <ArrowUpRight size={17} />
          </Link>
        </div>
        <ol>
          {[
            t("รับเป้าหมายธุรกิจประจำทีม", "Discover your strategic target"),
            t("ตัดสินใจผ่าน 8 สาขา", "Navigate eight disciplines"),
            t("เก็บตราประทับให้ครบ", "Complete your business passport"),
          ].map((x, i) => (
            <li key={x}>
              <span>{i + 1}</span>
              {x}
              <ArrowRight size={16} />
            </li>
          ))}
        </ol>
      </section>
      <p className="content-note">
        {t(
          "ใช้โจทย์และเกณฑ์เป้าหมายจาก Businessverse ต้นแบบ · ผลการแข่งขันแสดงโดยผู้จัดงานเท่านั้น",
          "Original Businessverse questions and target rules · Competition standings are shown by organizers only.",
        )}
      </p>
    </>
  );
}
function BookIcon() {
  return <Flag size={25} />;
}
export function DepartmentCard({
  department: d,
  answered,
}: {
  department: Department;
  answered: number;
}) {
  const t = useText();
  const Icon = departmentIcons[d.displayOrder - 1] ?? Landmark;
  const done = answered === 3;
  return (
    <Link
      to={`/departments/${d.slug}`}
      className={`department-card tone-${d.displayOrder}${done ? " complete" : ""}`}
    >
      <div className="department-art">
        <div className="art-lines" />
        <Icon size={39} strokeWidth={1.4} />
        <span className="discipline-number">
          {String(d.displayOrder).padStart(2, "0")}
        </span>
        <span
          className={`status-badge ${done ? "done" : d.isQ1Unlocked ? "live" : "waiting"}`}
        >
          {done ? (
            <Check size={12} />
          ) : d.isQ1Unlocked ? (
            <i />
          ) : (
            <LockKeyhole size={11} />
          )}
          {done
            ? t("สำเร็จ", "Completed")
            : d.isQ1Unlocked
              ? t("เปิดภารกิจแล้ว", "Open")
              : t("รอเริ่มภารกิจ", "Waiting to start")}
        </span>
      </div>
      <div className="department-body">
        <h3>
          {t(
            d.nameTh,
            d.name.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase()),
          )}
        </h3>
        <span className="department-english">{d.name}</span>
        <p>{d.description}</p>
        <div className="department-bottom">
          <span className="mini-steps">
            {[0, 1, 2].map((n) => (
              <i key={n} className={answered > n ? "filled" : ""} />
            ))}
            <span>
              {answered} / 3 {t("ข้อ", "decisions")}
            </span>
          </span>
          <ArrowUpRight size={19} />
        </div>
      </div>
    </Link>
  );
}
export function ObjectiveStrip({ progress }: { progress: Passport }) {
  const t = useText();
  return (
    <section className="objective-strip">
      <span className="target-icon">
        <Target size={24} />
      </span>
      <div>
        <h3>{progress.user.objective.title}</h3>
        <span>{t("เป้าหมายธุรกิจของคุณ", "Your strategic target")}</span>
        <p>{progress.user.objective.target}</p>
      </div>
      <span className="private-label">
        <LockKeyhole size={13} />
        {t("เฉพาะทีมของคุณ", "Only your team")}
      </span>
    </section>
  );
}
