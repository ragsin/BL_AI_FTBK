import React from 'react';
import { Link } from 'react-router-dom';
import { usePageTitle } from '../hooks/usePageTitle';

const PrivacyPolicyPage: React.FC = () => {
    usePageTitle(); // Set the document title

    return (
        <div className="min-h-screen bg-gray-100 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto bg-white dark:bg-gray-800 p-8 rounded-lg shadow-md">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">Privacy Policy</h1>
                <div className="prose dark:prose-invert max-w-none text-gray-600 dark:text-gray-300 space-y-4">
                    <p>Last updated: {new Date().toLocaleDateString()}</p>
                    
                    <h2 className="text-xl font-semibold">1. Information We Collect</h2>
                    <p>
                        We collect information you provide directly to us, such as when you create an account, update your profile, and use our services. This may include your name, email address, and other personal information.
                    </p>

                    <h2 className="text-xl font-semibold">2. How We Use Your Information</h2>
                    <p>
                        We use the information we collect to provide, maintain, and improve our services, including to personalize your experience, to communicate with you, and to protect the security of our platform.
                    </p>
                    
                    <h2 className="text-xl font-semibold">3. Information Sharing</h2>
                    <p>
                        We do not share your personal information with third parties except as described in this Privacy Policy, such as with your consent or for legal reasons.
                    </p>

                    <h2 className="text-xl font-semibold">4. Placeholder Content</h2>
                    <p>
                        This is a placeholder document. The content provided here is for demonstration purposes only and is not legally binding. You must consult with a legal professional to draft your actual Privacy Policy.
                    </p>

                    <h2 className="text-xl font-semibold">5. Data Security</h2>
                    <p>
                        We take reasonable measures to help protect your information from loss, theft, misuse, and unauthorized access.
                    </p>
                    
                    <h2 className="text-xl font-semibold">6. Contact Us</h2>
                    <p>
                        If you have any questions about this Privacy Policy, please contact us.
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

export default PrivacyPolicyPage;
