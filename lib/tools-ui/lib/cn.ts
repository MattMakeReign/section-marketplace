import { clsx, type ClassValue } from "clsx";

/**
 * Combine class names. We don't use tailwind-merge because tools-ui ships
 * its own CSS classes (not Tailwind utilities) — no conflict-resolution
 * needed. If we later add Tailwind utility coverage, swap to twMerge(clsx(…)).
 */
export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}
