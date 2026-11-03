import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router';
import { useOffers } from '../context/OffersContext';
import { useApplications } from '../context/ApplicationsContext';
import { useChats } from '../context/ChatsContext';
import { apiService } from '../../services/api';
import { describeError } from '../../services/apiError';
import { Application } from '../context/ApplicationsContext';
import { DeclineModal } from '../components/DeclineApplicationModal.tsx';
import { ArrowLeft, Check, X, Mail } from 'lucide-react';
import { toast } from 'sonner';

export function ApplicationsManagementPage() {
  const { offerId } = useParams<{ offerId: string }>();
  const navigate = useNavigate();
  const { getOfferById } = useOffers();
  const { updateApplicationStatus } = useApplications();
  const { refreshChats } = useChats();

  const offer = getOfferById(offerId || '');
  const [offerApplications, setOfferApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);

  //modal state for declining
  const [declineTarget, setDeclineTarget] = useState<{ id: string; name: string } | null>(null);

  const fetchOfferApplications = useCallback(async () => {
    if (!offerId) return;
    try {
      setLoading(true);
      const data = await apiService.getApplicationsByOffer(offerId);
      setOfferApplications(data);
    } catch (err) {
      console.error('Failed to load applications for offer:', err);
      toast.error('Could not load applications.', { description: describeError(err) });
    } finally {
      setLoading(false);
    }
  }, [offerId]);

  useEffect(() => {
    fetchOfferApplications();
  }, [fetchOfferApplications]);

  if (!offer) {
    return (
        <div className="text-center py-12">
          <p className="text-gray-500">Offer not found</p>
          <button
              onClick={() => navigate('/my-offers')}
              className="mt-4 text-blue-600 hover:text-blue-700"
          >
            Back to my offers
          </button>
        </div>
    );
  }

  const handleApprove = async (applicationId: string, applicantName: string) => {
    try {
      await updateApplicationStatus(applicationId, 'approved');
      await refreshChats();
      toast.success(`${applicantName}'s application approved! Chat created.`);
      await fetchOfferApplications();
    } catch (error) {
      console.error('Failed to approve application:', error);
      toast.error('Could not approve application.', { description: describeError(error) });
    }
  };

  const handleConfirmDecline = async (declineMessage?: string) => {
    if (!declineTarget) return;

    try {
      //passes the optional decline message to the backend
      await updateApplicationStatus(declineTarget.id, 'declined', declineMessage);
      toast.info(`Application for ${declineTarget.name} declined.`);
      setDeclineTarget(null);
      await fetchOfferApplications();
    } catch (error) {
      console.error('Failed to decline application:', error);
      toast.error('Could not decline application.', { description: describeError(error) });
    }
  };

  const pendingApplications = offerApplications.filter(app => app.status === 'pending');
  const approvedApplications = offerApplications.filter(app => app.status === 'approved' || app.status === 'offered');
  const declinedApplications = offerApplications.filter(app => app.status === 'declined');

  const getStatusBadge = (status: string) => {
    const colors = {
      pending: 'bg-yellow-50 text-yellow-700 border-yellow-200',
      approved: 'bg-green-50 text-green-700 border-green-200',
      declined: 'bg-red-50 text-red-700 border-red-200',
      offered: 'bg-blue-100 text-blue-800 border-blue-300',
    };
    return colors[status as keyof typeof colors] || 'bg-gray-50 text-gray-700 border-gray-200';
  };

  return (
      <div className="max-w-4xl mx-auto">
        <button
            onClick={() => navigate(`/offer/${offer.id}`)}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6 transition-colors"
        >
          <ArrowLeft size={20} />
          <span>Back to offer</span>
        </button>

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Applications for {offer.name}</h1>
          <p className="text-gray-600">{offerApplications.length} total applications</p>
        </div>

        {offer.isRented && (
            <div className="mb-8 p-4 bg-gray-100 border border-gray-300 rounded-lg text-sm text-gray-700">
              <strong className="text-gray-900">This apartment has been rented.</strong> New applicants can't be
              approved anymore, but you can still decline the remaining applications.
            </div>
        )}

        {loading ? (
            <div className="bg-white rounded-lg shadow-sm p-12 text-center">
              <p className="text-gray-500">Loading applications...</p>
            </div>
        ) : offerApplications.length === 0 ? (
            <div className="bg-white rounded-lg shadow-sm p-12 text-center">
              <p className="text-gray-500">No applications yet</p>
            </div>
        ) : (
            <>
              {pendingApplications.length > 0 && (
                  <div className="mb-8">
                    <h2 className="text-xl font-semibold text-gray-900 mb-4">
                      Pending ({pendingApplications.length})
                    </h2>
                    <div className="space-y-4">
                      {pendingApplications.map((app) => (
                          <div key={app.id} className="bg-white rounded-lg shadow-sm border p-6">
                            <div className="flex items-start justify-between mb-4">
                              <div>
                                <h3 className="font-semibold text-lg text-gray-900">{app.applicantName}</h3>
                                <div className="flex items-center gap-2 text-sm text-gray-600 mt-1">
                                  <Mail size={16} />
                                  <span>{app.applicantEmail}</span>
                                </div>
                                <p className="text-xs text-gray-500 mt-1">
                                  Applied {app.createdAt ? new Date(app.createdAt).toLocaleDateString('de-DE') : 'recently'}
                                </p>
                              </div>
                              <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusBadge(app.status)}`}>
                        Pending
                      </span>
                            </div>

                            <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                              <p className="text-sm font-medium text-gray-700 mb-2">Message:</p>
                              <p className="text-gray-600 whitespace-pre-line">{app.message}</p>
                            </div>

                            <div className="flex gap-3">
                              {!offer.isRented && (
                                  <button
                                      onClick={() => handleApprove(app.id, app.applicantName)}
                                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
                                  >
                                    <Check size={20}/>
                                    Approve & Start Chat
                                  </button>
                              )}
                              <button
                                  onClick={() => setDeclineTarget({id: app.id, name: app.applicantName})}
                                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
                              >
                                <X size={20}/>
                                Decline
                              </button>
                            </div>
                          </div>
                      ))}
                    </div>
                  </div>
              )}

              {approvedApplications.length > 0 && (
                  <div className="mb-8">
                    <h2 className="text-xl font-semibold text-gray-900 mb-4">
                      Approved ({approvedApplications.length})
                    </h2>
                    <div className="space-y-4">
                      {approvedApplications.map((app) => (
                          <div key={app.id} className="bg-white rounded-lg shadow-sm border p-6">
                            <div className="flex items-start justify-between mb-4">
                              <div>
                                <h3 className="font-semibold text-lg text-gray-900">{app.applicantName}</h3>
                                <p className="text-sm text-gray-600">{app.applicantEmail}</p>
                              </div>
                              <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusBadge(app.status)}`}>
                        {app.status === 'offered' ? 'Offered' : 'Approved'}
                      </span>
                            </div>

                            <div className="flex gap-3">
                              <button
                                  onClick={() => navigate('/chats')}
                                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                              >
                                Go to Chat
                              </button>
                            </div>
                          </div>
                      ))}
                    </div>
                  </div>
              )}

              {declinedApplications.length > 0 && (
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900 mb-4">
                      Declined ({declinedApplications.length})
                    </h2>
                    <div className="space-y-4">
                      {declinedApplications.map((app) => (
                          <div key={app.id} className="bg-white rounded-lg shadow-sm border p-6 opacity-75">
                            <div className="flex items-start justify-between">
                              <div>
                                <h3 className="font-semibold text-lg text-gray-900">{app.applicantName}</h3>
                                <p className="text-sm text-gray-600">{app.applicantEmail}</p>
                              </div>
                              <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusBadge(app.status)}`}>
                        Declined
                      </span>
                            </div>

                            {app.declineMessage && (
                                <div className="mt-3 p-3 bg-red-50 border border-red-100 rounded-lg text-xs text-red-700">
                                  <strong>Reason provided:</strong> {app.declineMessage}
                                </div>
                            )}
                          </div>
                      ))}
                    </div>
                  </div>
              )}
            </>
        )}

        <DeclineModal
            isOpen={Boolean(declineTarget)}
            onClose={() => setDeclineTarget(null)}
            onSubmit={handleConfirmDecline}
            applicantName={declineTarget?.name || ''}
        />
      </div>
  );
}