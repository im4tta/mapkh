
"use client";

import { useAuth } from "@/context/auth-provider";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Loader2, Users, Settings as SettingsIcon, Grip, History } from "lucide-react";
import { useTranslation } from "react-i18next";
import Link from 'next/link';
import { cn } from "@/lib/utils";

const ADMIN_UID = 'ADMIN_UID_REDACTED';

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const { t } = useTranslation();
  const [isMounted, setIsMounted] = useState(false);
  
  const navItems = [
    { href: '/settings', label: t('settings.nav.general'), icon: SettingsIcon },
    { href: '/settings/users', label: t('settings.nav.users'), icon: Users },
    { href: '/settings/categories', label: t('settings.nav.categories'), icon: Grip },
    { href: '/settings/history', label: t('settings.nav.history'), icon: History },
  ];

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!loading) {
      if (!user) {
        // Not logged in, redirect to login
        router.push('/login');
      } else if (user.uid !== ADMIN_UID) {
        // Logged in but not admin, redirect to home
        router.push('/');
      }
    }
  }, [user, loading, router]);

  if (loading || !isMounted || (user && user.uid !== ADMIN_UID)) {
    // Show a loading spinner or a blank page while checking auth or if not an admin
    return (
      <div className="flex h-[calc(100vh_-_theme(spacing.14))] w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }


  return (
    <div className="container mx-auto py-10 px-4">
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">{t('settings.title')}</h2>
          <p className="text-muted-foreground">
            {t('settings.description')}
          </p>
        </div>
        <div className="flex flex-col space-y-8 md:flex-row md:space-x-6 md:space-y-0">
          <aside className="md:w-1/4">
             <nav className="flex flex-col space-y-1">
                {navItems.map((item) => (
                    <Link
                        key={item.href}
                        href={item.href}
                        className={cn(
                        "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium hover:bg-muted",
                        pathname === item.href ? 'bg-muted' : 'text-muted-foreground'
                        )}
                    >
                        <item.icon className="h-4 w-4" />
                        <span>{item.label}</span>
                    </Link>
                ))}
            </nav>
          </aside>
          <div className="flex-1">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
