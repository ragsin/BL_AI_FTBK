import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Announcement, Conversation, Message, User, Program, Role } from '../../types';
import { getAnnouncements, saveAnnouncements, getConversations, getMessages, saveMessages, saveConversations } from '../../api/communicationApi';
import { getUsers } from '../../api/userApi';
import { getPrograms } from '../../api/programApi';
import { logAction } from '../../api/auditApi';
import { useToast } from '../../contexts/ToastContext';
import { useAuth } from '../../contexts/AuthContext';
import { MegaphoneIcon, PlusIcon, TrashIcon, ChatBubbleIcon, SearchIcon } from '../../components/icons/Icons';
import EmptyState from '../../components/EmptyState';
import ConfirmationModal from '../../components/ConfirmationModal';
import AnnouncementFormModal from '../../components/AnnouncementFormModal';
import NewConversationModal from '../../components/NewConversationModal';
import { useSettings } from '../../contexts/SettingsContext';

const CommunicationPage: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'announcements' | 'direct-messages'>('announcements');
    const { addToast } = useToast();
    const { user: adminUser } = useAuth();
    const { settings } = useSettings();
    const [allPrograms, setAllPrograms] = useState<Program[]>([]);

    // --- Announcements State ---
    const [announcements, setAnnouncements] = useState<Announcement[]>([]);
    const [isAnnouncementModalOpen, setIsAnnouncementModalOpen] = useState(false);
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);
    const [announcementToDelete, setAnnouncementToDelete] = useState<Announcement | null>(null);

    // --- Direct Messages State ---
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [messages, setMessages] = useState<Message[]>([]);
    const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
    const [newMessage, setNewMessage] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [isNewConvoModalOpen, setIsNewConvoModalOpen] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const [allUsers, setAllUsers] = useState<User[]>([]);
    const userMap = useMemo(() => new Map(allUsers.map(u => [u.id, u])), [allUsers]);
    const programMap = useMemo(() => new Map(allPrograms.map(p => [p.id, p.title])), [allPrograms]);

    useEffect(() => {
        const fetchData = async () => {
            const [announcementsData, conversationsData, messagesData, usersData, programsData] = await Promise.all([
                getAnnouncements(),
                getConversations(),
                getMessages(),
                getUsers(),
                getPrograms(),
            ]);
            setAnnouncements(announcementsData);
            setConversations(conversationsData);
            setMessages(messagesData);
            setAllUsers(usersData);
            setAllPrograms(programsData);
        };
        fetchData();
    }, []);

    // --- Announcements Logic ---
    const handleSaveAnnouncement = async (newAnnouncement: Announcement) => {
        const currentAnnouncements = await getAnnouncements();
        const newAnnouncements = [newAnnouncement, ...currentAnnouncements];
        await saveAnnouncements(newAnnouncements);
        setAnnouncements(newAnnouncements);
        addToast('Announcement sent successfully!');
        if (adminUser) {
            logAction(adminUser, 'ANNOUNCEMENT_SENT', 'Announcement', newAnnouncement.id, { title: newAnnouncement.title, audience: { roles: newAnnouncement.targetRoles, programs: newAnnouncement.targetProgramIds } });
        }
    };
    const handleDeleteClick = (announcement: Announcement) => {
        setAnnouncementToDelete(announcement);
        setIsConfirmOpen(true);
    };
    const handleDeleteConfirm = async () => {
        if (announcementToDelete) {
            const currentAnnouncements = await getAnnouncements();
            const newAnnouncements = currentAnnouncements.filter(ann => ann.id !== announcementToDelete.id);
            await saveAnnouncements(newAnnouncements);
            setAnnouncements(newAnnouncements);
            addToast(`Announcement "${announcementToDelete.title}" deleted.`);
            if (adminUser) {
                logAction(adminUser, 'ANNOUNCEMENT_DELETED', 'Announcement', announcementToDelete.id, { title: announcementToDelete.title });
            }
        }
        setIsConfirmOpen(false);
        setAnnouncementToDelete(null);
    };
    const sortedAnnouncements = useMemo(() => {
        return [...announcements].sort((a, b) => new Date(b.dateSent).getTime() - new Date(a.dateSent).getTime());
    }, [announcements]);
    
    // --- Direct Messages Logic ---
    const sortedConversations = useMemo(() => {
        return conversations
            .filter(c => {
                if (!searchTerm) return true;
                const participants = c.participantIds.map(id => userMap.get(id));
                return participants.some(p => p && `${p.firstName} ${p.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()));
            })
            .sort((a, b) => new Date(b.lastMessageTimestamp).getTime() - new Date(a.lastMessageTimestamp).getTime());
    }, [conversations, userMap, searchTerm]);

    const selectedConversationMessages = useMemo(() => {
        if (!selectedConversationId) return [];
        return messages.filter(m => m.conversationId === selectedConversationId).sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    }, [messages, selectedConversationId]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [selectedConversationMessages]);

    const handleSelectConversation = (conversationId: string) => {
        setSelectedConversationId(conversationId);
    };

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim() || !selectedConversationId || !adminUser) return;
        const conversation = conversations.find(c => c.id === selectedConversationId);
        if (!conversation) return;

        const newMessageObj: Message = {
            id: `msg-${Date.now()}`, conversationId: selectedConversationId, senderId: adminUser.id,
            receiverId: conversation.participantIds.find(id => id !== adminUser.id) || '', text: newMessage,
            timestamp: new Date().toISOString(), read: false,
        };
        const currentMessages = await getMessages();
        const newMessages = [...currentMessages, newMessageObj];
        await saveMessages(newMessages);
        setMessages(newMessages);

        const currentConversations = await getConversations();
        const updatedConversations = currentConversations.map(c => {
            if (c.id === selectedConversationId) {
                const newUnreadCount = { ...c.unreadCount };
                c.participantIds.forEach(pid => {
                    if (pid !== adminUser.id) {
                         newUnreadCount[pid] = (newUnreadCount[pid] || 0) + 1
                    }
                });
                return { ...c, lastMessageSnippet: `Admin: ${newMessage}`, lastMessageTimestamp: newMessageObj.timestamp, unreadCount: newUnreadCount };
            }
            return c;
        });
        await saveConversations(updatedConversations);
        setConversations(updatedConversations);
        setNewMessage('');
    };

    const handleCreateConversation = async (participants: { studentId: string; teacherId: string }, firstMessage: string) => {
        if (!adminUser) return;
        const { studentId, teacherId } = participants;
        const currentConversations = await getConversations();
        const existingConvo = currentConversations.find(c => c.participantIds.length === 2 && c.participantIds.includes(studentId) && c.participantIds.includes(teacherId));
        if (existingConvo) {
            addToast('A conversation between these users already exists.', 'error');
            return;
        }

        const newConversation: Conversation = {
            id: `conv-${Date.now()}`, participantIds: [studentId, teacherId],
            lastMessageSnippet: `Admin: ${firstMessage}`, lastMessageTimestamp: new Date().toISOString(),
            unreadCount: { [studentId]: 1, [teacherId]: 1 }
        };
        const newMessageObj: Message = {
            id: `msg-${Date.now()}`, conversationId: newConversation.id, senderId: adminUser.id,
            receiverId: studentId, text: firstMessage, timestamp: newConversation.lastMessageTimestamp, read: false
        };
        
        const newConversations = [newConversation, ...currentConversations];
        await saveConversations(newConversations);
        setConversations(newConversations);

        const currentMessages = await getMessages();
        const newMessages = [...currentMessages, newMessageObj];
        await saveMessages(newMessages);
        setMessages(newMessages);


        addToast('New conversation started!');
        setIsNewConvoModalOpen(false);
        setActiveTab('direct-messages');
        setSelectedConversationId(newConversation.id);
    };

    const TabButton: React.FC<{ tabName: 'announcements' | 'direct-messages', label: string }> = ({ tabName, label }) => (
        <button onClick={() => setActiveTab(tabName)} className={`px-4 py-2 text-sm font-medium rounded-md ${activeTab === tabName ? 'bg-primary-100 text-primary-700 dark:bg-primary-900/50 dark:text-primary-300' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'}`}>
            {label}
        </button>
    );

    return (
        <>
            <div className="space-y-6">
                <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Communications Hub</h1>
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-2">
                    <div className="flex space-x-2">
                        <TabButton tabName="announcements" label="Announcements" />
                        <TabButton tabName="direct-messages" label="Direct Messages" />
                    </div>
                </div>

                {activeTab === 'announcements' && (
                    <div className="space-y-6">
                        <div className="flex justify-end">
                            <button onClick={() => setIsAnnouncementModalOpen(true)} className="flex items-center justify-center bg-primary-500 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-primary-600">
                                <PlusIcon className="h-5 w-5 mr-2" /> New Announcement
                            </button>
                        </div>
                        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm overflow-hidden">
                            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                                <thead className="bg-gray-50 dark:bg-gray-700"><tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Title</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Audience</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Date Sent</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Actions</th>
                                </tr></thead>
                                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                                    {sortedAnnouncements.length > 0 ? sortedAnnouncements.map(ann => (
                                        <tr key={ann.id}>
                                            <td className="px-6 py-4"><div className="text-sm font-medium text-gray-900 dark:text-white">{ann.title}</div><div className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 max-w-sm">{ann.content}</div></td>
                                            <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                                                <div className="flex flex-col gap-1">
                                                    {ann.targetUserIds && ann.targetUserIds.length > 0 ? (
                                                        <>
                                                            <span className="font-semibold">To: {ann.targetUserIds.map(id => {
                                                                const user = userMap.get(id);
                                                                return user ? `${user.firstName} ${user.lastName}` : 'Unknown';
                                                            }).join(', ')}</span>
                                                            <span className="text-xs italic text-gray-400">(Automated Message)</span>
                                                        </>
                                                    ) : (
                                                        <>
                                                            {ann.targetRoles?.length > 0 && <span className="font-semibold">Roles: {ann.targetRoles.join(', ')}</span>}
                                                            {ann.targetProgramIds?.length > 0 && <span className="font-semibold">Programs: {ann.targetProgramIds.map(id => programMap.get(id) || id).join(', ')}</span>}
                                                        </>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{new Date(ann.dateSent).toLocaleString()}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium"><button onClick={() => handleDeleteClick(ann)} className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300" title="Delete"><TrashIcon className="h-5 w-5" /></button></td>
                                        </tr>
                                    )) : (<tr><td colSpan={4}><EmptyState icon={MegaphoneIcon} title="No announcements" message="Create an announcement to communicate with users." action={{ text: "New Announcement", onClick: () => setIsAnnouncementModalOpen(true) }} /></td></tr>)}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {activeTab === 'direct-messages' && (
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm h-[calc(100vh-15rem)] flex">
                        <div className="w-1/3 border-r border-gray-200 dark:border-gray-700 flex flex-col">
                            <div className="p-4 border-b border-gray-200 dark:border-gray-700 space-y-3">
                                <div className="relative"><SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" /><input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Search conversations..." className="w-full pl-10 pr-4 py-2 text-sm bg-gray-100 dark:bg-gray-700 border border-transparent rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"/></div>
                                <button onClick={() => setIsNewConvoModalOpen(true)} className="w-full flex items-center justify-center bg-primary-500 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-primary-600"><PlusIcon className="h-5 w-5 mr-2" />New Message</button>
                            </div>
                            <div className="flex-grow overflow-y-auto">
                                {sortedConversations.map(convo => {
                                    const participants = convo.participantIds.map(id => userMap.get(id)).filter((u): u is User => !!u);
                                    const isSelected = selectedConversationId === convo.id;
                                    return (
                                        <div key={convo.id} onClick={() => handleSelectConversation(convo.id)} className={`p-4 cursor-pointer flex items-start space-x-3 border-b dark:border-gray-700 ${isSelected ? 'bg-primary-50 dark:bg-primary-900/30' : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'}`}>
                                            <div className="flex -space-x-3">{participants.map(p => <img key={p.id} src={p.avatar} alt={p.firstName} className="h-8 w-8 rounded-full border-2 border-white dark:border-gray-800"/>)}</div>
                                            <div className="flex-grow overflow-hidden"><p className={`font-semibold text-gray-800 dark:text-white truncate`}>{participants.map(p => p.firstName).join(' & ')}</p><p className={`text-sm text-gray-500 dark:text-gray-400 truncate`}>{convo.lastMessageSnippet}</p></div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                        <div className="w-2/3 flex flex-col">
                            {selectedConversationId ? (
                                <>
                                    <div className="p-4 border-b border-gray-200 dark:border-gray-700"><h3 className="font-semibold">{conversations.find(c=>c.id === selectedConversationId)?.participantIds.map(id=>userMap.get(id)?.firstName).join(' & ')}</h3></div>
                                    <div className="flex-grow p-4 overflow-y-auto bg-gray-50 dark:bg-gray-900/50"><div className="space-y-4">
                                        {selectedConversationMessages.map(msg => {
                                            const sender = userMap.get(msg.senderId);
                                            const isMe = msg.senderId === adminUser?.id;
                                            return (
                                                <div key={msg.id} className={`flex items-end gap-2 ${isMe ? 'justify-end' : 'justify-start'}`}>
                                                    {!isMe && sender && <img src={sender.avatar} alt={sender.firstName} className="h-6 w-6 rounded-full" />}
                                                    <div className={`px-4 py-2 rounded-xl max-w-md ${isMe ? 'bg-primary-500 text-white rounded-br-none' : 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white rounded-bl-none'}`}>
                                                        {!isMe && sender && <p className="text-xs font-bold text-primary-600 dark:text-primary-400">{sender.firstName} {sender.lastName}</p>}
                                                        <p className="text-sm">{msg.text}</p>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                        <div ref={messagesEndRef} />
                                    </div></div>
                                    <div className="p-4 border-t border-gray-200 dark:border-gray-700">
                                        <form onSubmit={handleSendMessage} className="flex items-center space-x-2">
                                            <input type="text" value={newMessage} onChange={(e) => setNewMessage(e.target.value)} placeholder="Send a message..." className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-full shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"/>
                                            <button type="submit" className="bg-primary-500 text-white p-2 rounded-full hover:bg-primary-600"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg></button>
                                        </form>
                                    </div>
                                </>
                            ) : (
                                <div className="flex flex-col items-center justify-center h-full text-center text-gray-500 dark:text-gray-400">
                                    <ChatBubbleIcon className="h-16 w-16 mb-4" /><h3 className="text-lg font-semibold">Select a conversation</h3><p>Choose a conversation from the list to view messages.</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            <AnnouncementFormModal isOpen={isAnnouncementModalOpen} onClose={() => setIsAnnouncementModalOpen(false)} onSave={handleSaveAnnouncement} programs={allPrograms} templates={settings.messageTemplates} />
            <ConfirmationModal isOpen={isConfirmOpen} onClose={() => setIsConfirmOpen(false)} onConfirm={handleDeleteConfirm} title="Delete Announcement" message={`Are you sure you want to delete "${announcementToDelete?.title}"? This cannot be undone.`}/>
            <NewConversationModal isOpen={isNewConvoModalOpen} onClose={() => setIsNewConvoModalOpen(false)} onSave={handleCreateConversation} allUsers={allUsers} />
        </>
    );
};

export default CommunicationPage;