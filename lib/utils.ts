import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Merge Tailwind class names with conflict resolution.
 *
 * Parameters
 * ----------
 * inputs : ClassValue
 *     Class names or conditional class maps.
 *
 * Returns
 * -------
 * string
 *     Merged class string.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
