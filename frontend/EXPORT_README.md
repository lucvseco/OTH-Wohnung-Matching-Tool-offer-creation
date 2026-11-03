# OTH Regensburg Housing Match Platform - React Export

Complete React application for the OTH Regensburg housing matching platform.

## Technology Stack

- React 18.3.1
- React Router 7.13.0
- Tailwind CSS 4.1.12
- TypeScript
- Vite 6.3.5
- Lucide React (icons)
- Sonner (toast notifications)

## Project Structure

```
oth-housing-platform/
├── public/
├── src/
│   ├── app/
│   │   ├── components/
│   │   │   ├── ApplyModal.tsx
│   │   │   ├── ConfirmModal.tsx
│   │   │   ├── Layout.tsx
│   │   │   ├── NotificationDropdown.tsx
│   │   │   └── ProtectedRoute.tsx
│   │   ├── context/
│   │   │   ├── ApplicationsContext.tsx
│   │   │   ├── AuthContext.tsx
│   │   │   ├── ChatsContext.tsx
│   │   │   ├── NotificationsContext.tsx
│   │   │   └── OffersContext.tsx
│   │   ├── pages/
│   │   │   ├── ApplicationsManagementPage.tsx
│   │   │   ├── ChatsPage.tsx
│   │   │   ├── CreateOfferPage.tsx
│   │   │   ├── FeedPage.tsx
│   │   │   ├── LoginPage.tsx
│   │   │   ├── MyApplicationsPage.tsx
│   │   │   ├── MyOffersPage.tsx
│   │   │   ├── OfferDetailPage.tsx
│   │   │   └── ProfilePage.tsx
│   │   ├── App.tsx
│   │   └── routes.tsx
│   ├── styles/
│   │   ├── fonts.css
│   │   └── theme.css
│   ├── main.tsx
│   └── vite-env.d.ts
├── index.html
├── package.json
├── tsconfig.json
├── tsconfig.node.json
├── vite.config.ts
└── tailwind.config.js
```

## Installation & Setup

### 1. Create a new Vite + React + TypeScript project

```bash
npm create vite@latest oth-housing-platform -- --template react-ts
cd oth-housing-platform
```

### 2. Install dependencies

```bash
npm install react-router@7.13.0 lucide-react sonner
npm install -D tailwindcss@4.1.12 @tailwindcss/vite @vitejs/plugin-react
```

### 3. Copy all files from this export to your project

Replace the default files with the ones provided in this export.

### 4. Start the development server

```bash
npm run dev
```

### 5. Open your browser

Navigate to `http://localhost:5173`

## Default Login Credentials

The application uses a mock authentication system. You can log in with any email address ending in `@oth-regensburg.de`.

Example:
- Email: `student@oth-regensburg.de`
- Password: `any password`

## Features

### Authentication
- University portal SSO simulation
- User data import (name, email, gender, date of birth, role)

### Housing Offers
- Browse available offers with filters (Zwischenmiete, Nachmieter, Couchsurfing)
- Detailed offer pages with images, pricing, location, and specifications
- Create offers with 10-step wizard
- Manage your own offers
- Disable offers

### Applications
- Apply to offers with introduction message
- View all applications for your offers
- Approve or decline applications
- Application status tracking

### Chat System
- Real-time messaging between approved applicants and offer owners
- Offer or decline accommodation to applicants
- Optional decline message
- Chat deactivation when declined

### Notifications
- Real-time notification system
- Notification bell with unread count
- Application, approval, decline, and offer notifications

## Demo Data

The application includes demo data for testing:
- 3 mock applications on the first offer
- 1 active chat conversation
- 2 unread notifications

This allows you to test the complete flow without needing multiple user accounts.

## Customization

### Styling
All styles use Tailwind CSS v4. Modify `src/styles/theme.css` for global theme changes.

### Mock Data
Update the demo data in:
- `src/app/context/OffersContext.tsx` - Sample offers
- `src/app/context/ApplicationsContext.tsx` - Demo applications
- `src/app/context/ChatsContext.tsx` - Demo chat messages
- `src/app/context/NotificationsContext.tsx` - Demo notifications

### Backend Integration
To connect to a real backend:
1. Replace mock authentication in `AuthContext.tsx`
2. Replace state management with API calls in all context files
3. Implement real-time chat with WebSocket or similar
4. Add image upload functionality

## Production Build

```bash
npm run build
```

The production-ready files will be in the `dist/` directory.

## License

This is a prototype for educational purposes.
