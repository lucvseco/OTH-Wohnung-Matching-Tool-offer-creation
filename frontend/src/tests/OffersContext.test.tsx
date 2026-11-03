import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axios, { AxiosError, AxiosHeaders } from 'axios';
import { OffersProvider, useOffers, type NewOffer } from '../app/context/OffersContext';
import { SERVER_UNREACHABLE } from '../services/apiError';

const { getOffers } = vi.hoisted(() => ({ getOffers: vi.fn() }));

vi.mock('../services/api', () => ({ apiService: { getOffers } }));

function OfferList() {
    const { offers } = useOffers();
    return (
        <ul>
            {offers.map(offer => (
                <li key={offer.id}>
                    {offer.name}: {offer.isRented ? 'rented' : offer.isActive ? 'available' : 'inactive'}
                </li>
            ))}
        </ul>
    );
}

const newOffer: NewOffer = {
    name: 'Bright WG room',
    address: 'Galgenbergstraße 30, 93053 Regensburg',
    stayType: 'nachmieter',
    apartmentType: 'WG',
    moveInDate: '2026-12-01',
    area: 18,
    description: 'Bright room with balcony, 5 minutes to the OTH campus.',
    genderBreakdown: { males: 1, females: 0, diverse: 0 },
    priceBreakdown: { kaltmiete: 400, nebenkosten: 100, kaution: 0 },
    totalPrice: 500,
    specifics: { pets: 'maybe', smoking: 'not-allowed', parties: 'maybe', instruments: 'maybe', visitors: 'allowed' },
    contactEmail: 'max.mustermann@stud.oth-regensburg.de',
    createdBy: '1',
};

function PostOfferButton() {
    const { addOffer } = useOffers();
    return <button onClick={() => addOffer(newOffer, []).catch(() => {})}>Post</button>;
}

const postOfferFailingWith = async (error: AxiosError) => {
    getOffers.mockResolvedValue([]);
    vi.spyOn(axios, 'post').mockRejectedValue(error);
    const alert = vi.spyOn(window, 'alert').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});

    render(
        <OffersProvider>
            <PostOfferButton />
        </OffersProvider>,
    );
    await userEvent.setup().click(screen.getByRole('button', { name: 'Post' }));
    return alert;
};

afterEach(() => {
    vi.restoreAllMocks();
});

describe('OffersContext', () => {
    it('loads rented offers too and maps the rented flag', async () => {
        getOffers.mockResolvedValue([
            { id: 1, title: 'Available room', active: true, rented: false, price: 500 },
            { id: 2, title: 'Rented room', active: false, rented: true, price: 500 },
        ]);

        render(
            <OffersProvider>
                <OfferList />
            </OffersProvider>,
        );

        expect(await screen.findByText('Available room: available')).toBeInTheDocument();
        expect(screen.getByText('Rented room: rented')).toBeInTheDocument();
        expect(getOffers).toHaveBeenCalledWith({ includeRented: true });
    });

    it('shows the real server error when posting an offer fails', async () => {
        const message = "'OfferResponseDto DtoMapper.toOfferResponse(Offer)'";
        const alert = await postOfferFailingWith(new AxiosError('Request failed with status code 500', 'ERR_BAD_RESPONSE', undefined, undefined, {
            status: 500,
            statusText: '',
            data: { status: 500, error: 'Internal Server Error', exception: 'java.lang.NoSuchMethodError', message, path: '/offers' },
            headers: {},
            config: { headers: new AxiosHeaders() },
        }));

        expect(alert).toHaveBeenCalledWith(`Could not create the offer:\nNoSuchMethodError: ${message}`);
    });

    it('only blames the connection when the server could not be reached', async () => {
        const alert = await postOfferFailingWith(new AxiosError('Network Error', 'ERR_NETWORK'));
        expect(alert).toHaveBeenCalledWith(`Could not create the offer:\n${SERVER_UNREACHABLE}`);
    });
});
