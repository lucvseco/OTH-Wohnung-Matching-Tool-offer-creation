import { createBrowserRouter, Navigate } from 'react-router';
import { Layout } from './components/Layout';
import { ProtectedRoute } from './components/ProtectedRoute';
import { LoginPage } from './pages/LoginPage';
import { FeedPage } from './pages/FeedPage';
import { CreateOfferPage } from './pages/CreateOfferPage';
import { OfferDetailPage } from './pages/OfferDetailPage';
import { ProfilePage } from './pages/ProfilePage';
import { MyOffersPage } from './pages/MyOffersPage';
import { MyApplicationsPage } from './pages/MyApplicationsPage';
import { ChatsPage } from './pages/ChatsPage';
import { ApplicationsManagementPage } from './pages/ApplicationsManagementPage';

export const router = createBrowserRouter([
  {
    path: '/',
    element: (
      <ProtectedRoute>
        <Layout />
      </ProtectedRoute>
    ),
    children: [
      { index: true, Component: FeedPage },
      { path: 'my-offers', Component: MyOffersPage },
      { path: 'my-applications', Component: MyApplicationsPage },
      { path: 'chats', Component: ChatsPage },
      { path: 'create', Component: CreateOfferPage },
      { path: 'offer/:id', Component: OfferDetailPage },
      { path: 'applications/:offerId', Component: ApplicationsManagementPage },
      { path: 'profile', Component: ProfilePage },
    ],
  },
  {
    path: '/login',
    Component: LoginPage,
  },
  {
    path: '*',
    element: <Navigate to="/" replace />,
  },
]);
