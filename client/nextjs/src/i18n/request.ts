import { getRequestConfig } from "next-intl/server";
import { cookies } from "next/headers";
import { deepMerge, type Messages } from "@/lib/utils";

export default getRequestConfig(async () => {
  const store = await cookies();
  const fallbackLocale = "es";
  const rawLocale = store.get("NEXT_LOCALE")?.value || fallbackLocale;

  // Use language part (e.g. "es" from "es-AR") as base
  const language = rawLocale.split("-")[0] || fallbackLocale;

  // Load base language messages (e.g. "es.json")
  const baseMessages =
    (await import(`../../messages/${language}.json`)).default || {};

  // Try to load regional overrides (e.g. "es-AR.json"); if missing, ignore
  let regionalMessages: Messages = {};
  if (rawLocale !== language) {
    try {
      regionalMessages =
        (await import(`../../messages/${rawLocale}.json`)).default || {};
    } catch {
      // No regional file – that's fine, we just use the base language
    }
  }

  const messages = deepMerge(baseMessages, regionalMessages);

  return {
    locale: rawLocale,
    messages,
  };
});
