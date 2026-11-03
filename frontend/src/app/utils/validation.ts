import type { GenderBreakdown, PriceBreakdown, StayType } from '../context/OffersContext';

//all input rules live here so the forms and the tests share the same limits
//the backend enforces the same values, keep in sync with src/main/java/com/housing/oth_nest/validation/ValidationLimits.java
export const LIMITS = {
    NAME_MIN: 3,
    NAME_MAX: 100,
    ADDRESS_MIN: 5,
    ADDRESS_MAX: 200,
    AREA_MIN: 5,
    AREA_MAX: 1000,
    MONTHLY_PRICE_MAX: 10000,
    ONE_TIME_PRICE_MAX: 50000,
    OCCUPANTS_MAX: 20,
    YEARS_AHEAD_MAX: 2,
    CUSTOM_RULE_MAX: 60,
    CUSTOM_RULES_COUNT_MAX: 10,
    DESCRIPTION_MIN: 20,
    DESCRIPTION_MAX: 1000, //apartment.description column length in the backend
    PHOTOS_COUNT_MAX: 8,
    PHOTO_SIZE_MAX: 1024 * 1024, //spring default max-file-size (1MB), whole request is capped at 10MB
    APPLICATION_MESSAGE_MIN: 20,
    APPLICATION_MESSAGE_MAX: 2000, //@Size(max = 2000) in ApplicationRequestDto
    DECLINE_MESSAGE_MAX: 500,
    CHAT_MESSAGE_MAX: 2000,
} as const;

export const ALLOWED_PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export type FieldErrors<K extends string> = Partial<Record<K, string>>;

export const hasErrors = (errors: Record<string, string | null | undefined>) =>
    Object.values(errors).some(Boolean);

const hasMaxDecimals = (value: number, decimals: number) => {
    const scaled = value * 10 ** decimals;
    return Math.abs(Math.round(scaled) - scaled) < 1e-6;
};

const containsLetter = (value: string) => /\p{L}/u.test(value);

// ---------- dates (always YYYY-MM-DD strings in local time) ----------

export const toISODate = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

export const todayISO = () => toISODate(new Date());

export const addDaysISO = (iso: string, days: number) => {
    const [year, month, day] = iso.split('-').map(Number);
    return toISODate(new Date(year, month - 1, day + days));
};

export const addYearsISO = (iso: string, years: number) => {
    const [year, month, day] = iso.split('-').map(Number);
    return toISODate(new Date(year + years, month - 1, day));
};

//rejects anything that is not a real calendar date, e.g. 2026-02-30 or 5-digit years
export const isValidISODate = (value: string) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const [year, month, day] = value.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
};

// ---------- create offer ----------

export const validateOfferName = (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return 'Please enter a name for your offer.';
    if (trimmed.length < LIMITS.NAME_MIN) return `Name must be at least ${LIMITS.NAME_MIN} characters.`;
    if (trimmed.length > LIMITS.NAME_MAX) return `Name must be at most ${LIMITS.NAME_MAX} characters.`;
    if (!containsLetter(trimmed)) return 'Name must contain letters.';
    return null;
};

export const validateAddress = (address: string) => {
    const trimmed = address.trim();
    if (!trimmed) return 'Please enter the address.';
    if (trimmed.length < LIMITS.ADDRESS_MIN) return `Address must be at least ${LIMITS.ADDRESS_MIN} characters.`;
    if (trimmed.length > LIMITS.ADDRESS_MAX) return `Address must be at most ${LIMITS.ADDRESS_MAX} characters.`;
    if (!containsLetter(trimmed) || !/\d/.test(trimmed)) {
        return 'Please enter a full address (street, house number, postal code and city).';
    }
    return null;
};

export const validateMoveInDate = (moveInDate: string, today = todayISO()) => {
    if (!moveInDate) return 'Please select a move-in date.';
    if (!isValidISODate(moveInDate)) return 'Please enter a valid date.';
    if (moveInDate < today) return 'Move-in date cannot be in the past.';
    if (moveInDate > addYearsISO(today, LIMITS.YEARS_AHEAD_MAX)) {
        return `Move-in date must be within the next ${LIMITS.YEARS_AHEAD_MAX} years.`;
    }
    return null;
};

export const validateMoveOutDate = (moveOutDate: string, moveInDate: string, today = todayISO()) => {
    if (!moveOutDate) return 'Please select a move-out date.';
    if (!isValidISODate(moveOutDate)) return 'Please enter a valid date.';
    if (moveOutDate < today) return 'Move-out date cannot be in the past.';
    if (isValidISODate(moveInDate)) {
        if (moveOutDate <= moveInDate) return 'Move-out date must be after the move-in date.';
        if (moveOutDate > addYearsISO(moveInDate, LIMITS.YEARS_AHEAD_MAX)) {
            return `A sublet can last at most ${LIMITS.YEARS_AHEAD_MAX} years.`;
        }
    }
    return null;
};

//area is optional, but when given it has to be a realistic size
export const validateArea = (area: string) => {
    if (area.trim() === '') return null;
    const value = Number(area);
    if (!Number.isFinite(value)) return 'Area must be a number.';
    if (value < 0) return 'Area cannot be negative.';
    if (value < LIMITS.AREA_MIN) return `Area must be at least ${LIMITS.AREA_MIN} m².`;
    if (value > LIMITS.AREA_MAX) return `Area cannot exceed ${LIMITS.AREA_MAX} m².`;
    if (!hasMaxDecimals(value, 2)) return 'Area can have at most 2 decimal places.';
    return null;
};

const PRICE_FIELDS: { field: keyof PriceBreakdown; label: string; max: number }[] = [
    { field: 'kaltmiete', label: 'Kaltmiete', max: LIMITS.MONTHLY_PRICE_MAX },
    { field: 'nebenkosten', label: 'Nebenkosten', max: LIMITS.MONTHLY_PRICE_MAX },
    { field: 'kaution', label: 'Kaution', max: LIMITS.ONE_TIME_PRICE_MAX },
    { field: 'ablose', label: 'Ablöse', max: LIMITS.ONE_TIME_PRICE_MAX },
    { field: 'sonstiges', label: 'Sonstiges', max: LIMITS.ONE_TIME_PRICE_MAX },
];

export const validatePriceBreakdown = (prices: PriceBreakdown, stayType: StayType | null) => {
    const errors: FieldErrors<keyof PriceBreakdown> = {};

    PRICE_FIELDS.forEach(({ field, label, max }) => {
        const amount = prices[field] ?? 0;
        if (!Number.isFinite(amount)) errors[field] = `${label} must be a number.`;
        else if (amount < 0) errors[field] = `${label} cannot be negative.`;
        else if (amount > max) errors[field] = `${label} cannot exceed €${max.toLocaleString('de-DE')}.`;
        else if (!hasMaxDecimals(amount, 2)) errors[field] = `${label} can have at most 2 decimal places.`;
    });

    //a price of 0 is how the feed recognises couchsurfing, so only couchsurfing may be free
    if (stayType === 'couchsurfing') {
        if (!errors.kaltmiete && prices.kaltmiete > 0) errors.kaltmiete = 'Couchsurfing is free, Kaltmiete must be 0.';
        if (!errors.nebenkosten && prices.nebenkosten > 0) errors.nebenkosten = 'Couchsurfing is free, Nebenkosten must be 0.';
    } else if (!errors.kaltmiete && prices.kaltmiete === 0) {
        errors.kaltmiete = 'Please enter the Kaltmiete (only couchsurfing offers can be free).';
    }

    return errors;
};

const GENDER_FIELDS: { field: keyof GenderBreakdown; label: string }[] = [
    { field: 'males', label: 'Males' },
    { field: 'females', label: 'Females' },
    { field: 'diverse', label: 'Diverse' },
];

export const validateGenderBreakdown = (breakdown: GenderBreakdown) => {
    const errors: FieldErrors<keyof GenderBreakdown | 'total'> = {};

    GENDER_FIELDS.forEach(({ field, label }) => {
        const count = breakdown[field];
        if (!Number.isFinite(count)) errors[field] = `${label} must be a number.`;
        else if (count < 0) errors[field] = `${label} cannot be negative.`;
        else if (!Number.isInteger(count)) errors[field] = `${label} must be a whole number.`;
        else if (count > LIMITS.OCCUPANTS_MAX) errors[field] = `${label} cannot exceed ${LIMITS.OCCUPANTS_MAX}.`;
    });

    const total = breakdown.males + breakdown.females + breakdown.diverse;
    if (!hasErrors(errors) && total > LIMITS.OCCUPANTS_MAX) {
        errors.total = `A WG can have at most ${LIMITS.OCCUPANTS_MAX} tenants in total.`;
    }

    return errors;
};

//reservedLabels are the predefined house rules, a custom rule must not repeat them
export const validateCustomRule = (label: string, existingRules: string[], reservedLabels: string[] = []) => {
    const trimmed = label.trim();
    if (existingRules.length >= LIMITS.CUSTOM_RULES_COUNT_MAX) {
        return `You can add at most ${LIMITS.CUSTOM_RULES_COUNT_MAX} custom rules.`;
    }
    if (!trimmed) return 'Please enter a rule.';
    if (trimmed.length > LIMITS.CUSTOM_RULE_MAX) return `A rule can be at most ${LIMITS.CUSTOM_RULE_MAX} characters.`;
    if (!containsLetter(trimmed)) return 'A rule must contain letters.';
    const normalized = trimmed.toLowerCase();
    if ([...existingRules, ...reservedLabels].some(existing => existing.trim().toLowerCase() === normalized)) {
        return 'This rule already exists.';
    }
    return null;
};

//reservedLength = characters appended to the description on submit (custom house rules)
export const validateDescription = (description: string, reservedLength = 0) => {
    const trimmed = description.trim();
    const max = LIMITS.DESCRIPTION_MAX - reservedLength;
    if (!trimmed) return 'Please add a description.';
    if (trimmed.length < LIMITS.DESCRIPTION_MIN) return `Description must be at least ${LIMITS.DESCRIPTION_MIN} characters.`;
    if (trimmed.length > max) {
        return reservedLength > 0
            ? `Description can be at most ${max} characters (your custom house rules use ${reservedLength} of the ${LIMITS.DESCRIPTION_MAX}).`
            : `Description can be at most ${max} characters.`;
    }
    return null;
};

const formatMegabytes = (bytes: number) => `${Math.round((bytes / (1024 * 1024)) * 10) / 10} MB`;

export const validatePhoto = (file: File) => {
    if (!ALLOWED_PHOTO_TYPES.includes(file.type)) return `"${file.name}" is not a supported image (use JPG, PNG or WEBP).`;
    if (file.size === 0) return `"${file.name}" is empty.`;
    if (file.size > LIMITS.PHOTO_SIZE_MAX) return `"${file.name}" is larger than ${formatMegabytes(LIMITS.PHOTO_SIZE_MAX)}.`;
    return null;
};

const isSameFile = (a: File, b: File) => a.name === b.name && a.size === b.size && a.lastModified === b.lastModified;

//splits a new selection into files that can be added and the reasons the others were rejected
export const filterNewPhotos = (existing: File[], selected: File[]) => {
    const accepted: File[] = [];
    const errors: string[] = [];

    for (const file of selected) {
        const error = validatePhoto(file);
        if (error) {
            errors.push(error);
        } else if ([...existing, ...accepted].some(other => isSameFile(other, file))) {
            errors.push(`"${file.name}" was already added.`);
        } else if (existing.length + accepted.length >= LIMITS.PHOTOS_COUNT_MAX) {
            errors.push(`You can upload at most ${LIMITS.PHOTOS_COUNT_MAX} photos.`);
            break;
        } else {
            accepted.push(file);
        }
    }

    return { accepted, errors };
};

export const validatePhotos = (files: File[]) => {
    if (files.length > LIMITS.PHOTOS_COUNT_MAX) return `You can upload at most ${LIMITS.PHOTOS_COUNT_MAX} photos.`;
    for (const file of files) {
        const error = validatePhoto(file);
        if (error) return error;
    }
    return null;
};

// ---------- login ----------

export const validateOthEmail = (email: string) => {
    const trimmed = email.trim();
    if (!trimmed) return 'Please enter your email address.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) return 'Please enter a valid email address.';
    if (!/@([a-z0-9-]+\.)*oth-regensburg\.de$/i.test(trimmed)) {
        return 'Please use your OTH email address (…@oth-regensburg.de).';
    }
    return null;
};

export const validatePassword = (password: string) => (password.trim() ? null : 'Please enter your password.');

// ---------- applications & chat ----------

export const validateApplicationMessage = (message: string) => {
    const trimmed = message.trim();
    if (!trimmed) return 'Please write a short message.';
    if (trimmed.length < LIMITS.APPLICATION_MESSAGE_MIN) {
        return `Message must be at least ${LIMITS.APPLICATION_MESSAGE_MIN} characters.`;
    }
    if (trimmed.length > LIMITS.APPLICATION_MESSAGE_MAX) {
        return `Message can be at most ${LIMITS.APPLICATION_MESSAGE_MAX} characters.`;
    }
    return null;
};

//declining without a reason is allowed, only the length is limited
export const validateDeclineMessage = (message: string) =>
    message.trim().length > LIMITS.DECLINE_MESSAGE_MAX
        ? `Reason can be at most ${LIMITS.DECLINE_MESSAGE_MAX} characters.`
        : null;

export const validateChatMessage = (message: string) => {
    const trimmed = message.trim();
    if (!trimmed) return 'Message cannot be empty.';
    if (trimmed.length > LIMITS.CHAT_MESSAGE_MAX) return `Message can be at most ${LIMITS.CHAT_MESSAGE_MAX} characters.`;
    return null;
};
