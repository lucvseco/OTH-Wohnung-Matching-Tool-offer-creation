import { fetchOrThrow } from "./apiError";

const API_BASE_URL = 'http://localhost:8080'; // Change to your Spring Boot port

export interface OfferResponse {
    id: number;
    apartment: {
        id: number;
        title: string;
        description: string;
        price: number;
        deposit: number;
        location: string;
        apartmentType: 'WG' | 'STUDIO' | 'ROOM' | 'APARTMENT' | 'SUBLET';
        totalOccupants: number;
        photoUrls: string[];
    };
    owner: {
        id: number;
    };
    availableFrom: string;
    availableUntil: string;
    active: boolean;
    rented: boolean;
    createdAt: string;
}

export interface ChatMessageResponse {
    id: string;
    chatId: string;
    senderId: string;
    senderName: string;
    content: string;
    isRead: boolean;
    sentAt: string;
}

export interface ChatResponse {
    id: string;
    applicationId: string;
    applicationStatus?: string;
    offerId: string;
    offerTitle: string;
    ownerId: string;
    ownerName: string;
    applicantId: string;
    applicantName: string;
    messages: ChatMessageResponse[];
    unreadCount: number;
    createdAt: string;
}

export const apiService = {
    // Fetch active offers for the Feed Page (includeRented also returns rented ones, flagged with rented=true)
    async getOffers(filters?: { location?: string; maxPrice?: number; apartmentType?: string; includeRented?: boolean }): Promise<OfferResponse[]> {
        const params = new URLSearchParams();
        if (filters?.location) params.append('location', filters.location);
        if (filters?.maxPrice) params.append('maxPrice', filters.maxPrice.toString());
        if (filters?.apartmentType) params.append('apartmentType', filters.apartmentType);
        if (filters?.includeRented) params.append('includeRented', 'true');

        const response = await fetchOrThrow(`${API_BASE_URL}/offers?${params.toString()}`);
        return response.json();
    },

    // Fetch offers belonging to a specific owner for My Offers page
    async getOffersByOwner(ownerId: number | string): Promise<OfferResponse[]> {
        const response = await fetchOrThrow(`${API_BASE_URL}/offers/owner/${ownerId}`);
        return response.json();
    },

    // Post a new listing matching OfferRequestDto layout
    async createOffer(data: any): Promise<OfferResponse> {
        const response = await fetchOrThrow(`${API_BASE_URL}/offers`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
        return response.json();
    },

    // Deactivate an offer
    async deactivateOffer(id: number | string): Promise<OfferResponse> {
        const response = await fetchOrThrow(`${API_BASE_URL}/offers/${id}/deactivate`, {
            method: 'PATCH',
        });
        return response.json();
    },

    async createApplication(data: { offerId: number; applicantId: number; message: string }) {
        const response = await fetchOrThrow(`${API_BASE_URL}/applications`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
        return response.json();
    },

    async updateApplicationStatus(id: string, status: string, declineMessage?: string) {
        const response = await fetchOrThrow(`${API_BASE_URL}/applications/${id}/status`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: status.toUpperCase(), declineMessage }),
        });
        return response.json();
    },

    async getApplicationsByOffer(offerId: string) {
        const response = await fetchOrThrow(`${API_BASE_URL}/applications/offer/${offerId}`);
        return response.json();
    },

    async getApplicationsByApplicant(applicantId: string) {
        const response = await fetchOrThrow(`${API_BASE_URL}/applications/applicant/${applicantId}`);
        return response.json();
    },

    async hasUserApplied(offerId: string, userId: string): Promise<boolean> {
        const response = await fetch(`${API_BASE_URL}/applications/has-applied?offerId=${offerId}&userId=${userId}`);
        if (!response.ok) return false;
        return response.json();
    },

    async getUserNotifications(userId: string) {
        const response = await fetchOrThrow(`${API_BASE_URL}/notifications/user/${userId}`);
        return response.json();
    },

    async markNotificationAsRead(id: string) {
        await fetch(`${API_BASE_URL}/notifications/${id}/read`, { method: 'PATCH' });
    },

    async markAllNotificationsAsRead(userId: string) {
        await fetch(`${API_BASE_URL}/notifications/user/${userId}/read-all`, { method: 'PATCH' });
    },

    // 1. Get all chats for the logged in user
    async getUserChats(userId: string | number): Promise<ChatResponse[]> {
        const response = await fetchOrThrow(`${API_BASE_URL}/chats/user/${userId}`);
        return response.json();
    },

    // 2. Send a message in a chat
    async sendChatMessage(chatId: string | number, data: { senderId: number; content: string }): Promise<ChatMessageResponse> {
        const response = await fetchOrThrow(`${API_BASE_URL}/chats/${chatId}/messages`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
        return response.json();
    },

    // 3. Mark messages in a chat as read
    async markChatAsRead(chatId: string | number, userId: string | number): Promise<void> {
        await fetch(`${API_BASE_URL}/chats/${chatId}/read?userId=${userId}`, {
            method: 'PATCH',
        });
    },

    // 4. Finalize offer to candidate (sets status to OFFERED, deactivates offer, notifies others)
    async finalizeOffer(applicationId: string | number): Promise<void> {
        await fetchOrThrow(`${API_BASE_URL}/applications/${applicationId}/finalize-offer`, {
            method: 'POST',
        });
    }
};