import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { getConversations, getMessages, saveConversations, saveMessages } from '../../api/communicationApi';
import { getUsers } from '../../api/userApi';
import { Conversation, Message, User } from '../../types';
import { ChatBubbleIcon } from '../../components/icons/Icons';
import { useParentPortal } from '../../contexts/ParentPortalContext';
import ParentPageHeader from '../../components/ParentPageHeader';

const ParentMessagesPage: React.FC = () => {
    const { user: parent } = useAuth();
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [messages, setMessages] = useState<Message[]>([]);
    const [userMap, setUserMap] = useState(new Map<string, User>());
    const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
    const [newMessage, setNewMessage] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const { children } = useParentPortal();

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
        if (!parent) return [];
        return conversations
            .filter(c => c.participantIds.includes(parent.id))
            .sort((a, b) => new Date(b.lastMessageTimestamp).getTime() - new Date(a.lastMessageTimestamp).getTime());
    }, [conversations, parent]);

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
        if (parent) {
            const updatedMessages = messages.map(m => (m.conversationId === conversationId && m.receiverId === parent.id && !m.read) ? { ...m, read: true } : m);
            setMessages(updatedMessages);
            await saveMessages(updatedMessages);

            const updatedConversations = conversations.map(c => (c.id === conversationId) ? { ...c, unreadCount: { ...c.unreadCount, [parent.id]: 0 } } : c);
            setConversations(updatedConversations);
            await saveConversations(updatedConversations);
        }
    };

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim() || !selectedConversationId || !parent) return;
        
        const conversation = conversations.find(c => c.id === selectedConversationId);
        if (!conversation) return;

        const receiverId = conversation.participantIds.find(id => id !== parent.id);
        if (!receiverId) return;

        const message: Message = {
            id: `msg-${Date.now()}`, conversationId: selectedConversationId, senderId: parent.id,
            receiverId: receiverId, text: newMessage, timestamp: new Date().toISOString(), read: false
        };

        const updatedMessages = [...messages, message];
        await saveMessages(updatedMessages);
        setMessages(updatedMessages);

        const updatedConversations = conversations.map(c => {
            if (c.id === selectedConversationId) {
                return { ...c, lastMessageSnippet: newMessage, lastMessageTimestamp: message.timestamp, unreadCount: { ...c.unreadCount, [receiverId]: (c.unreadCount[receiverId] || 0) + 1 }};
            }
            return c;
        });
        await saveConversations(updatedConversations);
        setConversations(updatedConversations);
        setNewMessage('');
    };
    
    if (!parent) return null;

    if (children.length === 0) {
        return <ParentPageHeader title="Messages" />;
    }

    return (
        <div className="space-y-6">
            <ParentPageHeader title="Messages" />
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md h-[calc(100vh-18rem)] flex">
                <div className="w-1/3 border-r border-gray-200 dark:border-gray-700 flex flex-col">
                    <div className="p-4 border-b border-gray-200 dark:border-gray-700"><h2 className="text-lg font-semibold">Conversations</h2></div>
                    <div className="flex-grow overflow-y-auto">
                        {myConversations.map(convo => {
                            const otherParticipantId = convo.participantIds.find(id => id !== parent.id);
                            const otherParticipant = otherParticipantId ? userMap.get(otherParticipantId) : null;
                            const isSelected = selectedConversationId === convo.id;
                            const unreadCount = convo.unreadCount[parent.id] || 0;

                            return (
                                <div key={convo.id} onClick={() => handleSelectConversation(convo.id)} className={`p-4 cursor-pointer flex items-center space-x-3 border-b dark:border-gray-700 ${isSelected ? 'bg-primary-50 dark:bg-primary-900/30' : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'}`}>
                                    <div className="relative">
                                        <img src={otherParticipant?.avatar} alt={otherParticipant?.firstName} className="h-10 w-10 rounded-full" />
                                        {unreadCount > 0 && <span className="absolute top-0 right-0 h-3 w-3 bg-red-500 rounded-full border-2 border-white dark:border-gray-800"></span>}
                                    </div>
                                    <div className="flex-grow overflow-hidden">
                                        <p className={`font-semibold text-gray-800 dark:text-white ${unreadCount > 0 ? 'font-bold' : ''}`}>{otherParticipant?.firstName} {otherParticipant?.lastName}</p>
                                        <p className={`text-sm text-gray-500 dark:text-gray-400 truncate ${unreadCount > 0 ? 'font-bold text-gray-700 dark:text-gray-300' : ''}`}>{convo.lastMessageSnippet}</p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
                <div className="w-2/3 flex flex-col">
                    {selectedConversationId ? (
                        <>
                            <div className="p-4 border-b border-gray-200 dark:border-gray-700"><h3 className="font-semibold">{userMap.get(myConversations.find(c=>c.id === selectedConversationId)?.participantIds.find(id=>id !== parent.id) || '')?.firstName}</h3></div>
                            <div className="flex-grow p-4 overflow-y-auto bg-gray-50 dark:bg-gray-900/50">
                                <div className="space-y-4">
                                    {selectedConversationMessages.map(msg => {
                                        const sender = userMap.get(msg.senderId);
                                        const isMe = msg.senderId === parent.id;
                                        return (
                                            <div key={msg.id} className={`flex items-end gap-2 ${isMe ? 'justify-end' : 'justify-start'}`}>
                                                {!isMe && sender && <img src={sender.avatar} className="h-6 w-6 rounded-full" />}
                                                <div className={`px-4 py-2 rounded-xl max-w-md ${isMe ? 'bg-primary-500 text-white rounded-br-none' : 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white rounded-bl-none'}`}>
                                                    {!isMe && sender && <p className="text-xs font-bold text-primary-600 dark:text-primary-400">{sender.firstName}</p>}
                                                    <p className="text-sm">{msg.text}</p>
                                                </div>
                                            </div>
                                        );
                                    })}
                                    <div ref={messagesEndRef} />
                                </div>
                            </div>
                            <div className="p-4 border-t border-gray-200 dark:border-gray-700">
                                <form onSubmit={handleSendMessage} className="flex items-center space-x-2">
                                    <input type="text" value={newMessage} onChange={(e) => setNewMessage(e.target.value)} placeholder="Type a message..." className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-full shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"/>
                                    <button type="submit" className="bg-primary-500 text-white p-2 rounded-full hover:bg-primary-600"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg></button>
                                </form>
                            </div>
                        </>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full text-center text-gray-500 dark:text-gray-400">
                            <ChatBubbleIcon className="h-16 w-16 mb-4" />
                            <h3 className="text-lg font-semibold">Select a conversation</h3>
                            <p>Choose a conversation from the list to view your message history.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ParentMessagesPage;
