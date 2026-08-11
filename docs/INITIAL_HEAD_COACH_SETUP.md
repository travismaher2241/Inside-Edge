# Initial Head Coach Account Setup Guide

To prevent self-serve privilege escalation vulnerabilities, Inside Edge requires that the **very first Head Coach account is created manually via the Firebase Console**. All subsequent coach accounts (Head Coach or Assistant Coach) are then created strictly via secure single-use invitation links generated inside the app by a Head Coach.

## Step-by-Step Manual Setup

### 1. Create the Authentication Account
1. Open the [Firebase Console](https://console.firebase.google.com/) and select the `inside-edge-cricket-app` project.
2. Go to **Build** → **Authentication** → **Users** tab.
3. Click **Add user**.
4. Enter your Head Coach email address (e.g. `headcoach@club.com`) and set a strong password.
5. Click **Add user**.
6. Copy the generated **User UID** (e.g. `abc123xyz456...`).

### 2. Create the Firestore Coach Document
1. Go to **Build** → **Firestore Database** → **Data** tab.
2. Select or create the `coaches` collection.
3. Add a new document where the **Document ID** is set to the exact **User UID** copied from Step 1.
4. Add the following document fields:
   - `uid`: `string` → *(User UID)*
   - `email`: `string` → `"headcoach@club.com"`
   - `displayName`: `string` → `"Head Coach"`
   - `role`: `string` → `"head_coach"`
   - `createdAt`: `string` → `"2026-08-11T12:00:00.000Z"` *(current ISO timestamp)*

5. Click **Save**.

### 3. Deploy Security Rules & Sign In
1. Deploy the security rules:
   ```bash
   npx firebase-tools deploy --only firestore:rules
   ```
2. Open the web app at `https://inside-edge-cricket-app.web.app` (or `http://localhost:5173`).
3. Sign in using the email and password created in Step 1.
4. As Head Coach, you will now see a **COACHES** button in the header, allowing you to generate invitation links for your Assistant Coaches.
