import type { Offer } from '../context/OffersContext';

//"Rented" when the apartment was given to an applicant, "Inactive" when the owner disabled the offer
export function OfferStatusBadge({ offer, className = 'px-3 py-1' }: { offer: Pick<Offer, 'isActive' | 'isRented'>; className?: string }) {
    if (offer.isRented) {
        return <span className={`text-xs rounded-full font-medium whitespace-nowrap bg-gray-900 text-white ${className}`}>Rented</span>;
    }
    if (!offer.isActive) {
        return <span className={`text-xs rounded-full font-medium whitespace-nowrap bg-gray-500 text-white ${className}`}>Inactive</span>;
    }
    return null;
}
