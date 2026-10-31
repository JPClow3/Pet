import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

// Teach tailwind-merge the custom type and radius roles from globals.css so
// `text-caption` is merged as a font size, not mistaken for a text colour.
const twMerge = extendTailwindMerge({
  extend: {
    theme: {
      text: ["caption", "meta", "label", "body", "h3", "h2", "h1"],
      radius: ["control", "card", "feature", "sheet"],
    },
  },
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
