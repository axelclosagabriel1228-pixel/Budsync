# Budsync

Budsync is a phone-friendly PHP wallet tracker. It records income, expenses, adjustments, and transfers without connecting to a bank. Balances are calculated from opening balances and entries.

## Run locally

```sh
npm install
npm run dev
```

Open the Vite URL. A new workspace asks whether to start at ₱0 or explore with sample opening balances. Workspaces save in IndexedDB. Older valid `budsync-v1` local-storage snapshots are migrated into the guest workspace.

## Finance interface

The responsive dashboard has a balance overview, actual monthly income and expenses, a selectable cash-flow chart, spending categories, wallet summaries, and recent activity. **Insights** adds monthly category budgets and wallet-based savings targets. Targets display progress without moving money. The mobile layout uses a bottom navigation dock and transaction sheet; the theme button switches between light and dark modes and remembers the choice. Motion respects reduced-motion settings.

Budgets and goals are optional fields in the existing V2 JSON backup and sync snapshot. Older backups still load with empty plans.

## Receipt folders and scanner

Open **Receipts**, create a folder, and choose the wallet that pays for its expenses. **Add amount** records a manual expense immediately. Edit that record later to attach a receipt image without deducting the amount a second time. **Scan or upload** creates a new expense from an image. Review the detected merchant, date, and amount before saving; OCR suggestions can be corrected. The scanner detects a crop area, with manual crop, rotation, and black-and-white enhancement controls. A folder's optional comparison budget shows remaining or overspent amounts but does not move money.

Receipt images and folder records save in this device's IndexedDB. Deleting a record or folder reverses its linked wallet expenses; editing a folder's wallet moves those expenses to the new wallet. OCR also suggests line items and flags possible duplicate receipts for review. The OCR worker and English model are bundled locally and cached for offline use. Receipt images are not included in JSON backups or account sync. Camera access requires localhost or HTTPS and a browser that supports camera capture.

## Google Drive receipts

Drive access is a separate connection in **Settings**. When connected, Budsync uploads receipt data and images into `Budsync/<wallet name>/<folder name>/`, using JSON files for folder and receipt details and JPG files for images. It checks Drive while the app is visible, downloads newer folder and receipt details to each device, and uploads local changes. Deletions leave a marker for other devices and move the old Drive files to Trash. **Sync receipts now** runs both directions; **Download Drive changes** checks Drive without uploading. Receipt expenses are repaired from the local receipt copy if a save was interrupted. A JSON backup restore removes local receipts outside the restored transaction set and prevents older Drive receipts from reappearing. Custom wallets must have matching IDs on the other device, usually by signing into the same Budsync account or restoring its JSON backup first. Drive access lasts only until Google's browser token expires, so reconnect to resume synchronization. Keep a local backup before clearing browser data.

To enable Drive on localhost:

1. In [Google Cloud Console](https://console.cloud.google.com/), create or select a project. Enable **Google Drive API** under **APIs & Services > Library**.
2. Configure the OAuth consent screen (Google Auth Platform > Branding/Audience/Data Access). Add the `https://www.googleapis.com/auth/drive.file` scope. If the app is in testing mode, add your Google account as a test user.
3. Create an OAuth **Web application** client under **Clients**. Add `http://localhost:5173` to **Authorized JavaScript origins**. Add your actual Vite origin too if its port differs. This browser token flow needs no redirect URI.
4. Copy `.env.example` to `.env.local` if needed, set `VITE_GOOGLE_CLIENT_ID` to that Web Client ID, and restart `npm run dev`. Keep your Firebase values if present.
5. Open **Settings > Connect Google Drive** and approve access. A `Budsync` folder will be created after the first upload. Connect the same Google account on another device to synchronize its local receipt copy.

For the Firebase Hosting site, add `https://budsync-6672e.web.app` to the same OAuth Web client's **Authorized JavaScript origins**. Put that client's ID in `VITE_GOOGLE_CLIENT_ID` in `.env.local` before running `npm run build`, then deploy `dist` with `firebase deploy --only hosting --project budsync-6672e`. Vite embeds the ID at build time, so a new build and deployment are required after adding it. Firebase account sign-in alone does not grant Google Drive access; connect Drive separately in **Settings**.

The `drive.file` permission lets Budsync manage files it creates; the OAuth access token stays in memory. Do not place an OAuth client secret in the browser configuration.

## Firebase account sync

Budsync uses Firebase Authentication for email/password accounts and Firebase Realtime Database for revisioned wallet snapshots. Local IndexedDB saving works without Firebase configuration. To connect your Firebase project:

1. In [Firebase Console](https://console.firebase.google.com/), create a project and register a **Web app**. Copy its `apiKey`, `authDomain`, `projectId`, and `appId` into the matching `VITE_FIREBASE_*` entries in `.env.local` (see `.env.example`). These are web app identifiers, not a service account key.
2. Under **Authentication > Sign-in method**, enable **Email/Password**. Under **Settings > Authorized domains**, add your eventual `*.pages.dev` hostname and any custom domain. `localhost` may also need adding for local sign-in.
3. Create a **Realtime Database**. Copy its exact URL into `VITE_FIREBASE_DATABASE_URL`. In **Realtime Database > Rules**, publish the contents of `database.rules.json`; the rules permit each signed-in user to read and update only their own revisioned workspace. Do not leave the database in public test mode.
4. Restart `npm run dev`, create a Firebase account in **Settings**, and verify a wallet change syncs after refresh. The app stores snapshots at `workspaces/<Firebase uid>`.

Settings has separate **Login** and **Sign up** forms and shows **Log out** when an account is active. Guest and account records stay separate. **Copy guest data here** and **Copy previous account data** show a review before replacing the Firebase account copy. Account changes save locally first and sync when online. While open, the app checks for other-device changes every four seconds and on return or reconnection. Conflicting edits require choosing one copy; download a JSON backup before replacing either copy. Firebase's single-string snapshot limit is 10 MB; Budsync stops uploads before that limit and keeps the local copy.

### Moving an existing Supabase account

Supabase passwords and user IDs do not transfer to Firebase automatically. Before leaving the old deployment, sign in there and download the latest JSON backup from **Settings**. Create a new Firebase account, then restore that backup. On the same browser origin, **Copy previous account data** can also import the last locally saved Supabase workspace, but it may be older than the remote copy. Receipt images are separate: connect the same Google Drive account after restoring wallets, then restore missing receipts. Keep the previous Supabase project and Vercel deployment until you have checked the Firebase balances and receipts on the new site.

## Cloudflare Pages

Connect this Git repository in **Cloudflare > Workers & Pages > Create > Pages**. Set the build command to `npm run build` and the output directory to `dist`. Add all `VITE_FIREBASE_*` values from `.env.example` under **Settings > Environment variables** for production and preview; add `VITE_GOOGLE_CLIENT_ID` if using Drive. Deploy, then add the resulting `*.pages.dev` hostname to Firebase Authentication's authorized domains and Google OAuth's JavaScript origins. Cloudflare Pages serves this Vite single-page app directly; no server functions or Vercel configuration are required. Confirm sign-in, wallet sync, and receipt restore on the Pages URL before retiring the old deployment.

## Phone and offline use

Build and serve the app over HTTPS, then use the phone browser's **Add to Home Screen** or **Install app** action. The service worker caches the app shell after an online visit; IndexedDB holds records offline. Sync runs when the app is online, rather than relying on browser Background Sync support. Keep an exported JSON backup outside the device in case browser data is cleared. JSON backups are plain text, so store them privately.

## Checks

```sh
npm run test
npm run lint
npm run build
```

Manually check wallet edits, transfers, transaction deletion and restore, budgets, savings targets, receipt capture and upload, OCR review, manual record attachment, folder wallet changes, JSON restore, offline entry and reopening, sign-in on two devices, and conflict choices. Check 320–820 px layouts, light and dark themes, keyboard focus, and reduced motion. Physical Android and iPhone camera testing remains to be done.
