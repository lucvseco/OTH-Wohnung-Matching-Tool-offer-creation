# OTH Housing Match Platform - Complete Export Guide

## Quick Start

### Option 1: Download the Archive (Recommended)

1. Download `oth-housing-export.tar.gz` from this repository
2. Extract the archive:
   ```bash
   tar -xzf oth-housing-export.tar.gz
   ```
3. Create a new Vite project:
   ```bash
   npm create vite@latest oth-housing-platform -- --template react-ts
   cd oth-housing-platform
   ```
4. Copy the extracted files to your project:
   ```bash
   cp -r extracted/src ./
   cp extracted/EXPORT_PACKAGE.json ./package.json
   cp extracted/EXPORT_vite.config.ts ./vite.config.ts
   cp extracted/EXPORT_tsconfig.json ./tsconfig.json
   cp extracted/EXPORT_main.tsx ./src/main.tsx
   ```
5. Install dependencies:
   ```bash
   npm install
   ```
6. Run the development server:
   ```bash
   npm run dev
   ```

### Option 2: Manual Setup

If you prefer to set up manually, follow these steps:

## Complete File Structure

```
oth-housing-platform/
├── package.json
├── tsconfig.json
├── vite.config.ts
├── index.html
├── src/
│   ├── main.tsx
│   ├── styles/
│   │   ├── fonts.css
│   │   └── theme.css
│   └── app/
│       ├── App.tsx
│       ├── routes.tsx
│       ├── components/
│       │   ├── ApplyModal.tsx
│       │   ├── ConfirmModal.tsx
│       │   ├── Layout.tsx
│       │   ├── NotificationDropdown.tsx
│       │   └── ProtectedRoute.tsx
│       ├── context/
│       │   ├── ApplicationsContext.tsx
│       │   ├── AuthContext.tsx
│       │   ├── ChatsContext.tsx
│       │   ├── NotificationsContext.tsx
│       │   └── OffersContext.tsx
│       └── pages/
│           ├── ApplicationsManagementPage.tsx
│           ├── ChatsPage.tsx
│           ├── CreateOfferPage.tsx
│           ├── FeedPage.tsx
│           ├── LoginPage.tsx
│           ├── MyApplicationsPage.tsx
│           ├── MyOffersPage.tsx
│           ├── OfferDetailPage.tsx
│           └── ProfilePage.tsx
```

## File Contents

All source files are included in the archive. Key files:

### Configuration Files

1. **package.json** - Dependencies and scripts
2. **vite.config.ts** - Vite configuration with React and Tailwind
3. **tsconfig.json** - TypeScript configuration
4. **index.html** - HTML entry point

### Source Files

1. **src/main.tsx** - Application entry point
2. **src/app/App.tsx** - Main App component with providers
3. **src/app/routes.tsx** - React Router configuration

### Styles

1. **src/styles/fonts.css** - Font imports
2. **src/styles/theme.css** - Tailwind theme and CSS variables

### Context Providers (State Management)

1. **AuthContext.tsx** - Authentication and user management
2. **OffersContext.tsx** - Housing offers management
3. **ApplicationsContext.tsx** - Application submissions
4. **ChatsContext.tsx** - Chat system
5. **NotificationsContext.tsx** - Notification system

### Components

1. **Layout.tsx** - Main layout with navigation
2. **ProtectedRoute.tsx** - Route protection
3. **ApplyModal.tsx** - Application submission modal
4. **ConfirmModal.tsx** - Confirmation dialog
5. **NotificationDropdown.tsx** - Notification bell dropdown

### Pages

1. **LoginPage.tsx** - Authentication page
2. **FeedPage.tsx** - Browse housing offers
3. **OfferDetailPage.tsx** - Detailed offer view
4. **CreateOfferPage.tsx** - Multi-step offer creation wizard
5. **MyOffersPage.tsx** - User's posted offers
6. **MyApplicationsPage.tsx** - User's submitted applications
7. **ApplicationsManagementPage.tsx** - Manage offer applications
8. **ChatsPage.tsx** - Messaging system
9. **ProfilePage.tsx** - User profile

## Features Summary

### 🔐 Authentication
- University SSO simulation
- Auto-import user data (name, email, gender, DOB, role)
- Login with any @oth-regensburg.de email

### 🏠 Housing Management
- Browse offers with filters (Zwischenmiete, Nachmieter, Couchsurfing)
- Detailed offer information with images
- 10-step offer creation wizard
- Manage and disable your offers

### 📝 Applications
- Apply with introduction message
- View applications for your offers
- Approve/decline applicants
- Track application status

### 💬 Chat System
- Real-time messaging between approved users
- Offer or decline accommodation
- Optional decline messages
- Chat history

### 🔔 Notifications
- Bell icon with unread count
- Application, approval, decline, and offer notifications
- Mark as read functionality

## Demo Data

The application includes pre-populated demo data:
- 3 sample housing offers
- 3 applications on the first offer
- 1 active chat conversation with message history
- 2 unread notifications

This allows immediate testing of all features without multiple user accounts.

## Customization Guide

### Change Branding

1. Update university name in all pages
2. Modify logo in `Layout.tsx`
3. Update meta tags in `index.html`

### Modify Styles

Edit `src/styles/theme.css` to change:
- Color scheme (CSS variables)
- Border radius
- Typography
- Light/dark mode colors

### Add Backend Integration

Replace mock data in context files:
1. **AuthContext.tsx** - Connect to real authentication API
2. **OffersContext.tsx** - Fetch offers from database
3. **ApplicationsContext.tsx** - Save applications to backend
4. **ChatsContext.tsx** - Implement WebSocket for real-time chat
5. **NotificationsContext.tsx** - Push notifications from server

### Image Upload

Add image upload functionality in:
- `CreateOfferPage.tsx` - Step 9 (Photos)
- Replace URL input with file upload
- Integrate with cloud storage (AWS S3, Cloudinary, etc.)

## Development Tips

### State Management
Currently uses React Context API. For larger scale:
- Consider Redux Toolkit or Zustand
- Add data persistence with localStorage
- Implement optimistic updates

### API Integration
Create an API service layer:
```typescript
// src/services/api.ts
export const api = {
  offers: {
    getAll: () => fetch('/api/offers'),
    getById: (id) => fetch(`/api/offers/${id}`),
    create: (data) => fetch('/api/offers', { method: 'POST', body: JSON.stringify(data) }),
  },
  // ... more endpoints
}
```

### Real-time Chat
Replace mock chat with WebSocket:
```typescript
import { io } from 'socket.io-client';

const socket = io('ws://your-server.com');

socket.on('message', (message) => {
  // Handle incoming message
});
```

## Production Deployment

### Build for Production
```bash
npm run build
```

### Deploy to Vercel
```bash
npm install -g vercel
vercel
```

### Deploy to Netlify
```bash
npm install -g netlify-cli
netlify deploy --prod
```

### Environment Variables
Create `.env` file:
```
VITE_API_URL=https://your-api.com
VITE_SOCKET_URL=wss://your-socket.com
```

Access in code:
```typescript
const apiUrl = import.meta.env.VITE_API_URL;
```

## Browser Support

- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)
- Mobile browsers (iOS Safari, Chrome Mobile)

## Performance Optimization

- Images are lazy-loaded
- Routes are code-split with React Router
- CSS is optimized with Tailwind purge
- Build output is minified

## Security Notes

⚠️ **Important:** This is a prototype with mock authentication.

For production:
1. Implement real authentication (OAuth, JWT)
2. Add CSRF protection
3. Sanitize user inputs
4. Validate file uploads
5. Use HTTPS only
6. Implement rate limiting
7. Add content security policy
8. Regular security audits

## Support & Contribution

This is a prototype for educational purposes. For issues or improvements:
1. Review the code
2. Test thoroughly
3. Document changes
4. Consider security implications

## License

Educational prototype - Use at your own discretion.

---

**Last Updated:** May 2026
**Version:** 1.0.0
**React Version:** 18.3.1
**Built with:** Vite + React + TypeScript + Tailwind CSS
