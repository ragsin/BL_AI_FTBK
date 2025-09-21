
import React, { useState, useLayoutEffect, useRef, useEffect } from 'react';
import { useTour } from '../contexts/TourContext';
import { XIcon } from './icons/Icons';

const Tour: React.FC = () => {
    const { isOpen, steps, currentStepIndex, stopTour, nextStep, prevStep } = useTour();
    const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
    const [tooltipPosition, setTooltipPosition] = useState<{top: number, left: number, visibility: 'visible' | 'hidden' | 'collapse' | undefined}>({ top: 0, left: 0, visibility: 'hidden' });
    const tooltipRef = useRef<HTMLDivElement>(null);

    const currentStep = steps[currentStepIndex];

    // Effect to find the target element and get its dimensions
    useLayoutEffect(() => {
        if (isOpen && currentStep) {
            const targetElement = document.querySelector(currentStep.selector);
            if (targetElement) {
                targetElement.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
                // Use a timeout to wait for scrolling to finish before getting the rect.
                const timeoutId = setTimeout(() => {
                    const rect = targetElement.getBoundingClientRect();
                    setTargetRect(rect);
                }, 300); // 300ms for smooth scroll
                return () => clearTimeout(timeoutId);
            } else {
                console.warn(`Tour target not found: ${currentStep.selector}`);
                nextStep(); // Skip to next step if target not found
            }
        } else {
            setTargetRect(null);
        }
    }, [isOpen, currentStep, nextStep]);

    // Effect to calculate tooltip position once we have the target and the tooltip element
    useLayoutEffect(() => {
        if (targetRect && tooltipRef.current) {
            const tooltipEl = tooltipRef.current;
            const margin = 10;
            
            // Default position: bottom
            let top = targetRect.bottom + margin;
            let left = targetRect.left;

            // Check if it fits below
            if (top + tooltipEl.offsetHeight > window.innerHeight) {
                // If not, try above
                top = targetRect.top - tooltipEl.offsetHeight - margin;
            }
            
            // Check horizontal fit
            if (left + tooltipEl.offsetWidth > window.innerWidth) {
                left = window.innerWidth - tooltipEl.offsetWidth - margin;
            }
            if (left < 0) {
                left = margin;
            }

            // Ensure it's not off-screen at the top after adjustment
            if (top < 0) {
                top = margin;
            }

            setTooltipPosition({ top, left, visibility: 'visible' });
        } else {
            setTooltipPosition(pos => ({ ...pos, visibility: 'hidden' }));
        }
    }, [targetRect]);
    
    // Effect for keyboard controls
    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (!isOpen) return;

            if (event.key === 'Escape') {
                stopTour();
            } else if (event.key === 'ArrowRight') {
                nextStep();
            } else if (event.key === 'ArrowLeft') {
                prevStep();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, stopTour, nextStep, prevStep]);


    if (!isOpen || !currentStep) {
        return null;
    }
    
    const highlightStyle: React.CSSProperties = targetRect ? {
        position: 'fixed',
        top: targetRect.top - 4,
        left: targetRect.left - 4,
        width: targetRect.width + 8,
        height: targetRect.height + 8,
        boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.5)',
        borderRadius: '8px',
        zIndex: 9998,
        transition: 'all 0.3s ease-in-out',
        pointerEvents: 'none',
    } : { display: 'none' };
    
    const tooltipStyle: React.CSSProperties = {
        position: 'fixed',
        top: `${tooltipPosition.top}px`,
        left: `${tooltipPosition.left}px`,
        visibility: tooltipPosition.visibility,
        transition: 'top 0.3s, left 0.3s',
        zIndex: 9999,
    };
    
    return (
        <div className="fixed inset-0 z-[9999]">
            <div style={highlightStyle} />
            <div ref={tooltipRef} style={tooltipStyle} className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl p-4 w-72">
                <div className="flex justify-between items-start mb-2">
                    <h3 className="font-bold text-lg text-gray-900 dark:text-white">{currentStep.title}</h3>
                    <button onClick={stopTour} className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600">
                        <XIcon className="h-5 w-5 text-gray-600 dark:text-gray-300" />
                    </button>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">{currentStep.content}</p>
                <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-500">{currentStepIndex + 1} / {steps.length}</span>
                    <div>
                        {currentStepIndex > 0 && (
                            <button onClick={prevStep} className="px-3 py-1 mr-2 text-sm font-medium text-gray-700 bg-white dark:bg-gray-600 dark:text-gray-200 border border-gray-300 dark:border-gray-500 rounded-md shadow-sm hover:bg-gray-50 dark:hover:bg-gray-500">
                                Prev
                            </button>
                        )}
                        <button onClick={nextStep} className="px-3 py-1 text-sm font-medium text-white bg-primary-600 border border-transparent rounded-md shadow-sm hover:bg-primary-700">
                            {currentStepIndex === steps.length - 1 ? 'Finish' : 'Next'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Tour;
