import {createContext, useContext, useState, useEffect, ReactNode, useCallback} from 'react';
import {apiService, ChatResponse} from '../../services/api';
import {useAuth} from './AuthContext';

export interface Message {
    id: string;
    senderId: string;
    senderName: string;
    text: string;
    timestamp: string;
    isRead: boolean;
}

export interface Chat {
    id: string;
    applicationId: string;
    applicationStatus: string;
    offerId: string;
    offerName: string;
    ownerId: string;
    ownerName: string;
    applicantId: string;
    applicantName: string;
    participants: string[];
    messages: Message[];
    unreadCount: number;
}

interface ChatsContextType {
    chats: Chat[];
    loading: boolean;
    refreshChats: () => Promise<void>;
    sendMessage: (chatId: string, senderId: string, text: string) => Promise<void>;
    markAsRead: (chatId: string) => Promise<void>;
}

const ChatsContext = createContext<ChatsContextType | undefined>(undefined);

export function ChatsProvider({children}: { children: ReactNode }) {
    const [chats, setChats] = useState<Chat[]>([]);
    const [loading, setLoading] = useState(false);
    const {user} = useAuth();

    const refreshChats = useCallback(async () => {
        if (!user) {
            setChats([]);
            return;
        }

        try {
            setLoading(true);
            const data: ChatResponse[] = await apiService.getUserChats(user.id);

            const mappedChats: Chat[] = data.map(c => ({
                id: c.id,
                applicationId: c.applicationId,
                applicationStatus: c.applicationStatus || 'PENDING',
                offerId: c.offerId,
                offerName: c.offerTitle || 'Accommodation',
                ownerId: c.ownerId,
                ownerName: c.ownerName,
                applicantId: c.applicantId,
                applicantName: c.applicantName,
                participants: [c.ownerId, c.applicantId],
                unreadCount: c.unreadCount || 0,
                messages: (c.messages || []).map(m => ({
                    id: m.id,
                    senderId: m.senderId,
                    senderName: m.senderName,
                    text: m.content,
                    timestamp: m.sentAt,
                    isRead: Boolean(m.isRead), //handle both isRead and read for backward compatibility
                })),
            }));

            setChats(mappedChats);
        } catch (error) {
            console.error('Failed to load chats:', error);
        } finally {
            setLoading(false);
        }
    }, [user]);

    useEffect(() => {
        void refreshChats();
    }, [refreshChats]);

    useEffect(() => {
        if (!user) return;

        const interval = setInterval(() => {
            void refreshChats();
        }, 3000);

        return () => clearInterval(interval);
    }, [user, refreshChats]);

    const sendMessage = async (chatId: string, senderId: string, text: string) => {
        try {
            const response = await apiService.sendChatMessage(chatId, {
                senderId: Number(senderId),
                content: text,
            });

            const newMessage: Message = {
                id: response.id,
                senderId: response.senderId,
                senderName: response.senderName,
                text: response.content,
                timestamp: response.sentAt,
                isRead: false,
            };

            setChats(prev =>
                prev.map(chat =>
                    chat.id === chatId
                        ? {...chat, messages: [...chat.messages, newMessage]}
                        : chat
                )
            );
        } catch (error) {
            console.error('Failed to send message:', error);
            throw error;
        }
    };

    const markAsRead = async (chatId: string) => {
        if (!user) return;
        try {
            await apiService.markChatAsRead(chatId, user.id);
            setChats(prev =>
                prev.map(c => (c.id === chatId ? {...c, unreadCount: 0} : c))
            );
        } catch (err) {
            console.error('Failed to mark chat as read:', err);
        }
    };

    return (
        <ChatsContext.Provider
            value={{
                chats,
                loading,
                refreshChats,
                sendMessage,
                markAsRead,
            }}
        >
            {children}
        </ChatsContext.Provider>
    );
}

export function useChats() {
    const context = useContext(ChatsContext);
    if (!context) {
        throw new Error('useChats must be used within a ChatsProvider');
    }
    return context;
}