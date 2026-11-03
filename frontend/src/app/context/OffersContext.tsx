import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { apiService } from "../../services/api.ts";
import axios from 'axios';
import { describeError } from '../../services/apiError';

export type StayType = 'zwischenmiete' | 'nachmieter' | 'couchsurfing';
export type ApartmentType = 'WG' | 'studio' | 'apartment';
export type PermissionStatus = 'allowed' | 'not-allowed' | 'maybe';

export interface GenderBreakdown {
  males: number;
  females: number;
  diverse: number;
}

export interface PriceBreakdown {
  kaltmiete: number;
  nebenkosten: number;
  kaution: number;
  ablose?: number;
  sonstiges?: number;
}

export interface OfferSpecifics {
  pets: PermissionStatus;
  smoking: PermissionStatus;
  parties: PermissionStatus;
  instruments: PermissionStatus;
  visitors: PermissionStatus;
}

export interface Offer {
  id: string;
  name: string;
  address: string;
  stayType: StayType;
  apartmentType: ApartmentType;
  moveInDate: string;
  moveOutDate?: string;
  createdAt?: string; // FIXED: Added to interface to resolve TS2339 compiler error on the Feed Page
  area: number;
  description: string;
  images: string[];
  genderBreakdown: GenderBreakdown;
  priceBreakdown: PriceBreakdown;
  totalPrice: number;
  specifics: OfferSpecifics;
  contactEmail: string;
  createdBy: string;
  isActive: boolean;
  isRented: boolean; // offered to an applicant, an inactive offer that is not rented was disabled by the owner
}

export type NewOffer = Omit<Offer, 'id' | 'isActive' | 'isRented' | 'images'>;

interface OffersContextType {
  offers: Offer[];
  loading: boolean;
  error: string | null;
  addOffer: (offer: NewOffer, binaryFiles: File[]) => Promise<void>;
  getOfferById: (id: string) => Offer | undefined;
  markOfferAsInactive: (id: string) => Promise<void>;
  refreshOffers: () => Promise<void>;
}

const OffersContext = createContext<OffersContextType | undefined>(undefined);

const mapBackendToFrontend = (backendOffer: any): Offer => {
  const data = backendOffer || {};

  // Upper-case conversion completely eliminates backend string layout drop bugs
  const backendStayType = String(data.stayType || '').toUpperCase();

  let deducedStayType: StayType = 'nachmieter';
  if (backendStayType === 'COUCHSURFING' || data.price === 0) {
    deducedStayType = 'couchsurfing';
  } else if (backendStayType === 'ZWISCHENMIETE') {
    deducedStayType = 'zwischenmiete';
  } else if (backendStayType === 'NACHMIETER') {
    deducedStayType = 'nachmieter';
  }

  const backendAptType = String(data.apartmentType || '').toUpperCase();
  let deducedAptType: ApartmentType = 'apartment';
  if (backendAptType === 'WG') deducedAptType = 'WG';
  if (backendAptType === 'STUDIO') deducedAptType = 'studio';

  return {
    id: String(data.id || Math.random()),
    name: data.title || 'Untitled Listing',
    address: data.location || 'No Location Provided',
    stayType: deducedStayType,
    apartmentType: deducedAptType,
    moveInDate: data.availableFrom || new Date().toISOString().split('T')[0],
    moveOutDate: data.availableUntil || undefined,
    createdAt: data.createdAt || undefined, // FIXED: Maps backend timestamp into the runtime frontend model
    area: data.area || 0,
    description: data.description || 'No description available.',
    images: data.photoUrls && data.photoUrls.length > 0
        ? data.photoUrls
        : ['https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800'],
    genderBreakdown: {
      males: data.malesCount || 0,
      females: data.femalesCount || 0,
      diverse: data.diverseCount || 0
    },
    priceBreakdown: {
      kaltmiete: data.kaltmiete || data.price || 0,
      nebenkosten: data.nebenkosten || 0,
      kaution: data.deposit || 0,
      ablose: data.ablose || 0,
      sonstiges: data.sonstiges || 0
    },
    totalPrice: data.price || 0,
    specifics: {
      pets: (data.petsPermission as PermissionStatus) || 'maybe',
      smoking: (data.smokingPermission as PermissionStatus) || 'not-allowed',
      parties: (data.partiesPermission as PermissionStatus) || 'maybe',
      instruments: (data.instrumentsPermission as PermissionStatus) || 'maybe',
      visitors: (data.visitorsPermission as PermissionStatus) || 'allowed',
    },
    contactEmail: data.ownerEmail || '',
    createdBy: String(data.ownerId || '1'),
    isActive: data.active ?? true,
    isRented: Boolean(data.rented)
  };
};

export function OffersProvider({ children }: { children: ReactNode }) {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const refreshOffers = async () => {
    try {
      setLoading(true);
      // Rented offers stay in the list so they don't vanish from the feed, the owner's and the tenant's pages
      const backendData = await apiService.getOffers({ includeRented: true });
      const localizedOffers = backendData.map(mapBackendToFrontend);
      setOffers(localizedOffers);
      setError(null);
    } catch (err) {
      setError(describeError(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshOffers();
  }, []);

  const addOffer = async (frontendOffer: NewOffer, binaryFiles: File[]) => {
    let backendAptType = frontendOffer.apartmentType.toUpperCase();
    if (backendAptType === 'STUDIO') {
      backendAptType = 'STUDIO';
    } else if (backendAptType === 'APARTMENT') {
      backendAptType = 'APARTMENT';
    } else {
      backendAptType = 'WG';
    }

    const offerMetadata = {
      ownerId: Number(frontendOffer.createdBy) || 1,
      stayType: frontendOffer.stayType.toUpperCase(),
      apartment: {
        title: frontendOffer.name,
        description: frontendOffer.description,
        price: frontendOffer.totalPrice,
        deposit: frontendOffer.priceBreakdown.kaution,
        location: frontendOffer.address,
        apartmentType: backendAptType,
        totalOccupants: (frontendOffer.genderBreakdown.males || 0) + (frontendOffer.genderBreakdown.females || 0) + (frontendOffer.genderBreakdown.diverse || 0),
        area: frontendOffer.area || 0,
        kaltmiete: frontendOffer.priceBreakdown.kaltmiete || 0,
        nebenkosten: frontendOffer.priceBreakdown.nebenkosten || 0,
        ablose: frontendOffer.priceBreakdown.ablose || 0,
        sonstiges: frontendOffer.priceBreakdown.sonstiges || 0,
        malesCount: frontendOffer.genderBreakdown.males || 0,
        femalesCount: frontendOffer.genderBreakdown.females || 0,
        diverseCount: frontendOffer.genderBreakdown.diverse || 0,
        petsPermission: frontendOffer.specifics.pets || 'maybe',
        smokingPermission: frontendOffer.specifics.smoking || 'not-allowed',
        partiesPermission: frontendOffer.specifics.parties || 'maybe',
        instrumentsPermission: frontendOffer.specifics.instruments || 'maybe',
        visitorsPermission: frontendOffer.specifics.visitors || 'allowed'
      },
      availableFrom: frontendOffer.moveInDate,
      availableUntil: frontendOffer.moveOutDate || null
    };

    const formData = new FormData();
    formData.append(
        'offer',
        new Blob([JSON.stringify(offerMetadata)], { type: 'application/json' })
    );

    binaryFiles.forEach((file) => {
      formData.append('files', file);
    });

    try {
      await axios.post('http://localhost:8080/offers', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        }
      });
      await refreshOffers();
    } catch (err) {
      console.error("Error creating multipart listing on the backend:", err);
      alert(`Could not create the offer:\n${describeError(err)}`);
      throw err;
    }
  };

  const getOfferById = (id: string) => {
    return offers.find(offer => offer.id === id);
  };

  const markOfferAsInactive = async (id: string) => {
    try {
      await apiService.deactivateOffer(id);
      await refreshOffers();
    } catch (err) {
      console.error("Error deactivating listing:", err);
    }
  };

  return (
      <OffersContext.Provider value={{
        offers,
        loading,
        error,
        addOffer,
        getOfferById,
        markOfferAsInactive,
        refreshOffers
      }}>
        {children}
      </OffersContext.Provider>
  );
}

export function useOffers() {
  const context = useContext(OffersContext);
  if (context === undefined) {
    throw new Error('useOffers must be used within an OffersProvider');
  }
  return context;
}