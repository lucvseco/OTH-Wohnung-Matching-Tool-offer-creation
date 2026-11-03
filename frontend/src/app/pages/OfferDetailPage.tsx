import { useParams, useNavigate, Link } from 'react-router';
import { useOffers, StayType } from '../context/OffersContext';
import { useAuth } from '../context/AuthContext';
import { useApplications } from '../context/ApplicationsContext';
import { MapPin, Maximize2, Users, Calendar, Mail, ArrowLeft, Check, X, Minus, Send, UserCheck, Ban, Home } from 'lucide-react';
import { useState } from 'react';
import { ApplyModal } from '../components/ApplyModal';
import { ConfirmModal } from '../components/ConfirmModal';
import { OfferStatusBadge } from '../components/OfferStatusBadge';
import { toast } from 'sonner';
import { describeError } from '../../services/apiError';

export function OfferDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { getOfferById, markOfferAsInactive } = useOffers();
  const { addApplication, hasUserApplied, getApplicationsByOffer, getApplicationsByApplicant } = useApplications();

  const offer = getOfferById(id || '');
  const [selectedImage, setSelectedImage] = useState(0);
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [showDisableModal, setShowDisableModal] = useState(false);

  const isOwner = offer && user && offer.createdBy === user.id;
  const hasApplied = offer && user ? hasUserApplied(offer.id, user.id) : false;
  const applications = offer ? getApplicationsByOffer(offer.id) : [];
  // The tenant the apartment was rented to sees their own application with status "offered"
  const isMyRental = Boolean(offer && user && getApplicationsByApplicant(user.id)
      .some(app => app.offerId === offer.id && app.status === 'offered'));

  if (!offer) {
    return (
        <div className="text-center py-12">
          <p className="text-gray-500">Offer not found</p>
          <button
              onClick={() => navigate('/')}
              className="mt-4 text-blue-600 hover:text-blue-700"
          >
            Back to feed
          </button>
        </div>
    );
  }

  const getStayTypeLabel = (type: StayType) => {
    const labels = {
      zwischenmiete: 'Zwischenmiete',
      nachmieter: 'Nachmieter',
      couchsurfing: 'Couchsurfing',
    };
    return labels[type];
  };

  const getStayTypeBadgeColor = (type: StayType) => {
    const colors = {
      zwischenmiete: 'bg-blue-50 text-blue-700',
      nachmieter: 'bg-green-50 text-green-700',
      couchsurfing: 'bg-purple-50 text-purple-700',
    };
    return colors[type];
  };

  const PermissionIcon = ({ status }: { status: 'allowed' | 'not-allowed' | 'maybe' }) => {
    if (status === 'allowed') return <Check size={20} className="text-green-600" />;
    if (status === 'not-allowed') return <X size={20} className="text-red-600" />;
    return <Minus size={20} className="text-yellow-600" />;
  };

  const handleApply = async (message: string) => {
    if (!offer || !user) return;

    try {
      await addApplication({
        offerId: offer.id,
        applicantId: user.id,
        message,
      });

      toast.success('Application submitted successfully! Check "My Applications" for updates.');
    } catch (error) {
      toast.error('Failed to submit application.', { description: describeError(error) });
      console.error('Error submitting application:', error);
    }
  };

  const handleDisableOffer = () => {
    if (!offer) return;

    markOfferAsInactive(offer.id);
    toast.success('Offer disabled successfully.');
  };

  const totalTenants = offer.genderBreakdown.males + offer.genderBreakdown.females + offer.genderBreakdown.diverse;

  return (
      <div>
        <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6 transition-colors"
        >
          <ArrowLeft size={20} />
          <span>Back to feed</span>
        </button>

        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 p-8">
            <div>
              <div className="aspect-[4/3] rounded-lg overflow-hidden bg-gray-200 mb-4">
                <img
                    src={offer.images[selectedImage]}
                    alt={offer.name}
                    className="w-full h-full object-cover"
                />
              </div>

              {offer.images.length > 1 && (
                  <div className="grid grid-cols-4 gap-2">
                    {offer.images.map((image, index) => (
                        <button
                            key={index}
                            onClick={() => setSelectedImage(index)}
                            className={`aspect-square rounded-lg overflow-hidden ${
                                selectedImage === index ? 'ring-2 ring-blue-600' : 'ring-1 ring-gray-200'
                            }`}
                        >
                          <img
                              src={image}
                              alt={`${offer.name} ${index + 1}`}
                              className="w-full h-full object-cover"
                          />
                        </button>
                    ))}
                  </div>
              )}
            </div>

            <div>
              <div className="mb-6">
                <div className="flex items-start justify-between gap-4 mb-3">
                  <h1 className="text-3xl font-bold text-gray-900">{offer.name}</h1>
                  <div className="flex gap-2">
                  <span className={`text-xs px-3 py-1.5 rounded-full font-medium whitespace-nowrap ${getStayTypeBadgeColor(offer.stayType)}`}>
                    {getStayTypeLabel(offer.stayType)}
                  </span>
                    <OfferStatusBadge offer={offer} className="px-3 py-1.5" />
                  </div>
                </div>

                <div className="flex items-center gap-2 text-gray-600 mb-3">
                  <MapPin size={20} />
                  <span>{offer.address}</span>
                </div>

                {/* TIMELINE DISPLAY CONTAINER BOX */}
                <div className="flex flex-col gap-2 bg-gray-50 border border-gray-100 p-4 rounded-xl text-gray-700">
                  <div className="flex items-center gap-2.5">
                    <Calendar size={18} className="text-blue-600" />
                    <span className="text-sm font-medium">
                    Move in: <strong className="text-gray-900 font-semibold">{new Date(offer.moveInDate).toLocaleDateString('de-DE', {
                      day: '2-digit',
                      month: 'long',
                      year: 'numeric',
                    })}</strong>
                  </span>
                  </div>

                  {/* CONDITIONALLY RENDER MOVE OUT CUTOFF IF IT IS A ZWISCHENMIETE */}
                  {offer.stayType === 'zwischenmiete' && offer.moveOutDate && (
                      <div className="flex items-center gap-2.5 pt-2 border-t border-gray-200/60">
                        <Calendar size={18} className="text-amber-600" />
                        <span className="text-sm font-medium">
                      Move out: <strong className="text-gray-900 font-semibold">{new Date(offer.moveOutDate).toLocaleDateString('de-DE', {
                          day: '2-digit',
                          month: 'long',
                          year: 'numeric',
                        })}</strong>
                    </span>
                      </div>
                  )}
                </div>
              </div>

              <div className="bg-blue-50 rounded-lg p-6 mb-6">
                <div className="text-4xl font-bold text-blue-600 mb-4">
                  {offer.totalPrice > 0 ? `€${offer.totalPrice}` : 'Free'}
                  {offer.totalPrice > 0 && <span className="text-base font-normal text-gray-600">/month</span>}
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Kaltmiete:</span>
                    <span className="font-medium text-gray-900">€{offer.priceBreakdown.kaltmiete}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Nebenkosten:</span>
                    <span className="font-medium text-gray-900">€{offer.priceBreakdown.nebenkosten}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Kaution:</span>
                    <span className="font-medium text-gray-900">€{offer.priceBreakdown.kaution}</span>
                  </div>
                  {offer.priceBreakdown.ablose !== undefined && offer.priceBreakdown.ablose > 0 && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Ablöse:</span>
                        <span className="font-medium text-gray-900">€{offer.priceBreakdown.ablose}</span>
                      </div>
                  )}
                  {offer.priceBreakdown.sonstiges !== undefined && offer.priceBreakdown.sonstiges > 0 && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Sonstiges:</span>
                        <span className="font-medium text-gray-900">€{offer.priceBreakdown.sonstiges}</span>
                      </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-6">
                {offer.area > 0 && (
                    <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
                      <Maximize2 size={24} className="text-gray-600" />
                      <div>
                        <p className="text-sm text-gray-500">Area</p>
                        <p className="font-semibold text-gray-900">{offer.area} m²</p>
                      </div>
                    </div>
                )}

                <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
                  <Users size={24} className="text-gray-600" />
                  <div>
                    <p className="text-sm text-gray-500">Type</p>
                    <p className="font-semibold text-gray-900">{offer.apartmentType}</p>
                  </div>
                </div>
              </div>

              {totalTenants > 0 && (
                  <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                    <h3 className="font-semibold text-gray-900 mb-3">Gender Breakdown in WG</h3>
                    <div className="flex items-center gap-6 text-sm">
                      {offer.genderBreakdown.males > 0 && (
                          <div>
                            <span className="text-gray-600">Males: </span>
                            <span className="font-medium text-gray-900">{offer.genderBreakdown.males}</span>
                          </div>
                      )}
                      {offer.genderBreakdown.females > 0 && (
                          <div>
                            <span className="text-gray-600">Females: </span>
                            <span className="font-medium text-gray-900">{offer.genderBreakdown.females}</span>
                          </div>
                      )}
                      {offer.genderBreakdown.diverse > 0 && (
                          <div>
                            <span className="text-gray-600">Diverse: </span>
                            <span className="font-medium text-gray-900">{offer.genderBreakdown.diverse}</span>
                          </div>
                      )}
                    </div>
                  </div>
              )}
            </div>
          </div>

          <div className="px-8 pb-8 space-y-6">
            <div>
              <h2 className="font-semibold text-lg text-gray-900 mb-3">Description</h2>
              <p className="text-gray-600 leading-relaxed whitespace-pre-line">
                {offer.description}
              </p>
            </div>

            <div>
              <h2 className="font-semibold text-lg text-gray-900 mb-3">Rules & Specifics</h2>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="flex flex-col items-center gap-2 p-4 bg-gray-50 rounded-lg">
                  <PermissionIcon status={offer.specifics.pets} />
                  <span className="text-sm text-gray-700">Pets</span>
                </div>
                <div className="flex flex-col items-center gap-2 p-4 bg-gray-50 rounded-lg">
                  <PermissionIcon status={offer.specifics.smoking} />
                  <span className="text-sm text-gray-700">Smoking</span>
                </div>
                <div className="flex flex-col items-center gap-2 p-4 bg-gray-50 rounded-lg">
                  <PermissionIcon status={offer.specifics.parties} />
                  <span className="text-sm text-gray-700">Parties</span>
                </div>
                <div className="flex flex-col items-center gap-2 p-4 bg-gray-50 rounded-lg">
                  <PermissionIcon status={offer.specifics.instruments} />
                  <span className="text-sm text-gray-700">Instruments</span>
                </div>
                <div className="flex flex-col items-center gap-2 p-4 bg-gray-50 rounded-lg">
                  <PermissionIcon status={offer.specifics.visitors} />
                  <span className="text-sm text-gray-700">Visitors</span>
                </div>
              </div>
              <div className="mt-4 flex items-center gap-6 text-xs text-gray-500">
                <div className="flex items-center gap-1">
                  <Check size={16} className="text-green-600" />
                  <span>Allowed</span>
                </div>
                <div className="flex items-center gap-1">
                  <X size={16} className="text-red-600" />
                  <span>Not Allowed</span>
                </div>
                <div className="flex items-center gap-1">
                  <Minus size={16} className="text-yellow-600" />
                  <span>Maybe</span>
                </div>
              </div>
            </div>

            {!isOwner && (
                <div>
                  {isMyRental ? (
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 text-center">
                        <Home size={32} className="text-blue-600 mx-auto mb-2" />
                        <p className="font-medium text-blue-900">You rented this apartment</p>
                        <p className="text-sm text-blue-700 mt-1">
                          The owner offered this accommodation to you. Use the chat to coordinate the move-in.
                        </p>
                      </div>
                  ) : offer.isRented ? (
                      <div className="bg-gray-100 border border-gray-300 rounded-lg p-6 text-center">
                        <p className="font-medium text-gray-900">This apartment has been rented</p>
                        <p className="text-sm text-gray-600 mt-1">
                          The accommodation has been offered to another applicant.
                        </p>
                      </div>
                  ) : !offer.isActive ? (
                      <div className="bg-gray-100 border border-gray-300 rounded-lg p-6 text-center">
                        <p className="font-medium text-gray-900">This offer is no longer active</p>
                        <p className="text-sm text-gray-600 mt-1">
                          The owner is no longer accepting applications.
                        </p>
                      </div>
                  ) : hasApplied ? (
                      <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
                        <UserCheck size={32} className="text-green-600 mx-auto mb-2" />
                        <p className="font-medium text-green-900">Application Sent</p>
                        <p className="text-sm text-green-700 mt-1">
                          Your application has been submitted. Check "My Applications" for updates.
                        </p>
                      </div>
                  ) : (
                      <button
                          onClick={() => setShowApplyModal(true)}
                          className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-lg"
                      >
                        <Send size={24} />
                        Apply for this accommodation
                      </button>
                  )}
                </div>
            )}

            {isOwner && (
                <div className="space-y-4">
                  {offer.isRented && (
                      <div className="bg-gray-100 border border-gray-300 rounded-lg p-6 text-center">
                        <p className="font-medium text-gray-900">You rented out this apartment</p>
                        <p className="text-sm text-gray-600 mt-1">
                          The offer stays visible to others, marked as rented, and no longer accepts applications.
                        </p>
                      </div>
                  )}

                  {applications.length > 0 && (
                      <div>
                        <h2 className="font-semibold text-lg text-gray-900 mb-3">
                          Applications ({applications.length})
                        </h2>
                        <Link
                            to={`/applications/${offer.id}`}
                            className="block w-full px-6 py-4 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors text-center font-medium text-gray-900"
                        >
                          View All Applications
                        </Link>
                      </div>
                  )}

                  {offer.isActive && (
                      <button
                          onClick={() => setShowDisableModal(true)}
                          className="w-full flex items-center justify-center gap-2 px-6 py-3 border-2 border-red-300 text-red-700 rounded-lg hover:bg-red-50 transition-colors font-medium"
                      >
                        <Ban size={20} />
                        Disable my offer
                      </button>
                  )}
                </div>
            )}

            <div className="bg-blue-50 rounded-lg p-6">
              <div className="flex items-center gap-2 text-gray-700 mb-2">
                <Mail size={20} />
                <span className="font-medium">Contact</span>
              </div>
              <a
                  href={`mailto:${offer.contactEmail}`}
                  className="text-blue-600 hover:text-blue-700 font-medium"
              >
                {offer.contactEmail}
              </a>
            </div>
          </div>
        </div>

        <ApplyModal
            isOpen={showApplyModal}
            onClose={() => setShowApplyModal(false)}
            onSubmit={handleApply}
            offerName={offer.name}
        />

        <ConfirmModal
            isOpen={showDisableModal}
            onClose={() => setShowDisableModal(false)}
            onConfirm={handleDisableOffer}
            title="Disable Offer"
            message="Are you sure you want to disable this offer? It will no longer appear as active to applicants."
            confirmText="Yes, Disable"
            cancelText="No, Keep Active"
        />
      </div>
  );
}