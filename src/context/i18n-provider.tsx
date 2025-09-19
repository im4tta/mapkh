
"use client";

import { ReactNode, useEffect } from "react";
import { I18nextProvider, useTranslation, initReactI18next } from "react-i18next";
import i18next from "i18next";
import { useAuth } from "./auth-provider";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import LanguageDetector from "i18next-browser-languagedetector";
import resourcesToBackend from 'i18next-resources-to-backend';

// Initialize i18next instance
const i18n = i18next
  .use(LanguageDetector)
  .use(resourcesToBackend((language: string, namespace: string) => import(`../locales/${language}/${namespace}.json`)))
  .use(initReactI18next);

// Async initialization
if (!i18n.isInitialized) {
  i18n.init({
    debug: false,
    fallbackLng: "en",
    interpolation: {
      escapeValue: false, // not needed for react as it escapes by default
    },
    detection: {
        order: ['cookie', 'htmlTag'],
        caches: ['cookie'],
        lookupCookie: 'i18next',
    }
  });
}

// Separate component for initialization logic
const I18nInitializer = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const { i18n } = useTranslation();
  
  useEffect(() => {
    const fetchUserLanguage = async () => {
      if (user) {
        try {
          const userDoc = await getDoc(doc(db, "users", user.uid));
          if (userDoc.exists() && userDoc.data().language) {
            i18n.changeLanguage(userDoc.data().language);
          }
        } catch (error) {
          console.error("Failed to fetch user language preference:", error);
        }
      }
    };
    fetchUserLanguage();
  }, [user, i18n]);

  return <>{children}</>;
};

export function I18nProvider({ children }: { children: ReactNode }) {
  return (
    <I18nextProvider i18n={i18n}>
      <I18nInitializer>{children}</I18nInitializer>
    </I18nextProvider>
  );
}
