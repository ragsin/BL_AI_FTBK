import { useState, useEffect } from 'react';
import { useLocation, matchPath, useParams } from 'react-router-dom';
import { useSettings } from '../contexts/SettingsContext';
import { getUsers } from '../api/userApi';
import { getPrograms } from '../api/programApi';

const routeTitles: { path: string; title: string }[] = [
    // Admin
    { path: '/admin/dashboard', title: 'Dashboard' },
    { path: '/admin/users', title: 'User Management' },
    { path: '/admin/users/:userId', title: 'User Profile' },
    { path: '/admin/programs', title: 'Programs' },
    { path: '/admin/programs/:programId', title: 'Program Details' },
    { path: '/admin/programs/:programId/curriculum', title: 'Curriculum Builder' },
    { path: '/admin/enrollments', title: 'Enrollments' },
    { path: '/admin/schedule', title: 'Master Schedule' },
    { path: '/admin/assets', title: 'Asset Management' },
    { path: '/admin/assets/reports', title: 'Asset Reports' },
    { path: '/admin/reports', title: 'Reports Center' },
    { path: '/admin/revenue', title: 'Revenue Management' },
    { path: '/admin/settings', title: 'Settings' },
    { path: '/admin/profile', title: 'My Profile' },
    { path: '/admin/communication', title: 'Communications Hub'},
    { path: '/admin/audit-log', title: 'Audit Log'},

    // Teacher
    { path: '/teacher/dashboard', title: 'Dashboard' },
    { path: '/teacher/schedule', title: 'My Schedule' },
    { path: '/teacher/students', title: 'My Students' },
    { path: '/teacher/programs', title: 'Programs' },
    { path: '/teacher/programs/:programId', title: 'Program Details' },
    { path: '/teacher/assets', title: 'My Assets' },
    { path: '/teacher/availability', title: 'My Availability' },
    { path: '/teacher/messages', title: 'Messages' },
    { path: '/teacher/profile', title: 'My Profile' },

    // Parent
    { path: '/parent/dashboard', title: 'Dashboard' },
    { path: '/parent/credits', title: 'Credit History' },
    { path: '/parent/schedule', title: 'Schedule' },
    { path: '/parent/assignments', title: 'Assignments' },
    { path: '/parent/journey', title: 'Learning Journey' },
    { path: '/parent/messages', title: 'Messages' },
    { path: '/parent/profile', title: 'My Profile' },

    // Student
    { path: '/student/dashboard', title: 'Adventure Hub' },
    { path: '/student/schedule', title: 'My Schedule' },
    { path: '/student/assignments', title: 'My Quests' },
    { path: '/student/journey', title: 'Journey Map' },
    { path: '/student/messages', title: 'Messages' },
    { path: '/student/profile', title: 'My Profile' },
    { path: '/student/leaderboard', title: 'Leaderboard' },

    // Other
    { path: '/login', title: 'Login' },
    { path: '/terms', title: 'Terms of Service' },
    { path: '/privacy', title: 'Privacy Policy' },
    { path: '/', title: 'Dashboard' },
];

export const usePageTitle = (): string => {
    const { pathname } = useLocation();
    const params = useParams();
    const { settings } = useSettings();
    const companyName = settings.companyName || 'BrainLeaf Platform';

    const [pageTitle, setPageTitle] = useState('Loading...');

    useEffect(() => {
        let isMounted = true;
        let baseTitle = 'Dashboard'; // Default

        // Find the static base title
        for (const route of routeTitles) {
            const match = matchPath({ path: route.path, end: true }, pathname);
            if (match) {
                baseTitle = route.title;
                break;
            }
        }

        const fetchDynamicName = async () => {
            if (params.userId) {
                const users = await getUsers();
                const user = users.find(u => u.id === params.userId);
                if (isMounted) {
                    setPageTitle(user ? `${user.firstName} ${user.lastName}` : baseTitle);
                }
            } else if (params.programId) {
                const programs = await getPrograms();
                const program = programs.find(p => p.id === params.programId);
                if (isMounted) {
                    if (program) {
                        setPageTitle(baseTitle === 'Curriculum Builder' ? `Curriculum: ${program.title}` : program.title);
                    } else {
                        setPageTitle(baseTitle);
                    }
                }
            } else {
                if (isMounted) {
                    setPageTitle(baseTitle);
                }
            }
        };

        fetchDynamicName();
        
        return () => {
            isMounted = false;
        };

    }, [pathname, params]);

    useEffect(() => {
        document.title = `${pageTitle} | ${companyName}`;
    }, [pageTitle, companyName]);

    return pageTitle;
};
