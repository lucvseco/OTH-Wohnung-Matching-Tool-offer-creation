import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ChatsPage } from '../app/pages/ChatsPage';
import { LIMITS } from '../app/utils/validation';
import { ApiError } from '../services/apiError';

const { sendMessage, finalizeOffer, toastError, chat, chatsValue, authValue, applicationsValue, offersValue } = vi.hoisted(() => {
    const chat = {
        id: 'chat-1',
        applicationId: 'app-1',
        applicationStatus: 'APPROVED',
        offerId: 'offer-1',
        offerName: 'WG Room',
        ownerId: '2',
        ownerName: 'Anna Schmidt',
        applicantId: '1',
        applicantName: 'Max Mustermann',
        participants: ['2', '1'],
        messages: [],
        unreadCount: 0,
    };
    const sendMessage = vi.fn();
    return {
        sendMessage,
        finalizeOffer: vi.fn(),
        toastError: vi.fn(),
        chat,
        authValue: { user: { id: '1', name: 'Max Mustermann' } },
        applicationsValue: { updateApplicationStatus: vi.fn(), refreshApplications: vi.fn() },
        offersValue: { getOfferById: vi.fn(), refreshOffers: vi.fn() },
        chatsValue: { chats: [chat], sendMessage, markAsRead: vi.fn(), refreshChats: vi.fn() },
    };
});

vi.mock('../app/context/AuthContext', () => ({ useAuth: () => authValue }));
vi.mock('../app/context/ChatsContext', () => ({ useChats: () => chatsValue }));
vi.mock('../app/context/ApplicationsContext', () => ({ useApplications: () => applicationsValue }));
vi.mock('../app/context/OffersContext', () => ({ useOffers: () => offersValue }));
vi.mock('../services/api', () => ({ apiService: { finalizeOffer } }));
vi.mock('sonner', () => ({ toast: { error: toastError, success: vi.fn(), info: vi.fn() } }));

beforeEach(() => {
    sendMessage.mockReset();
    offersValue.getOfferById.mockReturnValue({ id: 'offer-1', isActive: true, isRented: false });
    authValue.user.id = '1';
    chat.applicationStatus = 'APPROVED';
});

describe('ChatsPage rejects incorrect messages', () => {
    const sendButton = () => screen.getByRole('button', { name: /send message/i });

    it.each([
        ['empty', ''],
        ['whitespace-only', '      '],
        ['too long', 'a'.repeat(LIMITS.CHAT_MESSAGE_MAX + 1)],
    ])('does not send an %s message', (_label, message) => {
        render(<ChatsPage />);
        fireEvent.change(screen.getByLabelText('Message'), { target: { value: message } });
        expect(sendButton()).toBeDisabled();

        fireEvent.submit(sendButton().closest('form')!);
        expect(sendMessage).not.toHaveBeenCalled();
    });

    it('explains why a long message is rejected', () => {
        render(<ChatsPage />);
        fireEvent.change(screen.getByLabelText('Message'), { target: { value: 'a'.repeat(LIMITS.CHAT_MESSAGE_MAX + 1) } });
        expect(screen.getByText(/at most 2000 characters/i)).toBeInTheDocument();
    });

    it('sends a valid message trimmed', async () => {
        sendMessage.mockResolvedValue(undefined);
        const user = userEvent.setup();
        render(<ChatsPage />);
        await user.type(screen.getByLabelText('Message'), '   When can I visit the room?  ');
        await user.click(sendButton());
        expect(sendMessage).toHaveBeenCalledWith('chat-1', '1', 'When can I visit the room?');
    });
});

describe('ChatsPage for a rented apartment', () => {
    const offerButton = () => screen.queryByRole('button', { name: /offer this apartment/i });

    beforeEach(() => {
        authValue.user.id = '2'; //the owner
    });

    it('lets the owner offer an apartment that is still available', () => {
        render(<ChatsPage />);
        expect(offerButton()).toBeInTheDocument();
    });

    it('shows who the apartment was rented to instead of the offer/decline buttons', () => {
        chat.applicationStatus = 'OFFERED';
        render(<ChatsPage />);
        expect(screen.getByText(/you rented this apartment to max mustermann/i)).toBeInTheDocument();
        expect(offerButton()).not.toBeInTheDocument();
        expect(screen.queryByRole('button', { name: /^decline$/i })).not.toBeInTheDocument();
    });

    it('does not let the owner offer it to a second applicant', () => {
        offersValue.getOfferById.mockReturnValue({ id: 'offer-1', isActive: false, isRented: true });
        render(<ChatsPage />);
        expect(screen.getByText(/already been rented to another applicant/i)).toBeInTheDocument();
        expect(offerButton()).not.toBeInTheDocument();
        expect(screen.getByRole('button', { name: /^decline$/i })).toBeInTheDocument();
    });

    it('shows the server\'s reason when offering the apartment fails', async () => {
        finalizeOffer.mockRejectedValue(new ApiError('This apartment has already been rented', 400));
        const user = userEvent.setup();
        render(<ChatsPage />);

        await user.click(offerButton()!);
        await user.click(screen.getByRole('button', { name: /confirm offer/i }));
        expect(toastError).toHaveBeenCalledWith('Could not finalize offer', { description: 'This apartment has already been rented' });
    });
});
