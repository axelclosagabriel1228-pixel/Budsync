# Repository Guidelines

## Project Goal

Build a beginner-friendly, local multi-wallet finance tracker. The V1 plan calls for preset Personal, Organization, Savings, and E-Wallet wallets; manual PHP income, expense, adjustment, and transfer entries; transaction history; and a dashboard whose balances are calculated from opening balances and entries. Transfers must move the same amount between two different wallets without changing the combined balance. Save records locally before considering sign-in or cloud sync. The app currently displays the React and Vite starter page, so treat these features as planned work, not existing behavior.

## Project Structure

- `src/main.jsx` mounts React into the `root` element in `index.html`.
- `src/App.jsx` contains the current page and starter counter. `src/App.css` styles that page; `src/index.css` holds global styles.
- `src/assets/` contains imported images; `public/` contains files served by URL, such as the favicon and icons.
- `vite.config.js` configures Vite. `eslint.config.js` defines lint rules. `package.json` lists dependencies and scripts.

## Run and Check

Run commands from this directory (`Budsync/Budsync` when starting from the outer workspace):

- `npm install` installs dependencies from `package-lock.json`.
- `npm run dev` starts the local Vite development server; open the URL it prints.
- `npm run lint` checks JavaScript and JSX with ESLint.
- `npm run build` creates a production build in `dist/`.
- `npm run preview` serves that build locally for a final browser check.

There is no automated test script yet. For finance features, manually check income, expenses, corrections, transfers, editing, filters, and persistence after refresh against the V1 plan before calling them complete.

## Working Conventions

Use the existing JavaScript and JSX style: two-space indentation, single quotes, and function components. Keep wallet balances and dashboard totals derived from recorded activity rather than storing separate totals. Require a reason note for corrections and edits. Label unfinished screens or controls as placeholders; do not display invented financial data.

## Before Editing

Explain the intended change in plain language before modifying files. Name the files likely to change and how you will check the result. Keep changes small and focused so a beginner can follow them.
