
"use client";

import { useTranslation } from "react-i18next";
import { useState, useEffect } from "react";

export default function RecordsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { t } = useTranslation();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    return null; // or a loading skeleton
  }

  return (
    <div className="container mx-auto py-10 px-4">
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">{t('records.title')}</h2>
          <p className="text-muted-foreground">
            {t('records.description')}
          </p>
        </div>
        <div className="flex flex-col space-y-8">
          {children}
        </div>
      </div>
    </div>
  );
}
