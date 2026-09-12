# Google Cloud Platform (GCP) Deployment Guide: Cloud Run

This repository is fully containerized and production-ready for automated deployment to **Google Cloud Run**.

---

## 1. How to Find Your GCP Project ID

Since you already created a project when setting up the Google OAuth Client ID, you can find the **Project ID** in under 10 seconds:

1. Open the [Google Cloud Console](https://console.cloud.google.com).
2. Look at the top blue navigation bar (right next to the "Google Cloud" logo).
3. Click the **Project dropdown selector**.
4. In the modal that opens, you will see two columns:
   - **Project Name** (e.g., *Retail Sales*)
   - **Project ID** (e.g., *retail-sales-442109* or *smiling-matrix-381902*)
5. Copy the exact string in the **Project ID** column.

---

## 2. Deploy to Cloud Run from GitHub (Zero Local Setup Required)

Because your code is already pushed to GitHub (`https://github.com/rangaprasad557/sales.git`), you can deploy directly from the Google Cloud Console:

### Step 1: Navigate to Cloud Run
- In Google Cloud Console, search for **Cloud Run** in the top search bar and select it.
- Click the **Create Service** button.

### Step 2: Connect Your GitHub Repository
- Under **Deployment platform**, select **"Continuously deploy from a repository"**.
- Click **SET UP WITH CLOUD BUILD**.
- If prompted:
  - Select **GitHub** as the Repository Provider.
  - Authenticate with GitHub and select your repository: **`rangaprasad557/sales`**.
- Branch: select **`^master$`** or **`^main$`**.
- Build Type: select **Dockerfile** (Source location: `/Dockerfile`).
- Click **Save**.

### Step 3: Configure Service Settings
- **Service Name**: `sales` (or any preferred name).
- **Region**: Select a region close to your users (e.g., `asia-south1` (Mumbai) or `us-central1` (Iowa)).
- **Authentication**: Select **"Allow unauthenticated invocations"** (so you and your staff can access the web application over the public internet).
- **Container Port**: Ensure port is set to **`8080`** (under Container settings -> Port).
- **Memory**: 1 GiB or 2 GiB (Recommended: `1 GiB`).

### Step 4: Deploy
- Click **Create**.
- Cloud Build will automatically build your Docker container in Google Cloud and deploy it.
- Once finished (takes ~2 minutes), Cloud Run will give you your **live HTTPS URL**:
  ```
  https://sales-xxxxxx-uc.a.run.app
  ```

---

## 3. Update Your Google OAuth Authorized Origins

Once your Cloud Run URL is live:
1. Go to [Google Cloud Console Credentials](https://console.cloud.google.com/apis/credentials).
2. Click on your **Web Client ID**.
3. Under **Authorized JavaScript origins**, click **ADD URI** and paste your Cloud Run URL:
   ```
   https://sales-xxxxxx-uc.a.run.app
   ```
4. Click **Save**.

---

## 4. Alternate CLI Method: Deploy via `gcloud` CLI

If you prefer to deploy from your terminal:

1. Install Google Cloud SDK via PowerShell:
   ```powershell
   winget install Google.CloudSDK --silent
   ```
2. Open a new PowerShell terminal and authenticate:
   ```powershell
   gcloud auth login
   gcloud config set project YOUR_PROJECT_ID
   ```
3. Enable Cloud Run and Cloud Build APIs:
   ```powershell
   gcloud services enable run.googleapis.com cloudbuild.googleapis.com
   ```
4. Deploy the application:
   ```powershell
   gcloud run deploy sales --source . --region us-central1 --allow-unauthenticated
   ```
