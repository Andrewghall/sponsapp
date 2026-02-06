/**
 * Conditionally join CSS class names together, filtering out falsy values.
 *
 * A minimal alternative to `clsx` / `classnames` — accepts strings, undefined,
 * null, or false and returns a single space-separated string of truthy values.
 *
 * @example cn("px-4", isActive && "bg-blue-100", undefined) // "px-4 bg-blue-100"
 */
export function cn(...inputs: (string | undefined | null | false)[]): string {
  return inputs.filter(Boolean).join(' ')
}
