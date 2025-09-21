import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { getConversations, getMessages, saveConversations, saveMessages } from '../../api/communicationApi';
import { getUsers } from '../../api/userApi';
import { Conversation, Message, User } from '../../types';
import { ChatBubbleIcon } from '../../components/icons/Icons';

const StudentMessagesPage: React.FC = () => {
    const { user: student } = useAuth();
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [messages, setMessages] = useState<Message[]>([]);
    const [userMap, setUserMap] = useState<Map<string, User>>(new Map());
    
    const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
    const [newMessage, setNewMessage] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const fetchData = async () => {
            const [convos, msgs, users] = await Promise.all([getConversations(), getMessages(), getUsers()]);
            setConversations(convos);
            setMessages(msgs);
            setUserMap(new Map(users.map(u => [u.id, u])));
        };
        fetchData();
    }, []);

    const myConversations = useMemo(() => {
        if (!student) return [];
        return conversations
            .filter(c => c.participantIds.includes(student.id))
            .sort((a, b) => new Date(b.lastMessageTimestamp).getTime() - new Date(a.lastMessageTimestamp).getTime());
    }, [conversations, student]);

    const selectedConversationMessages = useMemo(() => {
        if (!selectedConversationId) return [];
        return messages
            .filter(m => m.conversationId === selectedConversationId)
            .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    }, [messages, selectedConversationId]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [selectedConversationMessages]);

    const handleSelectConversation = async (conversationId: string) => {
        setSelectedConversationId(conversationId);
        if (student) {
            const currentMessages = await getMessages();
            const updatedMessages = currentMessages.map(m => (m.conversationId === conversationId && m.receiverId === student.id && !m.read) ? { ...m, read: true } : m);
            setMessages(updatedMessages);
            await saveMessages(updatedMessages);

            const currentConversations = await getConversations();
            const updatedConversations = currentConversations.map(c => (c.id === conversationId) ? { ...c, unreadCount: { ...c.unreadCount, [student.id]: 0 } } : c);
            setConversations(updatedConversations);
            await saveConversations(updatedConversations);
        }
    };

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim() || !selectedConversationId || !student) return;
        
        const conversation = conversations.find(c => c.id === selectedConversationId);
        if (!conversation) return;

        const receiverId = conversation.participantIds.find(id => id !== student.id);
        if (!receiverId) return;

        const message: Message = {
            id: `msg-${Date.now()}`,
            conversationId: selectedConversationId,
            senderId: student.id,
            receiverId: receiverId,
            text: newMessage,
            timestamp: new Date().toISOString(),
            read: false,
        };

        const currentMessages = await getMessages();
        const updatedMessages = [...currentMessages, message];
        await saveMessages(updatedMessages);
        setMessages(updatedMessages);

        const currentConversations = await getConversations();
        const updatedConversations = currentConversations.map(c => {
            if (c.id === selectedConversationId) {
                return { ...c, lastMessageSnippet: newMessage, lastMessageTimestamp: message.timestamp, unreadCount: { ...c.unreadCount, [receiverId]: (c.unreadCount[receiverId] || 0) + 1 }};
            }
            return c;
        });
        await saveConversations(updatedConversations);
        setConversations(updatedConversations);
        setNewMessage('');
    };
    
    if (!student) return null;

    return (
        <div className="space-y-6">
            <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-lg">
                <h1 className="text-4xl font-extrabold text-slate-800 dark:text-white">Messages</h1>
                <p className="mt-1 text-slate-500 dark:text-slate-400">Talk to your teachers here.</p>
            </div>
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg h-[calc(100vh-20rem)] flex overflow-hidden">
                <div className="w-1/3 border-r border-slate-200 dark:border-slate-700 flex flex-col">
                    <div className="p-4 border-b border-slate-200 dark:border-slate-700">
                        <h2 className="text-lg font-bold">Conversations</h2>
                    </div>
                    <div className="flex-grow overflow-y-auto">
                        {myConversations.map(convo => {
                            const otherParticipantId = convo.participantIds.find(id => id !== student.id);
                            const otherParticipant = otherParticipantId ? userMap.get(otherParticipantId) : null;
                            const isSelected = selectedConversationId === convo.id;
                            const unreadCount = convo.unreadCount[student.id] || 0;

                            return (
                                <div key={convo.id} onClick={() => handleSelectConversation(convo.id)} className={`p-4 cursor-pointer flex items-center space-x-3 border-b border-slate-200 dark:border-slate-700 ${isSelected ? 'bg-sky-100 dark:bg-sky-800/50' : 'hover:bg-slate-50 dark:hover:bg-slate-700/50'}`}>
                                    <div className="relative">
                                        <img src={otherParticipant?.avatar} alt={otherParticipant?.firstName} className="h-10 w-10 rounded-full" />
                                        {unreadCount > 0 && <span className="absolute top-0 right-0 h-4 w-4 bg-pink-500 rounded-full border-2 border-white dark:border-slate-800 flex items-center justify-center text-white text-xs font-bold">{unreadCount}</span>}
                                    </div>
                                    <div className="flex-grow overflow-hidden">
                                        <p className={`font-bold text-slate-800 dark:text-white`}>{otherParticipant?.firstName} {otherParticipant?.lastName}</p>
                                        <p className={`text-sm text-slate-500 dark:text-slate-400 truncate ${unreadCount > 0 ? 'font-bold text-slate-700 dark:text-slate-300' : ''}`}>{convo.lastMessageSnippet}</p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
                <div className="w-2/3 flex flex-col">
                    {selectedConversationId ? (
                        <>
                            <div className="p-4 border-b border-slate-200 dark:border-slate-700">
                                <h3 className="font-bold text-xl">{userMap.get(myConversations.find(c=>c.id === selectedConversationId)?.participantIds.find(id=>id !== student.id) || '')?.firstName}</h3>
                            </div>
                            <div className="flex-grow p-4 overflow-y-auto bg-slate-50 dark:bg-slate-900/50">
                                <div className="space-y-4">
                                    {selectedConversationMessages.map(msg => {
                                        const sender = userMap.get(msg.senderId);
                                        const isMe = msg.senderId === student.id;
                                        return (
                                            <div key={msg.id} className={`flex items-end gap-2 ${isMe ? 'justify-end' : 'justify-start'}`}>
                                                {!isMe && sender && <img src={sender.avatar} className="h-6 w-6 rounded-full" />}
                                                <div className={`px-4 py-2 rounded-2xl max-w-md ${isMe ? 'bg-sky-500 text-white rounded-br-none' : 'bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-white rounded-bl-none'}`}>
                                                    {!isMe && sender && <p className="text-xs font-bold text-sky-600 dark:text-sky-400">{sender.firstName}</p>}
                                                    <p className="text-sm">{msg.text}</p>
                                                </div>
                                            </div>
                                        );
                                    })}
                                    <div ref={messagesEndRef} />
                                </div>
                            </div>
                            <div className="p-4 border-t border-slate-200 dark:border-slate-700">
                                <form onSubmit={handleSendMessage} className="flex items-center space-x-2">
                                    <input type="text" value={newMessage} onChange={(e) => setNewMessage(e.target.value)} placeholder="Type a message..." className="w-full px-4 py-2 bg-white dark:bg-slate-700 border-2 border-slate-300 dark:border-slate-600 rounded-full shadow-sm focus:outline-none focus:ring-sky-500 focus:border-sky-500 sm:text-sm"/>
                                    <button type="submit" className="bg-sky-500 text-white p-2 rounded-full hover:bg-sky-600 transition-colors">
                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
                                    </button>
                                </form>
                            </div>
                        </>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full text-center text-slate-500 dark:text-slate-400">
                            <ChatBubbleIcon className="h-24 w-24 mb-4" />
                            <h3 className="text-xl font-bold">Select a Conversation</h3>
                            <p>Choose a teacher from the list to see your messages.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default StudentMessagesPage;