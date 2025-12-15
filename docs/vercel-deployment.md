# Vercel Deployment Guide

This guide will help you deploy the MapKH application to Vercel.

## Prerequisites

- Vercel account
- GitHub repository with your code
- Firebase project with Firestore and Authentication configured
- Environment variables ready

## Environment Variables

Set up the following environment variables in your Vercel project dashboard:

### Firebase Configuration
```
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=your_measurement_id
```

### Firebase Admin (Server-side)
```
FIREBASE_ADMIN_PROJECT_ID=your_project_id
FIREBASE_ADMIN_CLIENT_EMAIL=your_service_account_email
FIREBASE_ADMIN_PRIVATE_KEY=your_private_key
```

### Application Settings
```
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
NEXTAUTH_SECRET=your_nextauth_secret
NEXTAUTH_URL=https://your-app.vercel.app
```

## Deployment Steps

### 1. Connect Repository

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click "New Project"
3. Import your GitHub repository
4. Select the MapKH project

### 2. Configure Build Settings

Vercel should automatically detect Next.js. Verify these settings:

- **Framework Preset**: Next.js
- **Build Command**: `npm run build`
- **Output Directory**: `.next`
- **Install Command**: `npm install`

### 3. Environment Variables

1. In your Vercel project dashboard, go to "Settings" → "Environment Variables"
2. Add all the environment variables listed above
3. Make sure to set them for all environments (Production, Preview, Development)

### 4. Deploy

1. Click "Deploy"
2. Wait for the build to complete
3. Your app will be available at `https://your-project-name.vercel.app`

## Post-Deployment Configuration

### Firebase Authentication

1. In Firebase Console, go to Authentication → Settings → Authorized domains
2. Add your Vercel domain: `your-project-name.vercel.app`

### Firebase Firestore Security Rules

Ensure your Firestore security rules are properly configured for production:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Add your production security rules here
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

## Monitoring and Maintenance

### Performance Monitoring

- Use Vercel Analytics to monitor performance
- Check Firebase Console for database usage
- Monitor error logs in Vercel dashboard

### Automatic Deployments

- Vercel automatically deploys when you push to your main branch
- Preview deployments are created for pull requests
- You can configure deployment branches in project settings

## Troubleshooting
<a id="problems_and_diagnostics"></a>

### Common Issues

1. **Build Failures**
   - Check environment variables are set correctly
   - Verify all dependencies are in package.json
   - Check build logs for specific errors

2. **Firebase Connection Issues**
   - Verify Firebase configuration variables
   - Check Firebase project permissions
   - Ensure service account has proper roles

3. **Authentication Problems**
   - Verify authorized domains in Firebase
   - Check NEXTAUTH_URL matches your domain
   - Ensure NEXTAUTH_SECRET is set

### Getting Help

- Check Vercel documentation: https://vercel.com/docs
- Firebase documentation: https://firebase.google.com/docs
- Next.js deployment guide: https://nextjs.org/docs/deployment

## Security Considerations

- Never commit environment variables to your repository
- Use Vercel's environment variable encryption
- Regularly rotate API keys and secrets
- Monitor access logs and usage patterns
- Keep dependencies updated

## Performance Optimization

The application is configured with:

- Standalone output for optimal performance
- Image optimization for faster loading
- Webpack optimizations for smaller bundles
- Experimental features for better performance

Monitor your application's performance using Vercel Analytics and adjust configurations as needed.