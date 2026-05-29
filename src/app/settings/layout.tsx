
"use client";

import { useAuth } from "@/context/auth-provider";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Loader2, Users, Settings as SettingsIcon, Grip, History } from "lucide-react";
import { useTranslation } from "react-i18next";
import Link from 'next/link';
import { cn } from "@/lib/utils";

import { isAdmin as checkIsAdmin } from '@/lib/admin';

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
  
  const isAdmin = checkIsAdmin(user?.uid);
  
  const allNavItems = [
    { href: '/settings', label: t('settings.nav.general'), icon: SettingsIcon, adminOnly: false },
    { href: '/settings/users', label: t('settings.nav.users'), icon: Users, adminOnly: true },
    { href: '/settings/categories', label: t('settings.nav.categories'), icon: Grip, adminOnly: true },
    { href: '/settings/history', label: t('settings.nav.history'), icon: History, adminOnly: true },
  ];
  
  const navItems = allNavItems.filter(item => !item.adminOnly || isAdmin);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!loading && !user) {
      // Not logged in, redirect to login
      router.push('/login');
    } else if (!loading && user && !isAdmin) {
      // Not admin, redirect to dashboard
      router.push('/');
    }
  }, [user, loading, router, isAdmin]);

  if (loading || !isMounted) {
    // Show a loading spinner while checking auth
    return (
      <div className="flex h-[calc(100vh_-_theme(spacing.14))] w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    // This should not happen as useEffect will redirect, but just in case
    return (
      <div className="flex h-[calc(100vh_-_theme(spacing.14))] w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAdmin) {
    // This should not happen as useEffect will redirect, but just in case
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
