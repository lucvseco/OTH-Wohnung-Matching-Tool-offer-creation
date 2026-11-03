import { Link } from 'react-router';
import { useAuth } from '../context/AuthContext';
import { useApplications } from '../context/ApplicationsContext';
import { useOffers } from '../context/OffersContext';
import { Clock, CheckCircle, XCircle, MessageCircle } from 'lucide-react';

export function MyApplicationsPage() {
  const { user } = useAuth();
  const { getApplicationsByApplicant } = useApplications();
  const { getOfferById } = useOffers();

  const myApplications = user ? getApplicationsByApplicant(user.id) : [];

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock size={20} className="text-yellow-600" />;
      case 'approved':
        return <CheckCircle size={20} className="text-green-600" />;
      case 'declined':
        return <XCircle size={20} className="text-red-600" />;
      case 'offered':
        return <CheckCircle size={20} className="text-blue-600" />;
      case 'rented':
        return <XCircle size={20} className="text-gray-500" />;
      default:
        return null;
    }
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      pending: 'bg-yellow-50 text-yellow-700 border-yellow-200',
      approved: 'bg-green-50 text-green-700 border-green-200',
      declined: 'bg-red-50 text-red-700 border-red-200',
      offered: 'bg-blue-50 text-blue-700 border-blue-200',
      rented: 'bg-gray-100 text-gray-700 border-gray-300',
    };
    const labels = {
      pending: 'Pending Review',
      approved: 'Approved - Chat Available',
      declined: 'Not Selected',
      offered: 'Offer Accepted',
      rented: 'Rented to someone else',
    };
    return {
      style: styles[status as keyof typeof styles] || styles.pending,
      label: labels[status as keyof typeof labels] || status,
    };
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">My Applications</h1>
        <p className="text-gray-600">{myApplications.length} applications submitted</p>
      </div>

      {myApplications.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-12 text-center">
          <p className="text-gray-500 mb-4">You haven't applied to any offers yet</p>
          <Link
            to="/"
            className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            Browse Available Offers
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {myApplications.map((app) => {
            const offer = getOfferById(app.offerId);
            if (!offer) return null;

            // The other applications of a rented apartment keep their status, show that it is gone
            const displayStatus = offer.isRented && (app.status === 'pending' || app.status === 'approved')
                ? 'rented'
                : app.status;
            const statusInfo = getStatusBadge(displayStatus);

            return (
              <div key={app.id} className="bg-white rounded-lg shadow-sm border p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <Link
                      to={`/offer/${offer.id}`}
                      className="font-semibold text-lg text-gray-900 hover:text-blue-600 transition-colors"
                    >
                      {offer.name}
                    </Link>
                    <p className="text-sm text-gray-600 mt-1">{offer.address}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      Applied {new Date(app.createdAt).toLocaleDateString('de-DE')}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusIcon(displayStatus)}
                    <span className={`px-3 py-1 rounded-full text-xs font-medium border whitespace-nowrap ${statusInfo.style}`}>
                      {statusInfo.label}
                    </span>
                  </div>
                </div>

                <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm font-medium text-gray-700 mb-2">Your message:</p>
                  <p className="text-sm text-gray-600 whitespace-pre-line">{app.message}</p>
                </div>

                {app.status === 'declined' && app.declineMessage && (
                  <div className="mb-4 p-4 bg-red-50 rounded-lg border border-red-200">
                    <p className="text-sm font-medium text-red-900 mb-2">Message from owner:</p>
                    <p className="text-sm text-red-700">{app.declineMessage}</p>
                  </div>
                )}

                {app.status === 'approved' && (
                  <Link
                    to="/chats"
                    className="flex items-center justify-center gap-2 w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                  >
                    <MessageCircle size={20} />
                    Go to Chat
                  </Link>
                )}

                {app.status === 'offered' && (
                  <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <p className="text-sm font-medium text-blue-900 mb-1">🎉 Congratulations!</p>
                    <p className="text-sm text-blue-700">
                      You've been selected for this accommodation. The chat is still available to coordinate move-in details.
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
