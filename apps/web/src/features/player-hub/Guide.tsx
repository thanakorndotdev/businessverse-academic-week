import { Link } from "react-router-dom";
import {
  ArrowRight,
  Target,
  LockKeyhole,
  CheckCircle2,
  ArrowUpRight,
} from "lucide-react";
import { useText } from "../../store";
export function Guide() {
  const t = useText();
  const targets = [
    [
      "Growth Company",
      "Sales > 145",
      t("เร่งยอดขายและขยายตลาด", "Grow sales and expand your market"),
    ],
    [
      "Premium Brand",
      "Brand > 120 · Risk < 55",
      t("สร้างแบรนด์พร้อมควบคุมความเสี่ยง", "Build brand value and control risk"),
    ],
    [
      "Cost Leader",
      "Cash > 200,000 · Operations > 100",
      t(
        "รักษาสภาพคล่องและประสิทธิภาพ",
        "Protect liquidity and operational efficiency",
      ),
    ],
    [
      "Customer Champion",
      "Customer > 130",
      t(
        "สร้างประสบการณ์และฐานลูกค้าระยะยาว",
        "Build lasting customer relationships",
      ),
    ],
  ];
  return (
    <article className="guide-page">
      <header className="guide-header">
        <span className="guide-large-icon">
          <Target size={44} strokeWidth={1.3} />
        </span>
        <h1>
          {t("รู้กติกา แล้วสร้างทางของคุณ", "Know the rules. Find your own way.")}
        </h1>
        <p className="lead">
          {t(
            "8 ทักษะ 1 ธุรกิจ 24 การตัดสินใจ เรียนรู้ผ่านการลงมือทำใน Businessverse Academic Week ของ UTCC Business School",
            "Eight skills, one business, 24 decisions. Learn by doing at UTCC Business School’s Businessverse Academic Week.",
          )}
        </p>
      </header>
      <section>
        <h2>{t("เล่นอย่างไร", "How it works")}</h2>
        <ol className="guide-instructions">
          {[
            [
              t("รับเป้าหมายธุรกิจ", "Get your business target"),
              t(
                "เข้าเกมด้วยหมายเลขทีมและรหัสจากผู้จัดงาน ทีมจะได้หนึ่งใน 4 เป้าหมายที่คงเดิมตลอดการแข่งขัน ทุกข้อต้องเขียนเหตุผลของทีมสั้น ๆ",
                "Sign in with your team number and organizer code. Your team gets one of four persistent strategic targets. Every answer needs a short team rationale.",
              ),
            ],
            [
              t(
                "รอเริ่มสาขา แล้วตอบต่อเนื่อง",
                "Wait for the start, then keep moving",
              ),
              t(
                "ผู้จัดงานเปิดข้อแรกของแต่ละสาขา ข้อ 2 และ 3 จะต่อให้ทันทีหลังบันทึก แต่ละข้อมีเวลา 3 นาที หมดเวลาจะไม่ได้คะแนนข้อนั้นและไปข้อถัดไปอัตโนมัติ ทำสาขาตามลำดับเพื่อรักษาสถานะธุรกิจ",
                "The organizer opens question one of each discipline. Questions two and three advance automatically. Each question has a 3-minute limit; an unanswered question scores nothing and the next one opens. Follow the discipline sequence to carry your business state forward.",
              ),
            ],
            [
              t("สะสมตราประทับให้ครบ", "Complete your passport"),
              t(
                "ตอบครบ 3 ข้อ รับหนึ่งตราประทับ ครบทั้ง 8 สาขาคือจบ 24 การตัดสินใจ ดูสถานะธุรกิจของคุณในพาสปอร์ตได้เสมอ",
                "Finish three decisions to earn a stamp. Eight stamps complete all 24 decisions. Your own business status is always available in your passport.",
              ),
            ],
          ].map(([title, body], i) => (
            <li key={title}>
              <span>{i + 1}</span>
              <div>
                <h3>{title}</h3>
                <p>{body}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>
      <section>
        <h2>
          {t(
            "เป้าหมายต่างกัน กลยุทธ์จึงต่างกัน",
            "Different targets. Different strategies.",
          )}
        </h2>
        <p>
          {t(
            "ทีม 1–4 ได้เป้าหมายตามลำดับด้านล่าง และวนซ้ำทุก 4 ทีม ผู้จัดงานปรับเป้าหมายได้ก่อนเริ่มเล่นเท่านั้น",
            "Teams 1–4 receive the targets below in order, repeating every four teams. Organizers may adjust assignments before play begins.",
          )}
        </p>
        <div className="target-list">
          {targets.map(([name, rule, desc]) => (
            <div key={name}>
              <Target size={21} />
              <div>
                <h3>{name}</h3>
                <p>{desc}</p>
              </div>
              <strong>{rule}</strong>
            </div>
          ))}
        </div>
      </section>
      <section className="scoring-guide">
        <h2>{t("คะแนนคิดอย่างไร", "How scoring works")}</h2>
        <p>
          {t(
            "ใช้สูตรเดียวกับต้นแบบ และคำนวณบนเซิร์ฟเวอร์จากคำตอบที่บันทึกไว้",
            "The original scoring formula runs on the server using your saved decisions.",
          )}
        </p>
        <dl>
          {[
            ["40", t("สถานะธุรกิจจำลอง", "Business simulation")],
            [
              "10",
              t(
                "บรรลุเป้าหมายหลังครบ 24 ข้อ",
                "Target achieved after 24 decisions",
              ),
            ],
            [
              "30",
              t("คุณภาพการตัดสินใจตาม target", "Decision quality for your target"),
            ],
            [
              "20",
              t(
                "Final แผน 8 สาขา (รวมรางวัลเฉพาะ Top 10)",
                "Final: eight-discipline plan (Top 10 awards)",
              ),
            ],
          ].map(([score, label]) => (
            <div key={score}>
              <dt>{label}</dt>
              <dd>{score}</dd>
            </div>
          ))}
        </dl>
        <p className="guide-fine-print">
          <LockKeyhole size={17} />
          {t(
            "รอบคัดเลือกเต็ม 80 คะแนน ทุกทีมส่งแผน Final 8 สาขาในโจทย์เดียวกันได้ คะแนน Final เต็ม 20 (รายสาขา 16 + ความสอดคล้องของแผน 4) รวมผลรางวัลเฉพาะ Top 10 คะแนนและอันดับแสดงเฉพาะจอผู้จัดงาน",
            "The qualifier is worth 80 points. Every team may submit the shared eight-discipline Final plan, worth 20 (16 for disciplines + 4 for the integrated plan). Only Top 10 Final scores count toward awards. Scores and ranks appear only on the organizer’s screen.",
          )}
        </p>
      </section>
      <section className="faq">
        <h2>{t("คำถามที่พบบ่อย", "Frequently asked questions")}</h2>
        {[
          [
            t("แก้คำตอบหลังยืนยันได้ไหม?", "Can I change a submitted decision?"),
            t(
              "ไม่ได้ ทุกการตัดสินใจส่งผลต่อสถานะบริษัท กรุณาตรวจสอบตัวเลือกก่อนยืนยัน",
              "No. Every decision changes your business state. Review your selection before confirming.",
            ),
          ],
          [
            t(
              "หลุดจากหน้าเกม ความก้าวหน้าจะหายไหม?",
              "Will I lose progress if I leave?",
            ),
            t(
              "คำตอบที่ยืนยันแล้วบันทึกในฐานข้อมูล เข้าสู่บัญชีเดิมเพื่อเล่นต่อได้",
              "Confirmed answers are saved in the database. Sign in with the same account to continue.",
            ),
          ],
          [
            t("ทำไมคำถามยังล็อกอยู่?", "Why is a question locked?"),
            t(
              "ต้องรอผู้จัดงานเปิดสาขา และทำสาขาก่อนหน้าให้ครบ หน้ารอจะอัปเดตเมื่อเปิดโดยอัตโนมัติ",
              "The organizer must open the discipline, and previous missions must be complete. Waiting screens update automatically.",
            ),
          ],
        ].map(([q, a]) => (
          <details key={q}>
            <summary>
              {q}
              <ArrowUpRight size={16} />
            </summary>
            <p>{a}</p>
          </details>
        ))}
      </section>
      <div className="guide-close">
        <CheckCircle2 size={28} />
        <h2>{t("พร้อมตัดสินใจครั้งแรกแล้วหรือยัง?", "Ready for your first move?")}</h2>
        <Link className="button primary" to="/">
          {t("ไปที่สนามธุรกิจ", "Go to the challenge hub")}
          <ArrowRight size={18} />
        </Link>
      </div>
    </article>
  );
}
