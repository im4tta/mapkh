"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";
import { LayoutDashboard, Map, Database, Users, BarChart3, Group, Menu } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "./ui/sheet";
import { Button } from "./ui/button";
import { useState } from "react";

export function BottomNav() {
  const pathname = usePathname();
  const { t } = useTranslation();
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  const mainLinks = [
    { href: "/", label: t('nav.dashboard'), icon: LayoutDashboard },
    { href: "/map", label: t('nav.map'), icon: Map },
    { href: "/records", label: t('nav.records'), icon: Database },
  ];
  
  const moreLinks = [
    { href: "/teams", label: t('nav.teams'), icon: Group },
    { href: "/contributions", label: t('nav.contributions'), icon: Users },
    { href: "/analytics", label: t('nav.analytics'), icon: BarChart3 },
  ];

  const handleLinkClick = () => {
    setIsSheetOpen(false);
  }

  return (
    <div className="fixed bottom-0 left-0 z-50 w-full h-16 bg-background border-t border-border md:hidden">
      <div className="grid h-full max-w-lg grid-cols-4 mx-auto font-medium">
        {mainLinks.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              "inline-flex flex-col items-center justify-center px-5 hover:bg-muted/50 group",
              pathname === link.href ? "text-primary" : "text-muted-foreground"
            )}
          >
            <link.icon className="w-5 h-5 mb-1" />
            <span className="text-xs">
              {link.label}
            </span>
          </Link>
        ))}
         <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
            <SheetTrigger asChild>
                 <button className="inline-flex flex-col items-center justify-center px-5 hover:bg-muted/50 group text-muted-foreground">
                    <Menu className="w-5 h-5 mb-1" />
                    <span className="text-xs">More</span>
                </button>
            </SheetTrigger>
            <SheetContent side="bottom" className="h-auto">
                <SheetHeader>
                    <SheetTitle className="sr-only">More Options</SheetTitle>
                </SheetHeader>
                <div className="grid grid-cols-3 gap-4 p-4">
                    {moreLinks.map((link) => (
                        <Link
                            key={link.href}
                            href={link.href}
                            onClick={handleLinkClick}
                            className={cn(
                            "inline-flex flex-col items-center justify-center p-4 rounded-lg hover:bg-muted/50 group",
                            pathname === link.href ? "text-primary" : "text-muted-foreground"
                            )}
                        >
                            <link.icon className="w-6 h-6 mb-2" />
                            <span className="text-sm font-medium">{link.label}</span>
                        </Link>
                    ))}
                </div>
            </SheetContent>
        </Sheet>
      </div>
    </div>
  );
}
