import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { apiService } from '../../services/api';
import { useAuth } from './AuthContext';

export type ApplicationStatus = 'pending' | 'approved' | 'declined' | 'offered';

export interface Application {
  id: string;
  offerId: string;
  applicantId: string;
  applicantName: string;
  applicantEmail: string;
  message: string;
  status: ApplicationStatus;
  declineMessage?: string;
  createdAt: string;
}

interface ApplicationsContextType {
  applications: Application[];
  addApplication: (application: { offerId: string; applicantId: string; message: string }) => Promise<void>;
  updateApplicationStatus: (id: string, status: ApplicationStatus, declineMessage?: string) => Promise<void>;
  getApplicationsByOffer: (offerId: string) => Application[];
  getApplicationsByApplicant: (applicantId: string) => Application[];
  hasUserApplied: (offerId: string, userId: string) => boolean;
  refreshApplications: () => Promise<void>;
}

const ApplicationsContext = createContext<ApplicationsContextType | undefined>(undefined);

export function ApplicationsProvider({ children }: { children: ReactNode }) {
  const [applications, setApplications] = useState<Application[]>([]);
  const { user } = useAuth();

  const refreshApplications = useCallback(async () => {
    if (!user) {
      setApplications([]);
      return;
    }
    try {
      //pull applications sent by or received by this user
      const userApplications = await apiService.getApplicationsByApplicant(user.id);
      setApplications(userApplications);
    } catch (err) {
      console.error('Failed to sync applications with backend:', err);
    }
  }, [user]);

  useEffect(() => {
    refreshApplications();
  }, [refreshApplications]);

  const addApplication = async ({ offerId, applicantId, message }: { offerId: string; applicantId: string; message: string }) => {
    await apiService.createApplication({
      offerId: Number(offerId),
      applicantId: Number(applicantId),
      message,
    });
    await refreshApplications();
  };

  const updateApplicationStatus = async (id: string, status: ApplicationStatus, declineMessage?: string) => {
    await apiService.updateApplicationStatus(id, status, declineMessage);
    await refreshApplications();
  };

  const getApplicationsByOffer = (offerId: string) => {
    return applications.filter(app => app.offerId === offerId);
  };

  const getApplicationsByApplicant = (applicantId: string) => {
    return applications.filter(app => app.applicantId === applicantId);
  };

  const hasUserApplied = (offerId: string, userId: string) => {
    return applications.some(app => app.offerId === offerId && app.applicantId === userId);
  };

  return (
      <ApplicationsContext.Provider
          value={{
            applications,
            addApplication,
            updateApplicationStatus,
            getApplicationsByOffer,
            getApplicationsByApplicant,
            hasUserApplied,
            refreshApplications,
          }}
      >
        {children}
      </ApplicationsContext.Provider>
  );
}

export function useApplications() {
  const context = useContext(ApplicationsContext);
  if (context === undefined) {
    throw new Error('useApplications must be used within an ApplicationsProvider');
  }
  return context;
}