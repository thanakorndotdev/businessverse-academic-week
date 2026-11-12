import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { usePreferences } from "../store";
export function SeoHead() {
  const { pathname } = useLocation();
  const language = usePreferences((s) => s.language);
  useEffect(() => {
    const privateRoute = /^\/(admin|passport|play|join)/.test(pathname);
    const route = pathname.startsWith("/admin")
      ? "Organizer control"
      : pathname.startsWith("/guide")
        ? "Event guide"
        : pathname.startsWith("/passport")
          ? "My passport"
          : "8 Skills. 1 Business.";
    document.title = `${route} | BUSINESSVERSE — UTCC Academic Week`;
    document.documentElement.lang = language;
    document
      .querySelector('meta[name="robots"]')
      ?.setAttribute(
        "content",
        privateRoute ? "noindex, nofollow" : "index, follow",
      );
    document
      .querySelector('meta[name="description"]')
      ?.setAttribute(
        "content",
        language === "th"
          ? "Businessverse Academic Week · UTCC Business School — 8 ทักษะธุรกิจ 24 การตัดสินใจ และเป้าหมายเฉพาะทีมของคุณ"
          : "Businessverse Academic Week at UTCC Business School: eight disciplines, 24 business decisions, and your team’s own strategic target.",
      );
    document
      .querySelector('link[rel="canonical"]')
      ?.setAttribute("href", `${window.location.origin}${pathname}`);
  }, [pathname, language]);
  return null;
}
