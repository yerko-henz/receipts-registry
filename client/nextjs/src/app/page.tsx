import React from "react";
import Link from "next/link";
import {
  ArrowRight,
  Globe,
  Shield,
  Users,
  Key,
  Database,
  Clock,
} from "lucide-react";
import AuthAwareButtons from "@/components/AuthAwareButtons";
import HomePricing from "@/components/HomePricing";
import { ThemeToggle } from "@/components/ThemeToggle";
import { getTranslations } from "next-intl/server";
import { createSSRClient } from "@/lib/supabase/server";

export default async function Home() {
  const productName = process.env.NEXT_PUBLIC_PRODUCTNAME ?? "";
  const t = await getTranslations("homepage");

  const supabase = await createSSRClient();
  const { data: { user } } = await supabase.auth.getUser();

  const features = [
    {
      icon: Shield,
      title: t("feature.auth.title"),
      description: t("feature.auth.description"),
      color: "text-green-600",
    },
    {
      icon: Database,
      title: t("feature.storage.title"),
      description: t("feature.storage.description"),
      color: "text-orange-600",
    },
    {
      icon: Users,
      title: t("feature.settings.title"),
      description: t("feature.settings.description"),
      color: "text-red-600",
    },
    {
      icon: Clock,
      title: t("feature.tasks.title"),
      description: t("feature.tasks.description"),
      color: "text-teal-600",
    },
    {
      icon: Globe,
      title: t("feature.legal.title"),
      description: t("feature.legal.description"),
      color: "text-purple-600",
    },
    {
      icon: Key,
      title: t("feature.cookies.title"),
      description: t("feature.cookies.description"),
      color: "text-primary",
    },
  ];

  const stats = [
    { label: t("stats.activeUsers"), value: "10K+" },
    { label: t("stats.organizations"), value: "2K+" },
    { label: t("stats.countries"), value: "50+" },
    { label: t("stats.uptime"), value: "99.9%" },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <nav className="fixed top-0 w-full bg-background/80 backdrop-blur-sm z-50 border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex-shrink-0">
              <span className="text-2xl font-bold bg-gradient-to-r from-primary-600 to-primary-500 bg-clip-text text-transparent">
                {productName}
              </span>
            </div>
            <div className="hidden md:flex items-center space-x-8">
              <Link
                href="#features"
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                {t("nav.features")}
              </Link>

              <Link
                href="#pricing"
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                {t("nav.pricing")}
              </Link>

              <ThemeToggle />
              <AuthAwareButtons variant="nav" initialUser={user} />
            </div>
          </div>
        </div>
      </nav>

      <section className="relative pt-32 pb-24 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-5xl md:text-6xl font-bold tracking-tight">
              {t("hero.title")}
              <span className="block text-primary">
                {t("hero.highlight")}
              </span>
            </h1>
            <p className="mt-6 text-xl text-muted-foreground max-w-3xl mx-auto">
              {t("hero.subtitle")}
            </p>
            <div className="mt-10 flex gap-4 justify-center">
              <AuthAwareButtons initialUser={user} />
            </div>
          </div>
        </div>
      </section>

      <section className="py-16 bg-gradient-to-b from-background to-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <div key={index} className="text-center">
                <div className="text-4xl font-bold text-primary">
                  {stat.value}
                </div>
                <div className="mt-2 text-sm text-muted-foreground">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-foreground">{t("features.title")}</h2>
            <p className="mt-4 text-xl text-muted-foreground">
              {t("features.subtitle")}
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div
                key={index}
                className="bg-card p-6 rounded-xl shadow-sm border border-border hover:shadow-md transition-all"
              >
                <feature.icon className={`h-8 w-8 ${feature.color}`} />
                <h3 className="mt-4 text-xl font-semibold text-foreground">{feature.title}</h3>
                <p className="mt-2 text-muted-foreground">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <HomePricing />

      <section className="py-24 bg-primary">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-white">{t("cta.title")}</h2>
          <p className="mt-4 text-xl text-primary-100">
            {t("cta.subtitle", { productName })}
          </p>
          <Link
            href="/auth/register"
            className="mt-8 inline-flex items-center px-6 py-3 rounded-lg bg-white text-primary font-medium hover:bg-primary-50 transition-colors"
          >
            {t("cta.button")}
            <ArrowRight className="ml-2 h-5 w-5" />
          </Link>
        </div>
      </section>

      <footer className="bg-muted/50 border-t border-border">
        <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div>
              <h4 className="text-sm font-semibold text-foreground">
                {t("footer.product")}
              </h4>
              <ul className="mt-4 space-y-2">
                <li>
                  <Link
                    href="#features"
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {t("footer.features")}
                  </Link>
                </li>
                <li>
                  <Link
                    href="#pricing"
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {t("footer.pricing")}
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="text-sm font-semibold text-foreground">
                {t("footer.legal")}
              </h4>
              <ul className="mt-4 space-y-2">
                <li>
                  <Link
                    href="/legal/privacy"
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {t("footer.privacy")}
                  </Link>
                </li>
                <li>
                  <Link
                    href="/legal/terms"
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {t("footer.terms")}
                  </Link>
                </li>
              </ul>
            </div>
          </div>
          <div className="mt-8 pt-8 border-t border-border">
            <p className="text-center text-muted-foreground">
              {t("footer.copyright", {
                year: new Date().getFullYear(),
                productName,
              })}
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
