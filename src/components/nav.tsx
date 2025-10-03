"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";
import { useEffect, useState } from "react";

export function Nav({ 
    isAdmin = false,
}: { 
    isAdmin?: boolean,
}) {
    const pathname = usePathname();
    const { t } = useTranslation();
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
    }, []);


    const allLinks = [
        { href: "/", label: t('nav.dashboard'), adminOnly: false },
        { href: "/map", label: t('nav.map'), adminOnly: false },
        { href: "/records", label: t('nav.records'), adminOnly: false },
        { href: "/teams", label: t('nav.teams'), adminOnly: false },
        { href: "/contributions", label: t('nav.contributions'), adminOnly: false },
        { href: "/analytics", label: t('nav.analytics'), adminOnly: false },
        { href: "/settings", label: t('nav.settings'), adminOnly: false },
    ];

    const links = allLinks.filter(link => !link.adminOnly || isAdmin);

    if (!isMounted) {
        return null;
    }

    return (
        <div className={cn("hidden md:flex items-center gap-4 text-sm lg:gap-6")}>
            {links.map(link => (
                <Link
                    key={link.href}
                    href={link.href}
                    className={cn("transition-colors hover:text-foreground/80", 
                        pathname === link.href ? "text-foreground" : "text-foreground/60"
                    )}
                >
                    {link.label}
                </Link>
            ))}
        </div>
    );
}
