[# MapKH - Community-Driven Map Correction Platform

MapKH is a community-driven platform born from the **Cambodia Google Local Guides community**. This is not to compete with Google, but to show that automated filtering systems still have limits — real people are needed to keep our community maps clean and accurate.

As conflicts arose between Cambodia and Thailand, many locations across Cambodia's territory became targets of offensive content, hate speech, harassment, and incorrect place labels. MapKH empowers the community to report, review, and correct these map issues collaboratively.

## Features

- **Interactive Map Interface**: Report issues directly on an interactive map
- **Community Collaboration**: Team-based review and approval system
- **Multi-language Support**: Full English and Khmer language support
- **Progressive Web App**: Works offline and can be installed on mobile devices
- **Real-time Notifications**: Push notifications for report updates
- **Analytics Dashboard**: Comprehensive reporting and analytics
- **AI-Powered Features**: Duplicate detection and automatic translation
- **Comprehensive User Guide**: Built-in help system for new users

## Quick Start (Local Development)

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
   
   Fill in all required values in `.env.local`.

4. **Start the development server**
   ```bash
   npm run dev
   ```

5. **Open your browser**
   Navigate to `http://localhost:3000`

## Tech Stack

- **Framework**: Next.js with Turbopack
- **UI**: React, shadcn/ui, Tailwind CSS
- **Backend**: Firebase (Auth, Firestore, FCM, Storage)
- **Maps**: Google Maps Platform, Leaflet
- **AI**: Google Genkit (duplicate detection, translation, geocoding)
- **Charts**: Recharts
- **i18n**: i18next (English, Khmer)

## License

MIT
](https://github.com/jdepoix/youtube-transcript-api.git)
