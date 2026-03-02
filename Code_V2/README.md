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
podman-compose -f podman-compose.yml up -d
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

## 🏗 Deployment Guide Overview

For production deployments, VSMS provides tailored `podman-compose` configurations:
- **`podman-compose.yml`**: Designed for single-machine deployment (PostgreSQL, MinIO, API in one stack).
- **`podman-compose.api.yml`**: Designed for multi-silo Orleans cluster deployment (runs only the API container in `host` network mode, expects external DB and MinIO).
- **`podman-compose.file.yml`**: Dedicated MinIO storage server deployment.
- **`podman-compose.db.yml`**: Dedicated PostgreSQL server deployment.

Refer to the `.env.example` file for required environment variables.
