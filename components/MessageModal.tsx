import React, { useState, useEffect } from 'react';
import { User, Conversation, Message } from '../types';
import { useToast } from '../contexts/ToastContext';
import { XIcon } from './icons/Icons';
import { getConversations, saveConversations, getMessages, saveMessages } from '../api/communicationApi';

interface MessageModalProps {
  isOpen: boolean;
  onClose: () => void;
  studentUser: User;
  recipientUser: User;
  initialText?: string;
}

const MessageModal: React.FC<MessageModalProps> = ({ isOpen, onClose, studentUser, recipientUser, initialText = '' }) => {
  const [message, setMessage] = useState('');
  const { addToast } = useToast();
  
  useEffect(() => {
    if (isOpen) {
        setMessage(initialText);
    }
  }, [isOpen, initialText]);

  const handleSend = async () => {
    if (!message.trim()) {
      addToast('Message cannot be empty.', 'error');
      return;
    }

    const allConversations = await getConversations();
    let conversation = allConversations.find(c => 
        c.participantIds.includes(studentUser.id) && c.participantIds.includes(recipientUser.id)
    );

    let isNewConversation = false;
    if (!conversation) {
        isNewConversation = true;
        conversation = {
            id: `conv-${Date.now()}`,
            participantIds: [studentUser.id, recipientUser.id],
            lastMessageSnippet: '',
            lastMessageTimestamp: new Date().toISOString(),
            unreadCount: { [recipientUser.id]: 0, [studentUser.id]: 0 },
        };
    }

    const newMessage: Message = {
        id: `msg-${Date.now()}`,
        conversationId: conversation.id,
        senderId: studentUser.id,
        receiverId: recipientUser.id,
        text: message,
        timestamp: new Date().toISOString(),
        read: false,
    };
    
    // Update messages
    const allMessages = await getMessages();
    await saveMessages([...allMessages, newMessage]);
    
    // Update conversation
    conversation.lastMessageSnippet = message;
    conversation.lastMessageTimestamp = newMessage.timestamp;
    conversation.unreadCount[recipientUser.id] = (conversation.unreadCount[recipientUser.id] || 0) + 1;

    if (isNewConversation) {
        await saveConversations([...allConversations, conversation]);
    } else {
        await saveConversations(allConversations.map(c => c.id === conversation!.id ? conversation! : c));
    }
    
    addToast('Message sent!');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center font-student" aria-modal="true" role="dialog">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-lg m-4 transform transition-all animate-fade-in-up">
        <div className="flex items-center justify-between p-4 border-b dark:border-slate-700">
          <h2 className="text-xl font-bold text-slate-800 dark:text-white">Message to {recipientUser.firstName} {recipientUser.lastName}</h2>
           <button onClick={onClose} className="p-1 rounded-full hover:bg-slate-200 dark:hover:bg-slate-600">
            <XIcon className="h-6 w-6 text-slate-600 dark:text-slate-300" />
          </button>
        </div>
        <div className="p-6">
            <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={5}
                placeholder="Type your message here..."
                className="mt-1 block w-full px-3 py-2 bg-slate-50 dark:bg-slate-700 border-2 border-slate-300 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-sky-500 focus:border-sky-500 sm:text-sm"
            />
        </div>
        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-700/50 flex justify-end items-center space-x-3 rounded-b-2xl">
            <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-bold text-slate-700 bg-white dark:bg-slate-600 dark:text-slate-200 border border-slate-300 dark:border-slate-500 rounded-full shadow-sm hover:bg-slate-50 dark:hover:bg-slate-500"
            >
                Cancel
            </button>
            <button
                type="button"
                onClick={handleSend}
                className="px-4 py-2 text-sm font-bold text-white bg-sky-600 border border-transparent rounded-full shadow-sm hover:bg-sky-700"
            >
                Send Message
            </button>
        </div>
      </div>
    </div>
  );
};

export default MessageModal;