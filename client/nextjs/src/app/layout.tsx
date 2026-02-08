import type { Metadata } from "next";
import "./globals.css";
import { Analytics } from "@vercel/analytics/next";
import CookieConsent from "@/components/Cookies";
import { GoogleAnalytics } from "@next/third-parties/google";
import { NextIntlClientProvider } from "next-intl";
import { getTranslations, getLocale, getMessages } from "next-intl/server";
import { ThemeProvider } from "@/components/ThemeProvider";
import { MantineProviderWrapper } from "@/components/MantineProviderWrapper";
import { ThemeSync } from "@/components/ThemeSync";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("layout");

  return {
    title: process.env.NEXT_PUBLIC_PRODUCTNAME,
    description: t("description"),
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();
  const messages = await getMessages();
  let theme = process.env.NEXT_PUBLIC_THEME;
  if (!theme) {
    theme = "theme-sass3";
  }
  const gaID = process.env.NEXT_PUBLIC_GOOGLE_TAG;
  return (
    <html lang={locale} suppressHydrationWarning>
      <body className={theme}>
        <MantineProviderWrapper>
            <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
            >
            <ThemeSync />
            <NextIntlClientProvider locale={locale} messages={messages}>
                {children}
                <CookieConsent />
            </NextIntlClientProvider>
            </ThemeProvider>
         </MantineProviderWrapper>
        <Analytics />
        {gaID && <GoogleAnalytics gaId={gaID} />}
      </body>
    </html>
  );
}
