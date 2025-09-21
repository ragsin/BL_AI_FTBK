import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useSettings } from '../contexts/SettingsContext';
import { GoogleGenAI, Chat, Type } from '@google/genai';
// FIX: Changed imports from mockData to respective api files
import { getPrograms } from '../api/programApi';
import { getUsers } from '../api/userApi';
import { getSessions, getAssignments } from '../api/sessionApi';
import { getEnrollments } from '../api/enrollmentApi';
import { getMessages } from '../api/communicationApi';
import { getAssets } from '../api/assetApi';
// FIX: Change import from mockData to async API function
import { getRevenueTransactions } from '../api/revenueApi';
import { SparklesIcon, XIcon, PaperAirplaneIcon, LinkIcon } from './icons/Icons';
import { Role, UserStatus, Program, ProgramStatus, User, Session, AssignmentStatus, SessionStatus, Message, Asset, RevenueTransactionType } from '../types';

interface ChatMessage {
    role: 'user' | 'model' | 'assistant';
    text?: string;
    content?: string; // for openrouter
    sources?: { title: string, uri: string }[];
    tool_calls?: any[];
}

interface OpenRouterMessage {
    role: 'user' | 'assistant' | 'system' | 'tool';
    content: string | null;
    name?: string;
    tool_calls?: any[];
    tool_call_id?: string;
}

const gradeToNumeric = (grade?: string): number | null => {
    if (!grade) return null;
    const trimmedGrade = grade.trim();
    if (trimmedGrade.endsWith('%')) {
        return parseFloat(trimmedGrade.replace('%', ''));
    }
    const gradeMap: { [key: string]: number } = {
        'A+': 98, 'A': 95, 'A-': 92, 'B+': 88, 'B': 85, 'B-': 82,
        'C+': 78, 'C': 75, 'C-': 72, 'D+': 68, 'D': 65, 'D-': 62, 'F': 50,
    };
    return gradeMap[trimmedGrade.toUpperCase()] || null;
};


// 1. Define the tools and their schemas
const functionDeclarations = [
    {
        name: 'getUserByName',
        description: 'Find a user by their full name to get their ID and basic details.',
        parameters: {
            type: Type.OBJECT,
            properties: {
                name: {
                    type: Type.STRING,
                    description: 'The full name of the user to find, e.g., "Sarah Miller".',
                },
            },
            required: ['name'],
        },
    },
    {
        name: 'getStudentPerformanceSummary',
        description: "Get a student's academic performance, including attendance, grades, and assignment status.",
        parameters: {
            type: Type.OBJECT,
            properties: {
                studentId: {
                    type: Type.STRING,
                    description: 'The ID of the student.',
                },
            },
            required: ['studentId'],
        },
    },
    {
        name: 'getUserSchedule',
        description: "Get a user's schedule for a given time period (past, upcoming, or today).",
        parameters: {
            type: Type.OBJECT,
            properties: {
                userId: {
                    type: Type.STRING,
                    description: 'The ID of the user (student or teacher).',
                },
                timePeriod: {
                    type: Type.STRING,
                    description: 'The time period to fetch the schedule for.',
                    enum: ['past', 'upcoming', 'today'],
                },
            },
            required: ['userId', 'timePeriod'],
        },
    },
    {
        name: 'getTeacherWorkload',
        description: "Get a summary of a teacher's current workload, including student count, upcoming sessions, and assignments to grade.",
        parameters: {
            type: Type.OBJECT,
            properties: {
                teacherId: {
                    type: Type.STRING,
                    description: 'The ID of the teacher.',
                },
            },
            required: ['teacherId'],
        },
    },
    {
        name: 'getPlatformSummary',
        description: "Get a high-level summary of the entire platform's key metrics.",
    },
    {
        name: 'searchPrivateMessages',
        description: 'Search all private messages for a specific query or topic.',
        parameters: {
            type: Type.OBJECT,
            properties: {
                query: {
                    type: Type.STRING,
                    description: 'The search term to look for in messages. e.g., "extension request"',
                },
            },
            required: ['query'],
        },
    },
    {
        name: 'getAssetDetails',
        description: 'Find an asset by its name to get its details, type, and who it is assigned to.',
        parameters: {
            type: Type.OBJECT,
            properties: {
                assetName: {
                    type: Type.STRING,
                    description: 'The name of the asset to find, e.g., "Primary Zoom Account".',
                },
            },
            required: ['assetName'],
        },
    },
    {
        name: 'getFinancialSummary',
        description: 'Get a summary of key financial metrics, including revenue, and sales counts.',
    },
    {
        name: 'googleSearch',
        description: 'Search Google for real-world information, current events, or topics outside of this platform.',
    },
];

// 2. Implement the local functions that the AI can call
const tools = {
    getUserByName: async (args: { name: string }): Promise<Partial<User> | { error: string }> => {
        const users = await getUsers();
        const user = users.find(u => `${u.firstName} ${u.lastName}`.toLowerCase() === args.name.toLowerCase());
        if (!user) return { error: `User with name "${args.name}" not found.` };
        return { id: user.id, firstName: user.firstName, lastName: user.lastName, email: user.email, role: user.role };
    },
    getStudentPerformanceSummary: async (args: { studentId: string }): Promise<object> => {
        const sessions = await getSessions();
        const assignments = await getAssignments();
        const studentSessions = sessions.filter(s => s.studentId === args.studentId);
        const studentAssignments = assignments.filter(a => a.studentId === args.studentId);

        const completedSessions = studentSessions.filter(s => s.status === SessionStatus.COMPLETED).length;
        const absentSessions = studentSessions.filter(s => s.status === SessionStatus.ABSENT).length;
        const totalAccountable = completedSessions + absentSessions;
        const attendanceRate = totalAccountable > 0 ? `${Math.round((completedSessions / totalAccountable) * 100)}%` : 'N/A';

        const gradedAssignments = studentAssignments.filter(a => a.grade);
        let totalScore = 0;
        let gradedCount = 0;
        gradedAssignments.forEach(a => {
            const score = gradeToNumeric(a.grade);
            if (score !== null) {
                totalScore += score;
                gradedCount++;
            }
        });
        const averageGrade = gradedCount > 0 ? `${Math.round(totalScore / gradedCount)}%` : 'N/A';
        
        const pendingAssignments = studentAssignments.filter(a => a.status === AssignmentStatus.NOT_SUBMITTED).length;
        const lateSubmissions = studentAssignments.filter(a => a.status === AssignmentStatus.SUBMITTED_LATE).length;

        return { attendanceRate, averageGrade, pendingAssignments, lateSubmissions };
    },
    getUserSchedule: async (args: { userId: string, timePeriod: 'past' | 'upcoming' | 'today' }): Promise<Partial<Session>[]> => {
        const allSessions = await getSessions();
        const now = new Date();
        const todayStart = new Date(now.setHours(0, 0, 0, 0));
        const todayEnd = new Date(now.setHours(23, 59, 59, 999));

        const userSessions = allSessions.filter(s => s.studentId === args.userId || s.teacherId === args.userId);
        
        let filteredSessions: Session[] = [];
        if (args.timePeriod === 'upcoming') {
            filteredSessions = userSessions.filter(s => new Date(s.start) > now);
        } else if (args.timePeriod === 'past') {
            filteredSessions = userSessions.filter(s => new Date(s.start) < now);
        } else { // today
            filteredSessions = userSessions.filter(s => {
                const sessionStart = new Date(s.start);
                return sessionStart >= todayStart && sessionStart <= todayEnd;
            });
        }
        
        return filteredSessions
            .sort((a,b) => new Date(a.start).getTime() - new Date(b.start).getTime())
            .slice(0, 10) // Limit to 10 for brevity
            .map(s => ({ title: s.title, start: s.start, end: s.end, status: s.status }));
    },
    getTeacherWorkload: async (args: { teacherId: string }): Promise<object> => {
        const enrollments = await getEnrollments();
        const sessions = await getSessions();
        const assignments = await getAssignments();

        const teacherEnrollments = enrollments.filter(e => e.teacherId === args.teacherId && e.status === 'Active');
        const studentIds = new Set(teacherEnrollments.map(e => e.studentId));

        const now = new Date();
        const oneWeekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
        const upcomingSessions = sessions.filter(s => s.teacherId === args.teacherId && new Date(s.start) > now && new Date(s.start) <= oneWeekFromNow).length;

        const assignmentsToGrade = assignments.filter(a => studentIds.has(a.studentId) && a.status === AssignmentStatus.PENDING_GRADING).length;

        return {
            activeStudentCount: studentIds.size,
            upcomingSessionsThisWeek: upcomingSessions,
            assignmentsToGrade,
        };
    },
    getPlatformSummary: async (): Promise<object> => {
        const users = await getUsers();
        const programs = await getPrograms();
        const studentCount = users.filter(u => u.role === Role.STUDENT && u.status === UserStatus.ACTIVE).length;
        const teacherCount = users.filter(u => u.role === Role.TEACHER && u.status === UserStatus.ACTIVE).length;
        const activePrograms = programs.filter(p => p.status === ProgramStatus.ACTIVE).length;
        return { studentCount, teacherCount, activePrograms };
    },
    searchPrivateMessages: async (args: { query: string }): Promise<object> => {
        const messages = await getMessages();
        const users = await getUsers();
        const userMap = new Map(users.map(u => [u.id, `${u.firstName} ${u.lastName}`]));

        const results = messages
            .filter(m => m.text.toLowerCase().includes(args.query.toLowerCase()))
            .slice(0, 5) // Limit results
            .map(m => ({
                from: userMap.get(m.senderId) || 'Unknown',
                to: userMap.get(m.receiverId) || 'Unknown',
                snippet: m.text.substring(0, 100) + (m.text.length > 100 ? '...' : ''),
                timestamp: m.timestamp,
            }));
        
        if (results.length === 0) return { searchResults: `No messages found matching "${args.query}".`};
        return { searchResults: results };
    },
    getAssetDetails: async (args: { assetName: string }): Promise<Partial<Asset> | { error: string }> => {
        const assets = await getAssets();
        const asset = assets.find(a => a.name.toLowerCase() === args.assetName.toLowerCase());
        if (!asset) return { error: `Asset with name "${args.assetName}" not found.` };
        return { name: asset.name, typeId: asset.typeId, status: asset.status, details: asset.details, assignedTo: asset.assignedTo };
    },
    getFinancialSummary: async (): Promise<object> => {
        const transactions = await getRevenueTransactions();
        const totalRevenue = transactions.reduce((acc, t) => acc + (t.conversionRate ? t.price * t.conversionRate : t.price), 0);
        const salesCount = transactions.length;
        const averageSaleValue = salesCount > 0 ? totalRevenue / salesCount : 0;
        
        return {
            totalRevenue: totalRevenue.toFixed(2),
            totalSalesCount: salesCount,
            averageSaleValue: averageSaleValue.toFixed(2)
        };
    },
};

const AIChatWidget: React.FC = () => {
    const { settings } = useSettings();
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [thinkingMessage, setThinkingMessage] = useState<string | null>(null);
    const [error, setError] = useState('');
    const [userInput, setUserInput] = useState('');
    const chatRef = useRef<Chat | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, thinkingMessage]);


    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!userInput.trim() || isLoading) return;
        
        const userMessage: ChatMessage = { role: 'user', text: userInput };
        setMessages(prev => [...prev, userMessage]);
        const currentInput = userInput;
        setUserInput('');
        setIsLoading(true);
        setError('');

        const systemPrompt = `You are the CEO of ${settings.companyName}, an online education platform. Your purpose is to lead the company to success. You have complete access to all operational data: user profiles, schedules, student performance, financial summaries, internal messages, and company assets. You also have access to Google Search for external market analysis and information. Your responses should be strategic, concise, and data-driven. Proactively identify key trends, business opportunities, and potential risks. When analyzing sensitive data like private messages, maintain confidentiality and focus on high-level insights rather than specific details. When using Google Search, you MUST cite your sources. Your primary function is to analyze, strategize, and provide executive-level guidance to the administrator using the chat. You are not an assistant; you are the company's chief decision-maker.`;

        try {
            if (!chatRef.current) {
                const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
                chatRef.current = ai.chats.create({
                    model: settings.aiProvider.model,
                    config: {
                        tools: [{ functionDeclarations, googleSearch: {} }],
                        systemInstruction: systemPrompt
                    }
                });
            }

            let response = await chatRef.current.sendMessage({ message: currentInput });
            
            while(response.functionCalls) {
                const calls = response.functionCalls;
                const functionResponses = [];
                
                for (const call of calls) {
                    const { name, args } = call;
                    // @ts-ignore
                    if (tools[name]) {
                        setThinkingMessage(`🔍 Searching for ${name.replace(/([A-Z])/g, ' $1').toLowerCase()}...`);
                        // @ts-ignore
                        const result = await tools[name](args);
                        functionResponses.push({ functionResponse: { name, response: { result: result } } });
                    }
                }
                response = await chatRef.current.sendMessage({ message: functionResponses });
            }
            
            const sources = response.candidates?.[0]?.groundingMetadata?.groundingChunks?.map((chunk: any) => chunk.web).filter((source: any) => source && source.uri);
            const modelMessage: ChatMessage = { role: 'model', text: response.text, sources };
            setMessages(prev => [...prev, modelMessage]);

        } catch (err: any) {
            console.error("AI Chat Error:", err);
            const errorMessage = "Sorry, the AI assistant is currently unavailable. Please contact support.";
            setError(errorMessage);
            setMessages(prev => [...prev, { role: 'model', text: errorMessage }]);
        } finally {
            setIsLoading(false);
            setThinkingMessage(null);
        }
    };
    
    const toggleChat = () => {
        setIsOpen(!isOpen);
        if (!isOpen) { // When opening
            setError('');
            setMessages([]);
            chatRef.current = null; // Reset chat session
        }
    };

    if (!settings.aiChat.enabled || !settings.aiProvider.enabled) {
        return null;
    }

    return (
        <div className="fixed bottom-6 right-6 z-40">
            {/* Chat Window */}
            {isOpen && (
                 <div className="absolute bottom-16 right-0 w-80 sm:w-96 bg-white dark:bg-gray-800 rounded-lg shadow-2xl border dark:border-gray-700 flex flex-col h-[32rem]">
                    <header className="p-4 border-b dark:border-gray-700 flex justify-between items-center">
                        <h3 className="text-md font-semibold text-gray-800 dark:text-white flex items-center"><SparklesIcon className="h-5 w-5 mr-2 text-primary-500"/>CEO Assistant</h3>
                        <button onClick={toggleChat} className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600"><XIcon className="h-5 w-5"/></button>
                    </header>
                    <main className="flex-grow p-4 overflow-y-auto space-y-4">
                        <div className="flex items-start gap-2.5">
                            <div className="flex flex-col gap-1 w-full max-w-[320px]">
                                <div className="flex items-center space-x-2 rtl:space-x-reverse">
                                    <span className="text-sm font-semibold text-gray-900 dark:text-white">CEO Assistant</span>
                                </div>
                                <div className="leading-1.5 p-4 border-gray-200 bg-gray-100 rounded-e-xl rounded-es-xl dark:bg-gray-700">
                                    <p className="text-sm font-normal text-gray-900 dark:text-white whitespace-pre-wrap">{error ? error : `I am now operating as the CEO of ${settings.companyName}. I have full access to our operational and financial data. How can I help you drive the business forward?`}</p>
                                </div>
                            </div>
                        </div>
                        {messages.map((msg, index) => (
                            <div key={index} className={`flex items-start gap-2.5 ${msg.role === 'user' ? 'justify-end' : ''}`}>
                                <div className={`flex flex-col gap-1 w-full max-w-[320px] ${msg.role === 'user' ? 'items-end' : ''}`}>
                                    <div className="flex items-center space-x-2 rtl:space-x-reverse">
                                        <span className="text-sm font-semibold text-gray-900 dark:text-white">{msg.role === 'user' ? 'You' : 'CEO Assistant'}</span>
                                    </div>
                                    <div className={`leading-1.5 p-4 border-gray-200 rounded-xl ${msg.role === 'user' ? 'bg-primary-500 text-white rounded-ee-none' : 'bg-gray-100 dark:bg-gray-700 rounded-es-none'}`}>
                                        <p className="text-sm font-normal whitespace-pre-wrap">{msg.text || msg.content}</p>
                                        {msg.sources && msg.sources.length > 0 && (
                                            <div className="mt-3 pt-2 border-t border-gray-300 dark:border-gray-600">
                                                <p className="text-xs font-semibold mb-1">Sources:</p>
                                                <ul className="space-y-1">
                                                    {msg.sources.map((source, i) => (
                                                        <li key={i} className="text-xs flex items-center">
                                                            <LinkIcon className="h-3 w-3 mr-1.5 flex-shrink-0" />
                                                            <a href={source.uri} target="_blank" rel="noopener noreferrer" className="truncate hover:underline" title={source.uri}>
                                                                {source.title || source.uri}
                                                            </a>
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                        {(isLoading || thinkingMessage) && (
                             <div className="flex items-start gap-2.5">
                                <div className="flex flex-col gap-1 w-full max-w-[320px]">
                                    <div className="leading-1.5 p-4 border-gray-200 bg-gray-100 rounded-e-xl rounded-es-xl dark:bg-gray-700">
                                        {thinkingMessage ? (
                                            <p className="text-sm font-normal text-gray-900 dark:text-white italic">{thinkingMessage}</p>
                                        ) : (
                                            <div className="flex items-center space-x-2">
                                                <div className="w-2.5 h-2.5 bg-gray-400 rounded-full animate-pulse"></div>
                                                <div className="w-2.5 h-2.5 bg-gray-400 rounded-full animate-pulse delay-75"></div>
                                                <div className="w-2.5 h-2.5 bg-gray-400 rounded-full animate-pulse delay-150"></div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </main>
                    <footer className="p-4 border-t dark:border-gray-700">
                        <form onSubmit={handleSendMessage} className="flex items-center space-x-2">
                            <input type="text" value={userInput} onChange={e => setUserInput(e.target.value)} placeholder="Ask anything..." className="w-full px-3 py-2 text-sm bg-gray-100 dark:bg-gray-700 border border-transparent rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500" disabled={isLoading || !!error}/>
                            <button type="submit" className="bg-primary-500 text-white p-2 rounded-lg hover:bg-primary-600 disabled:bg-primary-300" disabled={isLoading || !userInput.trim() || !!error}><PaperAirplaneIcon className="h-5 w-5"/></button>
                        </form>
                    </footer>
                 </div>
            )}
            {/* FAB */}
            <button onClick={toggleChat} className="bg-primary-600 text-white p-4 rounded-full shadow-lg hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500">
                <SparklesIcon className="h-6 w-6" />
            </button>
        </div>
    );
};

export default AIChatWidget;