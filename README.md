# WN-Wrecker-Parts-Management
SCI701 Project


# WN Wrecker Parts Management System — API

Backend Web API for WN Wrecker, a car wrecker that lists and sells second-hand
car parts online. Provides a public catalogue of parts (with search/filter and
photos) and a protected admin interface to manage listings.

This repository is the **backend** (ASP.NET Core Web API). The customer-facing
and admin **frontend** (React) is a separate project that consumes this API.

## Tech stack
- ASP.NET Core Web API (.NET 10, C#)
- Entity Framework Core — SQL Server LocalDB (development), Azure SQL (production)
- JWT bearer authentication for admin endpoints
- Azure Blob Storage for part photos
- OpenAPI + Scalar for interactive API docs/testing (dev only, at /scalar)

## Features
- Public catalogue: list parts with search and filtering (search text, make, year)
- View a single part
- Admin CRUD: create, update, delete parts (JWT-protected)
- Photo upload to Azure Blob Storage (JWT-protected); only the image URL is stored
  in the database
- Deleting a part also deletes its photo from Blob Storage

## API endpoints
| Method | Route                     | Auth   | Purpose                          |
|--------|---------------------------|--------|----------------------------------|
| GET    | /api/parts                | Public | List parts (search, make, year)  |
| GET    | /api/parts/{id}           | Public | Get one part                     |
| POST   | /api/parts                | Admin  | Create a part                    |
| PUT    | /api/parts/{id}           | Admin  | Update a part                    |
| DELETE | /api/parts/{id}           | Admin  | Delete a part (and its photo)    |
| POST   | /api/parts/{id}/photo     | Admin  | Upload a photo for a part        |
| POST   | /api/auth/login           | Public | Get a JWT for the admin account  |

Admin endpoints require an `Authorization: Bearer <token>` header. Get a token
from `POST /api/auth/login` using the admin credentials.

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
| AzureBlob:Container        | Blob container name for photos (part-photos)                   |

## First-time setup for a developer
Prerequisites: .NET 10 SDK, SQL Server LocalDB, Visual Studio 2022.

1. Clone the repo and open the solution in Visual Studio.
2. Set up secrets — right-click WnWrecker.Api > Manage User Secrets (or run
   `dotnet user-secrets init`), then set the values: