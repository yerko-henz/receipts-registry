"use client";
import { useState, useEffect } from "react";
import { createSPAClient } from "@/lib/supabase/client";
import { ArrowRight } from "lucide-react";
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

  const createAccount = () => {
    // Navigate to register (handled by Link)
  };

  // Navigation buttons for the header
  if (variant === "nav") {
    return isAuthenticated ? (
      <Link
        href="/dashboard"
        className="bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90 transition-all font-medium"
      >
        {t("hero.goToDashboard")}{" "}
      </Link>
    ) : (
      <>
        <Link
          href="/auth/register"
          className="bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90 transition-all font-medium"
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
      className="inline-flex items-center px-6 py-3 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-all"
    >
      {t("hero.goToDashboard")}
      <ArrowRight className="ml-2 h-5 w-5" />
    </Link>
  ) : (
    <>
      <div className="flex gap-3 items-center w-full justify-center">
        <Link href="/auth/register" className="w-full sm:w-auto">
          <button
            onClick={() => createAccount()}
            className="w-full px-6 py-3 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-all"
          >
            {t("hero.createAccount")}
          </button>
        </Link>
      </div>
    </>
  );
}
