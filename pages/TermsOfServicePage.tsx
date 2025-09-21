import React from 'react';
import { Link } from 'react-router-dom';
import { usePageTitle } from '../hooks/usePageTitle';

const TermsOfServicePage: React.FC = () => {
    usePageTitle(); // Set the document title

    return (
        <div className="min-h-screen bg-gray-100 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto bg-white dark:bg-gray-800 p-8 rounded-lg shadow-md">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">Terms of Service</h1>
                <div className="prose dark:prose-invert max-w-none text-gray-600 dark:text-gray-300 space-y-4">
                    <p>Last updated: {new Date().toLocaleDateString()}</p>
                    
                    <h2 className="text-xl font-semibold">1. Introduction</h2>
                    <p>
                        Welcome to BrainLeaf! These Terms of Service ("Terms") govern your use of our platform and services. By accessing or using our service, you agree to be bound by these Terms.
                    </p>

                    <h2 className="text-xl font-semibold">2. Use of Our Service</h2>
                    <p>
                        You must be of the required legal age to use our services. You agree not to misuse the services or help anyone else to do so. You are responsible for any activity that occurs through your account.
                    </p>

                    <h2 className="text-xl font-semibold">3. Content</h2>
                    <p>
                        Our service allows you to post, link, store, share and otherwise make available certain information, text, graphics, videos, or other material ("Content"). You are responsible for the Content that you post on or through the service.
                    </p>
                    
                    <h2 className="text-xl font-semibold">4. Placeholder Content</h2>
                    <p>
                        This is a placeholder document. The content provided here is for demonstration purposes only and does not constitute a legal agreement. You must consult with a legal professional to draft your actual Terms of Service.
                    </p>

                    <h2 className="text-xl font-semibold">5. Changes to Terms</h2>
                    <p>
                        We reserve the right, at our sole discretion, to modify or replace these Terms at any time. We will provide notice of any changes by posting the new Terms on this page.
                    </p>
                    
                    <h2 className="text-xl font-semibold">6. Contact Us</h2>
                    <p>
                        If you have any questions about these Terms, please contact us.
                    </p>
                </div>
                 <div className="mt-8 text-center">
                    <Link to="/login" className="text-primary-600 dark:text-primary-400 hover:underline">
                        Back to Login
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default TermsOfServicePage;
