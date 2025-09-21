import React, { createContext, useState, useContext, ReactNode, useCallback } from 'react';
import { TourStep } from '../types';

interface TourContextType {
  startTour: (steps: TourStep[]) => void;
  stopTour: () => void;
  nextStep: () => void;
  prevStep: () => void;
  isOpen: boolean;
  steps: TourStep[];
  currentStepIndex: number;
}

const TourContext = createContext<TourContextType | undefined>(undefined);

export const TourProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [steps, setSteps] = useState<TourStep[]>([]);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  const startTour = useCallback((tourSteps: TourStep[]) => {
    if (tourSteps.length > 0) {
      setSteps(tourSteps);
      setCurrentStepIndex(0);
      setIsOpen(true);
    }
  }, []);

  const stopTour = useCallback(() => {
    setIsOpen(false);
    setSteps([]);
    setCurrentStepIndex(0);
  }, []);

  const nextStep = useCallback(() => {
    if (currentStepIndex < steps.length - 1) {
      setCurrentStepIndex(prev => prev + 1);
    } else {
      stopTour();
    }
  }, [currentStepIndex, steps.length, stopTour]);

  const prevStep = useCallback(() => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(prev => prev - 1);
    }
  }, [currentStepIndex]);

  const value = {
    startTour,
    stopTour,
    nextStep,
    prevStep,
    isOpen,
    steps,
    currentStepIndex,
  };

  return <TourContext.Provider value={value}>{children}</TourContext.Provider>;
};

export const useTour = (): TourContextType => {
  const context = useContext(TourContext);
  if (context === undefined) {
    throw new Error('useTour must be used within a TourProvider');
  }
  return context;
};
