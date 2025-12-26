# MapKH Project Structure

## Overview
MapKH is a Next.js 16 application for community-driven map corrections and reporting in Cambodia. Built with TypeScript, Tailwind CSS, and Firebase.

## Technology Stack
- **Framework**: Next.js 16.1.1 with Turbopack
- **Language**: TypeScript 5.9.3
- **Styling**: Tailwind CSS 3.4.19
- **Database**: Firebase Firestore
- **Authentication**: Firebase Auth
- **Push Notifications**: Firebase Cloud Messaging (FCM)
- **UI Components**: Radix UI + shadcn/ui
- **Maps**: Google Maps API
- **Internationalization**: react-i18next
- **State Management**: React Context API

## Project Structure

```
MapKH/
├── .env.local                    # Environment variables (local)
├── .env.example                  # Environment variables template
├── .firebaserc                   # Firebase project configuration
├── apphosting.yaml              # Firebase App Hosting configuration
├── dataconnect.yaml             # Firebase Data Connect configuration
├── firestore.rules              # Firestore security rules
├── next.config.ts               # Next.js configuration with Turbopack
├── tailwind.config.ts           # Tailwind CSS configuration
├── tsconfig.json                # TypeScript configuration
├── package.json                 # Dependencies and scripts
├── PROJECT_STRUCTURE.md         # This file
├── README.md                    # Project documentation
├── vercel.json                  # Vercel deployment configuration
├── components.json              # shadcn/ui configuration
├── eslint.config.js             # ESLint configuration (v9 format)
│
├── public/                      # Static assets
│   ├── icons/                   # App icons and favicons
│   ├── firebase-messaging-sw.js # Firebase messaging service worker
│   ├── manifest.json            # PWA manifest
│   ├── offline.html             # Offline fallback page
│   └── sw.js                    # Main service worker
│
├── src/
│   ├── app/                     # Next.js App Router
│   │   ├── globals.css          # Global styles
│   │   ├── layout.tsx           # Root layout
│   │   ├── page.tsx             # Home page
│   │   ├── actions.ts           # Server actions (main business logic)
│   │   │
│   │   ├── api/                 # API routes
│   │   │   ├── notifications/   # Notification management
│   │   │   │   ├── send-push/   # Push notification endpoint
│   │   │   │   └── register-token/ # FCM token registration
│   │   │   ├── admin/           # Admin-only endpoints
│   │   │   ├── webpush/         # Web push notifications
│   │   │   └── placeid/         # Google Places integration
│   │   │
│   │   ├── login/               # Authentication pages
│   │   ├── register/
│   │   ├── forgot-password/
│   │   │
│   │   ├── map/                 # Interactive map interface
│   │   ├── records/             # Report management
│   │   │   └── [id]/            # Individual report pages
│   │   │       └── verification/ # Report verification
│   │   │
│   │   ├── settings/            # Admin settings
│   │   │   ├── users/           # User management
│   │   │   ├── history/         # System activity logs
│   │   │   ├── categories/      # Category management
│   │   │   └── edit-requests/   # Edit request management
│   │   │
│   │   ├── profile/             # User profile
│   │   ├── teams/               # Team collaboration
│   │   ├── contributions/       # User contributions
│   │   ├── analytics/           # Analytics dashboard
│   │   └── chat/                # Community chat
│   │
│   ├── components/              # Reusable UI components
│   │   ├── ui/                  # shadcn/ui base components
│   │   ├── app-shell.tsx        # Main app layout
│   │   ├── dashboard-header.tsx # Dashboard navigation
│   │   ├── data-table.tsx       # Reusable data table
│   │   ├── user-guide-dialog.tsx # User guide modal
│   │   ├── user-guide-button.tsx # Help button
│   │   ├── admin-edit-requests.tsx # Admin edit request management
│   │   ├── edit-status-indicator.tsx # Edit status display
│   │   └── report-protection-manager.tsx # Report protection controls
│   │
│   ├── context/                 # React Context providers
│   │   └── auth-provider.tsx    # Authentication context
│   │
│   ├── hooks/                   # Custom React hooks
│   │   └── use-toast.tsx        # Toast notification hook
│   │
│   ├── lib/                     # Utility libraries
│   │   ├── firebase.ts          # Firebase client configuration
│   │   ├── firebase-admin.ts    # Firebase Admin SDK
│   │   ├── firebase-messaging.ts # FCM client utilities
│   │   ├── notification-utils.ts # Notification helpers
│   │   ├── types.ts             # TypeScript type definitions
│   │   └── utils.ts             # General utilities
│   │
│   ├── locales/                 # Internationalization
│   │   ├── en/                  # English translations
│   │   │   └── translation.json
│   │   └── km/                  # Khmer translations
│   │       └── translation.json
│   │
│   └── ai/                      # AI/ML integrations
│       └── flows/               # Genkit AI flows
│
├── docs/                        # Documentation
│   ├── blueprint.md             # Project blueprint
│   └── vercel-deployment.md     # Deployment guide
│
└── scripts/                     # Build and deployment scripts
    └── .gitkeep
```

## Key Features

### 🗺️ Interactive Mapping
- Google Maps integration with custom markers
- Real-time location tracking
- Place ID verification and geocoding
- Province-based filtering

### 📱 Progressive Web App (PWA)
- Offline functionality
- Push notifications via FCM
- App-like experience on mobile
- Service worker for background sync

### 🔐 Authentication & Authorization
- Firebase Authentication
- Role-based access control (Admin/User)
- Secure API endpoints
- User session management

### 📊 Data Management
- Firestore for real-time data
- Server actions for business logic
- Data validation with Zod schemas
- Bulk operations and imports

### 🌐 Internationalization
- English and Khmer language support
- Dynamic language switching
- Localized date/time formatting
- RTL text support for Khmer

### 🔔 Notification System
- In-app notifications
- Push notifications to mobile devices
- Email notifications (planned)
- Real-time updates via Firestore

### 📈 Analytics & Reporting
- User activity tracking
- Report statistics
- Performance metrics
- Admin dashboard

## Database Collections

### Core Collections
- `users` - User profiles and authentication data
- `reports` - Community-submitted map corrections
- `notifications` - System and user notifications
- `history` - Audit log of all system activities

### Supporting Collections
- `teams` - Collaborative groups
- `posts` - Community discussions
- `tips` - Help and guidance content
- `supporters` - Project supporters
- `violationTerms` - Report categorization
- `subViolationTypes` - Detailed issue types
- `placeTypes` - Location categories

## Environment Variables

### Required
```env
# Firebase Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
NEXT_PUBLIC_FIREBASE_VAPID_KEY=

# Firebase Admin (Server-side)
FIREBASE_ADMIN_PROJECT_ID=
FIREBASE_ADMIN_CLIENT_EMAIL=
FIREBASE_ADMIN_PRIVATE_KEY=

# Google Maps
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=

# Google Drive Integration
GCP_SERVICE_ACCOUNT_EMAIL=
GCP_SERVICE_ACCOUNT_PRIVATE_KEY=

# Application
NEXT_PUBLIC_APP_URL=
```

## Development Commands

```bash
# Development
npm run dev              # Start development server with Turbopack
npm run build           # Build for production with Turbopack
npm run start           # Start production server
npm run lint            # Run ESLint

# AI/Genkit
npm run genkit:dev      # Start Genkit development
npm run genkit:watch    # Start Genkit with file watching
```

## Deployment

### Vercel (Recommended)
- Automatic deployments from GitHub
- Environment variables configured in dashboard
- Edge functions for API routes
- Global CDN distribution

### Firebase App Hosting
- Native Firebase integration
- Automatic scaling
- Built-in security rules
- Real-time database sync

## Security Features

### Data Protection System ✅
- **Report Protection**: Admins can protect critical reports from editing/deletion
- **Edit Request Workflow**: Non-admin users must request approval for report edits
- **Admin Review Process**: Comprehensive admin interface for reviewing edit requests
- **Edit History Tracking**: Complete audit trail of all edit requests and approvals
- **Status Indicators**: Visual indicators showing protection and edit request status
- **Automatic Notifications**: Users notified of edit request approvals/rejections

### Firestore Security Rules
- User-based access control
- Public read for reports and tips
- Authenticated write operations
- Admin-only collections

### API Security
- Server-side validation
- Rate limiting (planned)
- CORS configuration
- Input sanitization

### Authentication Security
- Firebase Auth integration
- JWT token validation
- Session management
- Password reset functionality

## Performance Optimizations

### Next.js 16 Features
- Turbopack for faster builds
- App Router for better performance
- Server Components where applicable
- Image optimization

### Firebase Optimizations
- Firestore indexes for queries
- Connection pooling
- Offline persistence
- Real-time listeners optimization

### PWA Features
- Service worker caching
- Background sync
- Push notifications
- Offline functionality

## Recent Updates (Latest)

### Fixed Mobile Lockscreen Notifications & History API ✅
- **Enhanced notification payload**: Completely restructured FCM messages with data-only payloads for better mobile display
- **Fixed service workers**: Enhanced both `sw.js` and `firebase-messaging-sw.js` with proper notification handling for lockscreen
- **Android notification channels**: Added proper Android notification channel setup and configuration
- **iOS compatibility**: Enhanced APNS payload structure for better iOS notification display
- **Fixed history API error**: Replaced Firebase Admin dependency with client-side Firebase for notification history
- **Enhanced vibration patterns**: Longer vibration sequences for better mobile notification feedback
- **Better notification actions**: Improved action buttons and click handling for mobile devices

### Enhanced Mobile Notification System ✅
- **Aggressive permission requests**: Notification system now automatically requests permissions on mobile devices
- **Mobile-first notification prompt**: Added `NotificationPermissionPrompt` component that shows automatically for mobile users
- **Improved notification initialization**: Removed delays and made permission requests immediate on user login
- **Better mobile detection**: Added `mobile-utils.ts` for device-specific notification handling
- **Enhanced settings UI**: Updated notification settings with refresh functionality and better mobile guidance
- **Auto-initialization**: System now auto-requests permissions after 2 seconds on page load for default permission status

### Complete Notification System Rewrite ✅
- **New notification system**: Complete rewrite with `src/lib/notification-system.ts` for better lockscreen display
- **Enhanced service workers**: Updated `public/sw.js` and `public/firebase-messaging-sw.js` for proper push handling
- **Improved notification settings**: New `NotificationSettingsNew` component with better UX and test functionality
- **Better push notifications**: Enhanced API endpoints with proper webpush configuration for lockscreen visibility
- **Map pin close buttons**: Added close (X) buttons to map pin detail cards for better UX
- **Fixed notification display**: Notifications now properly appear on lockscreen with actions and proper formatting

### Code Quality & Build Fixes ✅
- **Fixed duplicate function**: Removed duplicate `cleanupInvalidUsers` function causing build errors
- **Enhanced violation terms cleanup**: Fixed authentication context in categories management
- **Improved error handling**: Added proper user authentication checks for admin functions
- **Build optimization**: Ensured clean compilation with no TypeScript errors

### Next.js 16 Migration ✅
- Updated to Next.js 16.1.1 with Turbopack
- Enhanced build performance (~18s build time)
- Updated TypeScript and dependencies
- Fixed compatibility issues

### User Management Improvements ✅
- Simplified getUsers function for better reliability
- Added comprehensive user cleanup functionality
- Enhanced error handling and logging
- Fixed invalid user detection and removal

### Activity History Fixes ✅
- Resolved history tab filtering issues
- Improved client-side filtering fallback
- Enhanced error handling for missing indexes
- Better timestamp serialization

### Push Notification System ✅
- Implemented FCM integration
- Added service worker for background notifications
- Created notification API endpoints
- Automatic token registration on login
- Enhanced notification handling with actions

### Data Integrity ✅
- Added user validation and cleanup
- Improved error handling across all functions
- Enhanced logging for debugging
- Better timestamp handling consistency

## Contributing

1. Follow TypeScript strict mode
2. Use Tailwind CSS for styling
3. Implement proper error handling
4. Add appropriate logging
5. Write server actions for business logic
6. Follow Next.js 16 best practices
7. Ensure mobile responsiveness
8. Test push notifications thoroughly

## Support

For technical issues or questions:
- Check the documentation in `/docs`
- Review the project blueprint
- Check Firebase console for errors
- Monitor Vercel deployment logs