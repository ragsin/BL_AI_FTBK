import React, { createContext, useState, useEffect, useContext, ReactNode, useCallback } from 'react';
import { changelogData, CURRENT_VERSION } from '../data/changelog';

const LAST_SEEN_VERSION_KEY = 'brainleaf_lastSeenVersion';

interface ChangelogContextType {
  isChangelogOpen: boolean;
  openChangelog: () => void;
  closeChangelog: () => void;
  hasNewUpdate: boolean;
}

const ChangelogContext = createContext<ChangelogContextType | undefined>(undefined);

export const ChangelogProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isChangelogOpen, setIsChangelogOpen] = useState(false);
  const [hasNewUpdate, setHasNewUpdate] = useState(false);

  useEffect(() => {
    const lastSeenVersion = localStorage.getItem(LAST_SEEN_VERSION_KEY);
    
    if (lastSeenVersion !== CURRENT_VERSION) {
      setHasNewUpdate(true);
      // Automatically open the modal for first-time visitors or on new updates
      if (lastSeenVersion !== null) { // Only auto-open if it's an update, not first visit
        setIsChangelogOpen(true);
      }
    }
  }, []);

  const markAsSeen = useCallback(() => {
    localStorage.setItem(LAST_SEEN_VERSION_KEY, CURRENT_VERSION);
    setHasNewUpdate(false);
  }, []);

  const openChangelog = useCallback(() => {
    setIsChangelogOpen(true);
  }, []);

  const closeChangelog = useCallback(() => {
    setIsChangelogOpen(false);
    markAsSeen();
  }, [markAsSeen]);

  const value = {
    isChangelogOpen,
    openChangelog,
    closeChangelog,
    hasNewUpdate,
  };

  return <ChangelogContext.Provider value={value}>{children}</ChangelogContext.Provider>;
};

export const useChangelog = (): ChangelogContextType => {
  const context = useContext(ChangelogContext);
  if (context === undefined) {
    throw new Error('useChangelog must be used within a ChangelogProvider');
  }
  return context;
};