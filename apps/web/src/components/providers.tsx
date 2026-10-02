"use client";

import { Toaster } from "@aircircle/ui/components/sonner";

import { ThemeProvider } from "./theme-provider";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    // Forced light. Aircircle is a light design, and these pages are read once,
    // often straight from a store listing — a theme toggle on a privacy policy
    // is noise.
    <ThemeProvider attribute="class" forcedTheme="light" disableTransitionOnChange>
      {children}
      <Toaster richColors />
    </ThemeProvider>
  );
}
