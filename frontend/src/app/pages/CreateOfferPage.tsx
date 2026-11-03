import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';
import { useOffers, StayType, ApartmentType, PermissionStatus, GenderBreakdown, PriceBreakdown, OfferSpecifics } from '../context/OffersContext';
import { useAuth } from '../context/AuthContext';
import { FieldError } from '../components/FieldError';
import {
    LIMITS,
    ALLOWED_PHOTO_TYPES,
    hasErrors,
    todayISO,
    addDaysISO,
    addYearsISO,
    validateOfferName,
    validateAddress,
    validateMoveInDate,
    validateMoveOutDate,
    validateArea,
    validatePriceBreakdown,
    validateGenderBreakdown,
    validateCustomRule,
    validateDescription,
    validatePhotos,
    filterNewPhotos,
} from '../utils/validation';
import { ArrowLeft, ArrowRight, Check, Upload, X, Plus } from 'lucide-react';

export type HouseRuleValue = PermissionStatus;

//define house rules options
export const HOUSE_RULE_OPTIONS: { value: HouseRuleValue; label: string; activeColor: string }[] = [
    { value: 'not-allowed', label: 'Not allowed', activeColor: 'bg-red-50 text-red-700 border-red-300 font-semibold shadow-sm' },
    { value: 'maybe', label: 'To be discussed', activeColor: 'bg-amber-50 text-amber-800 border-amber-300 font-semibold shadow-sm' },
    { value: 'allowed', label: 'Allowed', activeColor: 'bg-emerald-50 text-emerald-800 border-emerald-300 font-semibold shadow-sm' },
];

//predefine the optional specifics for the offer
export type OptionalOfferSpecifics = {
    pets?: HouseRuleValue;
    smoking?: HouseRuleValue;
    parties?: HouseRuleValue;
    instruments?: HouseRuleValue;
    visitors?: HouseRuleValue;
};

//define the custom house rule interface
export interface CustomHouseRule {
    id: string;
    label: string;
    value?: HouseRuleValue;
}

interface OfferFormData {
    stayType: StayType | null;
    apartmentType: ApartmentType | null;
    name: string;
    address: string;
    moveInDate: string;
    moveOutDate: string;
    area: string;
    priceBreakdown: PriceBreakdown;
    genderBreakdown: GenderBreakdown;
    specifics: OptionalOfferSpecifics;
    customHouseRules: CustomHouseRule[];
    description: string;
    images: File[];
}

//predefined categories for house rules
const HOUSE_RULE_CATEGORIES: { field: keyof OptionalOfferSpecifics; label: string }[] = [
    { field: 'pets', label: 'Pets' },
    { field: 'smoking', label: 'Smoking' },
    { field: 'parties', label: 'Parties' },
    { field: 'instruments', label: 'Musical Instruments' },
    { field: 'visitors', label: 'Overnight Visitors' },
];

//custom rules must not repeat a predefined category (also under its short review label)
const RESERVED_RULE_LABELS = [...HOUSE_RULE_CATEGORIES.map(c => c.label), 'Instruments', 'Visitors'];

//custom house rules are only stored as text appended to the description (frontend only)
const buildCustomRulesSuffix = (rules: CustomHouseRule[]) => {
    if (rules.length === 0) return '';
    const summary = rules
        .map(r => `• ${r.label}: ${r.value ? HOUSE_RULE_OPTIONS.find(o => o.value === r.value)?.label : 'To be discussed'}`)
        .join('\n');
    return `\n\nAdditional House Rules:\n${summary}`;
};

//errors of a single wizard step, the step is valid when none of them is set
const getStepErrors = (step: number, data: OfferFormData): Record<string, string | null | undefined> => {
    switch (step) {
        case 1: return { stayType: data.stayType ? null : 'Please choose a stay type.' };
        case 2: return { apartmentType: data.apartmentType ? null : 'Please choose an apartment type.' };
        case 3: return { name: validateOfferName(data.name) };
        case 4: return {
            address: validateAddress(data.address),
            moveInDate: validateMoveInDate(data.moveInDate),
            moveOutDate: data.stayType === 'zwischenmiete' ? validateMoveOutDate(data.moveOutDate, data.moveInDate) : null,
            area: validateArea(data.area),
        };
        case 5: return validatePriceBreakdown(data.priceBreakdown, data.stayType);
        case 6: return data.apartmentType === 'WG' ? validateGenderBreakdown(data.genderBreakdown) : {};
        case 8: return { description: validateDescription(data.description, buildCustomRulesSuffix(data.customHouseRules).length) };
        case 9: return { photos: validatePhotos(data.images) };
        default: return {};
    }
};

//number inputs accept 'e', '+' and '-' (e.g. "1e5", "-20"), so block them while typing
const blockNonNumericKeys = (allowDecimals: boolean) => (e: React.KeyboardEvent<HTMLInputElement>) => {
    const blocked = allowDecimals ? ['e', 'E', '+', '-'] : ['e', 'E', '+', '-', '.', ','];
    if (blocked.includes(e.key)) e.preventDefault();
};

const inputClass = (error?: string | null) =>
    `w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none ${
        error ? 'border-red-400 bg-red-50/30' : 'border-gray-300'
    }`;

//errors are shown once a field has a value or the user has left it
function useTouched() {
    const [touched, setTouched] = useState<Record<string, boolean>>({});
    const touch = (field: string) => () => setTouched(prev => ({ ...prev, [field]: true }));
    return { touched, touch };
}

export function CreateOfferPage() {
    const navigate = useNavigate();
    const { addOffer } = useOffers();
    const { user } = useAuth();
    const [currentStep, setCurrentStep] = useState(1);
    const [agreedWithLandlord, setAgreedWithLandlord] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [formData, setFormData] = useState<OfferFormData>({
        stayType: null,
        apartmentType: null,
        name: '',
        address: '',
        moveInDate: '',
        moveOutDate: '',
        area: '',
        priceBreakdown: { kaltmiete: 0, nebenkosten: 0, kaution: 0, ablose: 0, sonstiges: 0 },
        genderBreakdown: { males: 0, females: 0, diverse: 0 },
        specifics: {
            pets: undefined,
            smoking: undefined,
            parties: undefined,
            instruments: undefined,
            visitors: undefined,
        },
        customHouseRules: [],
        description: '',
        images: [],
    });

    const totalSteps = 10;

    const canProceed = () => !hasErrors(getStepErrors(currentStep, formData));

    const handleNext = () => {
        if (canProceed() && currentStep < totalSteps) {
            if (currentStep === 5 && (formData.apartmentType === 'studio' || formData.apartmentType === 'apartment')) {
                setCurrentStep(7);
            } else {
                setCurrentStep(prev => prev + 1);
            }
        }
    };

    const handleBack = () => {
        if (currentStep > 1) {
            if (currentStep === 7 && (formData.apartmentType === 'studio' || formData.apartmentType === 'apartment')) {
                setCurrentStep(5);
            } else {
                setCurrentStep(prev => prev - 1);
            }
        }
    };

    const handleSubmit = async () => {
        if (isSubmitting || !formData.stayType || !formData.apartmentType) return;
        if (formData.stayType === 'zwischenmiete' && !agreedWithLandlord) return;

        //re-check every step, earlier answers can have been changed via "Back"
        const invalidStep = Array.from({ length: totalSteps - 1 }, (_, i) => i + 1)
            .find(step => hasErrors(getStepErrors(step, formData)));
        if (invalidStep !== undefined) {
            setCurrentStep(invalidStep);
            toast.error('Some details are invalid, please check them again.');
            return;
        }

        const totalPrice = Math.round((formData.priceBreakdown.kaltmiete + formData.priceBreakdown.nebenkosten) * 100) / 100;

        const isSharedWG = formData.apartmentType === 'WG';
        const finalGenderBreakdown = isSharedWG ? formData.genderBreakdown : { males: 0, females: 0, diverse: 0 };

        setIsSubmitting(true);
        try {
            const { images, customHouseRules, ...textMetadata } = formData;

            //add custom house rules to the description (only frontend)
            const finalDescription = textMetadata.description.trim() + buildCustomRulesSuffix(customHouseRules);

            await addOffer({
                name: textMetadata.name.trim(),
                address: textMetadata.address.trim(),
                stayType: textMetadata.stayType || 'nachmieter',
                apartmentType: textMetadata.apartmentType || 'apartment',
                moveInDate: textMetadata.moveInDate,
                moveOutDate: textMetadata.stayType === 'zwischenmiete' ? textMetadata.moveOutDate : undefined,
                area: Number(textMetadata.area) || 0,
                description: finalDescription,
                genderBreakdown: finalGenderBreakdown,
                priceBreakdown: textMetadata.priceBreakdown,
                totalPrice,
                specifics: textMetadata.specifics as OfferSpecifics,
                contactEmail: user?.email || 'dummy@oth-regensburg.de',
                createdBy: user?.id || '1',
            }, images);

            navigate('/');
        } catch (error) {
            console.error("Failed to post offer over multipart stream boundary:", error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const renderStepContent = () => {
        switch (currentStep) {
            case 1:
                return (
                    <StepStayType
                        value={formData.stayType}
                        onChange={(stayType) => setFormData(prev => ({ ...prev, stayType }))}
                    />
                );
            case 2:
                return (
                    <StepApartmentType
                        value={formData.apartmentType}
                        onChange={(apartmentType) => setFormData(prev => ({ ...prev, apartmentType }))}
                    />
                );
            case 3:
                return (
                    <StepName
                        value={formData.name}
                        onChange={(name) => setFormData(prev => ({ ...prev, name }))}
                    />
                );
            case 4:
                return (
                    <StepLocation
                        address={formData.address}
                        moveInDate={formData.moveInDate}
                        moveOutDate={formData.moveOutDate}
                        stayType={formData.stayType}
                        area={formData.area}
                        onChange={(field, value) => setFormData(prev => ({ ...prev, [field]: value }))}
                    />
                );
            case 5:
                return (
                    <StepPricing
                        priceBreakdown={formData.priceBreakdown}
                        stayType={formData.stayType}
                        onChange={(priceBreakdown) => setFormData(prev => ({ ...prev, priceBreakdown }))}
                    />
                );
            case 6:
                return (
                    <StepGenderBreakdown
                        genderBreakdown={formData.genderBreakdown}
                        onChange={(genderBreakdown) => setFormData(prev => ({ ...prev, genderBreakdown }))}
                    />
                );
            case 7:
                return (
                    <StepSpecifics
                        specifics={formData.specifics}
                        customRules={formData.customHouseRules}
                        onChange={(specifics) => setFormData(prev => ({ ...prev, specifics }))}
                        onCustomRulesChange={(customHouseRules) => setFormData(prev => ({ ...prev, customHouseRules }))}
                    />
                );
            case 8:
                return (
                    <StepDescription
                        value={formData.description}
                        reservedLength={buildCustomRulesSuffix(formData.customHouseRules).length}
                        onChange={(description) => setFormData(prev => ({ ...prev, description }))}
                    />
                );
            case 9:
                return (
                    <StepPhotos
                        files={formData.images}
                        onChange={(images) => setFormData(prev => ({ ...prev, images }))}
                    />
                );
            case 10:
                return (
                    <StepReview
                        formData={formData}
                        agreed={agreedWithLandlord}
                        onAgreeChange={setAgreedWithLandlord}
                    />
                );
            default:
                return null;
        }
    };

    const displayStepLabel = (currentStep === 6 && (formData.apartmentType === 'studio' || formData.apartmentType === 'apartment'))
        ? 'Step 5 of 9'
        : (formData.apartmentType === 'studio' || formData.apartmentType === 'apartment') && currentStep > 5
            ? `Step ${currentStep - 1} of 9`
            : `Step ${currentStep} of 10`;

    return (
        <div className="max-w-4xl mx-auto">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">Create New Offer</h1>
                <p className="text-gray-600">{displayStepLabel}</p>
            </div>

            <div className="mb-8">
                <div className="flex items-center gap-2">
                    {Array.from({ length: totalSteps }).map((_, index) => {
                        const stepNum = index + 1;
                        if (stepNum === 6 && (formData.apartmentType === 'studio' || formData.apartmentType === 'apartment')) {
                            return null;
                        }
                        return (
                            <div
                                key={index}
                                className={`h-2 flex-1 rounded-full transition-colors ${
                                    stepNum <= currentStep ? 'bg-blue-600' : 'bg-gray-200'
                                }`}
                            />
                        );
                    })}
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-8 mb-6">
                {renderStepContent()}
            </div>

            <div className="flex justify-between">
                <button
                    onClick={currentStep === 1 ? () => navigate('/') : handleBack}
                    className="flex items-center gap-2 px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                >
                    <ArrowLeft size={20} />
                    {currentStep === 1 ? 'Cancel' : 'Back'}
                </button>

                {currentStep < totalSteps ? (
                    <button
                        onClick={handleNext}
                        disabled={!canProceed()}
                        className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                    >
                        Next
                        <ArrowRight size={20} />
                    </button>
                ) : (
                    <button
                        onClick={handleSubmit}
                        disabled={isSubmitting || (formData.stayType === 'zwischenmiete' && !agreedWithLandlord)}
                        className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                    >
                        <Check size={20} />
                        {isSubmitting ? 'Posting...' : 'Post Offer'}
                    </button>
                )}
            </div>
        </div>
    );
}

function StepStayType({ value, onChange }: { value: StayType | null; onChange: (value: StayType) => void }) {
    const options: { value: StayType; label: string; description: string }[] = [
        { value: 'zwischenmiete', label: 'Zwischenmiete', description: 'Temporary sublet for a fixed period' },
        { value: 'nachmieter', label: 'Nachmieter', description: 'Looking for a permanent successor' },
        { value: 'couchsurfing', label: 'Couchsurfing', description: 'Short-term free accommodation' },
    ];

    return (
        <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">What type of stay are you offering?</h2>
            <p className="text-gray-600 mb-6">Choose the category that best describes your offer</p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {options.map((option) => (
                    <button
                        key={option.value}
                        onClick={() => onChange(option.value)}
                        className={`p-6 rounded-lg border-2 text-left transition-all ${
                            value === option.value
                                ? 'border-blue-600 bg-blue-50'
                                : 'border-gray-200 hover:border-gray-300 bg-white'
                        }`}
                    >
                        <h3 className="font-semibold text-lg text-gray-900 mb-2">{option.label}</h3>
                        <p className="text-sm text-gray-600">{option.description}</p>
                    </button>
                ))}
            </div>
        </div>
    );
}

function StepApartmentType({ value, onChange }: { value: ApartmentType | null; onChange: (value: ApartmentType) => void }) {
    const options: { value: ApartmentType; label: string; description: string }[] = [
        { value: 'WG', label: 'WG Room', description: 'Room in a shared apartment' },
        { value: 'studio', label: 'Studio', description: 'Self-contained studio apartment' },
        { value: 'apartment', label: 'Apartment', description: 'Full apartment' },
    ];

    return (
        <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">What type of accommodation?</h2>
            <p className="text-gray-600 mb-6">Select the apartment type</p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {options.map((option) => (
                    <button
                        key={option.value}
                        onClick={() => onChange(option.value)}
                        className={`p-6 rounded-lg border-2 text-left transition-all ${
                            value === option.value
                                ? 'border-blue-600 bg-blue-50'
                                : 'border-gray-200 hover:border-gray-300 bg-white'
                        }`}
                    >
                        <h3 className="font-semibold text-lg text-gray-900 mb-2">{option.label}</h3>
                        <p className="text-sm text-gray-600">{option.description}</p>
                    </button>
                ))}
            </div>
        </div>
    );
}

function StepName({ value, onChange }: { value: string; onChange: (value: string) => void }) {
    const { touched, touch } = useTouched();
    const error = touched.name || value ? validateOfferName(value) : null;

    return (
        <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Give your offer a name</h2>
            <p className="text-gray-600 mb-6">Create a catchy title that describes your accommodation</p>

            <input
                type="text"
                aria-label="Offer name"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                onBlur={touch('name')}
                aria-invalid={Boolean(error)}
                placeholder="e.g., Cozy WG Room in City Center"
                className={`${inputClass(error)} text-lg`}
                autoFocus
            />
            <div className="flex justify-between gap-4">
                <FieldError message={error} />
                <p className="text-sm text-gray-500 mt-1.5 ml-auto">{value.trim().length} / {LIMITS.NAME_MAX}</p>
            </div>
        </div>
    );
}

function StepLocation({
                          address,
                          moveInDate,
                          moveOutDate,
                          stayType,
                          area,
                          onChange,
                      }: {
    address: string;
    moveInDate: string;
    moveOutDate: string;
    stayType: StayType | null;
    area: string;
    onChange: (field: string, value: string) => void;
}) {
    const { touched, touch } = useTouched();
    const today = todayISO();
    const isShown = (field: string, value: string) => touched[field] || value !== '';

    const addressError = isShown('address', address) ? validateAddress(address) : null;
    const moveInError = isShown('moveInDate', moveInDate) ? validateMoveInDate(moveInDate, today) : null;
    const moveOutError = isShown('moveOutDate', moveOutDate) ? validateMoveOutDate(moveOutDate, moveInDate, today) : null;
    const areaError = validateArea(area);

    return (
        <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Location & Availability details</h2>
            <p className="text-gray-600 mb-6">Where and when is your accommodation located?</p>

            <div className="space-y-4">
                <div>
                    <label htmlFor="offer-address" className="block text-sm font-medium text-gray-700 mb-2">
                        Full Address *
                    </label>
                    <input
                        id="offer-address"
                        type="text"
                        value={address}
                        onChange={(e) => onChange('address', e.target.value)}
                        onBlur={touch('address')}
                        aria-invalid={Boolean(addressError)}
                        placeholder="Street, Postal Code, City"
                        className={inputClass(addressError)}
                    />
                    <FieldError message={addressError} />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label htmlFor="offer-move-in" className="block text-sm font-medium text-gray-700 mb-2">
                            Available From *
                        </label>
                        <input
                            id="offer-move-in"
                            type="date"
                            value={moveInDate}
                            min={today}
                            max={addYearsISO(today, LIMITS.YEARS_AHEAD_MAX)}
                            onChange={(e) => onChange('moveInDate', e.target.value)}
                            onBlur={touch('moveInDate')}
                            aria-invalid={Boolean(moveInError)}
                            className={inputClass(moveInError)}
                        />
                        <FieldError message={moveInError} />
                    </div>

                    {stayType === 'zwischenmiete' && (
                        <div>
                            <label htmlFor="offer-move-out" className="block text-sm font-medium text-gray-700 mb-2">
                                Available Until *
                            </label>
                            <input
                                id="offer-move-out"
                                type="date"
                                value={moveOutDate}
                                min={addDaysISO(moveInDate || today, 1)}
                                max={addYearsISO(moveInDate || today, LIMITS.YEARS_AHEAD_MAX)}
                                onChange={(e) => onChange('moveOutDate', e.target.value)}
                                onBlur={touch('moveOutDate')}
                                aria-invalid={Boolean(moveOutError)}
                                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none ${
                                    moveOutError ? 'border-red-400 bg-red-50/30' : 'border-amber-300 bg-amber-50/30'
                                }`}
                            />
                            <FieldError message={moveOutError} />
                        </div>
                    )}
                </div>

                <div>
                    <label htmlFor="offer-area" className="block text-sm font-medium text-gray-700 mb-2">
                        Area (m²) - Optional
                    </label>
                    <input
                        id="offer-area"
                        type="number"
                        value={area}
                        onChange={(e) => onChange('area', e.target.value)}
                        onKeyDown={blockNonNumericKeys(true)}
                        aria-invalid={Boolean(areaError)}
                        placeholder="0"
                        min={LIMITS.AREA_MIN}
                        max={LIMITS.AREA_MAX}
                        className={inputClass(areaError)}
                    />
                    <FieldError message={areaError} />
                </div>
            </div>
        </div>
    );
}

function StepPricing({
                         priceBreakdown,
                         stayType,
                         onChange,
                     }: {
    priceBreakdown: PriceBreakdown;
    stayType: StayType | null;
    onChange: (value: PriceBreakdown) => void;
}) {
    const { touched, touch } = useTouched();

    const updateField = (field: keyof PriceBreakdown, value: string) => {
        onChange({ ...priceBreakdown, [field]: value === '' ? 0 : Number(value) });
    };

    const total = Math.round((priceBreakdown.kaltmiete + priceBreakdown.nebenkosten) * 100) / 100;
    const errors = validatePriceBreakdown(priceBreakdown, stayType);

    const fields: { field: keyof PriceBreakdown; label: string; className?: string }[] = [
        { field: 'kaltmiete', label: stayType === 'couchsurfing' ? 'Kaltmiete (€)' : 'Kaltmiete (€) *' },
        { field: 'nebenkosten', label: 'Nebenkosten (€)' },
        { field: 'kaution', label: 'Kaution (€)' },
        { field: 'ablose', label: 'Ablöse (€) - Optional' },
        { field: 'sonstiges', label: 'Sonstiges (€) - Optional', className: 'md:col-span-2' },
    ];

    return (
        <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Price breakdown</h2>
            <p className="text-gray-600 mb-6">Enter all cost details (use 0 for free/couchsurfing)</p>

            <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {fields.map(({ field, label, className }) => {
                        const value = priceBreakdown[field] ?? 0;
                        const error = touched[field] || value !== 0 ? errors[field] : null;
                        return (
                            <div key={field} className={className}>
                                <label htmlFor={`price-${field}`} className="block text-sm font-medium text-gray-700 mb-2">
                                    {label}
                                </label>
                                <input
                                    id={`price-${field}`}
                                    type="number"
                                    value={value || ''}
                                    onChange={(e) => updateField(field, e.target.value)}
                                    onKeyDown={blockNonNumericKeys(true)}
                                    onBlur={touch(field)}
                                    aria-invalid={Boolean(error)}
                                    placeholder="0"
                                    min="0"
                                    step="0.01"
                                    className={inputClass(error)}
                                />
                                <FieldError message={error} />
                            </div>
                        );
                    })}
                </div>

                <div className="bg-blue-50 rounded-lg p-4">
                    <div className="flex justify-between items-center">
                        <span className="font-medium text-gray-700">Total Monthly Rent:</span>
                        <span className="text-2xl font-bold text-blue-600">€{total}</span>
                    </div>
                </div>
            </div>
        </div>
    );
}

function StepGenderBreakdown({
                                 genderBreakdown,
                                 onChange,
                             }: {
    genderBreakdown: GenderBreakdown;
    onChange: (value: GenderBreakdown) => void;
}) {
    const updateField = (field: keyof GenderBreakdown, value: string) => {
        onChange({ ...genderBreakdown, [field]: value === '' ? 0 : Number(value) });
    };

    const total = genderBreakdown.males + genderBreakdown.females + genderBreakdown.diverse;
    const errors = validateGenderBreakdown(genderBreakdown);

    const fields: { field: keyof GenderBreakdown; label: string }[] = [
        { field: 'males', label: 'Males' },
        { field: 'females', label: 'Females' },
        { field: 'diverse', label: 'Diverse' },
    ];

    return (
        <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Gender breakdown in WG</h2>
            <p className="text-gray-600 mb-6">How many people of each gender live in the apartment?</p>

            <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {fields.map(({ field, label }) => (
                        <div key={field}>
                            <label htmlFor={`gender-${field}`} className="block text-sm font-medium text-gray-700 mb-2">
                                {label}
                            </label>
                            <input
                                id={`gender-${field}`}
                                type="number"
                                value={genderBreakdown[field] || ''}
                                onChange={(e) => updateField(field, e.target.value)}
                                onKeyDown={blockNonNumericKeys(false)}
                                aria-invalid={Boolean(errors[field])}
                                placeholder="0"
                                min="0"
                                max={LIMITS.OCCUPANTS_MAX}
                                step="1"
                                className={inputClass(errors[field])}
                            />
                            <FieldError message={errors[field]} />
                        </div>
                    ))}
                </div>

                <FieldError message={errors.total} />

                {total > 0 && !hasErrors(errors) && (
                    <div className="bg-gray-50 rounded-lg p-4">
                        <span className="text-sm text-gray-600">Total tenants: </span>
                        <span className="font-semibold text-gray-900">{total}</span>
                    </div>
                )}
            </div>
        </div>
    );
}

//house rules
function StepSpecifics({
                           specifics,
                           customRules,
                           onChange,
                           onCustomRulesChange,
                       }: {
    specifics: OptionalOfferSpecifics;
    customRules: CustomHouseRule[];
    onChange: (value: OptionalOfferSpecifics) => void;
    onCustomRulesChange: (rules: CustomHouseRule[]) => void;
}) {
    //custom rule input state
    const [newRuleInput, setNewRuleInput] = useState('');

    const toggleField = (field: keyof OptionalOfferSpecifics, clickedValue: HouseRuleValue) => {
        const nextValue = specifics[field] === clickedValue ? undefined : clickedValue;
        onChange({ ...specifics, [field]: nextValue });
    };

    const existingRuleLabels = customRules.map(rule => rule.label);
    const ruleError = newRuleInput.trim() || customRules.length >= LIMITS.CUSTOM_RULES_COUNT_MAX
        ? validateCustomRule(newRuleInput, existingRuleLabels, RESERVED_RULE_LABELS)
        : null;

    const handleAddCustomRule = (e: React.FormEvent) => {
        e.preventDefault();
        const trimmed = newRuleInput.trim();
        if (!trimmed || validateCustomRule(trimmed, existingRuleLabels, RESERVED_RULE_LABELS)) return;

        const newRule: CustomHouseRule = {
            id: Date.now().toString(),
            label: trimmed,
            value: undefined,
        };

        onCustomRulesChange([...customRules, newRule]);
        setNewRuleInput('');
    };

    const toggleCustomRuleValue = (id: string, clickedValue: HouseRuleValue) => {
        onCustomRulesChange(
            customRules.map(rule => {
                if (rule.id === id) {
                    return {
                        ...rule,
                        value: rule.value === clickedValue ? undefined : clickedValue,
                    };
                }
                return rule;
            })
        );
    };

    //delete custom rule
    const handleDeleteCustomRule = (id: string) => {
        onCustomRulesChange(customRules.filter(rule => rule.id !== id));
    };

    return (
        <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">House rules</h2>
            <p className="text-gray-600 mb-6">
                Set rules for your accommodation or add your own custom preferences. Click any option again to deselect it. Optional step
            </p>

            <div className="space-y-6">
                {HOUSE_RULE_CATEGORIES.map((category) => {
                    const currentValue = specifics[category.field];
                    return (
                        <div key={category.field} className="pb-4 border-b border-gray-100 last:border-b-0">
                            <div className="mb-3">
                                <label className="block text-sm font-medium text-gray-700">
                                    {category.label}
                                </label>
                            </div>

                            <div className="grid grid-cols-3 gap-3">
                                {HOUSE_RULE_OPTIONS.map((option) => {
                                    const isSelected = currentValue === option.value;
                                    return (
                                        <button
                                            key={option.value}
                                            type="button"
                                            onClick={() => toggleField(category.field, option.value)}
                                            className={`px-4 py-3 rounded-lg border-2 text-sm font-medium transition-all ${
                                                isSelected
                                                    ? option.activeColor
                                                    : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300 hover:bg-gray-50/60'
                                            }`}
                                        >
                                            {option.label}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    );
                })}

                {customRules.map((rule) => (
                    <div key={rule.id} className="pb-4 border-b border-gray-100">
                        <div className="flex items-center justify-between mb-3">
                            <label className="block text-sm font-medium text-gray-800">
                                {rule.label}
                            </label>
                            <button
                                type="button"
                                onClick={() => handleDeleteCustomRule(rule.id)}
                                className="text-gray-400 hover:text-red-600 transition-colors p-1"
                                title="Remove rule"
                            >
                                <X size={16} />
                            </button>
                        </div>

                        <div className="grid grid-cols-3 gap-3">
                            {HOUSE_RULE_OPTIONS.map((option) => {
                                const isSelected = rule.value === option.value;
                                return (
                                    <button
                                        key={option.value}
                                        type="button"
                                        onClick={() => toggleCustomRuleValue(rule.id, option.value)}
                                        className={`px-4 py-3 rounded-lg border-2 text-sm font-medium transition-all ${
                                            isSelected
                                                ? option.activeColor
                                                : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300 hover:bg-gray-50/60'
                                        }`}
                                    >
                                        {option.label}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                ))}

                <div className="pt-2">
                    <label htmlFor="custom-rule" className="block text-sm font-medium text-gray-700 mb-2">
                        Add a custom rule
                    </label>
                    <div className="flex gap-2">
                        <input
                            id="custom-rule"
                            type="text"
                            aria-invalid={Boolean(ruleError)}
                            value={newRuleInput}
                            onChange={(e) => setNewRuleInput(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    e.preventDefault();
                                    handleAddCustomRule(e);
                                }
                            }}
                            placeholder="e.g., Quiet hours after 10 PM, Shoes off inside..."
                            className={`flex-1 px-4 py-2.5 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none ${
                                ruleError ? 'border-red-400 bg-red-50/30' : 'border-gray-300'
                            }`}
                        />
                        <button
                            type="button"
                            onClick={handleAddCustomRule}
                            disabled={!newRuleInput.trim() || Boolean(ruleError)}
                            className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <Plus size={16} />
                            Add Rule
                        </button>
                    </div>
                    <FieldError message={ruleError} />
                </div>
            </div>
        </div>
    );
}

function StepDescription({
                             value,
                             reservedLength,
                             onChange,
                         }: {
    value: string;
    reservedLength: number;
    onChange: (value: string) => void;
}) {
    const { touched, touch } = useTouched();
    const error = touched.description || value ? validateDescription(value, reservedLength) : null;
    const maxLength = LIMITS.DESCRIPTION_MAX - reservedLength;
    const length = value.trim().length;

    return (
        <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Add a description</h2>
            <p className="text-gray-600 mb-6">Describe your accommodation, the neighborhood, and what makes it special</p>

            <textarea
                aria-label="Description"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                onBlur={touch('description')}
                aria-invalid={Boolean(error)}
                rows={10}
                placeholder="Tell potential tenants about the room, amenities, location..."
                className={`${inputClass(error)} resize-none`}
                autoFocus
            />
            <FieldError message={error} />
            <p className={`text-sm mt-2 ${length > maxLength ? 'text-red-600' : 'text-gray-500'}`}>
                {length} / {maxLength} characters
            </p>
        </div>
    );
}

function StepPhotos({ files, onChange }: { files: File[]; onChange: (value: File[]) => void }) {
    const [previews, setPreviews] = useState<string[]>([]);
    const [photoErrors, setPhotoErrors] = useState<string[]>([]);

    useEffect(() => {
        const objectUrls = files.map(file => URL.createObjectURL(file));
        setPreviews(objectUrls);
        return () => objectUrls.forEach(url => URL.revokeObjectURL(url));
    }, [files]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFiles = Array.from(e.target.files ?? []);
        e.target.value = ''; //lets the same file be picked again after removing it

        //wrong types, too large files, duplicates and files over the limit are rejected
        const { accepted, errors } = filterNewPhotos(files, selectedFiles);
        setPhotoErrors(errors);
        if (accepted.length > 0) onChange([...files, ...accepted]);
    };

    const removeImage = (index: number) => {
        setPhotoErrors([]);
        onChange(files.filter((_, i) => i !== index));
    };

    return (
        <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Add photos</h2>
            <p className="text-gray-600 mb-6">Upload images to showcase your accommodation</p>

            <div className="space-y-4">
                <div className="flex items-center justify-center w-full">
                    <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors">
                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                            <Upload className="w-10 h-10 text-gray-400 mb-3" />
                            <p className="mb-2 text-sm text-gray-500 font-semibold">Click to upload accommodation files</p>
                            <p className="text-xs text-gray-400">
                                JPG, PNG or WEBP, max {LIMITS.PHOTO_SIZE_MAX / (1024 * 1024)} MB each, up to {LIMITS.PHOTOS_COUNT_MAX} photos
                            </p>
                        </div>
                        <input
                            type="file"
                            multiple
                            accept={ALLOWED_PHOTO_TYPES.join(',')}
                            onChange={handleFileChange}
                            className="hidden"
                        />
                    </label>
                </div>

                {photoErrors.map((error) => (
                    <FieldError key={error} message={error} />
                ))}

                {previews.length > 0 && (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {previews.map((url, index) => (
                            <div key={index} className="relative group">
                                <img
                                    src={url}
                                    alt={`Upload Preview ${index + 1}`}
                                    className="w-full aspect-square object-cover rounded-lg shadow-sm"
                                />
                                <button
                                    type="button"
                                    onClick={() => removeImage(index)}
                                    className="absolute top-2 right-2 w-8 h-8 bg-red-600 text-white rounded-full opacity-100 flex items-center justify-center shadow-md hover:bg-red-700"
                                >
                                    <X size={16} />
                                </button>
                            </div>
                        ))}
                    </div>
                )}
                <p className="text-sm text-gray-500">{files.length} / {LIMITS.PHOTOS_COUNT_MAX} photos</p>
            </div>
        </div>
    );
}

function StepReview({
                        formData,
                        agreed,
                        onAgreeChange
                    }: {
    formData: OfferFormData;
    agreed: boolean;
    onAgreeChange: (value: boolean) => void;
}) {
    const totalPrice = Math.round((formData.priceBreakdown.kaltmiete + formData.priceBreakdown.nebenkosten) * 100) / 100;
    const totalTenants = formData.genderBreakdown.males + formData.genderBreakdown.females + formData.genderBreakdown.diverse;
    const [reviewPreviews, setReviewPreviews] = useState<string[]>([]);

    useEffect(() => {
        const objectUrls = formData.images.map(file => URL.createObjectURL(file));
        setReviewPreviews(objectUrls);
        return () => objectUrls.forEach(url => URL.revokeObjectURL(url));
    }, [formData.images]);

    const getStayTypeLabel = (type: StayType | null) => {
        if (!type) return '';
        const labels = { zwischenmiete: 'Zwischenmiete', nachmieter: 'Nachmieter', couchsurfing: 'Couchsurfing' };
        return labels[type];
    };

    const getHouseRuleLabel = (val?: HouseRuleValue) => {
        if (!val) return 'Not specified';
        const match = HOUSE_RULE_OPTIONS.find(o => o.value === val);
        return match ? match.label : 'Not specified';
    };

    const isSharedWG = formData.apartmentType === 'WG';

    return (
        <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Review your offer</h2>
            <p className="text-gray-600 mb-6">Please check all details before posting</p>

            <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
                    <div>
                        <p className="text-sm text-gray-600 mb-1">Stay Type</p>
                        <p className="font-medium text-gray-900">{getStayTypeLabel(formData.stayType)}</p>
                    </div>
                    <div>
                        <p className="text-sm text-gray-600 mb-1">Apartment Type</p>
                        <p className="font-medium text-gray-900">{formData.apartmentType}</p>
                    </div>
                </div>

                <div>
                    <p className="text-sm text-gray-600 mb-1">Name</p>
                    <p className="font-medium text-gray-900 text-lg">{formData.name}</p>
                </div>

                <div>
                    <p className="text-sm text-gray-600 mb-1">Address</p>
                    <p className="font-medium text-gray-900">{formData.address}</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <p className="text-sm text-gray-600 mb-1">Move-in Date</p>
                        <p className="font-medium text-gray-900">
                            {formData.moveInDate ? new Date(formData.moveInDate).toLocaleDateString('de-DE') : ''}
                        </p>
                    </div>
                    {formData.stayType === 'zwischenmiete' && formData.moveOutDate && (
                        <div>
                            <p className="text-sm text-gray-600 mb-1">Move-out Date (Until)</p>
                            <p className="font-medium text-gray-900">
                                {new Date(formData.moveOutDate).toLocaleDateString('de-DE')}
                            </p>
                        </div>
                    )}
                    {formData.area && (
                        <div>
                            <p className="text-sm text-gray-600 mb-1">Area</p>
                            <p className="font-medium text-gray-900">{formData.area} m²</p>
                        </div>
                    )}
                </div>

                <div className="p-4 bg-blue-50 rounded-lg">
                    <p className="text-sm text-gray-700 mb-2">Price Breakdown</p>
                    <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                            <span>Kaltmiete:</span>
                            <span className="font-medium">€{formData.priceBreakdown.kaltmiete}</span>
                        </div>
                        <div className="flex justify-between">
                            <span>Nebenkosten:</span>
                            <span className="font-medium">€{formData.priceBreakdown.nebenkosten}</span>
                        </div>
                        <div className="flex justify-between">
                            <span>Kaution:</span>
                            <span className="font-medium">€{formData.priceBreakdown.kaution}</span>
                        </div>
                        <div className="flex justify-between pt-2 border-t border-blue-200">
                            <span className="font-medium">Total Monthly:</span>
                            <span className="font-bold text-lg">€{totalPrice}</span>
                        </div>
                    </div>
                </div>

                <div className="p-4 bg-gray-50 rounded-lg">
                    <p className="text-sm font-medium text-gray-700 mb-3">House Rules & Specifics</p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
                        <div>
                            <span className="text-gray-500 block text-xs">Smoking</span>
                            <span className="font-medium text-gray-800">{getHouseRuleLabel(formData.specifics.smoking)}</span>
                        </div>
                        <div>
                            <span className="text-gray-500 block text-xs">Pets</span>
                            <span className="font-medium text-gray-800">{getHouseRuleLabel(formData.specifics.pets)}</span>
                        </div>
                        <div>
                            <span className="text-gray-500 block text-xs">Parties</span>
                            <span className="font-medium text-gray-800">{getHouseRuleLabel(formData.specifics.parties)}</span>
                        </div>
                        <div>
                            <span className="text-gray-500 block text-xs">Instruments</span>
                            <span className="font-medium text-gray-800">{getHouseRuleLabel(formData.specifics.instruments)}</span>
                        </div>
                        <div>
                            <span className="text-gray-500 block text-xs">Visitors</span>
                            <span className="font-medium text-gray-800">{getHouseRuleLabel(formData.specifics.visitors)}</span>
                        </div>
                        {formData.customHouseRules.map((cr) => (
                            <div key={cr.id}>
                                <span className="text-gray-500 block text-xs">{cr.label}</span>
                                <span className="font-medium text-gray-800">{getHouseRuleLabel(cr.value)}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {isSharedWG && totalTenants > 0 && (
                    <div>
                        <p className="text-sm text-gray-600 mb-1">Gender Breakdown</p>
                        <p className="font-medium text-gray-900">
                            {formData.genderBreakdown.males > 0 && `${formData.genderBreakdown.males} male${formData.genderBreakdown.males > 1 ? 's' : ''}`}
                            {formData.genderBreakdown.females > 0 && `, ${formData.genderBreakdown.females} female${formData.genderBreakdown.females > 1 ? 's' : ''}`}
                            {formData.genderBreakdown.diverse > 0 && `, ${formData.genderBreakdown.diverse} diverse`}
                        </p>
                    </div>
                )}

                <div>
                    <p className="text-sm text-gray-600 mb-2">Description</p>
                    <p className="text-gray-900 whitespace-pre-line">{formData.description}</p>
                </div>

                {reviewPreviews.length > 0 && (
                    <div>
                        <p className="text-sm text-gray-600 mb-2">Photos ready for storage upload ({reviewPreviews.length})</p>
                        <div className="grid grid-cols-4 gap-2">
                            {reviewPreviews.map((url, index) => (
                                <img
                                    key={index}
                                    src={url}
                                    alt={`Preview ${index + 1}`}
                                    className="w-full aspect-square object-cover rounded-lg shadow-sm"
                                />
                            ))}
                        </div>
                    </div>
                )}

                {formData.stayType === 'zwischenmiete' && (
                    <div className="mt-6 pt-6 border-t border-gray-200">
                        <label className="flex items-start gap-3 p-4 bg-amber-50 rounded-lg border border-amber-200 cursor-pointer select-none">
                            <input
                                type="checkbox"
                                checked={agreed}
                                onChange={(e) => onAgreeChange(e.target.checked)}
                                className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 mt-0.5"
                            />
                            <span className="text-sm text-amber-900 font-medium">
                                I hereby confirm that this stay has been agreed with by the landlord
                            </span>
                        </label>
                    </div>
                )}
            </div>
        </div>
    );
}