'use client';

import React, { useState, useEffect } from 'react';
import { X, Share, Plus, Home, Smartphone } from 'lucide-react';
import { detectMobileEnvironment } from '@/lib/mobile-detection';

interface IOSPWAGuideProps {
  onClose: () => void;
  isOpen: boolean;
}

export function IOSPWAGuide({ onClose, isOpen }: IOSPWAGuideProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [mobileEnv, setMobileEnv] = useState<any>(null);

  useEffect(() => {
    setMobileEnv(detectMobileEnvironment());
  }, []);

  if (!isOpen || !mobileEnv?.isIOS || mobileEnv?.isStandalone) {
    return null;
  }

  const steps = [
    {
      title: "Open Share Menu",
      description: "Tap the Share button at the bottom of Safari",
      icon: <Share className="w-8 h-8 text-blue-500" />,
      detail: "Look for the square with an arrow pointing up at the bottom of your Safari browser."
    },
    {
      title: "Add to Home Screen",
      description: "Scroll down and tap 'Add to Home Screen'",
      icon: <Plus className="w-8 h-8 text-green-500" />,
      detail: "You may need to scroll down in the share menu to find this option."
    },
    {
      title: "Confirm Installation",
      description: "Tap 'Add' to install MapCorrectKH",
      icon: <Home className="w-8 h-8 text-purple-500" />,
      detail: "The app will be added to your home screen with full functionality including notifications and badges."
    }
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-gray-900">Install MapCorrectKH</h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-full"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="mb-6">
            <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-lg mb-4">
              <Smartphone className="w-6 h-6 text-blue-600" />
              <div>
                <p className="text-sm font-medium text-blue-900">
                  For the best experience on iOS
                </p>
                <p className="text-xs text-blue-700">
                  Install this app to enable notifications and app badges
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            {steps.map((step, index) => (
              <div
                key={index}
                className={`p-4 rounded-lg border-2 transition-all ${
                  index === currentStep
                    ? 'border-blue-500 bg-blue-50'
                    : index < currentStep
                    ? 'border-green-500 bg-green-50'
                    : 'border-gray-200 bg-gray-50'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0">
                    {step.icon}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 mb-1">
                      {index + 1}. {step.title}
                    </h3>
                    <p className="text-sm text-gray-600 mb-2">
                      {step.description}
                    </p>
                    <p className="text-xs text-gray-500">
                      {step.detail}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 flex gap-3">
            {currentStep > 0 && (
              <button
                onClick={() => setCurrentStep(currentStep - 1)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Previous
              </button>
            )}
            {currentStep < steps.length - 1 ? (
              <button
                onClick={() => setCurrentStep(currentStep + 1)}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Next
              </button>
            ) : (
              <button
                onClick={onClose}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                Got it!
              </button>
            )}
          </div>

          <div className="mt-4 p-3 bg-yellow-50 rounded-lg">
            <p className="text-xs text-yellow-800">
              <strong>Note:</strong> After installation, you can access the app from your home screen. 
              Notifications and app badges will work properly once installed.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default IOSPWAGuide;