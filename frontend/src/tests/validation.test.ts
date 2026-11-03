import { describe, expect, it } from 'vitest';
import {
    LIMITS,
    addDaysISO,
    addYearsISO,
    filterNewPhotos,
    hasErrors,
    isValidISODate,
    validateAddress,
    validateApplicationMessage,
    validateArea,
    validateChatMessage,
    validateCustomRule,
    validateDeclineMessage,
    validateDescription,
    validateGenderBreakdown,
    validateMoveInDate,
    validateMoveOutDate,
    validateOfferName,
    validateOthEmail,
    validatePassword,
    validatePhoto,
    validatePhotos,
    validatePriceBreakdown,
} from '../app/utils/validation';

//fixed "today" so the date rules give the same result on every day
const TODAY = '2026-06-15';

const prices = (overrides: Partial<Record<string, number>> = {}) => ({
    kaltmiete: 400, nebenkosten: 100, kaution: 1200, ablose: 0, sonstiges: 0, ...overrides,
});

const photo = (name: string, type: string, size = 1000, lastModified = 1) => {
    const file = new File(['x'], name, { type, lastModified });
    Object.defineProperty(file, 'size', { value: size });
    return file;
};

describe('offer name', () => {
    it.each([
        ['', 'empty'],
        ['    ', 'only spaces'],
        ['ab', 'too short'],
        ['a'.repeat(LIMITS.NAME_MAX + 1), 'too long'],
        ['12345', 'no letters'],
        ['!!!???', 'only symbols'],
    ])('rejects %j (%s)', (value) => {
        expect(validateOfferName(value)).not.toBeNull();
    });

    it.each(['Cozy WG Room in City Center', '  Studio  ', 'Zimmer in 3er WG'])('accepts %j', (value) => {
        expect(validateOfferName(value)).toBeNull();
    });
});

describe('address', () => {
    it.each([
        ['', 'empty'],
        ['   ', 'only spaces'],
        ['A 1', 'too short'],
        ['Galgenbergstraße', 'no house number / postal code'],
        ['12345 67890', 'no street or city name'],
        [`Street 1 ${'x'.repeat(LIMITS.ADDRESS_MAX)}`, 'too long'],
    ])('rejects %j (%s)', (value) => {
        expect(validateAddress(value)).not.toBeNull();
    });

    it('accepts a full address', () => {
        expect(validateAddress('Galgenbergstraße 30, 93053 Regensburg')).toBeNull();
    });
});

describe('dates', () => {
    it.each(['2026-02-30', '2026-13-01', '2026-00-10', '20260-01-01', '26-01-01', '01.07.2026', 'tomorrow', ''])(
        'isValidISODate rejects %j',
        (value) => {
            expect(isValidISODate(value)).toBe(false);
        },
    );

    it('isValidISODate accepts real dates incl. leap day', () => {
        expect(isValidISODate('2028-02-29')).toBe(true);
        expect(isValidISODate('2027-02-29')).toBe(false);
    });

    it.each([
        ['', 'missing'],
        ['2026-06-14', 'yesterday'],
        ['2020-01-01', 'years in the past'],
        [addDaysISO(addYearsISO(TODAY, LIMITS.YEARS_AHEAD_MAX), 1), 'too far in the future'],
        ['275760-09-13', 'browser max date'],
        ['2026-02-31', 'impossible date'],
    ])('move-in rejects %j (%s)', (value) => {
        expect(validateMoveInDate(value, TODAY)).not.toBeNull();
    });

    it.each([TODAY, '2026-07-01', addYearsISO(TODAY, LIMITS.YEARS_AHEAD_MAX)])('move-in accepts %j', (value) => {
        expect(validateMoveInDate(value, TODAY)).toBeNull();
    });

    it.each([
        ['', 'missing'],
        ['2026-06-30', 'before move-in'],
        ['2026-07-01', 'same day as move-in'],
        ['2026-06-01', 'in the past'],
        [addDaysISO(addYearsISO('2026-07-01', LIMITS.YEARS_AHEAD_MAX), 1), 'sublet longer than allowed'],
        ['2026-09-31', 'impossible date'],
    ])('move-out rejects %j (%s) for move-in 2026-07-01', (value) => {
        expect(validateMoveOutDate(value, '2026-07-01', TODAY)).not.toBeNull();
    });

    it('move-out accepts a date after move-in', () => {
        expect(validateMoveOutDate('2026-07-02', '2026-07-01', TODAY)).toBeNull();
        expect(validateMoveOutDate('2026-12-31', '2026-07-01', TODAY)).toBeNull();
    });
});

describe('area', () => {
    it.each(['-1', '-50', '0', '4.99', String(LIMITS.AREA_MAX + 1), '1e9', '20.555'])('rejects %j', (value) => {
        expect(validateArea(value)).not.toBeNull();
    });

    it.each(['', '5', '18', '23.5', '120.25'])('accepts %j', (value) => {
        expect(validateArea(value)).toBeNull();
    });
});

describe('price breakdown', () => {
    it.each([
        ['kaltmiete', -1],
        ['kaltmiete', -500],
        ['nebenkosten', -0.01],
        ['kaution', -100],
        ['ablose', -1],
        ['sonstiges', -1],
    ])('rejects negative %s (%d)', (field, value) => {
        const errors = validatePriceBreakdown(prices({ [field]: value }), 'nachmieter');
        expect(errors[field as keyof typeof errors]).toMatch(/negative/i);
    });

    it.each([
        ['kaltmiete', LIMITS.MONTHLY_PRICE_MAX + 1],
        ['nebenkosten', LIMITS.MONTHLY_PRICE_MAX + 1],
        ['kaution', LIMITS.ONE_TIME_PRICE_MAX + 1],
        ['ablose', 1e9],
    ])('rejects unrealistic %s (%d)', (field, value) => {
        const errors = validatePriceBreakdown(prices({ [field]: value }), 'nachmieter');
        expect(errors[field as keyof typeof errors]).toMatch(/exceed/i);
    });

    it.each([NaN, Infinity])('rejects non-numbers (%d)', (value) => {
        expect(validatePriceBreakdown(prices({ kaltmiete: value }), 'nachmieter').kaltmiete).toBeDefined();
    });

    it('rejects more than 2 decimal places', () => {
        expect(validatePriceBreakdown(prices({ kaltmiete: 400.123 }), 'nachmieter').kaltmiete).toMatch(/decimal/);
    });

    it.each(['nachmieter', 'zwischenmiete'] as const)('requires a Kaltmiete for %s', (stayType) => {
        expect(validatePriceBreakdown(prices({ kaltmiete: 0 }), stayType).kaltmiete).toBeDefined();
    });

    it('does not allow rent for couchsurfing', () => {
        const errors = validatePriceBreakdown(prices({ kaltmiete: 200, nebenkosten: 50 }), 'couchsurfing');
        expect(errors.kaltmiete).toBeDefined();
        expect(errors.nebenkosten).toBeDefined();
    });

    it('accepts valid prices', () => {
        expect(hasErrors(validatePriceBreakdown(prices({ kaltmiete: 399.99 }), 'zwischenmiete'))).toBe(false);
        expect(hasErrors(validatePriceBreakdown(prices({ kaltmiete: 0, nebenkosten: 0, kaution: 0 }), 'couchsurfing'))).toBe(false);
    });
});

describe('gender breakdown', () => {
    it.each([
        [{ males: -1, females: 0, diverse: 0 }, 'males'],
        [{ males: 0, females: -3, diverse: 0 }, 'females'],
        [{ males: 0, females: 0, diverse: 1.5 }, 'diverse'],
        [{ males: LIMITS.OCCUPANTS_MAX + 1, females: 0, diverse: 0 }, 'males'],
        [{ males: 15, females: 10, diverse: 0 }, 'total'],
        [{ males: NaN, females: 0, diverse: 0 }, 'males'],
    ])('rejects %j', (breakdown, field) => {
        const errors = validateGenderBreakdown(breakdown);
        expect(errors[field as keyof typeof errors]).toBeDefined();
    });

    it('accepts realistic numbers (and an empty breakdown)', () => {
        expect(hasErrors(validateGenderBreakdown({ males: 2, females: 1, diverse: 0 }))).toBe(false);
        expect(hasErrors(validateGenderBreakdown({ males: 0, females: 0, diverse: 0 }))).toBe(false);
    });
});

describe('custom house rule', () => {
    const reserved = ['Pets', 'Smoking'];

    it.each([
        ['', [], 'empty'],
        ['   ', [], 'only spaces'],
        ['x'.repeat(LIMITS.CUSTOM_RULE_MAX + 1), [], 'too long'],
        ['123', [], 'no letters'],
        ['pets', [], 'same as a predefined rule'],
        ['  SMOKING ', [], 'predefined rule with other case/spaces'],
        ['Quiet hours', ['quiet hours'], 'duplicate custom rule'],
        ['New rule', Array.from({ length: LIMITS.CUSTOM_RULES_COUNT_MAX }, (_, i) => `Rule ${i}`), 'too many rules'],
    ])('rejects %j (%s)', (label, existing, _reason) => {
        expect(validateCustomRule(label, existing, reserved)).not.toBeNull();
    });

    it('accepts a new rule', () => {
        expect(validateCustomRule('Shoes off inside', ['Quiet hours'], reserved)).toBeNull();
    });
});

describe('description', () => {
    it.each([
        ['', 0, 'empty'],
        ['      ', 0, 'only spaces'],
        ['Too short', 0, 'below minimum'],
        ['a'.repeat(LIMITS.DESCRIPTION_MAX + 1), 0, 'above backend limit'],
        ['a'.repeat(LIMITS.DESCRIPTION_MAX - 50), 100, 'fits alone but not with the custom rules appended'],
    ])('rejects %j (%s)', (value, reserved) => {
        expect(validateDescription(value, reserved)).not.toBeNull();
    });

    it('accepts a normal description', () => {
        expect(validateDescription('Bright room with balcony, 5 minutes to the OTH campus.')).toBeNull();
        expect(validateDescription('a'.repeat(LIMITS.DESCRIPTION_MAX))).toBeNull();
    });
});

describe('photos', () => {
    it.each([
        [photo('notes.txt', 'text/plain'), 'text file'],
        [photo('doc.pdf', 'application/pdf'), 'pdf'],
        [photo('anim.gif', 'image/gif'), 'unsupported image type'],
        [photo('vector.svg', 'image/svg+xml'), 'svg'],
        [photo('empty.jpg', 'image/jpeg', 0), 'empty file'],
        [photo('huge.jpg', 'image/jpeg', LIMITS.PHOTO_SIZE_MAX + 1), 'too large'],
    ])('rejects %s (%s)', (file) => {
        expect(validatePhoto(file)).not.toBeNull();
    });

    it.each([photo('a.jpg', 'image/jpeg'), photo('b.png', 'image/png'), photo('c.webp', 'image/webp')])(
        'accepts %s',
        (file) => {
            expect(validatePhoto(file)).toBeNull();
        },
    );

    it('filters out invalid files, duplicates and files over the limit', () => {
        const existing = [photo('room.jpg', 'image/jpeg', 500, 1)];
        const { accepted, errors } = filterNewPhotos(existing, [
            photo('room.jpg', 'image/jpeg', 500, 1),
            photo('virus.exe', 'application/x-msdownload'),
            photo('kitchen.png', 'image/png'),
        ]);
        expect(accepted.map(f => f.name)).toEqual(['kitchen.png']);
        expect(errors).toHaveLength(2);

        const full = Array.from({ length: LIMITS.PHOTOS_COUNT_MAX }, (_, i) => photo(`p${i}.jpg`, 'image/jpeg', 100, i));
        const overLimit = filterNewPhotos(full, [photo('one-more.jpg', 'image/jpeg')]);
        expect(overLimit.accepted).toHaveLength(0);
        expect(overLimit.errors[0]).toMatch(/at most/);
    });

    it('validatePhotos rejects too many photos', () => {
        const tooMany = Array.from({ length: LIMITS.PHOTOS_COUNT_MAX + 1 }, (_, i) => photo(`p${i}.jpg`, 'image/jpeg', 100, i));
        expect(validatePhotos(tooMany)).not.toBeNull();
        expect(validatePhotos([])).toBeNull();
    });
});

describe('login', () => {
    it.each([
        '',
        '   ',
        'max',
        'max@',
        '@oth-regensburg.de',
        'max mustermann@oth-regensburg.de',
        'max@gmail.com',
        'max@oth-regensburg.de.evil.com',
        'max@fake-oth-regensburg.de',
    ])('rejects email %j', (value) => {
        expect(validateOthEmail(value)).not.toBeNull();
    });

    it.each(['max.mustermann@stud.oth-regensburg.de', 'Prof.X@OTH-Regensburg.de', '  anna@oth-regensburg.de  '])(
        'accepts email %j',
        (value) => {
            expect(validateOthEmail(value)).toBeNull();
        },
    );

    it('rejects an empty or whitespace password', () => {
        expect(validatePassword('')).not.toBeNull();
        expect(validatePassword('    ')).not.toBeNull();
        expect(validatePassword('password123')).toBeNull();
    });
});

describe('messages', () => {
    it.each(['', '     ', 'Hi!', 'a'.repeat(LIMITS.APPLICATION_MESSAGE_MAX + 1)])('application rejects %j', (value) => {
        expect(validateApplicationMessage(value)).not.toBeNull();
    });

    it('application accepts a real introduction', () => {
        expect(validateApplicationMessage('Hi, I am Max and I study computer science at OTH.')).toBeNull();
    });

    it('decline reason is optional but limited', () => {
        expect(validateDeclineMessage('')).toBeNull();
        expect(validateDeclineMessage('Sorry, the room is taken.')).toBeNull();
        expect(validateDeclineMessage('a'.repeat(LIMITS.DECLINE_MESSAGE_MAX + 1))).not.toBeNull();
    });

    it.each(['', '   ', '\n\t', 'a'.repeat(LIMITS.CHAT_MESSAGE_MAX + 1)])('chat rejects %j', (value) => {
        expect(validateChatMessage(value)).not.toBeNull();
    });

    it('chat accepts a normal message', () => {
        expect(validateChatMessage('When can I visit the room?')).toBeNull();
    });
});
