import { RouterProvider } from 'react-router';
import { AuthProvider } from './context/AuthContext';
import { OffersProvider } from './context/OffersContext';
import { ApplicationsProvider } from './context/ApplicationsContext';
import { ChatsProvider } from './context/ChatsContext';
import { NotificationsProvider } from './context/NotificationsContext';
import { router } from './routes';
import { Toaster } from 'sonner';

export default function App() {
  return (
    <AuthProvider>
      <OffersProvider>
        <ApplicationsProvider>
          <ChatsProvider>
            <NotificationsProvider>
              <RouterProvider router={router} />
              <Toaster position="top-right" />
            </NotificationsProvider>
          </ChatsProvider>
        </ApplicationsProvider>
      </OffersProvider>
    </AuthProvider>
  );
}