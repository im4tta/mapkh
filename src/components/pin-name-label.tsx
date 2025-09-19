"use client";

import React from 'react';
import type { Report } from '@/lib/types';

interface PinNameLabelProps {
    report: Report;
    zoomLevel: number;
    minZoomLevel?: number;
}

export const PinNameLabel: React.FC<PinNameLabelProps> = ({ 
    report, 
    zoomLevel, 
    minZoomLevel = 12 
}) => {
    // Always render at zoom 12+ for better visibility
    if (zoomLevel < minZoomLevel) {
        return null;
    }

    // Get the best available name with priority order
    const getName = (): string => {
        if (report.englishLanguage?.trim()) {
            return report.englishLanguage.trim();
        }
        if (report.thaiLanguage?.trim()) {
            return report.thaiLanguage.trim();
        }
        if (report.nativeKhmerLanguage?.trim()) {
            return report.nativeKhmerLanguage.trim();
        }
        return `Report #${report.reportNumber}`;
    };

    const displayName = getName();

    return (
        <div 
            className="absolute pointer-events-none z-20"
            style={{
                top: '100%',
                left: '50%',
                transform: 'translateX(-50%)',
                marginTop: '6px',
            }}
        >
            <div
                className="px-3 py-2 text-xs font-bold text-gray-900 bg-white/95 rounded-lg border-2 border-gray-300 shadow-lg backdrop-blur-sm"
                style={{
                    whiteSpace: 'nowrap',
                    maxWidth: '180px',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    textShadow: '0 1px 2px rgba(255, 255, 255, 0.9)',
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.25), 0 2px 4px rgba(0, 0, 0, 0.1)',
                }}
            >
                {displayName}
            </div>
        </div>
    );
};

export default PinNameLabel;