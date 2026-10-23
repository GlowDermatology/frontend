import { Cormorant_Garamond, Manrope } from "next/font/google";

/**
 * Brand typefaces from the design system: Cormorant Garamond for display
 * (24px and up only) and Manrope for everything read or tapped. Both are
 * variable fonts. Only Latin is preloaded; Cyrillic (Russian pages) is
 * fetched on demand through `unicode-range`.
 */
export const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  style: ["normal", "italic"],
  weight: "variable",
  variable: "--font-cormorant",
  fallback: ["Georgia", "Times New Roman", "serif"],
});

export const manrope = Manrope({
  subsets: ["latin"],
  weight: "variable",
  variable: "--font-manrope",
  fallback: ["Segoe UI", "system-ui", "-apple-system", "sans-serif"],
});

export const fontVariables = `${cormorant.variable} ${manrope.variable}`;
