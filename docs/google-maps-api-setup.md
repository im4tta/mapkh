# Google Maps API Setup Guide

This guide will help you set up a Google Maps API key to enable map functionality in the verification pages.

## Quick Setup

1. **Get an API Key**
   - Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
   - Create a new project or select an existing one
   - Click "Create Credentials" → "API Key"
   - Copy the generated API key (starts with `AIza`)

2. **Enable Required APIs**
   - Go to [APIs & Services](https://console.cloud.google.com/apis/library)
   - Search for and enable:
     - **Maps JavaScript API** (required for map display)
     - **Places API** (optional, for enhanced location features)

3. **Configure API Key Restrictions (Recommended)**
   - In the API key settings, add your domain to "Website restrictions"
   - For local development: `localhost:3000`
   - For production: `yourdomain.com`
   - Or select "None" for testing (less secure)

4. **Set Up Billing**
   - Google Maps requires a billing account
   - Go to [Billing](https://console.cloud.google.com/billing)
   - Add a payment method to avoid "For development purposes only" watermark

## Environment Variables

Add your API key to your environment variables:

```bash
# In .env.local
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=AIza...your-api-key-here
```

## Verification Page Usage

The verification page supports two ways to use API keys:

### Option 1: Environment Variable (Recommended)
- Set `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` in your `.env.local` file
- Maps will load automatically for all users

### Option 2: Custom API Key Input
- Users can input their own API key in the verification page
- Useful for testing or when environment key is not available
- API key is saved locally in browser storage

## Common Issues & Solutions

### "This page can't load Google Maps correctly"
- **Cause**: API key has domain restrictions that don't match current domain
- **Solution**: Add your domain to API key restrictions or use "None" for testing

### "For development purposes only" watermark
- **Cause**: Billing is not enabled on your Google Cloud project
- **Solution**: Enable billing in Google Cloud Console

### Map not loading at all
- **Cause**: API key is invalid or Maps JavaScript API is not enabled
- **Solution**: Check API key format and enable required APIs

### Authentication errors
- **Cause**: API key is invalid or has been regenerated
- **Solution**: Generate a new API key and update your configuration

## API Key Security

- **Never commit API keys to version control**
- Use environment variables for production
- Consider using domain restrictions
- Monitor API usage in Google Cloud Console
- Rotate keys periodically for security

## Testing Your Setup

1. Visit a verification page: `/records/[report-number]/verification`
2. If no environment API key is set, you'll see an API key input dialog
3. Enter your API key and click "Save & Continue"
4. The map should load and display the report location

## Cost Considerations

- Google Maps has a free tier with monthly credits
- Monitor usage in Google Cloud Console
- Set up billing alerts to avoid unexpected charges
- Consider implementing usage limits for production

## Support

If you continue to have issues:
1. Check the browser console for error messages
2. Verify your API key in Google Cloud Console
3. Ensure all required APIs are enabled
4. Check billing status
5. Review domain restrictions

For more detailed information, visit the [Google Maps Platform Documentation](https://developers.google.com/maps/documentation).