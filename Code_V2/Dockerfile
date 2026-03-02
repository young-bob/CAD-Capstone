# ============ Stage 1: Build ============
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

# Copy solution and project files for restore
COPY VSMS.slnx .
COPY backend/VSMS.Abstractions/VSMS.Abstractions.csproj backend/VSMS.Abstractions/
COPY backend/VSMS.Grains/VSMS.Grains.csproj backend/VSMS.Grains/
COPY backend/VSMS.Api/VSMS.Api.csproj backend/VSMS.Api/
COPY backend/VSMS.Infrastructure/VSMS.Infrastructure.csproj backend/VSMS.Infrastructure/

# Restore dependencies (cached layer)
RUN dotnet restore backend/VSMS.Api/VSMS.Api.csproj

# Copy full source
COPY backend/ backend/

# Build and publish release
RUN dotnet publish backend/VSMS.Api/VSMS.Api.csproj \
    -c Release \
    -o /app/publish \
    --no-restore

# ============ Stage 2: Runtime ============
FROM mcr.microsoft.com/dotnet/aspnet:10.0-noble AS runtime
WORKDIR /app

# Install curl for healthcheck, and create non-root user
RUN apt-get update && apt-get install -y --no-install-recommends curl && rm -rf /var/lib/apt/lists/* \
    && useradd --no-create-home --shell /bin/false appuser

# Copy published output
COPY --from=build /app/publish .

# Set environment
ENV ASPNETCORE_URLS=http://+:8080
ENV ASPNETCORE_ENVIRONMENT=Production
ENV DOTNET_EnableDiagnostics=0

EXPOSE 8080

USER appuser
ENTRYPOINT ["dotnet", "VSMS.Api.dll"]
