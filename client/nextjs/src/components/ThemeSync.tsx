"use client";

import { useMantineColorScheme } from "@mantine/core";
import { useTheme } from "next-themes";
import { useEffect } from "react";

export function ThemeSync() {
  const { resolvedTheme } = useTheme();
  const { setColorScheme } = useMantineColorScheme();

  useEffect(() => {
    if (resolvedTheme === "dark") {
      setColorScheme("dark");
    } else {
      setColorScheme("light"); // Default to light or auto
    }
  }, [resolvedTheme, setColorScheme]);

  return null;
}
