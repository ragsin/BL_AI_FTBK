

import React from 'react';
import { Outlet } from 'react-router-dom';
import TeacherSidebar from '../components/TeacherSidebar';
import Header from '../components/Header';
import ImpersonationBanner from '../components/ImpersonationBanner';
import { SidebarProvider, useSidebar } from '../contexts/SidebarContext';
import Breadcrumbs from '../components/Breadcrumbs';

const TeacherLayoutContent: React.FC = () => {
    const { isSidebarOpen, closeSidebar } = useSidebar();
    return (
        <div className="relative flex h-screen bg-slate-100 dark:bg-slate-900 text-gray-800 dark:text-gray-200 overflow-hidden">
            <TeacherSidebar />
            <div className="flex-1 flex flex-col overflow-hidden">
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

const TeacherLayout: React.FC = () => {
  return (
    <SidebarProvider>
        <TeacherLayoutContent />
    </SidebarProvider>
  );
};

export default TeacherLayout;