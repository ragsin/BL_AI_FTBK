import React, { createContext, useState, useContext, ReactNode, useMemo, useEffect } from 'react';
import { User } from '../types';
import { useAuth } from './AuthContext';

interface ParentPortalContextType {
  children: User[];
  selectedChild: User | null;
  selectedChildId: string;
  setSelectedChildId: (id: string) => void;
}

const ParentPortalContext = createContext<ParentPortalContextType | undefined>(undefined);

export const ParentPortalProvider: React.FC<{ children: ReactNode }> = ({ children: providerChildren }) => {
  const { user: parent, findUserById } = useAuth();
  
  // FIX: Use state and effect to handle async fetching of child user objects
  const [parentChildren, setParentChildren] = useState<User[]>([]);

  useEffect(() => {
    let isMounted = true;
    if (parent?.childrenIds && parent.childrenIds.length > 0) {
      Promise.all(parent.childrenIds.map(id => findUserById(id)))
        .then(resolvedUsers => {
          if (isMounted) {
            setParentChildren(resolvedUsers.filter((u): u is User => !!u));
          }
        });
    } else {
        setParentChildren([]);
    }
    return () => { isMounted = false; };
  }, [parent, findUserById]);

  // Initialize from sessionStorage or default to first child
  const [selectedChildId, setSelectedChildId] = useState<string>(() => {
    const savedChildId = sessionStorage.getItem('selectedChildId');
    if (savedChildId && parentChildren.some(c => c.id === savedChildId)) {
      return savedChildId;
    }
    return parentChildren.length > 0 ? parentChildren[0].id : '';
  });

  // Effect to save to sessionStorage
  useEffect(() => {
    if (selectedChildId) {
      sessionStorage.setItem('selectedChildId', selectedChildId);
    } else {
      sessionStorage.removeItem('selectedChildId');
    }
  }, [selectedChildId]);

  // Ensure selectedChildId is valid if children list changes
  useEffect(() => {
    if (parentChildren.length > 0 && !parentChildren.some(c => c.id === selectedChildId)) {
      setSelectedChildId(parentChildren[0].id);
    } else if (parentChildren.length === 0) {
      setSelectedChildId('');
    }
  }, [parentChildren, selectedChildId]);
  
  const selectedChild = useMemo(() => parentChildren.find(c => c.id === selectedChildId) || null, [selectedChildId, parentChildren]);

  const value = {
    children: parentChildren,
    selectedChild,
    selectedChildId,
    setSelectedChildId,
  };

  return (
    <ParentPortalContext.Provider value={value}>
      {providerChildren}
    </ParentPortalContext.Provider>
  );
};

export const useParentPortal = (): ParentPortalContextType => {
  const context = useContext(ParentPortalContext);
  if (context === undefined) {
    throw new Error('useParentPortal must be used within a ParentPortalProvider');
  }
  return context;
};
