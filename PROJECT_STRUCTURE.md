# MapKH Project Structure

This document outlines the complete structure of the MapKH project, a community-driven platform for improving map data in Cambodia.

## 📁 Root Directory Structure

```
MapKH/
├── 📁 .git/                    # Git version control
├── 📁 .next/                   # Next.js build output (auto-generated)
├── 📁 .vercel/                 # Vercel deployment configuration
├── 📁 .vscode/                 # VS Code workspace settings
├── 📁 docs/                    # Project documentation
├── 📁 node_modules/            # NPM dependencies (auto-generated)
├── 📁 public/                  # Static assets and PWA files
├── 📁 scripts/                 # Utility scripts for development
├── 📁 src/                     # Source code (main application)
├── 📄 .env                     # Environment variables (local)
├── 📄 .env.example             # Environment variables template
├── 📄 .env.local               # Local environment overrides
├── 📄 .firebaserc              # Firebase project configuration
├── 📄 .gitignore               # Git ignore rules
├── 📄 .npmrc                   # NPM configuration
├── 📄 apphosting.yaml          # Firebase App Hosting configuration
├── 📄 components.json          # shadcn/ui components configuration
├── 📄 dataconnect.yaml         # Firebase Data Connect configuration
├── 📄 firestore.rules          # Firestore security rules
├── 📄 next-env.d.ts            # Next.js TypeScript declarations
├── 📄 next.config.ts           # Next.js configuration
├── 📄 package.json             # Project dependencies and scripts
├── 📄 package-lock.json        # Locked dependency versions
├── 📄 postcss.config.mjs       # PostCSS configuration
├── 📄 PROJECT_STRUCTURE.md     # This file
├── 📄 README.md                # Project overview and setup
├── 📄 tailwind.config.ts       # Tailwind CSS configuration
├── 📄 tsconfig.json            # TypeScript configuration
└── 📄 vercel.json              # Vercel deployment configuration
```

## 📁 Source Code Structure (`src/`)

```
src/
├── 📁 ai/                      # AI and ML functionality
│   ├── 📁 flows/               # Genkit AI flows
│   │   ├── 📄 find-duplicate-reports.ts
│   │   ├── 📄 geocode-address.ts
│   │   └── 📄 translate-text.ts
│   └── 📄 dev.ts               # AI development server
├── 📁 app/                     # Next.js App Router pages
│   ├── 📁 analytics/           # Analytics dashboard
│   ├── 📁 api/                 # API routes
│   │   ├── 📁 admin/           # Admin-only endpoints
│   │   ├── 📁 notifications/   # Push notification endpoints
│   │   ├── 📁 placeid/         # Place ID management
│   │   └── 📁 webpush/         # Web push notification endpoints
│   ├── 📁 chat/                # Team chat functionality
│   ├── 📁 contributions/       # Community contributions
│   ├── 📁 map/                 # Interactive map interface
│   ├── 📁 records/             # Report records management
│   ├── 📁 settings/            # Application settings
│   ├── 📁 teams/               # Team collaboration
│   ├── 📄 globals.css          # Global CSS styles
│   ├── 📄 layout.tsx           # Root layout component
│   └── 📄 page.tsx             # Home page
├── 📁 components/              # Reusable React components
│   ├── 📁 teams/               # Team-specific components
│   ├── 📁 ui/                  # Base UI components (shadcn/ui)
│   ├── 📄 app-shell.tsx        # Main application shell
│   ├── 📄 dashboard.tsx        # Dashboard component
│   ├── 📄 header.tsx           # Application header
│   ├── 📄 report-dialog.tsx    # Report submission dialog
│   ├── 📄 user-guide-button.tsx # User guide button component
│   ├── 📄 user-guide-dialog.tsx # User guide modal component
│   └── ... (other components)
├── 📁 context/                 # React context providers
│   ├── 📄 auth-provider.tsx    # Authentication context
│   ├── 📄 i18n-provider.tsx    # Internationalization context
│   └── ... (other contexts)
├── 📁 data/                    # Static data and configurations
├── 📁 hooks/                   # Custom React hooks
├── 📁 lib/                     # Utility libraries and configurations
│   ├── 📄 firebase.ts          # Firebase configuration
│   ├── 📄 types.ts             # TypeScript type definitions
│   └── ... (other utilities)
├── 📁 locales/                 # Internationalization files
│   ├── 📁 en/                  # English translations
│   │   └── 📄 translation.json
│   └── 📁 km/                  # Khmer translations
│       └── 📄 translation.json
├── 📁 settings/                # Settings page components
└── 📁 types/                   # Additional type definitions
```

## 📁 Public Assets Structure (`public/`)

```
public/
├── 📁 icons/                   # Application icons (various sizes)
├── 📁 uploads/                 # User uploaded files
├── 📄 apple-touch-icon*.png    # iOS PWA icons
├── 📄 favicon*.png             # Favicon files
├── 📄 favicon*.svg             # SVG favicon files
├── 📄 icon-*.png               # PWA icons
├── 📄 firebase-messaging-sw.js # Firebase messaging service worker
├── 📄 manifest.json            # PWA manifest
├── 📄 offline.html             # Offline fallback page
├── 📄 react-tooltip-custom.css # Custom tooltip styles
└── 📄 sw.js                    # Main service worker
```

## 📁 Documentation Structure (`docs/`)

```
docs/
├── 📄 blueprint.md             # Project blueprint and architecture
└── 📄 vercel-deployment.md     # Vercel deployment guide
```

## 🔧 Key Configuration Files

### Development & Build
- **`next.config.ts`**: Next.js configuration with PWA, i18n, and optimization settings
- **`tailwind.config.ts`**: Tailwind CSS configuration with custom themes
- **`tsconfig.json`**: TypeScript compiler configuration
- **`postcss.config.mjs`**: PostCSS configuration for CSS processing

### Deployment & Hosting
- **`vercel.json`**: Vercel deployment configuration with headers and redirects
- **`apphosting.yaml`**: Firebase App Hosting configuration
- **`.firebaserc`**: Firebase project configuration

### Package Management
- **`package.json`**: Project dependencies, scripts, and metadata
- **`.npmrc`**: NPM configuration for package management

### Environment & Security
- **`.env.example`**: Template for environment variables
- **`firestore.rules`**: Firestore database security rules

## 🚀 Key Features by Directory

### `/src/components/`
- **UI Components**: Reusable interface elements using shadcn/ui
- **User Guide System**: Comprehensive help system with `user-guide-dialog.tsx` and `user-guide-button.tsx`
- **Report Management**: Report submission, editing, and viewing components
- **Dashboard**: Analytics and overview components

### `/src/app/api/`
- **Authentication**: User management and authentication endpoints
- **Reports**: CRUD operations for map issue reports
- **Notifications**: Push notification system
- **Admin**: Administrative functions and user management

### `/src/locales/`
- **Internationalization**: Full English and Khmer language support
- **User Guide Translations**: Complete translations for the help system
- **UI Translations**: All interface text in multiple languages

### `/src/ai/`
- **Duplicate Detection**: AI-powered duplicate report detection
- **Translation**: Automatic text translation between languages
- **Geocoding**: Address to coordinates conversion

## 📱 PWA Features

The project is configured as a Progressive Web App with:
- **Service Worker**: Offline functionality and caching
- **Web App Manifest**: Installation and app-like behavior
- **Push Notifications**: Real-time notifications system
- **Offline Support**: Graceful degradation when offline

## 🌐 Internationalization

Full i18n support with:
- **English (en)**: Primary language
- **Khmer (km)**: Native Cambodian language
- **Dynamic Language Switching**: Runtime language changes
- **Localized Content**: All UI elements and help content translated

## 🔐 Security & Authentication

- **Firebase Authentication**: Google OAuth and email/password
- **Firestore Security Rules**: Database access control
- **Environment Variables**: Secure configuration management
- **CORS Configuration**: Proper cross-origin resource sharing

## 📊 Analytics & Monitoring

- **Vercel Analytics**: Performance and usage tracking
- **Custom Analytics**: Report submission and user engagement metrics
- **Error Tracking**: Client-side error monitoring

This structure provides a scalable, maintainable, and well-organized codebase for the MapKH community mapping platform.