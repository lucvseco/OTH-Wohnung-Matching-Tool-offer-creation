import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router';
import type { Offer } from '../app/context/OffersContext';
import type { Application } from '../app/context/ApplicationsContext';
import { FeedPage } from '../app/pages/FeedPage';
import { OfferDetailPage } from '../app/pages/OfferDetailPage';
import { MyOffersPage } from '../app/pages/MyOffersPage';
import { MyApplicationsPage } from '../app/pages/MyApplicationsPage';
import { ApplicationsManagementPage } from '../app/pages/ApplicationsManagementPage';

const { state, getApplicationsByOfferApi } = vi.hoisted(() => ({
    state: {
        offers: [] as Offer[],
        applications: [] as Application[],
        user: { id: '3', email: 'lena.weber@stud.oth-regensburg.de', name: 'Lena Weber' },
    },
    getApplicationsByOfferApi: vi.fn(),
}));

vi.mock('../app/context/OffersContext', () => ({
    useOffers: () => ({
        offers: state.offers,
        loading: false,
        error: null,
        getOfferById: (id: string) => state.offers.find(offer => offer.id === id),
        markOfferAsInactive: vi.fn(),
    }),
}));
vi.mock('../app/context/AuthContext', () => ({ useAuth: () => ({ user: state.user }) }));
vi.mock('../app/context/ApplicationsContext', () => ({
    useApplications: () => ({
        applications: state.applications,
        addApplication: vi.fn(),
        updateApplicationStatus: vi.fn(),
        getApplicationsByOffer: () => [],
        getApplicationsByApplicant: (id: string) => state.applications.filter(app => app.applicantId === id),
        hasUserApplied: (offerId: string, userId: string) =>
            state.applications.some(app => app.offerId === offerId && app.applicantId === userId),
    }),
}));
vi.mock('../app/context/ChatsContext', () => ({ useChats: () => ({ refreshChats: vi.fn() }) }));
vi.mock('../services/api', () => ({ apiService: { getApplicationsByOffer: getApplicationsByOfferApi } }));
vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn(), info: vi.fn() } }));

const OWNER = '2';
const TENANT = '1';
const VISITOR = '3';

const makeOffer = (overrides: Partial<Offer>): Offer => ({
    id: '1',
    name: 'Room',
    address: 'Galgenbergstraße 30, 93053 Regensburg',
    stayType: 'nachmieter',
    apartmentType: 'WG',
    moveInDate: '2026-12-01',
    area: 18,
    description: 'Bright room with balcony, 5 minutes to the OTH campus.',
    images: ['room.jpg'],
    genderBreakdown: { males: 0, females: 0, diverse: 0 },
    priceBreakdown: { kaltmiete: 400, nebenkosten: 100, kaution: 0 },
    totalPrice: 500,
    specifics: { pets: 'maybe', smoking: 'not-allowed', parties: 'maybe', instruments: 'maybe', visitors: 'allowed' },
    contactEmail: 'anna.schmidt@stud.oth-regensburg.de',
    createdBy: OWNER,
    isActive: true,
    isRented: false,
    ...overrides,
});

const makeApplication = (overrides: Partial<Application>): Application => ({
    id: 'a1',
    offerId: '1',
    applicantId: TENANT,
    applicantName: 'Max Mustermann',
    applicantEmail: 'max.mustermann@stud.oth-regensburg.de',
    message: 'Hi, I am Max and I study at OTH.',
    status: 'pending',
    createdAt: '2026-10-01T10:00:00',
    ...overrides,
});

//the rented offer is the newest one, it must still be listed after the available offer
const available = makeOffer({ id: '1', name: 'Available room', createdAt: '2026-10-01T10:00:00' });
const rented = makeOffer({ id: '2', name: 'Rented room', isActive: false, isRented: true, createdAt: '2026-10-20T10:00:00' });
const disabled = makeOffer({ id: '3', name: 'Disabled room', isActive: false, isRented: false });

const renderAt = (path: string, routePath: string, element: React.ReactNode) =>
    render(
        <MemoryRouter initialEntries={[path]}>
            <Routes>
                <Route path={routePath} element={element} />
            </Routes>
        </MemoryRouter>,
    );

beforeEach(() => {
    state.offers = [available, rented, disabled];
    state.applications = [];
    state.user = { ...state.user, id: VISITOR };
});

describe('Feed', () => {
    const cardTitles = () => screen.getAllByRole('heading', { level: 3 }).map(heading => heading.textContent);

    it('keeps rented ads visible, marked as rented and listed after the available ones', () => {
        renderAt('/', '/', <FeedPage />);

        expect(cardTitles()).toEqual(['Available room', 'Rented room']);
        const rentedCard = screen.getByRole('link', { name: /rented room/i });
        expect(within(rentedCard).getByText('Rented')).toBeInTheDocument();
    });

    it('never shows offers the owner disabled', () => {
        renderAt('/', '/', <FeedPage />);
        expect(screen.queryByText('Disabled room')).not.toBeInTheDocument();
    });

    it('can hide rented ads', async () => {
        const user = userEvent.setup();
        renderAt('/', '/', <FeedPage />);

        await user.click(screen.getByRole('checkbox', { name: /show rented offers \(1\)/i }));
        expect(cardTitles()).toEqual(['Available room']);
    });
});

describe('Offer detail page of a rented apartment', () => {
    const renderOffer = (id: string) => renderAt(`/offer/${id}`, '/offer/:id', <OfferDetailPage />);
    const applyButton = () => screen.queryByRole('button', { name: /apply for this accommodation/i });

    it('is still reachable and tells visitors it is rented', () => {
        renderOffer(rented.id);
        expect(screen.getByRole('heading', { name: 'Rented room' })).toBeInTheDocument();
        expect(screen.getByText('Rented')).toBeInTheDocument();
        expect(screen.getByText(/this apartment has been rented/i)).toBeInTheDocument();
        expect(applyButton()).not.toBeInTheDocument();
    });

    it('tells the tenant that they rented it', () => {
        state.user = { ...state.user, id: TENANT };
        state.applications = [makeApplication({ offerId: rented.id, status: 'offered' })];
        renderOffer(rented.id);
        expect(screen.getByText(/you rented this apartment/i)).toBeInTheDocument();
        expect(screen.queryByText(/offered to another applicant/i)).not.toBeInTheDocument();
    });

    it('tells the owner that it is rented out and hides "Disable my offer"', () => {
        state.user = { ...state.user, id: OWNER };
        renderOffer(rented.id);
        expect(screen.getByText(/you rented out this apartment/i)).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: /disable my offer/i })).not.toBeInTheDocument();
    });

    it('still lets visitors apply to an available apartment', () => {
        renderOffer(available.id);
        expect(applyButton()).toBeInTheDocument();
    });
});

describe('My Offers', () => {
    it('keeps the rented ad in the owner\'s list, marked as rented', () => {
        state.user = { ...state.user, id: OWNER };
        state.offers = [available, rented];
        renderAt('/my-offers', '/my-offers', <MyOffersPage />);

        expect(screen.getByText('Rented room')).toBeInTheDocument();
        const rentedCard = screen.getByRole('link', { name: /rented room/i });
        expect(within(rentedCard).getByText('Rented')).toBeInTheDocument();
    });
});

describe('My Applications', () => {
    it('keeps showing the tenant\'s accepted application', () => {
        state.user = { ...state.user, id: TENANT };
        state.applications = [makeApplication({ offerId: rented.id, status: 'offered' })];
        renderAt('/my-applications', '/my-applications', <MyApplicationsPage />);

        expect(screen.getByRole('link', { name: 'Rented room' })).toBeInTheDocument();
        expect(screen.getByText('Offer Accepted')).toBeInTheDocument();
        expect(screen.getByText(/congratulations/i)).toBeInTheDocument();
    });

    it('shows other applicants that the apartment went to someone else', () => {
        state.user = { ...state.user, id: VISITOR };
        state.applications = [makeApplication({ applicantId: VISITOR, offerId: rented.id, status: 'pending' })];
        renderAt('/my-applications', '/my-applications', <MyApplicationsPage />);

        expect(screen.getByRole('link', { name: 'Rented room' })).toBeInTheDocument();
        expect(screen.getByText('Rented to someone else')).toBeInTheDocument();
        expect(screen.queryByText('Pending Review')).not.toBeInTheDocument();
    });
});

describe('Applications of a rented apartment', () => {
    it('can still be opened, but remaining applicants cannot be approved', async () => {
        state.user = { ...state.user, id: OWNER };
        getApplicationsByOfferApi.mockResolvedValue([
            makeApplication({ id: 'a2', applicantId: VISITOR, applicantName: 'Lena Weber', offerId: rented.id }),
        ]);
        renderAt(`/applications/${rented.id}`, '/applications/:offerId', <ApplicationsManagementPage />);

        expect(await screen.findByText('Lena Weber')).toBeInTheDocument();
        expect(screen.getByText(/this apartment has been rented/i)).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: /approve/i })).not.toBeInTheDocument();
        expect(screen.getByRole('button', { name: /decline/i })).toBeInTheDocument();
    });
});
