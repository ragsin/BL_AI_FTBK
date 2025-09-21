import React, { createContext, useState, useEffect, useContext, ReactNode } from 'react';
import { PlatformSettings } from '../types';
import { API_BASE_URL } from '../config';
import { getAuthHeaders, handleResponse } from '../api/utils';

// --- Default Settings (as a fallback) ---
export const initialSettings: PlatformSettings = {
    companyName: 'BrainLeaf',
    companyLogoUrl: '',
    mascotImageUrl: 'https://i.imgur.com/3_THEME/mascot.png',
    mascotEnabled: true,
    companyEmail: 'contact@brainleaf.com',
    companyPhoneNumbers: [{ id: 'phone-1', code: '+1', number: '555-123-4567' }],
    primaryColor: '#10b981',
    primaryCurrency: 'INR',
    programCategories: [
        { id: 'cat-math', name: 'Math' },
        { id: 'cat-chess', name: 'Chess' },
        { id: 'cat-phonics', name: 'Phonics' },
    ],
    assetTypes: [
        { id: 'at-1', name: 'Meeting Account' },
        { id: 'at-2', name: 'Shared Link' },
        { id: 'at-3', name: 'Software License' },
        { id: 'at-4', name: 'Notes' },
    ],
    messageTemplates: [],
    parentLowCreditAlerts: { enabled: true, threshold: 5, },
    salesLowCreditAlerts: { enabled: true, threshold: 10, },
    sessionJoinWindow: { joinBufferMinutesBefore: 15, joinBufferMinutesAfter: 10, },
    aiProvider: { enabled: false, provider: 'gemini', model: 'gemini-2.5-flash', },
    aiBriefing: { enabled: false, autoRefreshHours: 0, dailyUpdateTime: '', },
    studentAtRisk: { enabled: true, missedSessions: { count: 2, periodDays: 30, }, },
    aiChat: { enabled: false, },
};

// --- Context Definition ---
interface SettingsContextType {
  settings: PlatformSettings;
  updateSettings: (newSettings: PlatformSettings) => void;
  formatCurrency: (value: number, fractionDigits?: number) => string;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

// --- Helper Functions for Theming ---
function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? { r: parseInt(result[1], 16), g: parseInt(result[2], 16), b: parseInt(result[3], 16) } : null;
}

function generatePalette(baseHex: string) {
    const baseRgb = hexToRgb(baseHex);
    if (!baseRgb) return {};
    const lighten = (rgb, factor) => ({ r: Math.round(rgb.r + (255 - rgb.r) * factor), g: Math.round(rgb.g + (255 - rgb.g) * factor), b: Math.round(rgb.b + (255 - rgb.b) * factor) });
    const darken = (rgb, factor) => ({ r: Math.round(rgb.r * (1 - factor)), g: Math.round(rgb.g * (1 - factor)), b: Math.round(rgb.b * (1 - factor)) });
    return { '50': lighten(baseRgb, 0.95), '100': lighten(baseRgb, 0.9), '200': lighten(baseRgb, 0.75), '300': lighten(baseRgb, 0.6), '400': lighten(baseRgb, 0.3), '500': baseRgb, '600': darken(baseRgb, 0.1), '700': darken(baseRgb, 0.2), '800': darken(baseRgb, 0.4), '900': darken(baseRgb, 0.6), '950': darken(baseRgb, 0.8) };
}

// --- Provider Component ---
export const SettingsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [settings, setSettings] = useState<PlatformSettings>(initialSettings);
    
    useEffect(() => {
        const fetchSettings = async () => {
            try {
                // Settings don't require auth to load the login page theme correctly
                const response = await fetch(`${API_BASE_URL}/settings`);
                if (response.ok) {
                    const fetchedSettings = await response.json();
                    setSettings(fetchedSettings);
                }
            } catch (error) {
                console.error("Failed to fetch settings from backend, using defaults.", error);
            }
        };
        fetchSettings();
    }, []);
    
    useEffect(() => {
        if (!settings.primaryColor) return;
        const root = document.documentElement;
        const palette = generatePalette(settings.primaryColor);
        for (const [shade, rgb] of Object.entries(palette)) {
            if (rgb) root.style.setProperty(`--color-primary-${shade}`, `${rgb.r} ${rgb.g} ${rgb.b}`);
        }
    }, [settings.primaryColor]);

    const updateSettings = async (newSettings: PlatformSettings) => {
        try {
            const response = await fetch(`${API_BASE_URL}/settings`, {
                method: 'POST',
                headers: getAuthHeaders(),
                body: JSON.stringify(newSettings),
            });
            const savedSettings = await handleResponse<PlatformSettings>(response);
            setSettings(savedSettings);
        } catch (error) {
            console.error("Failed to save settings to backend", error);
        }
    };

    const formatCurrency = (value: number, fractionDigits = 2) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: settings.primaryCurrency || 'USD',
            minimumFractionDigits: fractionDigits,
            maximumFractionDigits: fractionDigits,
        }).format(value);
    };

    return (
        <SettingsContext.Provider value={{ settings, updateSettings, formatCurrency }}>
            {children}
        </SettingsContext.Provider>
    );
};

// --- Custom Hook ---
export const useSettings = (): SettingsContextType => {
    const context = useContext(SettingsContext);
    if (context === undefined) {
        throw new Error('useSettings must be used within a SettingsProvider');
    }
    return context;
};
