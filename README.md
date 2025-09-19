
# Firebase Studio

This is a NextJS starter in Firebase Studio.

To get started, take a look at src/app/page.tsx.

## Google Drive Integration Setup

To enable automatic Google Drive folder creation for new reports, you need to configure a Google Cloud Service Account and share a "parent" folder with it. Follow these steps carefully.

### Step 1: Create the Service Account

1.  **Go to the Google Cloud Console:**
    *   Open the [Service Accounts page](https://console.cloud.google.com/iam-admin/serviceaccounts) for your project.

2.  **Start Creating:**
    *   Click the **+ CREATE SERVICE ACCOUNT** button at the top of the page.

3.  **Fill in Service Account Details:**
    *   **Service account name:** Enter a descriptive name. For example: `MapCorrect Drive Manager`.
    *   **Service account ID:** This will be automatically generated based on the name. You can leave it as is.
    *   **Service account description:** Briefly describe what this account will do. For example: `Manages Google Drive folders for MapCorrect reports.`
    *   Click **CREATE AND CONTINUE**.

4.  **Grant Permissions (Optional):**
    *   You can skip this step for now. The necessary permissions will be granted by sharing the Google Drive folder directly.
    *   Click **CONTINUE**.

5.  **Grant User Access (Optional):**
    *   You can also skip this step.
    *   Click **DONE**.

### Step 2: Enable the Google Drive & Maps APIs

1.  **Go to the API Library:**
    *   Navigate to the [API Library page](https://console.cloud.google.com/apis/library) in the Google Cloud Console.

2.  **Enable the Google Drive API:**
    *   Search for "Google Drive API" and click on it.
    *   If the API is not already enabled, click the **ENABLE** button. **This is a required step.**

3.  **Enable the Maps JavaScript API:**
    *   Go back to the [API Library](https://console.cloud.google.com/apis/library).
    *   Search for "Maps JavaScript API" and click on it.
    *   If it's not already enabled, click the **ENABLE** button.

### Step 3: Generate a Service Account Key

1.  **Go back to your Service Account list:**
    *   Find the service account you just created. Click on its email address to manage it.

2.  **Create a New Key:**
    *   Go to the **KEYS** tab.
    *   Click **ADD KEY > Create new key**.
    *   Select **JSON** as the key type and click **CREATE**. A JSON file containing the credentials will download to your computer. Keep this file safe.

### Step 4: Create and Share a Google Drive Folder

1.  **Create a Parent Folder:**
    *   Open your Google Drive.
    *   Create a new folder. This will be the main folder where all report subfolders are stored (e.g., "MapCorrect Reports").

2.  **Share the Folder with the Service Account:**
    *   Right-click the folder you just created and select **Share**.
    *   In the sharing dialog, copy the `client_email` from the JSON key file you downloaded (it looks like `<name>@<project-id>.iam.gserviceaccount.com`) and paste it into the "Add people and groups" field.
    *   **IMPORTANT:** Assign it the **Content manager** role. The application needs this permission to create new folders for each report.
    *   Click **Send**.

3.  **Get the Parent Folder ID:**
    *   Open the parent folder in your browser. The URL will look like `https://drive.google.com/drive/folders/1a2b3c4d5e6f7g8h9i0j`.
    *   **Copy ONLY the long string of letters and numbers at the end of the URL.** This is the **Folder ID**.

### Step 5: Get Your Google Maps API Key

1.  **Go to the Credentials Page:**
    *   Open the [Credentials page](https://console.cloud.google.com/apis/credentials) in the Google Cloud Console.
2.  **Find Your Key:**
    *   Under the "API Keys" section, you should see an API key. It might be named "Browser key" or something similar.
    *   Click the **Show key** icon (an eye) to reveal the key, then copy it.
    *   **Note:** For security in a production app, you should restrict this key to your website's domain.

### Step 6: Set Your Environment Variables

1.  **Open the `.env` file** in this project.
2.  **Fill in the values** using the information from your JSON key file and the IDs you just copied:
    *   `GOOGLE_DRIVE_PARENT_FOLDER_ID`: Paste **ONLY the Folder ID** from Step 4 (e.g., `1a2b3c4d5e6f7g8h9i0j`). **DO NOT paste the full URL.**
    *   `GCP_SERVICE_ACCOUNT_EMAIL`: Paste the `client_email` from your downloaded JSON key file (Step 3).
    *   `GCP_SERVICE_ACCOUNT_PRIVATE_KEY`: Paste the entire `private_key` from your JSON key file. It must start with `-----BEGIN PRIVATE KEY-----` and end with `-----END PRIVATE KEY-----`. It's best to wrap the key in double quotes (`"`).
    *   `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`: Paste the **API Key** you copied from Step 5.

## Troubleshooting Map Errors

If the map shows a "This page can't load Google Maps correctly" error, and you see `BillingNotEnabledMapError` in the browser console, follow these steps.

### 1. Verify Maps Platform Billing (Most Common Fix)

Even if your project has a billing account, you need to ensure the "Maps" product itself is linked to it. This is a common point of confusion.

1.  **Go to the Maps Billing Page:**
    *   Open the [Google Maps Platform Billing Page](https://console.cloud.google.com/google/maps-platform/billing).
    *   Make sure your project (`mapcorrect-z5n3v`) is selected.
2.  **Check the Status:**
    *   The page should show your active billing account. If it prompts you to select a billing account, it means the Maps Platform is not yet linked. Please select your active billing account to link it.

### 2. Check API Key Restrictions

An API key can be restricted to only work on certain websites. For development, it's often easiest to temporarily remove restrictions.

1.  **Go to the Credentials Page:**
    *   Open the [Credentials page](https://console.cloud.google.com/apis/credentials).
2.  **Select Your API Key:**
    *   Click on the name of the API key you are using.
3.  **Check for Restrictions:**
    *   Under **"Application restrictions"**, ensure **"None"** is selected for now. You can add restrictions later for production.
    *   Under **"API restrictions"**, ensure **"Don't restrict key"** is selected.
4.  **Save** your changes.

After checking these two settings, the map should load correctly. There is no code change required to fix this issue.
