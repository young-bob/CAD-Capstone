# Volunteer Service Management System (VSMS)

VSMS is a modern, high-performance platform designed to connect volunteers with organizations effortlessly. It features an event-driven, distributed backend architecture and a cross-platform mobile application.

## 🛠 Technology Stack

### Backend Architecture
- **Core Framework**: .NET 10 (ASP.NET Core Web API)
- **Language**: C# 13
- **Distributed Systems / Actor Model**: Microsoft Orleans 10
  - *Clustering & Persistence*: ADO.NET (PostgreSQL)
  - *Event Bus / Message Streaming*: Orleans Streams (Memory / ADO.NET)
- **Database / ORM**: PostgreSQL 17 + Entity Framework Core 9 (EF Core)
- **Architecture Pattern**: CQRS (Command Query Responsibility Segregation) + Domain-Driven Design (DDD) principles
- **File Storage**: MinIO (S3-compatible object storage)
- **Authentication / Authorization**: JWT (JSON Web Tokens)
- **Document Generation**: QuestPDF (for volunteer hour certificates)
- **Deployment & Containerization**: Podman Compose (supports both single-node and multi-silo cluster deployments)

### Mobile Application
- **Framework**: React Native with Expo (SDK 55)
- **Language**: TypeScript
- **UI Component Library**: React Native Paper (Material Design)
- **State Management**: Zustand
- **Routing/Navigation**: Expo Router (File-based routing)
- **Network / API Integration**: Axios
- **Maps & Location**: Expo Location (for geospatial check-ins)
- **Hardware Integration**: Expo Image Picker (for proof of attendance & credential uploads)
- **Push Notifications**: Expo Push Notifications Service

### Web Application
- **Framework**: React 19 + Vite 6
- **Language**: TypeScript
- **Styling**: TailwindCSS v4
- **Icons**: Lucide React
- **Network / API Integration**: Axios
- **Deployment**: Nginx (static file serving via Podman)

---

## 📱 How to Run the Mobile App (Android Emulator)

Follow these steps to run the VSMS mobile application on an Android Emulator:

### Prerequisites
1. **Node.js** (v18 or newer recommended).
2. **Android Studio** installed and configured.
3. An **Android Virtual Device (AVD)** created in Android Studio.

### Step 1: Start the Backend Services
The backend has cross-service dependencies (PostgreSQL, MinIO, etc.). It is highly recommended to run the entire stack using containerization rather than `dotnet run` directly.

To start the full environment locally:
```bash
podman compose -f podman-compose.yml up -d
# or
docker compose -f podman-compose.yml up -d
```
*The API will be available at `http://localhost:8080`.*

### Step 2: Configure the Mobile API URL
1. Open the file `mobile/constants/config.ts`.
2. Locate the `API_URL` variable.
3.   **Configurations for different environments:**
   - **Local via Emulator**: `http://10.0.2.2:8080/api` (Maps to your host's localhost:8080)
   - **Production/Cluster API**: `http://10.20.30.1:8080/api` (The deployed API server IP)

   ```typescript
   // In mobile/constants/config.ts
   export const API_URL = 'http://10.20.30.1:8080/api'; 
   ```

### Step 3: Install Mobile Dependencies
Navigate to the mobile directory and install the necessary NPM packages:
```bash
cd mobile
npm install
```

### Step 4: Start the Android Emulator
Open Android Studio, go to the **Device Manager**, and launch your Android emulator (hit the "Play" button next to your virtual device). Wait until the Android home screen has fully booted up.

### Step 5: Start the Expo Development Server
Run the following command to start the Expo Metro CLI:
```bash
npx expo start
```
*Alternatively, you can use `npm start`.*

### Step 6: Launch on Android
Once the Expo CLI is running in your terminal and displaying the QR code, press the **`a`** key on your keyboard. 

Expo will automatically connect to your running Android emulator, install the "Expo Go" app if it isn't already installed, and launch the VSMS application.

---

## 🌐 How to Run the Web App (Development)

### Prerequisites
1. **Node.js** (v18 or newer recommended).
2. Backend services running (see Step 1 in the Mobile section above).

### Step 1: Install Dependencies
```bash
cd web
npm install
```

### Step 2: Configure the API URL
The API URL is configured via environment variable. For development, create or edit `web/.env.development`:
```env
VITE_API_URL=http://10.20.30.1
```
- **Local Docker**: `VITE_API_URL=http://localhost:8080`
- **Production/Cluster API**: `VITE_API_URL=http://10.20.30.1`

### Step 3: Start the Dev Server
```bash
npm run dev
```
*The web app will be available at `http://localhost:5173` with hot-reload.*

### Step 4: Build for Production
```bash
npm run build
```
*The output is in `web/dist/` — static HTML/CSS/JS files served by Nginx in production.*

---

## 🧪 Seed Debug Data (System/Flow Testing)

To quickly generate realistic data for end-to-end feature and process debugging (users, organizations, opportunities, shifts, applications, approvals, attendance, and disputes), run:

```bash
node tools/seed-debug-data.mjs --base-url http://localhost:8080
```

Common example with larger dataset:

```bash
node tools/seed-debug-data.mjs \
  --base-url http://localhost:8080 \
  --incremental true \
  --long-running true \
  --history-days 300 \
  --future-days 60 \
  --coordinators 5 \
  --volunteers 60 \
  --opportunities-per-org 6 \
  --applications-per-opportunity 10 \
  --attendance-flows 40 \
  --checkin-ready-rate 0.9
```

30/30-day window example (past 30 days + next 30 days):

```bash
node tools/seed-debug-data.mjs \
  --base-url http://10.20.30.2:8080 \
  --long-running true \
  --history-days 30 \
  --future-days 30 \
  --past-opportunity-rate 0.45 \
  --ongoing-opportunity-rate 0.1 \
  --coordinators 5 \
  --volunteers 80 \
  --opportunities-per-org 10 \
  --shifts-per-opportunity 3 \
  --applications-per-opportunity 9 \
  --approve-rate 0.68 \
  --reject-rate 0.2 \
  --attendance-flows 25 \
  --checkin-ready-rate 0.85 \
  --run-tag month-window
```

Notes:
- Uses the default admin account: `admin@vsms.com / Admin@123` (override with `--admin-email` and `--admin-password`).
- `--long-running true` spreads opportunities/shifts across past/ongoing/future timeline and uses realistic names for people, organizations, and events.
- `--incremental true` will reuse accounts from `data/debug-seed/latest.json` (same base URL) and only top up to requested coordinator/volunteer counts.
- Generated account credentials and IDs are saved to:
  - `data/debug-seed/latest.json`
  - `data/debug-seed/seed-<runId>.json`
- See all options with:

```bash
node tools/seed-debug-data.mjs --help
```

---

## 🏗 Deployment Guide Overview

For production deployments, VSMS provides tailored `podman-compose` configurations:

### Single-Node (All-in-One)
- **`podman-compose.yml`**: PostgreSQL + MinIO + API + Web in one stack.

### Multi-Node (Cluster)
| File | Server | Description |
|------|--------|-------------|
| `podman-compose.db.yml` | DB Server | Dedicated PostgreSQL |
| `podman-compose.file.yml` | File Server | Dedicated MinIO storage |
| `podman-compose.api.yml` | App Server(s) | API + Orleans Silo (multi-silo cluster) |
| `podman-compose.web.yml` | LB Server | Web frontend (SPA build → Nginx serve) |
| `podman-compose.nginx.yml` | LB Server | Nginx reverse proxy + load balancer |

### Web Deployment
```bash
# Build & deploy web on the LB server (10.20.30.1)
podman compose -f podman-compose.web.yml up -d
podman compose -f podman-compose.nginx.yml up -d
# or
docker compose -f podman-compose.web.yml up -d
docker compose -f podman-compose.nginx.yml up -d
```

Refer to the `.env.example` file for required environment variables.
