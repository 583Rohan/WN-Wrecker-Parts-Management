# WN Wrecker Parts Management System

SCI701 Project

Web application for WN Wrecker, a car wrecker that lists and sells second-hand
car parts online. It provides a public catalogue of parts (with search, a car
finder, and photos), a customer–admin chat, and a protected admin interface to
manage listings and enquiries.

## Repository structure
This repo contains both halves of the project:

- `WnWrecker.Api/` — the backend (ASP.NET Core Web API).
- `frontend/` — the customer + admin frontend (React, built with Vite).

## Tech stack
- ASP.NET Core Web API (.NET 10, C#)
- Entity Framework Core — SQL Server LocalDB (development), Azure SQL (production)
- JWT bearer authentication for admin endpoints
- Azure Blob Storage for part photos
- OpenAPI + Scalar for interactive API docs/testing (dev only, at /scalar)
- React + Vite (TypeScript) for the frontend
- React Router (frontend routing)

## Features
- Public catalogue: list parts with search and filtering (search text, make, model, year)
- Car finder: pick a car by Make → Model → Year (built from in-stock parts)
- View a single part
- Admin CRUD: create, update, delete parts (JWT-protected)
- Photo upload to Azure Blob Storage (JWT-protected); only the image URL is stored
  in the database. Deleting a part also deletes its photo from Blob Storage.
- Customer chat: anonymous customers (no login) chat via a floating widget,
  identified by a conversation token stored in their browser. A chat can be about
  no product, one product, or several.
- Admin chat dashboard: view all conversations (also grouped by product), reply,
  and set a per-product enquiry status (New → In Discussion → Reserved →
  Awaiting Pickup → Sold → Closed) so parts are not double-sold.

## Frontend routes
- `/`       Customer site (with the floating chat widget)
- `/admin`  Admin dashboard (log in with the admin credentials)

## API endpoints

### Parts
| Method | Route                 | Auth   | Purpose                              |
|--------|-----------------------|--------|--------------------------------------|
| GET    | /api/parts            | Public | List parts (search, make, model, year) |
| GET    | /api/parts/{id}       | Public | Get one part                         |
| POST   | /api/parts            | Admin  | Create a part                        |
| PUT    | /api/parts/{id}       | Admin  | Update a part                        |
| DELETE | /api/parts/{id}       | Admin  | Delete a part (and its photo)        |
| POST   | /api/parts/{id}/photo | Admin  | Upload a photo for a part            |

### Auth
| Method | Route            | Auth   | Purpose                         |
|--------|------------------|--------|---------------------------------|
| POST   | /api/auth/login  | Public | Get a JWT for the admin account |

### Vehicles (car finder)
| Method | Route                                  | Auth   | Purpose                        |
|--------|----------------------------------------|--------|--------------------------------|
| GET    | /api/vehicles/makes                    | Public | Makes we have in-stock parts for |
| GET    | /api/vehicles/models?make=             | Public | Models for a make              |
| GET    | /api/vehicles/years?make=&model=       | Public | Years for a make + model       |

### Chat — customer (public, identified by conversation token)
| Method | Route                                    | Purpose                       |
|--------|------------------------------------------|-------------------------------|
| POST   | /api/chat/start                          | Start a conversation, get token |
| GET    | /api/chat/{token}                        | Load conversation + messages + parts |
| POST   | /api/chat/{token}/messages               | Send a message                |
| POST   | /api/chat/{token}/parts                  | Attach a product              |
| DELETE | /api/chat/{token}/parts/{partId}         | Remove a product              |

### Chat — admin (JWT-protected)
| Method | Route                                                     | Purpose                     |
|--------|-----------------------------------------------------------|-----------------------------|
| GET    | /api/admin/chats                                          | List all conversations      |
| GET    | /api/admin/chats/by-part                                  | Conversations grouped by product |
| GET    | /api/admin/chats/{conversationId}                         | One conversation + messages |
| POST   | /api/admin/chats/{conversationId}/messages               | Admin reply                 |
| PUT    | /api/admin/chats/{conversationId}/parts/{partId}/status  | Change a product's status   |

Admin endpoints require an `Authorization: Bearer <token>` header. Get a token
from `POST /api/auth/login` using the admin credentials.

## Data model
- **Part** — a listed part (name, make, model, year, condition, price, status, photo URL).
- **Conversation** — one per customer chat; identified by a `Token` (GUID) the
  browser stores. No customer login required.
- **Message** — a single message in a conversation (`Sender` = customer or admin).
- **ConversationPart** — links a conversation to a part and holds the per-product
  enquiry `Status`. A chat about several parts has several of these; a general
  enquiry has none.

## Configuration & Secrets

Sensitive values are NOT stored in this repo. They are supplied per environment:
- Development: .NET User Secrets (stored in your user profile, never committed)
- Production (Azure): App Service > Configuration (or Azure Key Vault)

Non-secret config lives in appsettings.json (e.g. Jwt:Issuer, AdminCredentials:Username).
The database connection string for local development uses LocalDB and is in
appsettings.json. The production database connection is set in Azure, not here.

### Secrets this project needs
| Config key                 | Purpose                                                        |
|----------------------------|----------------------------------------------------------------|
| Jwt:Key                    | Secret used to sign admin login tokens (32+ chars)             |
| AdminCredentials:Password  | Password for the admin dashboard                               |
| AzureBlob:ConnectionString | Connection string for the Azure Storage account (part photos)  |
| AzureBlob:Container        | Blob container name for photos (e.g. part-photos)              |

## First-time setup for a developer

### Backend (WnWrecker.Api)
Prerequisites: .NET 10 SDK, SQL Server LocalDB, Visual Studio 2022.

1. Clone the repo and open the solution in Visual Studio.
2. Set up secrets — right-click WnWrecker.Api > Manage User Secrets (or run
   `dotnet user-secrets init`), then set the values:
   dotnet user-secrets set "Jwt:Key" "<a long random secret, 32+ chars>"
   dotnet user-secrets set "AdminCredentials:Password" "<the admin password>"
   dotnet user-secrets set "AzureBlob:ConnectionString" "<the storage connection string>"
   dotnet user-secrets set "AzureBlob:Container" "part-photos"
3. Create the local database — in Package Manager Console, run:
   Update-database
4. Run the project (F5). The API starts on https://localhost:7014, with the
   interactive API tester at https://localhost:7014/scalar.

### Frontend (frontend/)
Prerequisites: Node.js (LTS).

1. From the repo root:
   cd frontend
   npm install
   npm run dev
   `npm install` pulls every dependency listed in `package.json` (React, React
   Router, etc.), so no extra installs are needed.
2. Create a `.env` file in the `frontend` folder:
   VITE_API_URL=https://localhost:7014
3. Open the printed URL (default http://localhost:5173).

The backend must be running for the frontend to load data, and its URL must be
allowed by CORS (configured in the backend's Program.cs).   