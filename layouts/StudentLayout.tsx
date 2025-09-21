

import React, { useEffect, useRef } from 'react';
import { Outlet } from 'react-router-dom';
import StudentSidebar from '../components/StudentSidebar';
import Header from '../components/Header';
import ImpersonationBanner from '../components/ImpersonationBanner';
import { SidebarProvider, useSidebar } from '../contexts/SidebarContext';
import { useTheme } from '../contexts/ThemeContext';
import Breadcrumbs from '../components/Breadcrumbs';

const ParallaxBackground: React.FC = () => {
    const { theme } = useTheme();
    const bgRef = useRef<HTMLDivElement>(null);
    const layer1Ref = useRef<HTMLDivElement>(null);
    const layer2Ref = useRef<HTMLDivElement>(null);
    const layer3Ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            const { clientX, clientY } = e;
            const { innerWidth, innerHeight } = window;
            const moveX = (clientX / innerWidth - 0.5) * 40;
            const moveY = (clientY / innerHeight - 0.5) * 40;

            if (layer1Ref.current) layer1Ref.current.style.transform = `translate(${-moveX * 0.2}px, ${-moveY * 0.2}px)`;
            if (layer2Ref.current) layer2Ref.current.style.transform = `translate(${-moveX * 0.5}px, ${-moveY * 0.5}px)`;
            if (layer3Ref.current) layer3Ref.current.style.transform = `translate(${-moveX}px, ${-moveY}px)`;
        };

        window.addEventListener('mousemove', handleMouseMove);
        return () => window.removeEventListener('mousemove', handleMouseMove);
    }, []);
    
    const lightImages = {
        bg: 'https://i.imgur.com/3_THEME/sky_light.png',
        layer1: 'https://i.imgur.com/3_THEME/hills_far_light.png',
        layer2: 'https://i.imgur.com/3_THEME/hills_near_light.png',
        layer3: 'https://i.imgur.com/3_THEME/trees_light.png',
    };
    
    const darkImages = {
        bg: 'https://i.imgur.com/3_THEME/sky_dark.png',
        layer1: 'https://i.imgur.com/3_THEME/hills_far_dark.png',
        layer2: 'https://i.imgur.com/3_THEME/hills_near_dark.png',
        layer3: 'https://i.imgur.com/3_THEME/trees_dark.png',
    };

    const images = theme === 'dark' ? darkImages : lightImages;

    return (
        <div ref={bgRef} className="parallax-bg" style={{ backgroundImage: `url(${images.bg})` }}>
            <div ref={layer1Ref} style={{ backgroundImage: `url(${images.layer1})` }}></div>
            <div ref={layer2Ref} style={{ backgroundImage: `url(${images.layer2})` }}></div>
            <div ref={layer3Ref} style={{ backgroundImage: `url(${images.layer3})` }}></div>
        </div>
    );
};


const StudentLayoutContent: React.FC = () => {
    const { isSidebarOpen, closeSidebar } = useSidebar();

    return (
        <div className="student-portal relative flex h-screen text-slate-900 dark:text-slate-200 overflow-hidden">
            <ParallaxBackground />
            <StudentSidebar />
            <div className="flex-1 flex flex-col overflow-hidden z-10">
                <ImpersonationBanner />
                <Header />
                <main className="flex-1 overflow-x-hidden overflow-y-auto bg-transparent p-4 sm:p-6 md:p-8">
                    <Breadcrumbs />
                    <Outlet />
                </main>
            </div>
            {isSidebarOpen && (
                <div 
                    onClick={closeSidebar} 
                    className="fixed inset-0 bg-black bg-opacity-50 z-20 md:hidden"
                    aria-hidden="true"
                />
            )}
        </div>
    )
}

const StudentLayout: React.FC = () => {
  return (
    <SidebarProvider>
        <StudentLayoutContent />
    </SidebarProvider>
  );
};

export default StudentLayout;