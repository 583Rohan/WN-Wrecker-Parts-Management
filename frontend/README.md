# WN Wrecker — Frontend

React + TypeScript frontend for the WN Wrecker Parts Management System, built with Vite.
It consumes the backend Web API in ../WnWrecker.Api.

## Prerequisites
- Node.js (LTS)
- The backend running (default https://localhost:7014)

## Setup
1. Install dependencies: `npm install`
2. Create a `.env` file in this folder:
    VITE_API_URL=https://localhost:7014
3. Start the dev server: `npm run dev`  (opens on http://localhost:5173)

## Routes
- `/`       Customer site (with the floating chat widget)
- `/admin`  Admin dashboard (log in with the admin credentials)

## Structure
- `src/App.tsx`      Route definitions (customer + admin route trees)
- `src/main.tsx`     App entry (wraps the app in BrowserRouter)
- `src/components/CustomerLayout.tsx`  Customer nav bar + page content + chat widget
- `src/components/AdminLayout.tsx`     Admin nav + login gate (guards all /admin pages)
- `src/components/ChatWidget.tsx`      Floating customer chat widget (FAQ bot + human handoff)
- `src/pages/`        Customer pages: Home, Parts, PartDetail, Finder, Cart, About, Contact, NotFound
- `src/pages/Admin/`  Admin pages: AdminHome, ManageParts, ChatManagement

## Notes
- The API base URL comes from `VITE_API_URL` in `.env`.
- Customer chat identifies anonymous users via a token stored in the browser.
- The chat widget shows an automated FAQ bot; it hands off to a human on request,
  on availability/purchase questions, or when an admin replies.
- The admin dashboard authenticates against the API and stores its JWT in localStorage.
