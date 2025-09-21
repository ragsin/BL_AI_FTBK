import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Role, User, UserStatus } from '../types';
import { BeakerIcon } from '../components/icons/Icons';
import ForgotPasswordModal from '../components/ForgotPasswordModal';
import { getUsers } from '../api/userApi';
import { useSettings } from '../contexts/SettingsContext';
import { usePageTitle } from '../hooks/usePageTitle';

const LoginPage: React.FC = () => {
  const [emailOrUsername, setEmailOrUsername] = useState('admin');
  const [password, setPassword] = useState('password');
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isForgotModalOpen, setIsForgotModalOpen] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();
  const { settings } = useSettings();
  usePageTitle(); // Set the document title

  const [activeUsers, setActiveUsers] = useState<User[]>([]);

  useEffect(() => {
    const fetchUsers = async () => {
        const allUsers = await getUsers();
        setActiveUsers(allUsers.filter(user => user.status === UserStatus.ACTIVE));
    };
    fetchUsers();
  }, []);
  

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    
    try {
        const loggedInUser = await login(emailOrUsername, password);

        if (loggedInUser) {
            switch(loggedInUser.role) {
                case Role.TEACHER:
                    navigate('/teacher/dashboard', { replace: true });
                    break;
                case Role.PARENT:
                    navigate('/parent/dashboard', { replace: true });
                    break;
                case Role.STUDENT:
                    navigate('/student/dashboard', { replace: true });
                    break;
                default:
                    navigate('/admin/dashboard', { replace: true });
                    break;
            }
        }
    } catch (err: any) {
        setError(err.message || 'An unexpected error occurred.');
    } finally {
        setIsLoading(false);
    }
  };

  return (
    <>
      <div className="min-h-screen bg-white dark:bg-gray-900 lg:grid lg:grid-cols-12">
        <aside className="relative hidden h-full bg-gray-900 lg:col-span-5 lg:block">
            <div className="absolute inset-0 w-full h-full overflow-hidden">
                <div className="absolute top-1/4 left-1/4 w-32 h-32 bg-primary-700 rounded-full mix-blend-lighten filter blur-xl opacity-70 animate-float"></div>
                <div className="absolute bottom-1/4 right-1/4 w-48 h-48 bg-primary-500 rounded-full mix-blend-lighten filter blur-2xl opacity-70 animate-float-reverse" style={{ animationDelay: '2s' }}></div>
                <div className="absolute bottom-1/2 right-1/3 w-24 h-24 bg-primary-900 rounded-lg mix-blend-lighten filter blur-xl opacity-70 animate-float" style={{ animationDelay: '4s' }}></div>
            </div>
          <div className="relative flex flex-col items-center justify-center h-full px-8 text-center">
            <div className="animate-fade-in-up">
                {settings.companyLogoUrl ? (
                    <img src={settings.companyLogoUrl} alt={`${settings.companyName} Logo`} className="h-12 w-auto max-h-12 mx-auto" />
                ) : (
                    <BeakerIcon className="h-16 w-16 text-white mx-auto" />
                )}
              <h1 className="mt-6 text-4xl font-bold tracking-tight text-white sm:text-5xl">
                Welcome to {settings.companyName}
              </h1>
              <p className="mt-4 text-lg leading-8 text-gray-300">
                The future of personalized learning, powered by innovation.
              </p>
            </div>
          </div>
        </aside>

        <main className="flex items-center justify-center px-8 py-8 sm:px-12 lg:col-span-7 lg:px-16 lg:py-12 xl:col-span-7">
          <div className="w-full max-w-xl lg:max-w-md">
            <div className="relative block lg:hidden animate-fade-in-up">
                <div className="flex items-center justify-center space-x-2 mb-8">
                    {settings.companyLogoUrl ? (
                        <img src={settings.companyLogoUrl} alt={`${settings.companyName} Logo`} className="h-8 w-auto max-h-8" />
                    ) : (
                        <BeakerIcon className="h-8 w-8 text-primary-500" />
                    )}
                    <span className="text-2xl font-bold text-gray-800 dark:text-white">{settings.companyName}</span>
                </div>
            </div>

            <h2 style={{ animationDelay: '0.1s' }} className="animate-fade-in-up mt-6 text-2xl font-bold text-gray-900 dark:text-white sm:text-3xl md:text-4xl">
              Sign in to your account
            </h2>

            <form className="mt-8 space-y-6" onSubmit={handleLogin}>
              <div className="space-y-4">
                <div style={{ animationDelay: '0.2s' }} className="animate-fade-in-up">
                  <label htmlFor="email-address" className="sr-only">Email or Username</label>
                  <input
                    id="email-address"
                    name="email"
                    type="text"
                    autoComplete="email"
                    required
                    className="relative block w-full px-4 py-3 text-gray-900 bg-white dark:bg-gray-800 dark:text-white placeholder-gray-500 border-2 border-gray-200 dark:border-gray-700 rounded-lg appearance-none focus:outline-none focus:ring-primary-500 focus:border-primary-500 focus:z-10 sm:text-sm"
                    placeholder="Email or Username"
                    value={emailOrUsername}
                    onChange={(e) => setEmailOrUsername(e.target.value)}
                  />
                </div>
                <div style={{ animationDelay: '0.3s' }} className="animate-fade-in-up">
                  <label htmlFor="password-for-login" className="sr-only">Password</label>
                  <input
                    id="password-for-login"
                    name="password"
                    type="password"
                    autoComplete="current-password"
                    required
                    className="relative block w-full px-4 py-3 text-gray-900 bg-white dark:bg-gray-800 dark:text-white placeholder-gray-500 border-2 border-gray-200 dark:border-gray-700 rounded-lg appearance-none focus:outline-none focus:ring-primary-500 focus:border-primary-500 focus:z-10 sm:text-sm"
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
              </div>
    
              <div style={{ animationDelay: '0.4s' }} className="animate-fade-in-up flex items-center justify-end">
                <div className="text-sm">
                  <button
                    type="button"
                    onClick={() => setIsForgotModalOpen(true)}
                    className="font-medium text-primary-600 hover:text-primary-500"
                  >
                    Forgot your password?
                  </button>
                </div>
              </div>

                <div style={{ animationDelay: '0.45s' }} className="animate-fade-in-up">
                    <div className="flex items-center">
                        <input
                            id="agree"
                            name="agree"
                            type="checkbox"
                            checked={agreed}
                            onChange={(e) => setAgreed(e.target.checked)}
                            className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 dark:border-gray-600 rounded"
                        />
                        <label htmlFor="agree" className="ml-2 block text-sm text-gray-900 dark:text-gray-300">
                            I agree to the <Link to="/terms" target="_blank" className="font-medium text-primary-600 hover:underline">Terms of Service</Link> and <Link to="/privacy" target="_blank" className="font-medium text-primary-600 hover:underline">Privacy Policy</Link>.
                        </label>
                    </div>
                </div>
              
              {error && <p className="text-sm text-red-500 text-center animate-fade-in-up" style={{ animationDelay: '0.45s' }}>{error}</p>}
    
              <div style={{ animationDelay: '0.5s' }} className="animate-fade-in-up">
                <button
                  type="submit"
                  disabled={!agreed || isLoading}
                  className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-transform transform hover:scale-105 disabled:bg-primary-400 dark:disabled:bg-primary-800 disabled:cursor-not-allowed disabled:scale-100"
                >
                  {isLoading ? 'Signing in...' : 'Sign in'}
                </button>
              </div>
            </form>

             <div style={{ animationDelay: '0.6s' }} className="animate-fade-in-up mt-8">
                <h3 className="text-center text-md font-semibold text-gray-700 dark:text-gray-300 mb-4">
                  Active User Logins for Demo
                </h3>
                <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400 max-h-48 overflow-y-auto pr-2">
                  {activeUsers.map(user => (
                    <li key={user.id} className="flex justify-between p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer" onClick={() => setEmailOrUsername(user.username)}>
                      <span>{user.username} ({user.email})</span>
                      <span className="font-semibold text-gray-500 dark:text-gray-300">{user.role}</span>
                    </li>
                  ))}
                </ul>
              </div>

          </div>
        </main>
      </div>
      <ForgotPasswordModal
          isOpen={isForgotModalOpen}
          onClose={() => setIsForgotModalOpen(false)}
      />
    </>
  );
};

export default LoginPage;
