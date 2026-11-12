import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  ArrowRight,
  Eye,
  EyeOff,
  Target,
  ShieldCheck,
} from "lucide-react";
import { api } from "../../api";
import { useText } from "../../store";
import { ErrorState } from "../../components/Common";
export function Auth() {
  const t = useText();
  const [params] = useSearchParams();
  const requested = params.get("next") ?? "/";
  const next =
    requested.startsWith("/") && !requested.startsWith("//") ? requested : "/";
  const [organizer, setOrganizer] = useState(next.startsWith("/admin"));
  const admin = organizer;
  const [show, setShow] = useState(false);
  const cache = useQueryClient(),
    navigate = useNavigate();
  const teams = useQuery({
    queryKey: ["teams"],
    queryFn: api.teams,
    enabled: !organizer,
  });
  const mutation = useMutation({
    mutationFn: async (form: FormData) =>
      organizer
        ? api.login({
            email: String(form.get("email")),
            password: String(form.get("password")),
          })
        : api.teamLogin({
            teamNumber: Number(form.get("teamNumber")),
            code: String(form.get("code")).trim().toUpperCase(),
          }),
    onSuccess: ({ user }) => {
      cache.clear();
      cache.setQueryData(["user"], user);
      navigate(user.role === "admin" ? "/admin" : next.startsWith("/admin") ? "/" : next);
    },
  });
  return (
    <div className="auth-page">
      <section className="auth-story">
        <span className="brand-symbol large">
          B<span />
        </span>
        <h1>{t("ก้าวแรกของธุรกิจ\nเริ่มที่คุณ", "Your business\nstarts with you.")}</h1>
        <p>
          {t(
            "รับเป้าหมายของทีม ตัดสินใจผ่าน 8 ทักษะ แล้วดูว่าคุณจะพาธุรกิจไปได้ไกลแค่ไหน",
            "Get your team’s target. Navigate eight business skills. Discover where your decisions can take you.",
          )}
        </p>
        <div>
          <Target size={23} />
          <span>4 STRATEGIC TARGETS</span>
        </div>
        <img
          src="/1-UBS-UTCC-1.png"
          width="1557"
          height="650"
          alt="UTCC Business School"
        />
      </section>
      <section className="auth-form">
        <Link to="/" className="back-link">
          <ArrowLeft size={16} />
          {t("กลับสู่สนามธุรกิจ", "Back to the hub")}
        </Link>
        <h2>
          {admin
            ? t("เข้าสู่ระบบผู้จัดงาน", "Organizer sign in")
            : t("เข้าสู่สนาม BUSINESSVERSE", "Enter BUSINESSVERSE")}
        </h2>
        <p>
          {admin
            ? t(
                "ใช้บัญชีผู้จัดงานที่กำหนดไว้ในระบบ",
                "Use your configured organizer account.",
              )
            : t(
                "เลือกหมายเลขทีมและกรอกรหัสที่ได้รับจากผู้จัดงาน",
                "Choose your team number and enter the code from the organizer.",
              )}
        </p>
        <div className="auth-tabs">
          <button
            onClick={() => {
              setOrganizer(false);
              mutation.reset();
            }}
            className={!organizer ? "selected" : ""}
          >
            {t("ทีมผู้เล่น", "Team")}
          </button>
          <button
            onClick={() => {
              setOrganizer(true);
              mutation.reset();
            }}
            className={organizer ? "selected" : ""}
          >
            {t("ผู้จัดงาน", "Organizer")}
          </button>
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            mutation.mutate(new FormData(e.currentTarget));
          }}
        >
          {organizer ? (
            <>
              <label>
                {t("อีเมล", "Email")}
                <input
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  placeholder="organizer@example.com"
                />
              </label>
              <label>
                {t("รหัสผ่าน", "Password")}
                <div className="password-field">
                  <input
                    name="password"
                    type={show ? "text" : "password"}
                    autoComplete="current-password"
                    required
                    maxLength={128}
                    placeholder={t("กรอกรหัสผ่าน", "Enter your password")}
                  />
                  <button
                    type="button"
                    onClick={() => setShow(!show)}
                    aria-label={show ? "Hide password" : "Show password"}
                  >
                    {show ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </label>
            </>
          ) : (
            <>
              <label>
                {t("หมายเลขทีม", "Team number")}
                <select name="teamNumber" required defaultValue="">
                  <option value="" disabled>
                    {teams.isPending
                      ? t("กำลังโหลด…", "Loading…")
                      : teams.data?.teams.length
                        ? t("เลือกทีม", "Choose your team")
                        : t("ผู้จัดงานยังไม่สร้างทีม", "No teams yet")}
                  </option>
                  {teams.data?.teams.map((n) => (
                    <option key={n} value={n}>
                      TEAM {String(n).padStart(3, "0")}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                {t("รหัสทีม", "Team code")}
                <input
                  name="code"
                  required
                  minLength={4}
                  maxLength={12}
                  autoComplete="off"
                  autoCapitalize="characters"
                  spellCheck={false}
                  className="code-input"
                  placeholder="เช่น K7M2QX"
                />
              </label>
            </>
          )}
          {mutation.error && <ErrorState error={mutation.error} />}
          <button className="button primary full" disabled={mutation.isPending}>
            {mutation.isPending
              ? t("กำลังเข้าสู่ระบบ…", "Please wait…")
              : organizer
                ? t("เข้าสู่ระบบผู้จัดงาน", "Sign in")
                : t("เข้าสู่เกม", "Enter the game")}
            <ArrowRight size={18} />
          </button>
        </form>
        <p className="auth-privacy">
          <ShieldCheck size={17} />
          {t(
            "สมาชิกทีมใช้รหัสเดียวกันได้ ความก้าวหน้าบันทึกไว้ที่ทีม เล่นต่อได้เมื่อกลับมา",
            "Teammates share one code. Progress is saved to the team, ready when you return.",
          )}
        </p>
      </section>
    </div>
  );
}
