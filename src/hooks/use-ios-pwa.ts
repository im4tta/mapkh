'use client';

import { useState, useEffect } from 'react';
import { detectMobileEnvironment } from '@/lib/mobile-detection';

export function useIOSPWA() {
  const [showInstallGuide, setShowInstallGuide] = useState(false);
  const [isIOSDevice, setIsIOSDevice] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [hasSeenGuide, setHasSeenGuide] = useState(false);

  useEffect(() => {
    const env = detectMobileEnvironment();
    setIsIOSDevice(env.isIOS);
    setIsStandalone(env.isStandalone);

    // Check if user has already seen the guide
    const seenGuide = localStorage.getItem('ios_pwa_guide_seen');
    setHasSeenGuide(!!seenGuide);

    // Show guide if iOS Safari and not standalone and hasn't seen guide
    if (env.isIOS && !env.isStandalone && !seenGuide) {
      // Delay showing the guide to not interrupt initial page load
      const timer = setTimeout(() => {
        setShowInstallGuide(true);
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, []);

  const hideInstallGuide = () => {
    setShowInstallGuide(false);
    localStorage.setItem('ios_pwa_guide_seen', 'true');
    setHasSeenGuide(true);
  };

  const showGuideManually = () => {
    setShowInstallGuide(true);
  };

  const resetGuide = () => {
    localStorage.removeItem('ios_pwa_guide_seen');
    setHasSeenGuide(false);
  };

  return {
    showInstallGuide,
    isIOSDevice,
    isStandalone,
    hasSeenGuide,
    hideInstallGuide,
    showGuideManually,
    resetGuide
  };
}

export default useIOSPWA;