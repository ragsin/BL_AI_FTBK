import React from 'react';

const SkeletonRow: React.FC = () => (
    <div className="flex items-center space-x-4 p-4">
        <div className="h-10 w-10 bg-neutral-200 dark:bg-neutral-700 rounded-full animate-pulse"></div>
        <div className="flex-1 space-y-2">
            <div className="h-4 bg-neutral-200 dark:bg-neutral-700 rounded w-3/4 animate-pulse"></div>
            <div className="h-3 bg-neutral-200 dark:bg-neutral-700 rounded w-1/2 animate-pulse"></div>
        </div>
        <div className="h-6 w-24 bg-neutral-200 dark:bg-neutral-700 rounded animate-pulse"></div>
        <div className="h-6 w-20 bg-neutral-200 dark:bg-neutral-700 rounded animate-pulse hidden sm:block"></div>
    </div>
);

const ProgramCardSkeleton: React.FC = () => (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md animate-pulse border-t-4 border-gray-200 dark:border-gray-700">
        <div className="p-5 space-y-3">
            <div className="flex justify-between">
                <div className="h-5 w-20 bg-neutral-200 dark:bg-neutral-700 rounded-full"></div>
            </div>
            <div className="h-6 w-3/4 bg-neutral-200 dark:bg-neutral-700 rounded"></div>
            <div className="h-4 w-1/2 bg-neutral-200 dark:bg-neutral-700 rounded"></div>
            <div className="space-y-2 pt-2">
                <div className="h-4 bg-neutral-200 dark:bg-neutral-700 rounded"></div>
                <div className="h-4 w-5/6 bg-neutral-200 dark:bg-neutral-700 rounded"></div>
            </div>
        </div>
        <div className="border-t border-gray-200 dark:border-gray-700 p-4">
            <div className="flex justify-between">
                <div className="h-5 w-24 bg-neutral-200 dark:bg-neutral-700 rounded"></div>
                <div className="h-5 w-24 bg-neutral-200 dark:bg-neutral-700 rounded"></div>
            </div>
        </div>
    </div>
);


const DashboardSkeleton: React.FC = () => (
    <div className="space-y-8 animate-pulse">
        <div className="flex justify-between items-center">
            <div>
                <div className="h-8 w-64 bg-neutral-200 dark:bg-neutral-700 rounded"></div>
                <div className="h-4 w-96 bg-neutral-200 dark:bg-neutral-700 rounded mt-2"></div>
            </div>
            <div className="h-10 w-32 bg-neutral-200 dark:bg-neutral-700 rounded-lg"></div>
        </div>

        <div className="h-32 bg-neutral-200 dark:bg-neutral-700 rounded-2xl"></div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="h-32 bg-neutral-200 dark:bg-neutral-700 rounded-2xl"></div>
            <div className="h-32 bg-neutral-200 dark:bg-neutral-700 rounded-2xl"></div>
            <div className="h-32 bg-neutral-200 dark:bg-neutral-700 rounded-2xl"></div>
            <div className="h-32 bg-neutral-200 dark:bg-neutral-700 rounded-2xl"></div>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 h-80 bg-neutral-200 dark:bg-neutral-700 rounded-2xl"></div>
            <div className="h-80 bg-neutral-200 dark:bg-neutral-700 rounded-2xl"></div>
        </div>
    </div>
);

const SkeletonLoader: React.FC<{ type?: 'table' | 'dashboard' | 'program_grid', rows?: number }> = ({ type = 'table', rows = 5 }) => {
    if (type === 'dashboard') {
        return <DashboardSkeleton />;
    }
    
    if (type === 'program_grid') {
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 mt-6">
                {Array.from({ length: rows }).map((_, i) => <ProgramCardSkeleton key={i} />)}
            </div>
        );
    }

    // Default table loader
    return (
        <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {Array.from({ length: rows }).map((_, i) => <SkeletonRow key={i} />)}
        </div>
    );
};

export default SkeletonLoader;
