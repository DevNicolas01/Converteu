import { useEffect, useState } from "react";
import { SunIcon, MoonIcon } from "./Icons";

const STORAGE_KEY = "orcei-theme";

function applyTheme(dark: boolean) {
  if (dark) {
    document.documentElement.setAttribute("data-theme", "dark");
  } else {
    document.documentElement.removeAttribute("data-theme");
  }
}

export default function ThemeToggle() {
  const [dark, setDark] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) === "dark";
    } catch {
      return false;
    }
  });

  useEffect(() => {
    applyTheme(dark);
  }, [dark]);

  function toggle() {
    setDark((d) => {
      const next = !d;
      try {
        localStorage.setItem(STORAGE_KEY, next ? "dark" : "light");
      } catch {
        // ignore
      }
      return next;
    });
  }

  return (
    <button className="theme-toggle" type="button" onClick={toggle} title="Alternar tela clara/escura" aria-label="Alternar tela clara/escura">
      <SunIcon />
      <MoonIcon />
    </button>
  );
}
