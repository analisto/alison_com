# Baku Bus Route Dashboard

Complete database system for Baku's public transportation network. Fetches real-time data from the Ayna Transport API and stores it in a PostgreSQL database for analysis and visualization.

[![GitHub Actions](https://img.shields.io/badge/automated-every%203%20hours-brightgreen)](https://github.com/yourusername/bus_route_dashboard/actions)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-13+-blue.svg)](https://www.postgresql.org/)
[![Python](https://img.shields.io/badge/Python-3.8+-blue.svg)](https://www.python.org/)

## Table of Contents

- [Features](#features)
- [System Architecture](#system-architecture)
- [Database Schema (ERD)](#database-schema-entity-relationship-diagram)
- [Quick Start](#quick-start)
- [Setup](#setup)
- [Usage](#usage)
- [Data Flow Diagram](#data-flow-diagram)
- [Automated Data Scraping (GitHub Actions)](#automated-data-scraping-github-actions)
- [Data Sources](#data-sources)
- [Database Queries](#database-queries)
- [Project Structure](#project-structure)
- [Database Statistics](#database-statistics)
- [Documentation](#documentation)
- [Security Notes](#security-notes)
- [Troubleshooting](#troubleshooting)

## Features

- **Complete Route Data**: 208+ bus routes with detailed information
- **3,800+ Bus Stops**: Geographic coordinates and transport hub identification
- **Route Visualization**: Flow coordinates for mapping complete route paths
- **Fare Information**: Payment types, tariffs, and pricing data
- **Carrier Details**: Complete operator and company information
- **Fresh Data**: Automatic truncate-and-replace to ensure data freshness

## System Architecture

```mermaid
graph TB
    subgraph "Data Sources"
        API[Ayna Transport API]
    end

    subgraph "GitHub Actions"
        CRON[Cron Trigger<br/>Every 3 Hours]
        MANUAL[Manual Trigger]
        WORKFLOW[Scrape Workflow]
    end

    subgraph "Python Scripts"
        STOPS[stops.py<br/>Fetch Stops]
        BUS[busDetails.py<br/>Fetch Bus Details]
    end

    subgraph "PostgreSQL Database"
        DB[(ayna schema)]
    end

    subgraph "Applications"
        DASH[Dashboard/Analytics]
        MAP[Map Visualization]
        APP[Mobile/Web Apps]
    end

    API -->|REST API| STOPS
    API -->|REST API| BUS
    CRON --> WORKFLOW
    MANUAL --> WORKFLOW
    WORKFLOW --> STOPS
    WORKFLOW --> BUS
    STOPS -->|INSERT| DB
    BUS -->|INSERT| DB
    DB -->|QUERY| DASH
    DB -->|QUERY| MAP
    DB -->|QUERY| APP

    style API fill:#e1f5ff
    style DB fill:#fff4e1
    style WORKFLOW fill:#e8f5e9
```

## Database Schema (Entity Relationship Diagram)

```mermaid
erDiagram
    payment_types ||--o{ buses : "payment method"
    regions ||--o{ buses : "region"
    working_zone_types ||--o{ buses : "zone type"

    buses ||--o{ bus_stops : "has stops"
    buses ||--o{ routes : "has routes"

    stop_details ||--o{ bus_stops : "stop info"

    routes ||--o{ route_coordinates : "has coordinates"

    payment_types {
        int id PK
        string name
        text description
        boolean is_active
        date deactived_date
        int priority
    }

    regions {
        int id PK
        string name
        text description
        boolean is_active
        date deactived_date
        int priority
    }

    working_zone_types {
        int id PK
        string name
        text description
        boolean is_active
        date deactived_date
        int priority
    }

    stops {
        int id PK
        decimal longitude
        decimal latitude
        boolean is_transport_hub
        timestamp created_at
        timestamp updated_at
    }

    stop_details {
        int id PK
        string code
        string name
        string name_monitor
        string utm_coord_x
        string utm_coord_y
        decimal longitude
        decimal latitude
        boolean is_transport_hub
        timestamp created_at
        timestamp updated_at
    }

    buses {
        int id PK
        string carrier
        string number
        string first_point
        string last_point
        decimal route_length
        int payment_type_id FK
        date card_payment_date
        int tariff
        string tariff_str
        int region_id FK
        int working_zone_type_id FK
        int duration_minuts
        timestamp created_at
        timestamp updated_at
    }

    bus_stops {
        int bus_stop_id PK
        int bus_id FK
        int stop_id FK
        string stop_code
        string stop_name
        decimal total_distance
        decimal intermediate_distance
        int direction_type_id
        timestamp created_at
    }

    routes {
        int id PK
        string code
        string customer_name
        string type
        string name
        string destination
        string variant
        string operator
        int bus_id FK
        int direction_type_id
        timestamp created_at
        timestamp updated_at
    }

    route_coordinates {
        int id PK
        int route_id FK
        decimal latitude
        decimal longitude
        int sequence_order
        timestamp created_at
    }
```

### Database Views

The system also includes two materialized views for optimized queries:

- **`v_buses_complete`** - Complete bus information with joined reference data (payment types, regions, zone types)
- **`v_bus_stops_details`** - Bus stops with complete stop details and names

## Quick Start

Get up and running in 5 minutes:

```mermaid
graph LR
    A[1. Clone Repo] --> B[2. Install Deps]
    B --> C[3. Set DATABASE_URL]
    C --> D[4. Run Migrations]
    D --> E[5. Scrape Data]
    E --> F[✓ Done!]

    style A fill:#e3f2fd
    style B fill:#e3f2fd
    style C fill:#fff9c4
    style D fill:#c8e6c9
    style E fill:#c8e6c9
    style F fill:#a5d6a7
```

```bash
# 1. Clone and setup
git clone <your-repo-url>
cd bus_route_dashboard
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# 2. Install dependencies
pip install -r requirements.txt

# 3. Configure database (create .env file)
echo "DATABASE_URL=postgresql://user:password@host:port/database?sslmode=require" > .env

# 4. Create database schema
python scripts/run_migrations.py

# 5. Fetch all data
python scripts/stops.py
python scripts/busDetails.py

# ✓ Done! Your database is now populated with 127,000+ records
```

For automated updates every 3 hours, see [GitHub Actions Setup](#automated-data-scraping-github-actions).

## Setup

### Prerequisites

- Python 3.8+
- PostgreSQL database (can use services like Neon, Supabase, AWS RDS, etc.)
- Internet connection for API access

### Installation

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd bus_route_dashboard
   ```

2. **Create a virtual environment**
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

4. **Configure environment variables**

   Create a `.env` file in the project root:
   ```bash
   DATABASE_URL=postgresql://user:password@host:port/database?sslmode=require
   ```

   Replace with your actual database credentials.

### Setup Flow

```mermaid
flowchart TD
    START([Start Setup]) --> CLONE[Clone Repository]
    CLONE --> VENV[Create Virtual Environment]
    VENV --> DEPS[Install Dependencies<br/>pip install -r requirements.txt]
    DEPS --> ENV[Configure .env<br/>DATABASE_URL]
    ENV --> MIGRATE[Run Migrations<br/>python scripts/run_migrations.py]
    MIGRATE --> VERIFY{Schema Created?}

    VERIFY -->|No| ERROR1[Check DATABASE_URL<br/>Check permissions]
    ERROR1 --> MIGRATE

    VERIFY -->|Yes| STOPS[Run Stops Scraper<br/>python scripts/stops.py]
    STOPS --> CHECK1{Success?}

    CHECK1 -->|No| ERROR2[Check API connection<br/>Check logs]
    ERROR2 --> STOPS

    CHECK1 -->|Yes| BUS[Run Bus Details Scraper<br/>python scripts/busDetails.py]
    BUS --> CHECK2{Success?}

    CHECK2 -->|No| ERROR3[Check API connection<br/>Check foreign keys]
    ERROR3 --> BUS

    CHECK2 -->|Yes| GITHUB{Setup GitHub Actions?}

    GITHUB -->|Yes| SECRET[Add DATABASE_URL Secret]
    SECRET --> ENABLE[Enable Workflow]
    ENABLE --> DONE([Setup Complete!<br/>Auto-refresh every 3 hours])

    GITHUB -->|No| MANUAL([Setup Complete!<br/>Manual refresh only])

    style START fill:#e8f5e9
    style DONE fill:#c8e6c9
    style MANUAL fill:#fff9c4
    style ERROR1 fill:#ffcdd2
    style ERROR2 fill:#ffcdd2
    style ERROR3 fill:#ffcdd2
```

## Usage

### Step 1: Run Migrations

Create the database schema and tables:

```bash
python scripts/run_migrations.py
```

This will:
- Create the `ayna` schema
- Create all required tables
- Set up indexes and foreign keys
- Create views and triggers
- Verify the setup

### Step 2: Fetch and Load Stops Data

Fetch all bus stops and save to database:

```bash
python scripts/stops.py
```

This will:
- Fetch 3,800+ stops from the API
- **Truncate existing data** in `ayna.stops`
- Insert fresh stop data
- Display statistics

**Expected runtime:** ~5-10 seconds

### Step 3: Fetch and Load Bus Details

Fetch all bus route details and save to database:

```bash
python scripts/busDetails.py
```

This will:
- Fetch 208+ bus routes from the API
- **Truncate existing data** in all related tables
- Insert fresh data for:
  - Payment types, regions, zone types
  - Stop details
  - Bus routes
  - Bus stops (junction table)
  - Routes with directions
  - Route coordinates (~60,000+ points)
- Display statistics and row counts

**Expected runtime:** ~25-30 seconds

## Data Flow Diagram

```mermaid
flowchart LR
    subgraph "External API"
        A1[Ayna API<br/>Stop Endpoint]
        A2[Ayna API<br/>Bus List Endpoint]
        A3[Ayna API<br/>Bus Details Endpoint]
    end

    subgraph "Python Scripts"
        S1[stops.py]
        S2[busDetails.py]
    end

    subgraph "Database Operations"
        D1[Truncate stops]
        D2[Insert 3,841 stops]
        D3[Truncate reference tables]
        D4[Upsert payment_types]
        D5[Upsert regions]
        D6[Upsert zone_types]
        D7[Truncate stop_details<br/>CASCADE]
        D8[Insert 2,700 stop_details]
        D9[Truncate buses<br/>CASCADE]
        D10[Insert 208 buses]
        D11[Insert 11,786 bus_stops]
        D12[Insert 416 routes]
        D13[Insert 109,147 coordinates]
    end

    subgraph "PostgreSQL"
        DB[(ayna schema<br/>9 tables + 2 views)]
    end

    A1 -->|JSON Array| S1
    S1 --> D1
    D1 --> D2
    D2 --> DB

    A2 -->|Bus IDs| S2
    A3 -->|Bus Details| S2
    S2 --> D3
    D3 --> D4
    D4 --> D5
    D5 --> D6
    D6 --> D7
    D7 --> D8
    D8 --> D9
    D9 --> D10
    D10 --> D11
    D11 --> D12
    D12 --> D13
    D13 --> DB

    style S1 fill:#e3f2fd
    style S2 fill:#e3f2fd
    style DB fill:#fff9c4
```

## Automated Data Scraping (GitHub Actions)

The project includes automated data scraping using **GitHub Actions** that runs every 3 hours to keep the database fresh.

### Workflow Overview

The workflow (`.github/workflows/scrape-data.yml`) automatically:
1. Runs `stops.py` to update bus stop data
2. Runs `busDetails.py` to update bus route details
3. Uploads logs as artifacts for review
4. Reports success/failure status

### Workflow Sequence Diagram

```mermaid
sequenceDiagram
    participant Cron as Cron/Manual Trigger
    participant GHA as GitHub Actions
    participant Job1 as Job: Scrape Stops
    participant Job2 as Job: Scrape Bus Details
    participant Job3 as Job: Notify
    participant API as Ayna API
    participant DB as PostgreSQL

    Cron->>GHA: Trigger (every 3 hours)
    activate GHA

    GHA->>Job1: Start Job 1
    activate Job1
    Job1->>Job1: Checkout code
    Job1->>Job1: Setup Python 3.11
    Job1->>Job1: Install dependencies
    Job1->>API: GET /api/stop/getAll
    API-->>Job1: 3,841 stops
    Job1->>DB: TRUNCATE ayna.stops
    Job1->>DB: INSERT 3,841 stops
    Job1->>GHA: Upload logs artifact
    deactivate Job1

    GHA->>Job2: Start Job 2 (after Job1 success)
    activate Job2
    Job2->>Job2: Checkout code
    Job2->>Job2: Setup Python 3.11
    Job2->>Job2: Install dependencies
    Job2->>API: GET /api/bus/getBusList
    API-->>Job2: 209 bus IDs

    loop For each bus ID
        Job2->>API: GET /api/bus/getBusById?id=X
        API-->>Job2: Bus details
    end

    Job2->>DB: TRUNCATE CASCADE (multiple tables)
    Job2->>DB: INSERT reference data
    Job2->>DB: INSERT 2,700 stop_details
    Job2->>DB: INSERT 208 buses
    Job2->>DB: INSERT 11,786 bus_stops
    Job2->>DB: INSERT 416 routes
    Job2->>DB: INSERT 109,147 coordinates
    Job2->>GHA: Upload logs artifact
    deactivate Job2

    GHA->>Job3: Start Job 3 (always)
    activate Job3
    Job3->>Job3: Check Job 1 status
    Job3->>Job3: Check Job 2 status
    alt Both jobs successful
        Job3->>GHA: ✓ Success status
    else Any job failed
        Job3->>GHA: ✗ Failure status
    end
    deactivate Job3

    deactivate GHA
```

### Schedule

- **Automatic runs**: Every 3 hours (at :00 minutes)
- **Cron expression**: `0 */3 * * *`
- **Manual trigger**: Available via "Actions" tab on GitHub

### Setup Instructions

#### 1. Configure Database Secret

Add your database URL as a GitHub Secret:

1. Go to your repository on GitHub
2. Click **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Name: `DATABASE_URL`
5. Value: `postgresql://user:password@host:port/database?sslmode=require`
6. Click **Add secret**

#### 2. Enable GitHub Actions

1. Go to the **Actions** tab in your repository
2. If prompted, click **I understand my workflows, go ahead and enable them**
3. The workflow will start running automatically on the schedule

### Manual Trigger

To manually trigger a data refresh:

1. Go to **Actions** tab
2. Click **Scrape Bus Route Data** workflow
3. Click **Run workflow** button
4. Select branch (usually `main`)
5. Click **Run workflow**

### Monitoring

#### View Workflow Runs

1. Go to **Actions** tab
2. Click on **Scrape Bus Route Data** workflow
3. View list of all workflow runs with status indicators:
   - ✅ Green checkmark: Success
   - ❌ Red X: Failure
   - 🟡 Yellow circle: In progress

#### View Logs

1. Click on any workflow run
2. Click on job names to see detailed logs:
   - **Scrape Bus Stops**: logs from stops.py
   - **Scrape Bus Details**: logs from busDetails.py
   - **Notify Completion**: final status report

#### Download Log Artifacts

Logs are automatically saved for 7 days:

1. Click on a completed workflow run
2. Scroll to **Artifacts** section at the bottom
3. Download:
   - `stops-scraper-logs`
   - `bus-details-scraper-logs`

### Workflow Configuration

```yaml
# Runs every 3 hours
on:
  schedule:
    - cron: '0 */3 * * *'
  workflow_dispatch:  # Manual trigger

jobs:
  scrape-stops:
    runs-on: ubuntu-latest
    steps:
      - Checkout code
      - Setup Python 3.11
      - Install dependencies
      - Run stops.py
      - Upload logs

  scrape-bus-details:
    runs-on: ubuntu-latest
    needs: scrape-stops  # Waits for stops to complete
    steps:
      - Checkout code
      - Setup Python 3.11
      - Install dependencies
      - Run busDetails.py
      - Upload logs
```

### Customizing the Schedule

To change the scraping frequency, edit `.github/workflows/scrape-data.yml`:

```yaml
on:
  schedule:
    # Examples:
    - cron: '0 */6 * * *'   # Every 6 hours
    - cron: '0 0 * * *'     # Daily at midnight
    - cron: '0 */1 * * *'   # Every hour
    - cron: '0 0,12 * * *'  # Twice daily (midnight and noon)
```

[Cron expression reference](https://crontab.guru/)

### Benefits

- **Fresh Data**: Database automatically updated every 3 hours
- **No Manual Intervention**: Fully automated process
- **Error Tracking**: Logs preserved for debugging
- **Status Notifications**: Clear success/failure indicators
- **Cost Effective**: Free on GitHub for public repositories
- **Reliable**: Runs on GitHub's infrastructure

### Troubleshooting

#### Workflow Fails with "Database connection failed"

**Solution**: Check that `DATABASE_URL` secret is correctly configured:
- Go to Settings → Secrets and variables → Actions
- Verify `DATABASE_URL` exists and is correct
- Ensure the database accepts connections from GitHub's IP ranges

#### Workflow Doesn't Run on Schedule

**Possible causes**:
- Repository is private and you've exceeded free tier minutes
- Workflow file has syntax errors (check Actions tab for warnings)
- GitHub Actions are disabled for the repository

**Solution**:
- Check Actions tab for error messages
- Verify workflow YAML syntax
- Enable Actions in repository settings

#### Stops Job Succeeds but Bus Details Fails

This is expected occasionally:
- Bus ID 96 consistently fails (known API issue)
- The workflow continues and completes successfully
- Check logs to verify it's just bus ID 96

#### Logs Show "Table does not exist"

**Solution**: Run migrations on your database:
```bash
python scripts/run_migrations.py
```

The workflow assumes database schema is already set up.

### Learn More

For complete workflow documentation including customization, monitoring, and troubleshooting, see:
- **[GitHub Actions Workflow Documentation](docs/scrape-data-workflow.md)**

## Data Sources

### API Endpoints

- **Stops**: `https://map-api.ayna.gov.az/api/stop/getAll`
- **Bus List**: `https://map-api.ayna.gov.az/api/bus/getBusList`
- **Bus Details**: `https://map-api.ayna.gov.az/api/bus/getBusById?id={bus_id}`

### Data Refresh Strategy

The scripts use a **truncate-and-replace** strategy to ensure fresh data:

```mermaid
flowchart LR
    subgraph "Old Data"
        OLD1[Old stops: 3,800]
        OLD2[Old buses: 200]
        OLD3[Old coordinates: 100,000]
    end

    subgraph "Refresh Process"
        T1[TRUNCATE stops]
        T2[TRUNCATE buses CASCADE]
        T3[TRUNCATE routes CASCADE]
    end

    subgraph "New Data"
        NEW1[Fresh stops: 3,841]
        NEW2[Fresh buses: 208]
        NEW3[Fresh coordinates: 109,147]
    end

    OLD1 -->|Drop| T1
    OLD2 -->|Drop| T2
    OLD3 -->|Drop| T3
    T1 -->|Insert| NEW1
    T2 -->|Insert| NEW2
    T3 -->|Insert| NEW3

    style OLD1 fill:#ffcdd2
    style OLD2 fill:#ffcdd2
    style OLD3 fill:#ffcdd2
    style T1 fill:#fff9c4
    style T2 fill:#fff9c4
    style T3 fill:#fff9c4
    style NEW1 fill:#c8e6c9
    style NEW2 fill:#c8e6c9
    style NEW3 fill:#c8e6c9
```

**Key Points:**
- Old data is **removed** before inserting new data
- Only tables in the `ayna` schema are affected
- Reference tables use upsert to preserve relationships
- CASCADE delete maintains foreign key integrity
- Each run provides a complete snapshot of current data

### Coordinate Parsing

The Ayna API uses European number format for coordinates. Our parser handles this:

```mermaid
flowchart LR
    INPUT["API Input<br/>'50,206,297'"]
    STEP1["Remove separators<br/>'50206297'"]
    STEP2["Insert decimal<br/>'50.206297'"]
    OUTPUT["Database Value<br/>50.206297"]

    INPUT --> STEP1
    STEP1 --> STEP2
    STEP2 --> OUTPUT

    style INPUT fill:#e3f2fd
    style OUTPUT fill:#c8e6c9
```

**Examples:**
- `'50,206,297'` → `50.206297` (Longitude)
- `'40,43885'` → `40.43885` (Latitude)
- `'49.961721'` → `49.961721` (Standard format)

## Database Queries

### Example Queries

**Get all buses with complete information:**
```sql
SELECT * FROM ayna.v_buses_complete;
```

**Find all stops for a specific bus:**
```sql
SELECT
    b.number as bus_number,
    sd.name as stop_name,
    sd.latitude,
    sd.longitude,
    bs.total_distance,
    bs.direction_type_id
FROM ayna.bus_stops bs
JOIN ayna.buses b ON bs.bus_id = b.id
JOIN ayna.stop_details sd ON bs.stop_id = sd.id
WHERE b.number = '210'
ORDER BY bs.direction_type_id, bs.bus_stop_id;
```

**Get route coordinates for mapping:**
```sql
SELECT
    r.destination,
    rc.latitude,
    rc.longitude,
    rc.sequence_order
FROM ayna.route_coordinates rc
JOIN ayna.routes r ON rc.route_id = r.id
WHERE r.bus_id = 145 AND r.direction_type_id = 1
ORDER BY rc.sequence_order;
```

**Find transport hubs:**
```sql
SELECT
    name,
    latitude,
    longitude,
    COUNT(DISTINCT bs.bus_id) as bus_count
FROM ayna.stop_details sd
LEFT JOIN ayna.bus_stops bs ON sd.id = bs.stop_id
WHERE sd.is_transport_hub = true
GROUP BY sd.id, sd.name, sd.latitude, sd.longitude
ORDER BY bus_count DESC;
```

**Analyze fare distribution:**
```sql
SELECT
    tariff_str,
    COUNT(*) as route_count,
    AVG(route_length) as avg_length_km,
    AVG(duration_minuts) as avg_duration_min
FROM ayna.buses
GROUP BY tariff_str
ORDER BY tariff;
```

## Project Structure

```
bus_route_dashboard/
├── .env                           # Database credentials (not in git)
├── .gitignore                     # Git ignore rules
├── README.md                      # This file
├── requirements.txt               # Python dependencies
├── .github/
│   └── workflows/
│       └── scrape-data.yml        # GitHub Actions workflow (every 3 hours)
├── migrations/
│   └── 001_initial_schema.sql     # Database schema
├── scripts/
│   ├── db_utils.py               # Database utility functions
│   ├── run_migrations.py         # Migration runner
│   ├── stops.py                  # Stops data fetcher
│   └── busDetails.py             # Bus details fetcher
├── data/                          # JSON backups (optional)
└── docs/                          # Documentation
    ├── db_utils.md               # Database utilities documentation
    ├── run_migrations.md         # Migration runner documentation
    ├── stops.md                  # Stops scraper documentation
    ├── busDetails.md             # Bus details scraper documentation
    └── scrape-data-workflow.md   # GitHub Actions workflow documentation
```

## Database Statistics

After running all scripts, you should have approximately:

```mermaid
graph LR
    subgraph "Reference Data"
        PT[Payment Types<br/>~2 records]
        R[Regions<br/>~1 record]
        WZ[Working Zone Types<br/>~1 record]
    end

    subgraph "Stop Data"
        S[Stops<br/>3,841 records]
        SD[Stop Details<br/>~2,700 records]
    end

    subgraph "Route Data"
        B[Buses<br/>208 records]
        BS[Bus Stops<br/>11,786 records]
        RT[Routes<br/>416 records]
        RC[Route Coordinates<br/>109,147 points]
    end

    PT -.->|Reference| B
    R -.->|Reference| B
    WZ -.->|Reference| B
    SD -.->|Details| BS
    B -->|Has| BS
    B -->|Has| RT
    RT -->|Has| RC

    style PT fill:#ffebee
    style R fill:#ffebee
    style WZ fill:#ffebee
    style S fill:#e8f5e9
    style SD fill:#e8f5e9
    style B fill:#e3f2fd
    style BS fill:#e3f2fd
    style RT fill:#e3f2fd
    style RC fill:#e3f2fd
```

### Record Counts Summary

| Table | Records | Category |
|-------|---------|----------|
| `payment_types` | ~2 | Reference |
| `regions` | ~1 | Reference |
| `working_zone_types` | ~1 | Reference |
| `stops` | 3,841 | Stops |
| `stop_details` | ~2,700 | Stops |
| `buses` | 208 | Routes |
| `bus_stops` | 11,786 | Routes |
| `routes` | 416 | Routes |
| `route_coordinates` | 109,147 | Routes |
| **Total** | **~127,000** | **All** |

## Documentation

Comprehensive documentation is available for all components:

```mermaid
graph TD
    README[📘 README.md<br/>Main Documentation]

    README --> SCRIPTS[Python Scripts]
    README --> WORKFLOW[GitHub Actions]
    README --> DB[Database]

    SCRIPTS --> S1[📄 docs/stops.md<br/>Stops Scraper]
    SCRIPTS --> S2[📄 docs/busDetails.md<br/>Bus Details Scraper]
    SCRIPTS --> S3[📄 docs/db_utils.md<br/>Database Utilities]
    SCRIPTS --> S4[📄 docs/run_migrations.md<br/>Migration Runner]

    WORKFLOW --> W1[📄 docs/scrape-data-workflow.md<br/>GitHub Actions Workflow]

    DB --> D1[📊 migrations/001_initial_schema.sql<br/>Database Schema]

    style README fill:#e3f2fd
    style S1 fill:#fff9c4
    style S2 fill:#fff9c4
    style S3 fill:#fff9c4
    style S4 fill:#fff9c4
    style W1 fill:#c8e6c9
    style D1 fill:#ffebee
```

### Documentation Index

| Document | Description |
|----------|-------------|
| **[stops.md](docs/stops.md)** | Stops scraper - fetches 3,841 bus stops from API |
| **[busDetails.md](docs/busDetails.md)** | Bus details scraper - fetches 208 routes with coordinates |
| **[db_utils.md](docs/db_utils.md)** | Database utilities - connection pooling, queries, helpers |
| **[run_migrations.md](docs/run_migrations.md)** | Migration runner - schema setup and verification |
| **[scrape-data-workflow.md](docs/scrape-data-workflow.md)** | GitHub Actions workflow - automated 3-hour scraping |

Each document includes:
- ✅ Function documentation with examples
- ✅ Usage instructions
- ✅ Error handling
- ✅ Troubleshooting guides
- ✅ Example code snippets

## Security Notes

- ✅ Database credentials are stored in `.env` (not committed to git)
- ✅ All scripts use environment variables for credentials
- ✅ Connection pooling for efficient database usage
- ✅ Prepared statements to prevent SQL injection
- ✅ Proper error handling and logging

## Troubleshooting

### Database connection fails

```bash
# Test the connection
python scripts/db_utils.py
```

Check that:
- Your `DATABASE_URL` in `.env` is correct
- The database server is accessible
- SSL mode is configured correctly

### Tables don't exist

Run migrations first:
```bash
python scripts/run_migrations.py
```

### API request fails

Check:
- Internet connection is active
- API endpoints are accessible
- No rate limiting from the server

### Permission errors

Ensure your database user has:
- CREATE SCHEMA permission
- CREATE TABLE permission
- INSERT, UPDATE, DELETE permissions on tables

## Future Enhancements

- [x] **Scheduled data refresh** - ✅ Implemented via GitHub Actions (every 3 hours)
- [ ] Real-time bus tracking integration
- [ ] Web dashboard for visualization
- [ ] Route optimization algorithms
- [ ] REST API for data access
- [ ] Mobile app integration
- [ ] Historical data tracking
- [ ] Performance analytics
- [ ] Email/Slack notifications on scraping failures
- [ ] Data quality monitoring and alerts

## License

[Add your license here]

## Contributing

[Add contribution guidelines here]

## Contact

[Add contact information here]
