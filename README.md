# CAD-Capstone
# VSMS: Volunteer Service Management System

<div align="center">

![License](https://img.shields.io/badge/license-MIT-blue.svg)

**A platform for revolutionizing volunteer management through automated verification and compliance.**

[Features](#-features) • [Tech Stack](#-tech-stack) • [Getting Started](#-getting-started) • [Architecture](#-architecture)

---

## 📖 Table of Contents

- [The Problem](#-the-problem)
- [Our Solution](#-our-solution)
- [System Roles & Personas](#-system-roles--personas)
- [Key Features](#-key-features)
- [Tech Stack](#-tech-stack)
- [Repository Structure](#-repository-structure)
- [Architecture](#-architecture)
- [Getting Started](#-getting-started)
- [Development Workflow](#-development-workflow)
- [Testing](#-testing)
- [Deployment](#-deployment)
- [Team](#-team)
- [License](#-license)

---

## 🎯 The Problem

Volunteer coordination in Ontario faces four critical challenges:

### 1. 📧 Email Overload
Coordinators spend **15+ hours weekly** managing scheduling emails with zero visibility into who's already signed up.

### 2. ⏰ Lost Hours
Paper sign-in sheets and manual tracking lead to forgotten check-ins and **lost volunteer hours that can't be recovered** for graduation or certification requirements.

### 3. 📄 Proof Problems
Students need **40 hours for Ontario graduation** (or **120-150 hours for PSW diplomas**) but chase signatures for weeks to get official documentation.

### 4. 😰 Last-Minute Hour Panic
Students can't see in real-time how many approved clinical hours they still need before program deadlines.

---

## 💡 Our Solution

A **mobile-first, web platform** that automates volunteer coordination with GPS-verified attendance, instant certificates, and real-time progress tracking.

### For Volunteers 🙋
- 📍 **Smart Discovery**: Location-based matching finds opportunities within 5 km
- ✅ **Auto Check-in**: Geofencing triggers arrival notifications automatically
- 🎓 **One-Click Proof**: Generate verified certificates instantly for schools/employers
- 📊 **Skill Tracking**: Build a professional portfolio across all organizations

### For Organizations - Coordinator 🏢
- 📧 **Zero Email**: Automated scheduling with real-time availability
- 📈 **Predictive Demand Forecasting**: AI-Driven Predictive Demand Forecasting 
- 📱 **Digital Attendance**: GPS-verified check-ins eliminate manual tracking
- 📊 **Instant Reports**: Export verified hours for grant compliance
- 🛡️ **Fraud Prevention**: Geofencing ensures volunteers are actually present

---

## 👥 System Roles & Personas

The platform supports three distinct user roles, each with dedicated dashboard routing across the Web and Mobile applications:
- **Volunteer**: Discovers opportunities, manages applications, performs geospatial attendance check-ins, and tracks their impact score.
- **Coordinator**: Manages organization profiles, creates opportunities, reviews applications, handles manual attendance adjustments, and registers push notifications.
- **Admin**: Oversees the entire platform, approves/rejects new organizations, resolves attendance disputes, and manages system moderation.

---

## ✨ Key Features

### MVP - Core Functionality

#### Volunteers 
| Feature | Description | Status |
|---|---|---|
| **Multi-org Discovery** | Browse opportunities across organizations with map view | ✅ Finished |
| **Application Tracking** | Real-time status updates (pending/approved/rejected) | ✅ Finished |
| **Document Upload** | Secure upload for background checks, certifications | ✅ Finished |
| **Smart Task Discovery** | Location-based matching within 5 km radius | ✅ Finished |
| **One-Click Application** | Auto-approval based on task capacity | ✅ Finished |
| **Geofenced Check-in** | Automatic GPS-verified attendance tracking | ✅ Finished |
| **Progress Dashboard** | Visual tracking toward graduation/certification goals | ✅ Finished |
| **Certificate Generator** | Instant verified PDFs for schools/employers | ✅ Finished |

#### Coordinators 
| Feature | Description | Status |
|---|---|---|
| **Organization Verification** | Upload proof of legitimate organization | ✅ Finished |
| **Attendance Console** | Live dashboard with geofence validation | ✅ Finished |
| **Shift Management** | Create/manage shifts with real-time applicants | ✅ Finished |
| **Approval Workflow** | Review applications and verify credentials | ✅ Finished |
| **Geofencing Config** | Set radius boundaries for each location | ✅ Finished |
| **Bulk Notifications** | Send automated shift reminders/updates | ✅ Finished |
| **Organization Profile** | Manage details, locations, requirements | ✅ Finished |
| **Predictive Demand Forecasting** | A heatmap or trend line showing "Predicted Need" vs. "Current Registered Volunteers." | 📋 Planned |

#### Administrators
| Feature | Description | Status |
|---|---|---|
| **Organization Approval** | Review and approve/reject new organization registrations | ✅ Finished |
| **System Moderation** | Ban/unban users and handle critical platform violations | ✅ Finished |
| **Dispute Resolution** | Intervene in and resolve attendance or hour disputes | ✅ Finished |

#### Platform-Wide Features
| Feature | Description | Status |
|---|---|---|
| **AI Assistant** | Context-aware generative AI for answering platform and data questions | ✅ Finished |
| **Push Notifications** | Cross-platform real-time alerts for shift and application updates | ✅ Finished |

---

## 🛠️ Tech Stack

### Backend Architecture
- **Core Framework**: .NET 10 (ASP.NET Core Web API)
- **Language**: C# 13
- **Distributed Systems / Actor Model**: Microsoft Orleans 10
  - *Clustering & Persistence*: ADO.NET (PostgreSQL)
  - *Event Bus / Message Streaming*: Orleans Streams (Memory / ADO.NET)
- **Database / ORM**: PostgreSQL 17 + Entity Framework Core 9 (EF Core)
- **Architecture Pattern**: Vertical Slice Architecture + CQRS + Domain-Driven Design (DDD) principles using Minimal APIs
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

## 📁 Repository Structure

The active development is located in the `Code_V2/` directory:

- **`Code_V2/backend/`**: Core backend services built with .NET 10, ASP.NET Core Web API, and Microsoft Orleans.
- **`Code_V2/web/`**: Web application dashboard built with React 19, Vite, and TailwindCSS.
- **`Code_V2/mobile/`**: Cross-platform mobile application built with React Native and Expo.
- **`Code_V2/presentation/`**: Interactive Capstone project presentation (Reveal.js).
- **`Code_V2/terraform/`**: Infrastructure as Code (IaC) configurations for AWS deployment.
- **`Code_V2/deploy/`**: Configurations for reverse proxies and load balancers (Nginx, HAProxy).
- **`Code_V2/tools/`**: Development utilities, including the Node.js data seeder (`seed-debug-data.mjs`).
- **`Code_V2/tests/`**: Unit and integration test suites (`VSMS.Tests`).
- **`Code_V2/data/`**: Local data storage and output directory for generated debug seed data.
- **`Code_V2/*.sh` scripts**: Automation scripts for local (`local_*.sh`) and remote (`remote_*.sh`) deployments.

---

## 🏗️ Architecture

VSMS utilizes an event-driven, distributed actor model built on Microsoft Orleans. This ensures high availability, horizontal scalability, and low-latency processing for real-time attendance tracking and matching. 

For detailed diagrams and the CQRS data flow, see the [Architecture UML Diagrams](./Code_V2/UML.md).

---

## 🚀 Getting Started

### Prerequisites
- **Docker / Podman** installed and running
- **Node.js** (v18 or newer recommended)
- **.NET 10 SDK** (for local backend development)
- **Android Studio** (for mobile emulator)

### 1. Start the Backend Services (Docker/Podman)
The backend has cross-service dependencies (PostgreSQL, MinIO, etc.). It is highly recommended to run the entire stack using containerization.

```bash
cd Code_V2
podman compose -f podman-compose.yml up -d
# or
docker compose -f podman-compose.yml up -d
```
*The API will be available at `http://localhost:8080`.*

### 2. Seed Debug Data
To quickly generate realistic data for testing:
```bash
cd Code_V2
node tools/seed-debug-data.mjs --base-url http://localhost:8080 --incremental true
```

### 3. Run the Web App
```bash
cd Code_V2/web
npm install
npm run dev
```
*Available at `http://localhost:5173`.*

### 4. Run the Mobile App
```bash
cd Code_V2/mobile
npm install
npx expo start
```
*Press `a` in the terminal to launch on the Android Emulator.*

---

## 💻 Development Workflow

### Branch Strategy
We follow **Git Flow**:
- `main` - Production-ready code
- `develop` - Integration branch for features
- `feature/*` - New features (e.g., `feature/V-9-geofenced-checkin`)
- `bugfix/*` - Bug fixes
- `hotfix/*` - Critical production fixes

### Pull Request Process
1. Create a feature branch from `develop`
2. Make your changes and commit using Conventional Commits
3. Push and create a Pull Request
4. Ensure CI checks pass (linting, tests)
5. Get at least 1 approval from a team member
6. Squash and merge into `develop`

---

## 🧪 Testing

```bash
# Backend tests (.NET)
cd Code_V2/tests/VSMS.Tests
dotnet test

# Web tests (React)
cd Code_V2/web
npm test

# Mobile tests (React Native)
cd Code_V2/mobile
npm test
```

### Test Coverage Goals
- **Unit Tests**: > 80% coverage
- **Integration Tests**: All API endpoints
- **E2E Tests**: Critical user flows (check-in, application, certificate generation)

---

## 🚢 Deployment

VSMS supports both local containerized development and automated cloud deployments.

### Infrastructure as Code (Terraform)
The `Code_V2/terraform/` directory contains complete IaC definitions for provisioning the AWS infrastructure required for the production environment, including compute instances, networking, and security groups.

---

## 👥 Team

### Development Team
- Bo Yang
- Bo Zhang
- Chunxi Zhang
- Marieth Franciss Perez Zevallos

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](./LICENSE) file for details.
