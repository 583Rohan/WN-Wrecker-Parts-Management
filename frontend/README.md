# WN Wrecker — Frontend

React + TypeScript frontend for the WN Wrecker Parts Management System, built with Vite.
It consumes the backend Web API in ../WnWrecker.Api.

## Prerequisites
- Node.js (LTS)
- The backend running (default https://localhost:7014)

## Setup
1. Install dependencies: `npm install`
2. Create a `.env` file in this folder: VITE_API_URL=https://localhost:7014
3. Start the dev server: `npm run dev`  (opens on http://localhost:5173)

## Routes
- `/`       Customer site (with the floating chat widget)
- `/admin`  Admin dashboard (log in with the admin credentials)

## Structure
- `src/CustomerHome.tsx`   Customer landing page
- `src/ChatWidget.tsx`     Floating customer chat widget (anonymous; token in localStorage)
- `src/AdminDashboard.tsx` Admin login + chat management dashboard
- `src/App.tsx`            Route definitions
- `src/main.tsx`           App entry (wraps app in BrowserRouter)

## Notes
- The API base URL comes from `VITE_API_URL` in `.env`.
- Customer chat identifies anonymous users via a token stored in the browser.
- The admin dashboard authenticates against the API and stores its JWT in localStorage.