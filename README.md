# WN-Wrecker-Parts-Management
SCI701 Project


Connection to database are in a string in appsettings.json

## Configuration & Secrets

Sensitive values are NOT stored in this repo. They are supplied per environment:
- Development: .NET User Secrets (stored in your user profile, never committed)
- Production (Azure): App Service > Configuration (or Azure Key Vault)

The database connection string for local development uses LocalDB and is in
appsettings.json. The production database connection is set in Azure, not here.

### Secrets this project needs
| Config key                 | Purpose                                             |
|----------------------------|-----------------------------------------------------|
| Jwt:Key                    | Secret used to sign admin login tokens (32+ chars)  |
| AdminCredentials:Password  | Password for the admin dashboard                    |

### First-time setup for a developer
1. In Visual Studio: right-click WnWrecker.Api > Manage User Secrets
   (or run: dotnet user-secrets init)
2. Set the values:
   dotnet user-secrets set "Jwt:Key" "<a long random secret, 32+ chars>"
   dotnet user-secrets set "AdminCredentials:Password" "<the admin password>"
3. Run the project (F5).