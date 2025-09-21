import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { UserCircleIcon, XIcon } from './icons/Icons';
import { Role } from '../types';

const ImpersonationBanner: React.FC = () => {
    const { user, originalUser, stopImpersonating } = useAuth();

    if (!originalUser) {
        return null;
    }
    
    const isParent = originalUser.role === Role.PARENT;
    const bannerClass = isParent
        ? "bg-sky-500 dark:bg-sky-600 text-white"
        : "bg-yellow-400 dark:bg-yellow-600 text-black dark:text-white";
    const returnText = isParent ? "Return to Parent View" : "Return to Admin View";

    return (
        <div className={`${bannerClass} p-2 flex items-center justify-center text-sm font-semibold z-50`}>
            <UserCircleIcon className="h-5 w-5 mr-2" />
            <span>
                You are currently viewing as <span className="font-bold">{user?.firstName} {user?.lastName}</span>.
            </span>
            <button
                onClick={stopImpersonating}
                className="ml-4 font-bold underline hover:opacity-80"
            >
                {returnText}
            </button>
        </div>
    );
};

export default ImpersonationBanner;