# MapKH - Community-Driven Map Correction Platform

MapKH is a comprehensive community-driven platform for improving map data in Cambodia. Built with Next.js, Firebase, and modern web technologies, it enables users to report map issues, collaborate on corrections, and contribute to better mapping data for Cambodia.

## 🌟 Features

- **📍 Interactive Map Interface**: Report issues directly on an interactive map
- **🤝 Community Collaboration**: Team-based review and approval system
- **🌐 Multi-language Support**: Full English and Khmer language support
- **📱 Progressive Web App**: Works offline and can be installed on mobile devices
- **🔔 Real-time Notifications**: Push notifications for report updates
- **📊 Analytics Dashboard**: Comprehensive reporting and analytics
- **🎯 AI-Powered Features**: Duplicate detection and automatic translation
- **📚 Comprehensive User Guide**: Built-in help system for new users

## 🚀 Quick Start (Local Development)

### Prerequisites
- Node.js LTS (v18+ recommended)
- NPM or Yarn package manager
- Firebase project with Firestore and Authentication enabled
- Google Maps API key

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/tmeta-sudo/mapkh.git
   cd mapkh
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   ```bash
   cp .env.example .env.local
   ```
   
   Fill in all required values in `.env.local`:
   - Client Firebase keys: `NEXT_PUBLIC_FIREBASE_*`
   - Firebase Admin keys: `FIREBASE_ADMIN_*`
   - NextAuth config: `NEXTAUTH_URL`, `NEXTAUTH_SECRET`
   - Google integrations: `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`, etc.

4. **Start the development server**
   ```bash
   npm run dev
   ```

5. **Open your browser**
   Navigate to `http://localhost:3000`

## 📁 Project Structure

For a detailed overview of the project structure, see [PROJECT_STRUCTURE.md](PROJECT_STRUCTURE.md).

```
MapKH/
├── 📁 src/
│   ├── 📁 app/                 # Next.js App Router pages
│   ├── 📁 components/          # Reusable React components
│   ├── 📁 ai/                  # AI flows and ML functionality
│   ├── 📁 locales/             # Internationalization files
│   └── 📁 lib/                 # Utilities and configurations
├── 📁 public/                  # Static assets and PWA files
├── 📁 docs/                    # Project documentation
└── 📄 Configuration files...
```

## 🔧 Configuration

### Firebase Setup

1. Create a Firebase project at [Firebase Console](https://console.firebase.google.com)
2. Enable Authentication (Google OAuth recommended)
3. Enable Firestore Database
4. Enable Firebase Storage (for file uploads)
5. Copy your Firebase configuration to environment variables

### Google Maps API Setup

1. Enable Maps JavaScript API in [Google Cloud Console](https://console.cloud.google.com)
2. Create an API key
3. Add the key to `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`

### Google Drive Integration (Optional)

For automatic folder creation for reports:

1. Create a Google Cloud Service Account
2. Enable Google Drive API
3. Share a parent folder with the service account
4. Configure environment variables:
   - `GOOGLE_DRIVE_PARENT_FOLDER_ID`
   - `GCP_SERVICE_ACCOUNT_EMAIL`
   - `GCP_SERVICE_ACCOUNT_PRIVATE_KEY`

## 🌐 Internationalization

MapKH supports multiple languages:
- **English (en)**: Primary language
- **Khmer (km)**: Native Cambodian language

Language files are located in `src/locales/`. To add a new language:
1. Create a new directory in `src/locales/`
2. Copy `translation.json` from an existing language
3. Translate all keys
4. Update the i18n configuration

## 📱 Progressive Web App (PWA)

MapKH is configured as a PWA with:
- **Offline Support**: Core functionality works without internet
- **Push Notifications**: Real-time updates for report status
- **App Installation**: Can be installed on mobile devices
- **Service Worker**: Caches resources for better performance

## 🤖 AI Features

### Duplicate Detection
Automatically detects potential duplicate reports using AI analysis of:
- Location proximity
- Description similarity
- Issue type matching

### Translation Services
Automatic translation between English, Khmer, and Thai using AI translation flows.

### Geocoding
Converts addresses to coordinates for precise location mapping.

## 🔐 Security

- **Firebase Authentication**: Secure user authentication
- **Firestore Security Rules**: Database access control
- **Environment Variables**: Secure configuration management
- **CORS Configuration**: Proper cross-origin resource sharing

## 📊 Analytics

Built-in analytics track:
- Report submission rates
- User engagement metrics
- Geographic distribution of reports
- Resolution timeframes
- Community contribution statistics

## 🚀 Deployment

### Vercel (Recommended)

1. Connect your GitHub repository to Vercel
2. Configure environment variables in Vercel dashboard
3. Deploy automatically on push to main branch

See [docs/vercel-deployment.md](docs/vercel-deployment.md) for detailed deployment instructions.

### Firebase Hosting

1. Configure Firebase hosting in `firebase.json`
2. Build the project: `npm run build`
3. Deploy: `firebase deploy`

## 🤝 Contributing

We welcome contributions from the community! Please read our contributing guidelines:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

### Development Guidelines

- Follow TypeScript best practices
- Use the existing component patterns
- Add translations for new UI text
- Test on both desktop and mobile
- Ensure accessibility compliance

## 📚 User Guide

MapKH includes a comprehensive built-in user guide accessible through:
- The "User Guide" button in the dashboard header
- The floating help button (question mark icon) on all pages

The guide covers:
- Step-by-step report submission process
- Best practices for effective reporting
- Community guidelines and tips
- Frequently asked questions

## 🐛 Troubleshooting

### Common Issues

**Map not loading:**
- Verify `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` is set
- Check Google Maps API billing is enabled
- Ensure Maps JavaScript API is enabled

**Firebase errors:**
- Verify all Firebase environment variables are set
- Check Firebase project configuration
- Ensure Firestore security rules allow access

**Build failures:**
- Clear `.next` directory: `rm -rf .next`
- Reinstall dependencies: `rm -rf node_modules && npm install`
- Check TypeScript errors: `npm run lint`

For detailed troubleshooting, see [docs/vercel-deployment.md#problems_and_diagnostics](docs/vercel-deployment.md#problems_and_diagnostics).

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built with [Next.js](https://nextjs.org/) and [React](https://reactjs.org/)
- UI components from [shadcn/ui](https://ui.shadcn.com/)
- Maps powered by [Google Maps Platform](https://developers.google.com/maps)
- Backend services by [Firebase](https://firebase.google.com/)
- Deployed on [Vercel](https://vercel.com/)

## 📞 Support

For support and questions:
- Check the built-in User Guide
- Review the documentation in the `docs/` directory
- Open an issue on GitHub
- Join our community discussions

---

**MapKH** - Fix the Map, Help the Nation 🇰🇭