# Budsync

Budsync is a phone-friendly PHP wallet tracker. It records income, expenses, adjustments, and transfers without connecting to a bank. Balances are calculated from opening balances and entries.

## Run locally

```sh
npm install
npm run dev
```

Open the Vite URL. The first guest workspace shows sample opening balances from the V1 plan. Choose **Start fresh at ₱0** or **Restore existing data** in the welcome panel. Workspaces save in IndexedDB. On first launch after V2, the app copies a valid `budsync-v1` local-storage snapshot into the guest workspace, then removes the old key after the copy succeeds.

## Fluid Finance interface

The responsive dashboard has a balance overview, actual monthly income and expenses, a selectable cash-flow chart, spending categories, wallet summaries, and recent activity. **Insights** adds monthly category budgets and wallet-based savings targets. Targets display progress without moving money. The mobile layout uses a bottom navigation dock and transaction sheet; the theme button switches between light and dark modes and remembers the choice. Motion respects reduced-motion settings.

Budgets and goals are optional fields in the existing V2 JSON backup and sync snapshot. Older backups still load with empty plans.

## Account sync

The local `.env.local` points to the **BudSync Sydney** Supabase project using its publishable key. For another setup, copy `.env.example` to `.env.local` and fill in the URL and publishable key. Never put a secret or service-role key in the browser. Apply the SQL files in `supabase/migrations/` in order before using account sync.

Use **Data & account** to create an account or sign in. Guest and account records stay separate; **Copy guest data here** shows a review before replacing the account copy. Account changes save locally first and sync when online. While the app is open and online, it checks for other-device changes every four seconds, and also checks on return to the app or reconnection. **Check for updates** remains available for an immediate check. If both devices changed the account before syncing, choose which copy to keep in the conflict panel and download a JSON backup first. The sync record is separate from the project's existing `wallets` and `transactions` tables.

## Phone and offline use

Build and serve the app over HTTPS, then use the phone browser's **Add to Home Screen** or **Install app** action. The service worker caches the app shell after an online visit; IndexedDB holds records offline. Sync runs when the app is online, rather than relying on browser Background Sync support. Keep an exported JSON backup outside the device in case browser data is cleared. JSON backups are plain text, so store them privately.

## Checks

```sh
npm run test
npm run lint
npm run build
```

Manually check wallet edits, transfers, transaction deletion and restore, budgets, savings targets, JSON restore, offline entry and reopening, sign-in on two devices, and conflict choices. Check 320–820 px layouts, light and dark themes, keyboard focus, and reduced motion. Physical Android and iPhone testing remains to be done.
