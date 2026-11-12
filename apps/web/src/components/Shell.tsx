import {
  Link,
  NavLink,
  Outlet,
  useLocation,
  useNavigate,
} from "react-router-dom";
import {
  Compass,
  BookOpen,
  Fingerprint,
  ArrowUpRight,
  LogOut,
  LayoutDashboard,
  Languages,
  ArrowRight,
  Trophy,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useUser, useRealtime, useCompetition } from "../hooks";
import { usePreferences, useText } from "../store";
import { api } from "../api";
import { SeoHead } from "./SeoHead";
export function Shell() {
  const t = useText(),
    toggle = usePreferences((s) => s.toggle);
  const { data: user } = useUser();
  const connected = useRealtime();
  const competition = useCompetition();
  const cache = useQueryClient();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const links = [
    { to: "/", icon: Compass, label: t("สนามธุรกิจ", "Challenge hub") },
    {
      to: "/passport",
      icon: Fingerprint,
      label: t("พาสปอร์ตของฉัน", "My passport"),
    },
    { to: "/guide", icon: BookOpen, label: t("คู่มือการเล่น", "How to play") },
    ...(user?.role === "attendee" &&
    competition.data &&
    competition.data.phase !== "qualifier"
      ? [{ to: "/final", icon: Trophy, label: "Final" }]
      : []),
  ];
  return (
    <>
      <SeoHead />
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <div className="app-layout">
        <aside className="sidebar">
          <Link to="/" className="brand-logo" aria-label="UTCC Business School">
            <img
              src="/1-UBS-UTCC-1.png"
              width="1557"
              height="650"
              alt="UTCC Business School"
              fetchPriority="high"
            />
          </Link>
          <Link to="/" className="wordmark" aria-label="Businessverse home">
            <span className="brand-symbol">
              B<span />
            </span>
            <div>
              BUSINESS
              <br />
              VERSE<span>ACADEMIC WEEK 2026</span>
            </div>
          </Link>
          <div className="nav-caption">{t("พื้นที่ของคุณ", "YOUR WORKSPACE")}</div>
          <nav aria-label="Main navigation">
            {links.map(({ to, icon: Icon, label }) => (
              <NavLink key={to} to={to} end={to === "/"}>
                <Icon size={20} />
                {label}
              </NavLink>
            ))}
            {user?.role === "admin" && (
              <NavLink to="/admin">
                <LayoutDashboard size={20} />
                {t("ศูนย์ควบคุม", "Control center")}
              </NavLink>
            )}
          </nav>
          <div className="sidebar-note">
            <span className="small-orbit" />
            <h3>
              Make your
              <br />
              next move count.
            </h3>
            <p>
              {t(
                "8 ทักษะธุรกิจ เชื่อมต่อเป็นธุรกิจเดียวของคุณ",
                "Eight business skills. One business that’s yours to build.",
              )}
            </p>
            <Link to="/guide">
              {t("รู้จักการแข่งขัน", "Explore the challenge")}
              <ArrowUpRight size={16} />
            </Link>
          </div>
          <div className="sidebar-footer">
            <span>
              UNIVERSITY OF THE
              <br />
              THAI CHAMBER OF COMMERCE
            </span>
          </div>
        </aside>
        <div className="workspace">
          <header className="topbar">
            <div className="breadcrumb">
              <span>Academic Week</span>
              <span>/</span>
              <strong>
                {pathname.startsWith("/admin")
                  ? t("ผู้จัดงาน", "Organizer")
                  : pathname === "/passport"
                    ? t("พาสปอร์ต", "Passport")
                    : pathname === "/guide"
                      ? t("คู่มือ", "Guide")
                      : t("สนามธุรกิจ", "Challenge hub")}
              </strong>
            </div>
            <Link to="/" className="mobile-brand">
              <img
                src="/1-UBS-UTCC-1.png"
                width="1557"
                height="650"
                alt="UTCC Business School"
              />
              <span>BUSINESSVERSE</span>
            </Link>
            <div className="topbar-actions">
              {user && (
                <span
                  className={`connection ${connected ? "online" : ""}`}
                  title={connected ? "Real-time connected" : "Reconnecting"}
                >
                  <i />
                  {connected
                    ? t("เชื่อมต่อแล้ว", "Connected")
                    : t("กำลังเชื่อมต่อ", "Reconnecting")}
                </span>
              )}
              <button
                className="language-toggle"
                onClick={toggle}
                aria-label="Switch language"
              >
                <Languages size={16} />
                {t("EN", "ไทย")}
              </button>
              {user ? (
                <div className="account">
                  <span className="avatar">
                    {user.fullName.slice(0, 1).toUpperCase()}
                  </span>
                  <span>{user.fullName}</span>
                  <button
                    className="icon-button"
                    aria-label={t("ออกจากระบบ", "Sign out")}
                    onClick={async () => {
                      await api.logout();
                      cache.clear();
                      navigate("/");
                    }}
                  >
                    <LogOut size={16} />
                  </button>
                </div>
              ) : (
                <Link className="top-login" to="/join">
                  {t("เข้าสู่ระบบ", "Sign in")}
                  <ArrowRight size={16} />
                </Link>
              )}
            </div>
          </header>
          <main id="main" className="main-content">
            <Outlet />
          </main>
          <footer className="page-footer">
            <span>BUSINESSVERSE © 2026 · UTCC Business School</span>
            <Link to={user?.role === "admin" ? "/admin" : "/join?next=/admin"}>
              {t("สำหรับผู้จัดงาน", "Organizer access")}
              <ArrowUpRight size={13} />
            </Link>
          </footer>
        </div>
        <nav className="mobile-nav" aria-label="Mobile navigation">
          {links.map(({ to, icon: Icon, label }) => (
            <NavLink key={to} to={to} end={to === "/"}>
              <Icon size={21} />
              <span>{label}</span>
            </NavLink>
          ))}
          {user?.role === "admin" && (
            <NavLink to="/admin">
              <LayoutDashboard size={21} />
              <span>{t("ควบคุม", "Admin")}</span>
            </NavLink>
          )}
        </nav>
      </div>
    </>
  );
}
