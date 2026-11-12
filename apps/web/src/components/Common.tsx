import {
  AlertCircle,
  ArrowRight,
  RotateCw,
  Check,
  LockKeyhole,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useText } from "../store";
export function ErrorState({
  error,
  retry,
}: {
  error: unknown;
  retry?: () => void;
}) {
  const t = useText();
  return (
    <div className="error-state" role="alert">
      <AlertCircle size={20} />
      <div>
        <strong>{t("มีบางอย่างไม่เรียบร้อย", "Something needs attention")}</strong>
        <p>
          {error instanceof Error
            ? error.message
            : t(
                "เชื่อมต่อไม่สำเร็จ กรุณาลองใหม่",
                "Unable to connect. Please try again.",
              )}
        </p>
      </div>
      {retry && (
        <button className="button small secondary" onClick={retry}>
          <RotateCw size={16} />
          {t("ลองใหม่", "Retry")}
        </button>
      )}
    </div>
  );
}
export function Loading({ cards = false }: { cards?: boolean }) {
  return (
    <div
      className={cards ? "department-grid loading-grid" : "loading-panel"}
      role="status"
      aria-label="Loading"
    >
      {Array.from({ length: cards ? 8 : 1 }, (_, i) => (
        <div className="skeleton" key={i} />
      ))}
      <span className="sr-only">Loading…</span>
    </div>
  );
}
export function SignInPrompt({ next = "/" }: { next?: string }) {
  const t = useText();
  return (
    <section className="empty-state">
      <LockKeyhole size={36} />
      <h1>{t("พร้อมสร้างธุรกิจของคุณหรือยัง?", "Ready to build your business?")}</h1>
      <p>
        {t(
          "เข้าสู่ระบบเพื่อดู target ของคุณ และเก็บความก้าวหน้าไว้ทุกการตัดสินใจ",
          "Sign in to discover your target and save every decision.",
        )}
      </p>
      <Link
        className="button primary"
        to={`/join?next=${encodeURIComponent(next)}`}
      >
        {t("เข้าสู่สนาม", "Join the challenge")}
        <ArrowRight size={18} />
      </Link>
    </section>
  );
}
export function Steps({ answered }: { answered: number }) {
  const t = useText();
  return (
    <ol
      className="question-steps"
      aria-label={t("ความก้าวหน้า 3 ข้อ", "Three question progress")}
    >
      {[
        t("ความรู้ธุรกิจ", "Business check"),
        t("ตัดสินใจเชิงกลยุทธ์", "Strategic decision"),
        t("รับมือวิกฤต", "Crisis response"),
      ].map((label, i) => (
        <li
          key={label}
          className={answered > i ? "done" : answered === i ? "current" : ""}
        >
          {answered > i ? <Check size={16} /> : <span>{i + 1}</span>}
          <span>{label}</span>
        </li>
      ))}
    </ol>
  );
}
