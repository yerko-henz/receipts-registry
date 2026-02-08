"use client";

import { Sun, Moon } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Avoid hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <button className="p-2 w-9 h-9" aria-label="Toggle theme" />
    );
  }

  return (
    <button
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      className="p-2 text-muted-foreground hover:text-foreground rounded-full hover:bg-muted transition-colors"
      aria-label="Toggle theme"
    >
      {/* Sun icon shows in dark mode to switch to light */}
      <Sun className="h-5 w-5 hidden dark:block" />
      {/* Moon icon shows in light mode to switch to dark */}
      <Moon className="h-5 w-5 block dark:hidden" />
    </button>
  );
}
