import { Link, useNavigate } from 'react-router';
import { useOffers } from '../context/OffersContext';
import { useAuth } from '../context/AuthContext';
import { OfferStatusBadge } from '../components/OfferStatusBadge';
import { PlusCircle, MapPin, Euro, Calendar } from 'lucide-react';

export function MyOffersPage() {
  const { offers } = useOffers();
  const { user } = useAuth();
  const navigate = useNavigate();

  const myOffers = offers.filter(offer => offer.createdBy === user?.id);

  const getStayTypeLabel = (type: string) => {
    const labels = {
      zwischenmiete: 'Zwischenmiete',
      nachmieter: 'Nachmieter',
      couchsurfing: 'Couchsurfing',
    };
    return labels[type as keyof typeof labels] || type;
  };

  const getStayTypeBadgeColor = (type: string) => {
    const colors = {
      zwischenmiete: 'bg-blue-50 text-blue-700',
      nachmieter: 'bg-green-50 text-green-700',
      couchsurfing: 'bg-purple-50 text-purple-700',
    };
    return colors[type as keyof typeof colors] || 'bg-gray-50 text-gray-700';
  };

  if (myOffers.length === 0) {
    return (
      <div className="max-w-3xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">My Offers</h1>
          <p className="text-gray-600">Manage your housing offers</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-12 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <PlusCircle size={32} className="text-gray-400" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">No offers yet</h2>
          <p className="text-gray-600 mb-6">Start by creating your first housing offer</p>
          <button
            onClick={() => navigate('/create')}
            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            <PlusCircle size={20} />
            Create Offer
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">My Offers</h1>
          <p className="text-gray-600">{myOffers.length} {myOffers.length === 1 ? 'offer' : 'offers'} posted</p>
        </div>
        <button
          onClick={() => navigate('/create')}
          className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
        >
          <PlusCircle size={20} />
          Create Offer
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {myOffers.map((offer) => (
          <div
            key={offer.id}
            className="bg-white rounded-xl shadow-sm overflow-hidden"
          >
            <Link to={`/offer/${offer.id}`} className="block group">
              <div className="aspect-[4/3] overflow-hidden bg-gray-200 relative">
                <img
                  src={offer.images[0]}
                  alt={offer.name}
                  className={`w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 ${
                    offer.isRented ? 'grayscale opacity-80' : ''
                  }`}
                />
                <div className="absolute top-3 right-3 flex gap-2">
                  <span className={`text-xs px-3 py-1 rounded-full font-medium ${getStayTypeBadgeColor(offer.stayType)}`}>
                    {getStayTypeLabel(offer.stayType)}
                  </span>
                  <OfferStatusBadge offer={offer} />
                </div>
              </div>

              <div className="p-5">
                <h3 className="font-semibold text-lg text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">
                  {offer.name}
                </h3>

                <div className="space-y-2 text-sm text-gray-600 mb-4">
                  <div className="flex items-start gap-2">
                    <MapPin size={16} className="mt-0.5 flex-shrink-0" />
                    <span className="line-clamp-1">{offer.address}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Calendar size={16} className="flex-shrink-0" />
                    <span>
                      {new Date(offer.moveInDate).toLocaleDateString('de-DE', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                      })}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4 border-t">
                  <div className="flex items-center gap-1">
                    <Euro size={18} className="text-gray-600" />
                    <span className="font-semibold text-xl text-gray-900">{offer.totalPrice}</span>
                    {offer.totalPrice > 0 && <span className="text-sm text-gray-500">/month</span>}
                  </div>
                  <span className="text-xs px-3 py-1 rounded-full bg-gray-100 text-gray-700 font-medium">
                    {offer.apartmentType}
                  </span>
                </div>
              </div>
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}
