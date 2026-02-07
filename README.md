# Baku Bus Route Dashboard

Complete database system for Baku's public transportation network. Fetches real-time data from the Ayna Transport API and stores it in a PostgreSQL database for analysis and visualization.

## Features

- **Complete Route Data**: 208+ bus routes with detailed information
- **3,800+ Bus Stops**: Geographic coordinates and transport hub identification
- **Route Visualization**: Flow coordinates for mapping complete route paths
- **Fare Information**: Payment types, tariffs, and pricing data
- **Carrier Details**: Complete operator and company information
- **Fresh Data**: Automatic truncate-and-replace to ensure data freshness

## Database Schema

The system uses the `ayna` schema with the following tables:

### Reference Tables
- `payment_types` - Payment methods (Card/Cash)
- `regions` - Geographic regions
- `working_zone_types` - Zone classifications

### Core Tables
- `stops` - Simple stop coordinates (from stops.json)
- `stop_details` - Detailed stop information with names and codes
- `buses` - Main bus route information
- `bus_stops` - Junction table linking buses to stops
- `routes` - Direction-specific route metadata
- `route_coordinates` - Flow coordinates for route visualization

### Views
- `v_buses_complete` - Complete bus information with joined reference data
- `v_bus_stops_details` - Bus stops with complete details

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

## Automated Data Scraping (GitHub Actions)

The project includes automated data scraping using **GitHub Actions** that runs every 3 hours to keep the database fresh.

### Workflow Overview

The workflow (`.github/workflows/scrape-data.yml`) automatically:
1. Runs `stops.py` to update bus stop data
2. Runs `busDetails.py` to update bus route details
3. Uploads logs as artifacts for review
4. Reports success/failure status

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

- Old data is **removed** before inserting new data
- Only tables in the `ayna` schema are affected
- Reference tables use upsert to preserve relationships
- Each run provides a complete snapshot of current data

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

- **Stops**: 3,841 records
- **Stop Details**: 2,000+ records
- **Buses**: 208 records
- **Bus Stops**: 6,000+ records
- **Routes**: 400+ records (2 directions per bus)
- **Route Coordinates**: 60,000+ points
- **Payment Types**: 2-3 records
- **Regions**: 1-2 records
- **Zone Types**: 5-6 records

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
