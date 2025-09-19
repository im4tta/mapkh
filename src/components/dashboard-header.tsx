
"use client";

import { useAuth } from "@/context/auth-provider";
import { useTranslation } from "react-i18next";
import { useEffect, useState } from "react";
import { formatToKhmerLunarDate, formatToKhmerGregorian } from "@/lib/khmer-date";

export function DashboardHeader() {
  const { user } = useAuth();
  const { t, i18n } = useTranslation();
  const [currentDate, setCurrentDate] = useState<Date | null>(null);

  useEffect(() => {
    // Set the date only on the client-side to avoid hydration mismatch
    setCurrentDate(new Date());
    
    const timer = setInterval(() => {
      setCurrentDate(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const getGreeting = () => {
    if (!currentDate) return '';
    const hour = currentDate.getHours();
    if (hour < 12) return t('dashboard.greetings.morning');
    if (hour < 18) return t('dashboard.greetings.afternoon');
    return t('dashboard.greetings.evening');
  };

  const userName = user?.displayName || t('dashboard.greetings.guest');
  const greetingMessage = `${getGreeting()}, ${userName}!`;
  
  if (!currentDate) {
      return (
        <div>
            <h2 className="text-2xl font-bold tracking-tight">{`${t('dashboard.greetings.morning')}, ${userName}!`}</h2>
            <p className="text-muted-foreground">&nbsp;</p>
        </div>
      )
  }

  const formattedTime = currentDate.toLocaleTimeString(i18n.language === 'km' ? 'km-KH' : 'en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
  });

  return (
    <div>
        <h2 className="text-2xl font-bold tracking-tight">{greetingMessage}</h2>
        <p className="text-muted-foreground">
            {i18n.language === 'km' ? (
                <>
                    <span>{formatToKhmerLunarDate(currentDate)}</span>
                    <span className="font-khmer"> | {formatToKhmerGregorian(currentDate)}</span>
                    <span className="font-mono"> | {formattedTime}</span>
                </>
            ) : (
                <span>
                    {currentDate.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                    {' | '}
                    {formattedTime}
                </span>
            )}
        </p>
    </div>
  );
}
