import React, { useEffect, useState } from 'react';
import { useLocation, Link, useParams } from 'react-router-dom';
import { getUsers } from '../api/userApi';
import { getPrograms } from '../api/programApi';
import { HomeIcon, ChevronRightIcon } from './icons/Icons';

const breadcrumbNameMap: { [key: string]: string } = {
  admin: 'Admin',
  dashboard: 'Dashboard',
  users: 'Users',
  programs: 'Programs',
  enrollments: 'Enrollments',
  schedule: 'Schedule',
  communication: 'Communications',
  assets: 'Assets',
  reports: 'Reports',
  revenue: 'Revenue',
  settings: 'Settings',
  'audit-log': 'Audit Log',
  profile: 'My Profile',
  curriculum: 'Curriculum',
  teacher: 'Teacher',
  students: 'My Students',
  grading: 'Grading Queue',
  'at-risk': 'At-Risk Students',
  availability: 'My Availability',
  messages: 'Messages',
  parent: 'Parent',
  credits: 'Credits',
  assignments: 'Assignments',
  journey: 'Learning Journey',
  student: 'Student',
};

const Breadcrumbs: React.FC = () => {
    const location = useLocation();
    const params = useParams();
    const [dynamicNames, setDynamicNames] = useState<Record<string, string>>({});
    const [isLoading, setIsLoading] = useState(false);

    const pathnames = location.pathname.split('/').filter(x => x);

    useEffect(() => {
        const fetchNames = async () => {
            if (Object.keys(params).length === 0) {
                setDynamicNames({});
                return;
            }

            setIsLoading(true);
            const newNames: Record<string, string> = {};

            if (params.userId) {
                const users = await getUsers();
                const user = users.find(u => u.id === params.userId);
                if (user) newNames[params.userId] = `${user.firstName} ${user.lastName}`;
            }

            if (params.programId) {
                const programs = await getPrograms();
                const program = programs.find(p => p.id === params.programId);
                if (program) newNames[params.programId] = program.title;
            }
            
            setDynamicNames(newNames);
            setIsLoading(false);
        };
        fetchNames();
    }, [params]);

    if (pathnames.length <= 1) {
        return null; // Don't show on root portal pages like /admin/dashboard
    }

    const portalRoot = `/${pathnames[0]}`;
    const portalHome = `${portalRoot}/dashboard`;
    const portalName = breadcrumbNameMap[pathnames[0]] || 'Home';

    return (
        <nav className="flex mb-6" aria-label="Breadcrumb">
            <ol role="list" className="flex items-center space-x-2">
                <li>
                    <div>
                        <Link to={portalHome} className="text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
                            <HomeIcon className="flex-shrink-0 h-5 w-5" aria-hidden="true" />
                            <span className="sr-only">{portalName} Home</span>
                        </Link>
                    </div>
                </li>
                {pathnames.slice(1).map((value, index) => {
                    const last = index === pathnames.length - 2;
                    const to = `/${pathnames.slice(0, index + 2).join('/')}`;
                    let name = dynamicNames[value] || breadcrumbNameMap[value] || value.charAt(0).toUpperCase() + value.slice(1);
                    if (isLoading && (value === params.userId || value === params.programId)) {
                        name = '...';
                    }

                    return (
                        <li key={to}>
                            <div className="flex items-center">
                                <ChevronRightIcon className="flex-shrink-0 h-5 w-5 text-gray-400 dark:text-gray-500" aria-hidden="true" />
                                {last ? (
                                    <span className="ml-2 text-sm font-medium text-gray-800 dark:text-gray-200">
                                        {name}
                                    </span>
                                ) : (
                                    <Link
                                        to={to}
                                        className="ml-2 text-sm font-medium text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                                    >
                                        {name}
                                    </Link>
                                )}
                            </div>
                        </li>
                    );
                })}
            </ol>
        </nav>
    );
};

export default Breadcrumbs;