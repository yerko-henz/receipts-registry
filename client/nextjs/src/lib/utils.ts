import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function generateRandomString(
  length = 8,
  charset = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"
) {
  let result = "";
  const charsetLength = charset.length;

  for (let i = 0; i < length; i++) {
    result += charset.charAt(Math.floor(Math.random() * charsetLength));
  }

  return result;
}

export type Messages = Record<string, unknown>;

export function deepMerge<T extends Messages, U extends Messages>(
  target: T,
  source: U
): T & U {
  const output: Messages = { ...target };

  for (const [key, value] of Object.entries(source)) {
    if (
      value &&
      typeof value === "object" &&
      !Array.isArray(value) &&
      typeof (output as Messages)[key] === "object" &&
      (output as Messages)[key] !== null &&
      !Array.isArray((output as Messages)[key])
    ) {
      (output as Messages)[key] = deepMerge(
        (output as Messages)[key] as Messages,
        value as Messages
      );
    } else {
      (output as Messages)[key] = value;
    }
  }

  return output as T & U;
}
