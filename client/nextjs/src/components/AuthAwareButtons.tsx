"use client";
import { useState, useEffect } from "react";
import { createSPAClient } from "@/lib/supabase/client";
import { ArrowRight, Loader2 } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { User } from "@supabase/supabase-js";

export default function AuthAwareButtons({ 
  variant = "primary",
  initialUser = null
}: { 
  variant?: "primary" | "nav",
  initialUser?: User | null
}) {
  const [isAuthenticated, setIsAuthenticated] = useState(!!initialUser);
  const [loading, setLoading] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);
  const t = useTranslations("homepage");

  useEffect(() => {
    const supabase = createSPAClient();
    
    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setIsAuthenticated(!!session?.user);
      setLoading(false);
    });

    // Also check current session just in case
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setIsAuthenticated(!!session?.user);
      setLoading(false);
    };
    
    checkSession();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  if (loading) {
    return null;
  }

  // Navigation buttons for the header
  if (variant === "nav") {
    return isAuthenticated ? (
      <Link
        href="/dashboard"
        onClick={() => setIsNavigating(true)}
        className="bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90 transition-all font-medium flex items-center gap-2"
        data-testid="nav-dashboard-link"
      >
        {isNavigating ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        {t("hero.goToDashboard")}
      </Link>
    ) : (
      <>
        <Link
          href="/auth/register"
          className="bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90 transition-all font-medium"
          data-testid="nav-get-started-link"
        >
          {t("nav.getStarted")}
        </Link>
      </>
    );
  }

  // Primary buttons for the hero section
  return isAuthenticated ? (
    <Link
      href="/dashboard"
      onClick={() => setIsNavigating(true)}
      className="inline-flex items-center px-6 py-3 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-all"
      data-testid="hero-dashboard-link"
    >
      {isNavigating ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : null}
      {t("hero.goToDashboard")}
      {!isNavigating && <ArrowRight className="ml-2 h-5 w-5" />}
    </Link>
  ) : (
    <>
      <div className="flex gap-3 items-center w-full justify-center">
        <Link 
          href="/auth/register" 
          className="w-full sm:w-auto px-6 py-3 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-all text-center"
          data-testid="hero-create-account-link"
        >
           {t("hero.createAccount")}
        </Link>
      </div>
    </>
  );
}
