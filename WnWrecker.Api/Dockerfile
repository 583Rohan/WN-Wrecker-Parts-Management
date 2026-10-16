# Builds and runs the API in a container (used by Render).

# 1) build
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src
COPY WnWrecker.Api.csproj ./
RUN dotnet restore
COPY . .
RUN dotnet publish -c Release -o /app --no-restore

# 2) run
FROM mcr.microsoft.com/dotnet/aspnet:10.0
# fonts for the PDF invoices/transcripts; Australian time for dates printed on them
RUN apt-get update \
 && apt-get install -y --no-install-recommends fontconfig fonts-dejavu-core \
 && rm -rf /var/lib/apt/lists/*
ENV TZ=Australia/Brisbane \
    ASPNETCORE_ENVIRONMENT=Production
WORKDIR /app
COPY --from=build /app .
USER $APP_UID
ENTRYPOINT ["dotnet", "WnWrecker.Api.dll"]
