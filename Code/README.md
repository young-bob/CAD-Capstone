# Volunteer Service Management System (VSMS)

``` shell
VSMS (Volunteer Service Management System)
├── Backend
│   ├── VSMS.Grains.Interfaces
│   ├── VSMS.Grains  
│   ├── VSMS.API
│   ├── VSMS.Silo
│   └── VSMS.SQL
└── Frontend
    └── VSMS.VolunteerApp
        ├── Models
        ├── Views
        ├── ViewModels
        ├── Services
        └── Platforms
            ├── Android
            ├── iOS
            ├── MacCatalyst
            └── Windows
```

## System Architecture

```mermaid
graph TB
    subgraph MobileLayer ["📱 Presentation Layer - .NET MAUI"]
        MobileApp["VSMS.VolunteerApp"]
        subgraph MauiComponents ["Components"]
            Views["Views (XAML)"]
            ViewModels["ViewModels (MVVM)"]
            Models["Models"]
            Services["Services"]
        end
    end

    subgraph DockerEnv ["🐳 Docker Environment (vsms-net)"]
        subgraph APILayer ["API Layer - ASP.NET Core"]
            API["VSMS.API<br>:8080"]
            subgraph APIComponents ["Components"]
                Controllers["Controllers"]
                JWT["JWT Auth"]
                Swagger["Swagger/OpenAPI"]
                OrleansClient["Orleans Client"]
            end
        end

        subgraph BusinessLayer ["Business Layer - Orleans"]
            Silo["VSMS.Silo<br>:11111 :30000"]
            subgraph GrainComponents ["Grains"]
                UserGrain["UserGrain"]
                OrgGrain["OrganizationGrain"]
                OppGrain["OpportunityGrain"]
                AppGrain["ApplicationGrain"]
            end
        end

        subgraph DataLayer ["Data Layer - PostgreSQL"]
            DB[("Database: vsms<br>:5432")]
            subgraph Tables ["Tables"]
                OrleansSchema["Orleans Tables<br>(Clustering/Persistence)"]
                AppSchema["Application Tables<br>(Users/Orgs/Opportunities)"]
            end
        end
    end

    MobileApp -->|"REST API<br>HTTP/HTTPS"| API
    API -->|"Orleans RPC<br>Grain Calls"| Silo
    API -.->|"Read Cluster<br>Membership"| DB
    Silo <-->|"State Persistence<br>& Clustering"| DB

    style MobileLayer fill:#e1f5ff
    style DockerEnv fill:#fff4e1
    style APILayer fill:#e8f5e9
    style BusinessLayer fill:#f3e5f5
    style DataLayer fill:#fce4ec
```


## Logical Architecture Diagram of Single Node
``` mermaid
graph TB
    subgraph MobileLayer ["📱 User Client"]
        MobileApp["VSMS.VolunteerApp"]
    end

    subgraph DockerEnv ["🐳 Single Node Environment (Docker)"]
        subgraph APILayer ["API Layer - ASP.NET Core"]
            API["VSMS.API<br>:8080"]
        end

        subgraph BusinessLayer ["Business Layer - Orleans"]
            Silo["VSMS.Silo<br>:11111 :30000"]
        end

        subgraph DataLayer ["Data Layer - PostgreSQL"]
            DB[("PostgreSQL: vsms<br>:5432")]
        end
    end

    MobileApp -->|"REST API<br>HTTP/HTTPS"| API
    API -->|"Orleans RPC<br>Grain Calls"| Silo
    API -.->|"Read Cluster<br>Membership"| DB
    Silo <-->|"State Persistence<br>& Clustering"| DB

    style MobileLayer fill:#e1f5ff
    style DockerEnv fill:#fff4e1
    style APILayer fill:#e8f5e9
    style BusinessLayer fill:#f3e5f5
    style DataLayer fill:#fce4ec
```

## Physical Architecture Diagram of Single Node
``` mermaid
graph TB
    subgraph Client ["📱 User Client"]
        Mobile["VSMS.VolunteerApp"]
    end

    subgraph Server1 ["🖥️ Server"]
        subgraph DockerEngine ["Docker Runtime"]
            direction TB
            API["<b>VSMS.API Container</b><br/>Port: 8080"]
            Silo["<b>VSMS.Silo Container</b><br/>Ports: 11111, 30000"]
            DB["<b>PostgreSQL Container</b><br/>Port: 5432"]
        end
    end

    %% Network Connections
    Mobile -- "REST API<br>HTTP/HTTPS" --> API
    API -- "Container Network" --> Silo
    Silo -- "Container Network" --> DB
    API -.-> DB

    %% Styling
    style Server1 fill:#f9f9f9,stroke:#333,stroke-width:2px
    style DockerEngine fill:#fff4e1,stroke:#d4a017,stroke-dasharray: 5 5
    style API fill:#e8f5e9,stroke:#2e7d32
    style Silo fill:#f3e5f5,stroke:#7b1fa2
    style DB fill:#fce4ec,stroke:#c2185b
```

## Logical Architecture Diagram of Three-Node Sample

``` mermaid
graph TB
    subgraph MobileLayer ["📱 User Client"]
        MobileApp["VSMS.VolunteerApp"]
    end

    LB["Load Balancer<br>(Nginx / Ingress)"]

    subgraph ClusterEnv ["🌐 Distributed Cluster (Multi-Node)"]
        subgraph APILayer ["API Layers"]
            API1["VSMS.API Node 1"]
            API2["VSMS.API Node 2"]
            API3["VSMS.API Node 3"]
        end

        subgraph BusinessLayer ["Business Layers (Orleans Cluster)"]
            Silo1["VSMS.Silo 1"]
            Silo2["VSMS.Silo 2"]
            Silo3["VSMS.Silo 3"]
        end

        subgraph DataLayer ["Data Layers (CockroachDB Cluster)"]
            CRDB1[("CockroachDB Node 1")]
            CRDB2[("CockroachDB Node 2")]
            CRDB3[("CockroachDB Node 3")]
        end
    end

    MobileApp -->|"HTTPS"| LB
    LB --> API1 & API2 & API3
    
    %% Orleans RPC Logic
    API1 & API2 & API3 -->|"Distributed RPC"| Silo1 & Silo2 & Silo3
    
    %% API to DB Membership Read
    API1 -.->|"Read Membership"| CRDB1
    API2 -.->|"Read Membership"| CRDB2
    API3 -.->|"Read Membership"| CRDB3
    
    %% Clustering & Persistence
    Silo1 <--> Silo2 <--> Silo3
    Silo1 & Silo2 & Silo3 <-->|"Distributed<br>State Persistence"| CRDB1 & CRDB2 & CRDB3
    
    %% DB Replication
    CRDB1 <-->|"Raft Consensus"| CRDB2 <--> CRDB3

    style MobileLayer fill:#e1f5ff
    style ClusterEnv fill:#fff4e1
    style APILayer fill:#e8f5e9
    style BusinessLayer fill:#f3e5f5
    style DataLayer fill:#fce4ec
```

## Physical Architecture Diagram of Three-Node Sample

``` mermaid
graph TB
    subgraph Clients ["📱 User Client"]
        Mobile["VSMS.VolunteerApp"]
    end

    LB["Load Balancer<br>(Nginx / Ingress)"]

    subgraph Cluster ["🌐 3-Node High Availability Infrastructure"]
        
        subgraph Node1 ["🖥️ Server Node 1"]
            API1["VSMS.API (Node 1)"]
            Silo1["VSMS.Silo (Node 1)"]
            DB1[("CockroachDB (Node 1)")]
            
            API1 -.->|"Read Membership"| DB1
            Silo1 -->|"State & Membership Update"| DB1
        end

        subgraph Node2 ["🖥️ Server Node 2"]
            API2["VSMS.API (Node 2)"]
            Silo2["VSMS.Silo (Node 2)"]
            DB2[("CockroachDB (Node 2)")]
            
            API2 -.->|"Read Membership"| DB2
            Silo2 -->|"State & Membership Update"| DB2
        end

        subgraph Node3 ["🖥️ Server Node 3"]
            API3["VSMS.API (Node 3)"]
            Silo3["VSMS.Silo (Node 3)"]
            DB3[("CockroachDB (Node 3)")]
            
            API3 -.->|"Read Membership"| DB3
            Silo3 -->|"State & Membership Update"| DB3
        end
    end

    %% External Traffic Distribution
    Mobile -->|"HTTPS"| LB
    LB -->|"Round Robin"| API1 & API2 & API3

    %% API to Silo Mesh (Cross-Node RPC)
    API1 ==>|"Local RPC"| Silo1
    API1 -.->|"Cross-Node Gateway"| Silo2 & Silo3

    API2 ==>|"Local RPC"| Silo2
    API2 -.->|"Cross-Node Gateway"| Silo1 & Silo3

    API3 ==>|"Local RPC"| Silo3
    API3 -.->|"Cross-Node Gateway"| Silo1 & Silo2

    %% Cluster Horizontal Sync
    Silo1 <== "Orleans Clustering (Gossip)" ==> Silo2
    Silo2 <== "Orleans Clustering" ==> Silo3
    Silo3 <== "Orleans Clustering" ==> Silo1

    DB1 <== "Raft Consensus (Replication)" ==> DB2
    DB2 <== "Raft Consensus" ==> DB3
    DB3 <== "Raft Consensus" ==> DB1

    %% 严格对齐 README.md 的配色方案
    style Mobile fill:#e1f5ff,stroke:#01579b,stroke-width:2px
    style LB fill:#fff4e1,stroke:#d4a017,stroke-width:2px
    style Node1 fill:#fff4e1,stroke:#d4a017,stroke-dasharray: 5 5
    style Node2 fill:#fff4e1,stroke:#d4a017,stroke-dasharray: 5 5
    style Node3 fill:#fff4e1,stroke:#d4a017,stroke-dasharray: 5 5
    
    style API1 fill:#e8f5e9,stroke:#2e7d32
    style API2 fill:#e8f5e9,stroke:#2e7d32
    style API3 fill:#e8f5e9,stroke:#2e7d32
    
    style Silo1 fill:#f3e5f5,stroke:#7b1fa2
    style Silo2 fill:#f3e5f5,stroke:#7b1fa2
    style Silo3 fill:#f3e5f5,stroke:#7b1fa2
    
    style DB1 fill:#fce4ec,stroke:#c2185b
    style DB2 fill:#fce4ec,stroke:#c2185b
    style DB3 fill:#fce4ec,stroke:#c2185b
```

### Technology Stack

| Layer | Technology | Purpose |
| --- | --- | --- |
| **Mobile** | .NET MAUI 10 | Cross-platform UI (iOS/Android/Windows) |
| **Web** | React 18, Vite, Tailwind CSS | Web Frontend UI |
| **API** | ASP.NET Core 10 | REST API, JWT Authentication |
| **Business** | Orleans 10 | Distributed Actor Framework |
| **Data** | PostgreSQL or CockroachDB | Relational Database or NoSQL |
| **Orchestration** | Docker Compose | Container Management |

### Key Features

- **Orleans Clustering**: ADO.NET provider for distributed coordination
- **State Persistence**: Automatic grain state storage in PostgreSQL
- **Authentication**: JWT-based security for API endpoints

## Getting Started

### Prerequisites

- **Docker Desktop**: Install [Docker Desktop](https://www.docker.com/products/docker-desktop/) for your platform
- **.NET 10 SDK**: Required for local development (optional for Docker-only deployment)
- **PostgreSQL Client**: Optional, for direct database access

### Running the Application

#### On macOS / Linux

```bash
# Make script executable (first time only)
chmod +x docker_build.sh

# Build and run
./docker_build.sh
```

#### On Windows

Double-click `docker_build.bat` or run in Command Prompt:

```cmd
docker_build.bat
```

#### Manual Docker Compose Commands

```bash
# Build without cache
docker compose build --no-cache

# Create services
docker compose up -d

# More Docker Compose Commands as follows:

# View logs
docker compose logs

# Stop services
docker compose stop

# Start services
docker compose start

# Remove services
docker compose down
```

### Accessing the Application

Once the containers are running:

| Service | URL | Description |
| --- | --- | --- |
| **API** | <http://localhost:8080> | REST API endpoints |
| **Swagger UI** | <http://localhost:8080/swagger> | API documentation and testing |
| **PostgreSQL** | `localhost:5432` | Database (user: `root`, password: `root123`, db: `vsms`) |

### Troubleshooting

**Port conflicts**:

- Ensure ports 8080, 5432, 11111, and 30000 are not in use by other applications
