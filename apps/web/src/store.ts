import { create } from "zustand";
import { persist } from "zustand/middleware";
export const usePreferences = create<{
  language: "th" | "en";
  toggle: () => void;
}>()(
  persist(
    (set) => ({
      language: "th",
      toggle: () =>
        set((s) => ({ language: s.language === "th" ? "en" : "th" })),
    }),
    { name: "businessverse-preferences" },
  ),
);
export function useText() {
  const language = usePreferences((s) => s.language);
  return (thai: string, english: string) =>
    language === "th" ? thai : english;
}
