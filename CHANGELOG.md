# Changelog

All notable changes to MapKH will be documented in this file.

## [Unreleased]

### Security
- Replace hardcoded Admin UID (`ADMIN_UID_REDACTED`) across 17 files with env var `ADMIN_UIDS`/`NEXT_PUBLIC_ADMIN_UIDS`
- Create centralized admin utility (`src/lib/admin.ts`) with `isAdmin()` and `requireAdmin()` helpers
- Remove hardcoded VAPID private key fallbacks from 3 files — keys must now be set via env vars
- Remove sensitive `console.log` statements in `src/ai/genkit.ts` that leaked API key presence
- Fix Google Drive folder permissions from public `writer` to `reader`
- Restrict CORS `Access-Control-Allow-Origin` from wildcard `*` to app domain
- Move hardcoded Databuddy `clientId` to `NEXT_PUBLIC_DATABUDDY_CLIENT_ID` env var
- Update Firestore rules: prevent report/tip deletion at database level, enforce `reportedBy` on create
- Update `.env.example` with new required vars (`ADMIN_UIDS`, `VAPID_*`, `DATABUDDY_CLIENT_ID`)
- Strengthen `.gitignore` with additional patterns for key files and service account JSON

## [0.1.0] - 2026-05-29

### Added
- Interactive map interface for reporting map issues in Cambodia
- Community collaboration with team-based review and approval system
- Multi-language support (English and Khmer)
- Progressive Web App with offline support and push notifications
- Analytics dashboard with Recharts visualizations
- AI-powered duplicate detection using Google Genkit
- Automatic translation between English, Khmer, and Thai
- Geocoding for address-to-coordinate conversion
- Built-in User Guide with step-by-step report submission help
- Chat system with reply functionality and translation editing
- Tabbed notifications interface and admin notification settings
- PWA badge notifications and comprehensive cache cleaning
- Google Drive integration for report evidence storage
- Team collaboration with review workflows
- Edit request workflows for data integrity

### Changed
- Complete icon system overhaul with Cambodian flag design
- All PWA icons converted for iOS compatibility
- Enhanced notification system with lockscreen support
- Project structure cleanup and documentation improvements
- Google Maps API key management improvements

### Fixed
- iOS PWA issues: icon display, notification crashes, badge functionality
- JSON parsing error for notification reportDetails
- Client-side exception in verification page
- TypeScript compilation errors for user login tracking
- Province parsing and translation functionality
- System History tab filtering
- Security vulnerabilities CVE-2025-55183 and CVE-2025-55184
- Floating report button for mobile

### Security
- Implement free Google Translate with secure API key management
- Add security headers (X-Content-Type-Options, X-Frame-Options, X-XSS-Protection)
- Firestore security rules with public read / authenticated write
- Environment variable template with placeholder values
