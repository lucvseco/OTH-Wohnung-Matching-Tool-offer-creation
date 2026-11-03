import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CreateOfferPage } from '../app/pages/CreateOfferPage';
import { LIMITS, addDaysISO, addYearsISO, todayISO } from '../app/utils/validation';

const { addOffer, navigate } = vi.hoisted(() => ({ addOffer: vi.fn(), navigate: vi.fn() }));

vi.mock('../app/context/OffersContext', () => ({ useOffers: () => ({ addOffer }) }));
vi.mock('../app/context/AuthContext', () => ({
    useAuth: () => ({ user: { id: '1', email: 'max.mustermann@stud.oth-regensburg.de' } }),
}));
vi.mock('react-router', async (importOriginal) => ({
    ...(await importOriginal<typeof import('react-router')>()),
    useNavigate: () => navigate,
}));
vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn(), info: vi.fn() } }));

type User = ReturnType<typeof userEvent.setup>;

const today = todayISO();
const VALID = {
    name: 'Cozy WG Room in City Center',
    address: 'Galgenbergstraße 30, 93053 Regensburg',
    moveIn: addDaysISO(today, 7),
    moveOut: addDaysISO(today, 90),
    description: 'Bright room with balcony, 5 minutes to the OTH campus.',
};

const nextButton = () => screen.getByRole('button', { name: /^next$/i });
const setValue = (element: HTMLElement, value: string) => fireEvent.change(element, { target: { value } });
const expectHeading = (name: RegExp) => expect(screen.getByRole('heading', { name })).toBeInTheDocument();

//walks through the wizard with valid data until the given step is shown
async function goToStep(
    user: User,
    step: number,
    { stay = /^zwischenmiete/i, apartment = /^wg room/i, name = VALID.name, rent = '400' } = {},
) {
    await user.click(screen.getByRole('button', { name: stay }));
    await user.click(nextButton());
    await user.click(screen.getByRole('button', { name: apartment }));
    await user.click(nextButton());
    if (step === 3) return;

    await user.type(screen.getByLabelText('Offer name'), name);
    await user.click(nextButton());
    if (step === 4) return;

    setValue(screen.getByLabelText(/full address/i), VALID.address);
    setValue(screen.getByLabelText(/available from/i), VALID.moveIn);
    const moveOut = screen.queryByLabelText(/available until/i);
    if (moveOut) setValue(moveOut, VALID.moveOut);
    await user.click(nextButton());
    if (step === 5) return;

    if (rent) setValue(screen.getByLabelText(/kaltmiete/i), rent);
    await user.click(nextButton());
    if (step === 6) return;

    if (screen.queryByRole('heading', { name: /gender breakdown/i })) await user.click(nextButton());
    if (step === 7) return;

    await user.click(nextButton());
    if (step === 8) return;

    setValue(screen.getByLabelText('Description'), VALID.description);
    await user.click(nextButton());
    if (step === 9) return;

    await user.click(nextButton());
}

beforeEach(() => {
    addOffer.mockReset();
    navigate.mockReset();
});

describe('CreateOfferPage rejects incorrect values', () => {
    it('step 1/2: cannot continue without choosing a type', async () => {
        const user = userEvent.setup();
        render(<CreateOfferPage />);
        expect(nextButton()).toBeDisabled();
        await user.click(screen.getByRole('button', { name: /^nachmieter/i }));
        await user.click(nextButton());
        expect(nextButton()).toBeDisabled();
    });

    it('name: rejects whitespace, too short, too long and symbol-only names', async () => {
        const user = userEvent.setup();
        render(<CreateOfferPage />);
        await goToStep(user, 3);
        const input = screen.getByLabelText('Offer name');

        for (const bad of ['     ', 'ab', '!!!!!', 'a'.repeat(LIMITS.NAME_MAX + 1)]) {
            setValue(input, bad);
            expect(nextButton()).toBeDisabled();
            expect(input).toHaveAttribute('aria-invalid', 'true');
        }

        setValue(input, 'ab');
        expect(screen.getByText(/at least 3 characters/i)).toBeInTheDocument();

        setValue(input, 'Nice room');
        expect(nextButton()).toBeEnabled();
    });

    it('address: rejects addresses without street number / city', async () => {
        const user = userEvent.setup();
        render(<CreateOfferPage />);
        await goToStep(user, 4);
        setValue(screen.getByLabelText(/available from/i), VALID.moveIn);
        setValue(screen.getByLabelText(/available until/i), VALID.moveOut);

        const address = screen.getByLabelText(/full address/i);
        setValue(address, 'abc');
        expect(screen.getByText(/at least 5 characters/i)).toBeInTheDocument();

        for (const bad of ['   ', 'abc', 'Somewhere', '93053']) {
            setValue(address, bad);
            expect(nextButton()).toBeDisabled();
            expect(address).toHaveAttribute('aria-invalid', 'true');
        }

        setValue(address, VALID.address);
        expect(nextButton()).toBeEnabled();
    });

    it('dates: rejects a move-in date in the past or too far in the future', async () => {
        const user = userEvent.setup();
        render(<CreateOfferPage />);
        await goToStep(user, 4);
        setValue(screen.getByLabelText(/full address/i), VALID.address);
        setValue(screen.getByLabelText(/available until/i), addYearsISO(today, 2));
        const moveIn = screen.getByLabelText(/available from/i);

        setValue(moveIn, addDaysISO(today, -1));
        expect(screen.getByText(/cannot be in the past/i)).toBeInTheDocument();
        expect(nextButton()).toBeDisabled();

        setValue(moveIn, '2020-01-01');
        expect(nextButton()).toBeDisabled();

        setValue(moveIn, addDaysISO(addYearsISO(today, LIMITS.YEARS_AHEAD_MAX), 1));
        expect(screen.getByText(/within the next 2 years/i)).toBeInTheDocument();
        expect(nextButton()).toBeDisabled();

        setValue(moveIn, VALID.moveIn);
        expect(nextButton()).toBeEnabled();
    });

    it('dates: rejects a move-out date before or on the move-in date', async () => {
        const user = userEvent.setup();
        render(<CreateOfferPage />);
        await goToStep(user, 4);
        setValue(screen.getByLabelText(/full address/i), VALID.address);
        setValue(screen.getByLabelText(/available from/i), VALID.moveIn);
        const moveOut = screen.getByLabelText(/available until/i);

        setValue(moveOut, addDaysISO(VALID.moveIn, -3));
        expect(screen.getByText(/must be after the move-in date/i)).toBeInTheDocument();
        expect(nextButton()).toBeDisabled();

        setValue(moveOut, VALID.moveIn);
        expect(nextButton()).toBeDisabled();

        setValue(moveOut, addDaysISO(VALID.moveIn, 1));
        expect(nextButton()).toBeEnabled();
    });

    it('area: rejects negative, zero and unrealistic sizes, and blocks typing "-" or "e"', async () => {
        const user = userEvent.setup();
        render(<CreateOfferPage />);
        await goToStep(user, 5);
        await user.click(screen.getByRole('button', { name: /back/i }));
        const area = screen.getByLabelText(/area/i);

        setValue(area, '-20');
        expect(screen.getByText(/area cannot be negative/i)).toBeInTheDocument();
        expect(nextButton()).toBeDisabled();

        setValue(area, '0');
        expect(nextButton()).toBeDisabled();

        setValue(area, String(LIMITS.AREA_MAX + 1));
        expect(screen.getByText(/cannot exceed/i)).toBeInTheDocument();
        expect(nextButton()).toBeDisabled();

        await user.clear(area);
        await user.type(area, '-30');
        expect(area).toHaveValue(30);
        await user.clear(area);
        await user.type(area, '2e5');
        expect(area).toHaveValue(25);
        expect(nextButton()).toBeEnabled();
    });

    it('prices: rejects negative values, too many decimals and absurd amounts', async () => {
        const user = userEvent.setup();
        render(<CreateOfferPage />);
        await goToStep(user, 5, { rent: '' });

        const kaltmiete = screen.getByLabelText(/kaltmiete/i);
        expect(nextButton()).toBeDisabled(); //Kaltmiete is required for a Zwischenmiete

        setValue(kaltmiete, '-500');
        expect(screen.getByText(/kaltmiete cannot be negative/i)).toBeInTheDocument();
        expect(nextButton()).toBeDisabled();

        setValue(kaltmiete, '400.999');
        expect(screen.getByText(/2 decimal places/i)).toBeInTheDocument();
        expect(nextButton()).toBeDisabled();

        setValue(kaltmiete, '400');
        expect(nextButton()).toBeEnabled();

        for (const [label, value] of [
            [/nebenkosten/i, '-1'],
            [/kaution/i, '-100'],
            [/ablöse/i, '-5'],
            [/sonstiges/i, '-0.5'],
        ] as const) {
            const input = screen.getByLabelText(label);
            setValue(input, value);
            expect(input).toHaveAttribute('aria-invalid', 'true');
            expect(nextButton()).toBeDisabled();
            setValue(input, '');
        }

        setValue(screen.getByLabelText(/kaution/i), String(LIMITS.ONE_TIME_PRICE_MAX + 1));
        expect(screen.getByText(/kaution cannot exceed/i)).toBeInTheDocument();
        expect(nextButton()).toBeDisabled();
        setValue(screen.getByLabelText(/kaution/i), '');

        await user.clear(kaltmiete);
        await user.type(kaltmiete, '-450');
        expect(kaltmiete).toHaveValue(450);
        expect(nextButton()).toBeEnabled();
    });

    it('prices: couchsurfing cannot charge rent', async () => {
        const user = userEvent.setup();
        render(<CreateOfferPage />);
        await goToStep(user, 5, { stay: /^couchsurfing/i, apartment: /^studio/i, rent: '' });
        expect(nextButton()).toBeEnabled();

        setValue(screen.getByLabelText(/kaltmiete/i), '300');
        expect(screen.getByText(/couchsurfing is free/i)).toBeInTheDocument();
        expect(nextButton()).toBeDisabled();
    });

    it('gender breakdown: rejects negative, fractional and too many tenants', async () => {
        const user = userEvent.setup();
        render(<CreateOfferPage />);
        await goToStep(user, 6);
        expectHeading(/gender breakdown/i);

        setValue(screen.getByLabelText('Males'), '-1');
        expect(screen.getByText(/males cannot be negative/i)).toBeInTheDocument();
        expect(nextButton()).toBeDisabled();

        setValue(screen.getByLabelText('Males'), '1.5');
        expect(screen.getByText(/whole number/i)).toBeInTheDocument();
        expect(nextButton()).toBeDisabled();

        setValue(screen.getByLabelText('Males'), '15');
        setValue(screen.getByLabelText('Females'), '10');
        expect(screen.getByText(/at most 20 tenants/i)).toBeInTheDocument();
        expect(nextButton()).toBeDisabled();

        setValue(screen.getByLabelText('Females'), '2');
        expect(nextButton()).toBeEnabled();

        await user.clear(screen.getByLabelText('Diverse'));
        await user.type(screen.getByLabelText('Diverse'), '-1.5');
        expect(screen.getByLabelText('Diverse')).toHaveValue(15);
    });

    it('house rules: rejects duplicates, too long rules and too many rules', async () => {
        const user = userEvent.setup();
        render(<CreateOfferPage />);
        await goToStep(user, 7);
        const input = screen.getByLabelText(/add a custom rule/i);
        const addButton = screen.getByRole('button', { name: /add rule/i });

        setValue(input, 'pets');
        expect(screen.getByText(/already exists/i)).toBeInTheDocument();
        expect(addButton).toBeDisabled();

        setValue(input, 'x'.repeat(LIMITS.CUSTOM_RULE_MAX + 1));
        expect(addButton).toBeDisabled();

        setValue(input, 'Quiet hours after 10 PM');
        await user.click(addButton);
        setValue(input, 'QUIET HOURS AFTER 10 PM');
        expect(addButton).toBeDisabled();

        for (let i = 1; i < LIMITS.CUSTOM_RULES_COUNT_MAX; i++) {
            setValue(input, `Rule number ${i}`);
            await user.click(addButton);
        }
        setValue(input, 'One rule too many');
        expect(screen.getByText(/at most 10 custom rules/i)).toBeInTheDocument();
        expect(addButton).toBeDisabled();

        //pressing Enter must not bypass the check either
        await user.type(input, '{Enter}');
        expect(screen.queryByText('One rule too many')).not.toBeInTheDocument();
    });

    it('description: rejects whitespace, too short and too long descriptions', async () => {
        const user = userEvent.setup();
        render(<CreateOfferPage />);
        await goToStep(user, 8);
        const description = screen.getByLabelText('Description');

        setValue(description, '          ');
        expect(nextButton()).toBeDisabled();

        setValue(description, 'Too short');
        expect(screen.getByText(/at least 20 characters/i)).toBeInTheDocument();
        expect(nextButton()).toBeDisabled();

        setValue(description, 'a'.repeat(LIMITS.DESCRIPTION_MAX + 1));
        expect(screen.getByText(/at most 1000 characters/i)).toBeInTheDocument();
        expect(nextButton()).toBeDisabled();

        setValue(description, VALID.description);
        expect(nextButton()).toBeEnabled();
    });

    it('photos: rejects non-images, oversized files, duplicates and more than the maximum', async () => {
        //applyAccept: false simulates choosing "All files" in the file dialog
        const user = userEvent.setup({ applyAccept: false });
        render(<CreateOfferPage />);
        await goToStep(user, 9);
        const input = screen.getByLabelText(/click to upload/i);

        await user.upload(input, new File(['hello'], 'notes.txt', { type: 'text/plain' }));
        expect(screen.getByText(/"notes.txt" is not a supported image/i)).toBeInTheDocument();

        const huge = new File(['x'], 'huge.jpg', { type: 'image/jpeg' });
        Object.defineProperty(huge, 'size', { value: LIMITS.PHOTO_SIZE_MAX + 1 });
        await user.upload(input, huge);
        expect(screen.getByText(/"huge.jpg" is larger than 1 MB/i)).toBeInTheDocument();
        expect(screen.getByText(`0 / ${LIMITS.PHOTOS_COUNT_MAX} photos`)).toBeInTheDocument();

        const room = new File(['jpg'], 'room.jpg', { type: 'image/jpeg', lastModified: 1 });
        await user.upload(input, room);
        await user.upload(input, room);
        expect(screen.getByText(/"room.jpg" was already added/i)).toBeInTheDocument();
        expect(screen.getByText(`1 / ${LIMITS.PHOTOS_COUNT_MAX} photos`)).toBeInTheDocument();

        const many = Array.from({ length: LIMITS.PHOTOS_COUNT_MAX }, (_, i) =>
            new File(['png'], `photo-${i}.png`, { type: 'image/png', lastModified: i }));
        await user.upload(input, many);
        expect(screen.getByText(/at most 8 photos/i)).toBeInTheDocument();
        expect(screen.getByText(`${LIMITS.PHOTOS_COUNT_MAX} / ${LIMITS.PHOTOS_COUNT_MAX} photos`)).toBeInTheDocument();
        expect(nextButton()).toBeEnabled();
    });
});

describe('CreateOfferPage submit', () => {
    it('requires the landlord confirmation for a Zwischenmiete', async () => {
        const user = userEvent.setup();
        render(<CreateOfferPage />);
        await goToStep(user, 10);
        expectHeading(/review your offer/i);

        await user.click(screen.getByRole('button', { name: /post offer/i }));
        expect(addOffer).not.toHaveBeenCalled();
    });

    it('posts a valid offer with trimmed values', async () => {
        addOffer.mockResolvedValue(undefined);
        const user = userEvent.setup();
        render(<CreateOfferPage />);
        await goToStep(user, 10, { name: '   Cozy WG Room   ' });

        await user.click(screen.getByRole('checkbox'));
        await user.click(screen.getByRole('button', { name: /post offer/i }));

        expect(addOffer).toHaveBeenCalledTimes(1);
        expect(addOffer).toHaveBeenCalledWith(
            expect.objectContaining({
                name: 'Cozy WG Room',
                address: VALID.address,
                stayType: 'zwischenmiete',
                moveInDate: VALID.moveIn,
                moveOutDate: VALID.moveOut,
                totalPrice: 400,
                description: VALID.description,
            }),
            [],
        );
        await waitFor(() => expect(navigate).toHaveBeenCalledWith('/'));
    });

    it('cannot be submitted twice while posting', async () => {
        addOffer.mockReturnValue(new Promise(() => {}));
        const user = userEvent.setup();
        render(<CreateOfferPage />);
        await goToStep(user, 10);

        await user.click(screen.getByRole('checkbox'));
        const post = screen.getByRole('button', { name: /post offer/i });
        await user.dblClick(post);

        expect(addOffer).toHaveBeenCalledTimes(1);
        expect(screen.getByRole('button', { name: /posting/i })).toBeDisabled();
    });
});
