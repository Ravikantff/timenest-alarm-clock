import { useEffect, useState } from "react";

export type ThemeName = "dark" | "midnight" | "gradient" | "light";
export type Appearance = { theme: ThemeName; bgImageId: string | null; bgImageName: string | null };

export const APPEARANCE_KEY = "timenest.appearance.v1";
export const DEFAULT_APPEARANCE: Appearance = { theme: "dark", bgImageId: null, bgImageName: null };
export const THEMES: { id: ThemeName; name: string }[] = [
  { id: "dark", name: "Dark navy" },
  { id: "midnight", name: "Midnight" },
  { id: "gradient", name: "Aurora gradient" },
  { id: "light", name: "Light" },
];

export function useAppearance() {
  const [appearance, setAppearance] = useState<Appearance>(DEFAULT_APPEARANCE);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(APPEARANCE_KEY);
      if (raw) setAppearance({ ...DEFAULT_APPEARANCE, ...JSON.parse(raw) });
    } catch {
      /* ignore */
    }
    setLoaded(true);
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = appearance.theme;
    if (loaded) localStorage.setItem(APPEARANCE_KEY, JSON.stringify(appearance));
  }, [appearance, loaded]);

  return { appearance, setAppearance };
}
