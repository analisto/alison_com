# stops.py

## Overview
Python script that fetches all bus stop data from the Ayna Transport API and saves it to PostgreSQL database.

## Purpose
This script retrieves comprehensive information about all public transport stops in the Baku transportation system and stores them in the database. It replaces existing data with fresh data on each run to ensure accuracy.

## API Endpoint
```
GET https://map-api.ayna.gov.az/api/stop/getAll
```

## Output
- **Database Table**: `ayna.stops`
- **Schema**: ayna
- **Total Records**: ~3,841 stops
- **Strategy**: Truncate and replace (drops old data before inserting fresh data)

## Data Structure

### Database Schema: ayna.stops

```sql
CREATE TABLE IF NOT EXISTS ayna.stops (
    id INTEGER PRIMARY KEY,
    longitude DECIMAL(10, 7),
    latitude DECIMAL(10, 7),
    is_transport_hub BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### API Response Format

The API returns stops in this format:
```json
{
  "id": 1732,
  "longitude": "50.15006",
  "latitude": "40.378864",
  "isTransportHub": false
}
```

### Fields Description

| Field | Type | Database Type | Description |
|-------|------|---------------|-------------|
| `id` | Integer | INTEGER | Primary key - unique identifier for the stop |
| `longitude` | String → Float | DECIMAL(10,7) | Geographic longitude (parsed from API format) |
| `latitude` | String → Float | DECIMAL(10,7) | Geographic latitude (parsed from API format) |
| `is_transport_hub` | Boolean | BOOLEAN | Whether the stop is a major transport hub |
| `created_at` | Timestamp | TIMESTAMP | Automatically set when record is created |
| `updated_at` | Timestamp | TIMESTAMP | Automatically updated on changes |

**Note**: The API also returns `code`, `name`, `nameMonitor`, `utmCoordX`, and `utmCoordY` fields, but these are stored in the `ayna.stop_details` table (populated by busDetails.py script).

## Usage

### Prerequisites
1. Database connection configured in `.env` file:
   ```bash
   DATABASE_URL=postgresql://user:password@host:port/database?sslmode=require
   ```

2. Database migrations applied:
   ```bash
   python scripts/run_migrations.py
   ```

### Basic Usage
```bash
cd scripts
python stops.py
```

### Expected Output
```
============================================================
BAKU BUS STOPS DATA FETCHER
============================================================

Testing database connection...
✓ Database connection successful!

Fetching stops data from API...
URL: https://map-api.ayna.gov.az/api/stop/getAll
✓ Successfully fetched 3841 stops

============================================================
STOPS DATA STATISTICS
============================================================
Total stops: 3841
Transport hubs: 8
Regular stops: 3833
Stops with coordinates: 3841 (100.0%)
============================================================

Saving stops to database (will replace existing data)...
Truncating table ayna.stops (removing old data)...
Preparing data for database insert...
Inserting 3841 stops into database...
✓ Successfully saved 3841 stops to database
Total stops in database: 3841

============================================================
✓ ALL OPERATIONS COMPLETED SUCCESSFULLY!
============================================================
```

## Functions

### `fetch_stops()`
Fetch all stops from the API.

**Returns**:
- `List[Dict[str, Any]]`: List of stop dictionaries if successful
- `None`: If an error occurs

**Process**:
1. Sends GET request to the API endpoint with 30-second timeout
2. Validates HTTP response status
3. Parses JSON response
4. Logs success with stop count
5. Returns the data or None on error

**Example**:
```python
stops = fetch_stops()
if stops:
    print(f"Fetched {len(stops)} stops")
```

### `parse_coordinate(coord_str)`
Parse coordinate string from Ayna API that uses commas/periods as separators.

Geographic coordinates in the format `'50,206,297'` represent `50.206297` degrees.

**Parameters**:
- `coord_str` (str): Coordinate string from API

**Returns**:
- `float`: Coordinate value
- `None`: If parsing fails

**Examples**:
```python
# European format with comma decimal separator
parse_coordinate('50,206,297')  # Returns: 50.206297
parse_coordinate('40,43885')     # Returns: 40.43885

# Standard format with period decimal separator
parse_coordinate('49.961721')    # Returns: 49.961721
```

**Implementation Details**:
- Removes all separators (commas and periods)
- Inserts decimal point after 2nd digit
- Handles various formats from API consistently

### `save_stops_to_db(stops)`
Save stops data to the database (replaces all existing data).

**Parameters**:
- `stops` (List[Dict[str, Any]]): List of stop dictionaries from API

**Returns**:
- `bool`: True if successful, False otherwise

**Process**:
1. Checks if `ayna.stops` table exists
2. Truncates table to remove old data
3. Parses coordinates using `parse_coordinate()`
4. Prepares data tuples for bulk insert
5. Uses `execute_values()` for efficient insertion (page_size=1000)
6. Verifies row count matches expected count
7. Logs success and returns True/False

**Example**:
```python
stops = fetch_stops()
if stops and save_stops_to_db(stops):
    print("Stops saved successfully!")
```

### `get_statistics(stops)`
Display statistics about the stops data.

**Parameters**:
- `stops` (List[Dict[str, Any]]): List of stop dictionaries

**Output**:
```
Total stops: 3841
Transport hubs: 8
Regular stops: 3833
Stops with coordinates: 3841 (100.0%)
```

## Error Handling

The script handles the following error types:

### Network Errors
```python
requests.exceptions.RequestException
```
Connection issues, timeouts (30 seconds), DNS failures.

### HTTP Errors
```python
response.raise_for_status()
```
Invalid status codes (4xx, 5xx).

### JSON Decode Errors
```python
json.JSONDecodeError
```
Invalid JSON response from API.

### Database Errors
```python
psycopg2.Error
```
- Connection failures
- Table does not exist (prompts to run migrations)
- Constraint violations
- Disk space issues

**Example**:
```python
try:
    save_stops_to_db(stops)
except Exception as e:
    logger.error(f"Error saving stops: {e}")
    # Transaction automatically rolled back
```

## Configuration

### Environment Variables
Requires `DATABASE_URL` in `.env` file:
```bash
DATABASE_URL=postgresql://user:password@host:port/database?sslmode=require
```

**Security Notes**:
- Never commit `.env` file
- Use SSL mode for production
- Limit database user permissions

## Dependencies

```python
import requests                    # HTTP requests
import json                        # JSON parsing
import sys                         # Exit codes
import logging                     # Logging
from typing import Optional, List, Dict, Any
from db_utils import (             # Database utilities
    execute_values, table_exists, get_row_count,
    truncate_table, test_connection
)
```

### Installation
```bash
pip install -r requirements.txt
```

Or manually:
```bash
pip install requests psycopg2-binary python-dotenv
```

## Features

- **Database Integration**: Direct PostgreSQL storage with connection pooling
- **Coordinate Parsing**: Handles European number format from API (`'50,206,297'` → `50.206297`)
- **Truncate and Replace**: Ensures fresh data on every run
- **Bulk Insert Optimization**: Uses `execute_values()` for fast insertion (1000 rows per batch)
- **Comprehensive Logging**: Detailed progress and error reporting
- **Error Recovery**: Automatic transaction rollback on failures
- **Statistics Display**: Shows transport hubs, coordinate coverage, etc.
- **Connection Testing**: Verifies database connection before starting

## Use Cases

This data can be used for:
- **Route Optimization**: Algorithms for efficient bus routing
- **Proximity Analysis**: Finding nearby stops using coordinates
- **Geographic Mapping**: Visualizing stops on interactive maps
- **Transport Hub Identification**: Locating major transfer points
- **Route Planning**: Applications for journey planning
- **Distance Calculations**: Computing distances between stops
- **Data Analysis**: Analyzing stop distribution across the city

## Data Refresh Strategy

The script implements a **truncate-and-replace** strategy:

1. Connects to database
2. Truncates `ayna.stops` table (removes all existing rows)
3. Fetches fresh data from API
4. Inserts new data in bulk
5. Verifies row count

**Benefits**:
- Always has latest data from API
- No duplicate entries
- No complex upsert logic
- Fast and simple

**Trade-off**: Brief period where table is empty (during truncate → insert window)

## Example Integration

### Query Stops from Database

```python
from db_utils import fetch_all, fetch_one

# Get all stops
stops = fetch_all("SELECT * FROM ayna.stops ORDER BY id")
for stop_id, lng, lat, is_hub, created, updated in stops:
    print(f"Stop {stop_id}: ({lat}, {lng})")

# Get transport hubs only
hubs = fetch_all("""
    SELECT id, latitude, longitude
    FROM ayna.stops
    WHERE is_transport_hub = true
""")
print(f"Found {len(hubs)} transport hubs")

# Get stop by ID
stop = fetch_one("SELECT * FROM ayna.stops WHERE id = %s", (1732,))
if stop:
    print(f"Stop details: {stop}")

# Count stops in specific area (example: around Baku center)
count = fetch_one("""
    SELECT COUNT(*)
    FROM ayna.stops
    WHERE latitude BETWEEN 40.35 AND 40.45
      AND longitude BETWEEN 49.80 AND 50.00
""")[0]
print(f"Stops in area: {count}")
```

### Join with Stop Details

```python
from db_utils import fetch_all

# Get stops with names (from stop_details table)
stops_with_names = fetch_all("""
    SELECT
        s.id,
        s.latitude,
        s.longitude,
        sd.name,
        sd.code,
        s.is_transport_hub
    FROM ayna.stops s
    LEFT JOIN ayna.stop_details sd ON s.id = sd.id
    ORDER BY s.id
""")

for stop in stops_with_names:
    stop_id, lat, lng, name, code, is_hub = stop
    print(f"[{code}] {name}: ({lat}, {lng})")
```

## Exit Codes

- **0**: Success - all stops fetched and saved
- **1**: Failure - database connection, API error, or save error

**Usage in CI/CD**:
```bash
python scripts/stops.py
if [ $? -eq 0 ]; then
    echo "Stops updated successfully"
else
    echo "Stops update failed"
    exit 1
fi
```

## Logging

The script uses Python's logging module with INFO level:

```python
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
```

**Log Levels**:
- **INFO**: Normal operation (API requests, database operations)
- **WARNING**: Non-critical issues (coordinate parsing warnings)
- **ERROR**: Critical failures (connection errors, save failures)

**Example Logs**:
```
2026-02-07 17:15:23,456 - INFO - Fetching stops data from API...
2026-02-07 17:15:23,789 - INFO - ✓ Successfully fetched 3841 stops
2026-02-07 17:15:24,012 - INFO - Truncating table ayna.stops (removing old data)...
2026-02-07 17:15:24,345 - INFO - ✓ Successfully saved 3841 stops to database
```

## Testing

### Manual Test
```bash
python scripts/stops.py
echo "Exit code: $?"
```

### Automated Test
```python
import subprocess

result = subprocess.run(
    ['python', 'scripts/stops.py'],
    capture_output=True,
    text=True
)

if result.returncode == 0:
    print("✓ Stops scraper successful")
    print(result.stdout)
else:
    print("✗ Stops scraper failed")
    print(result.stderr)
```

## Troubleshooting

### Database Connection Failed
```
✗ Database connection failed!
```
**Solution**: Check `DATABASE_URL` in `.env` file

### Table Does Not Exist
```
Table 'ayna.stops' does not exist. Run migrations first.
```
**Solution**: Run migrations:
```bash
python scripts/run_migrations.py
```

### Coordinate Parsing Warning
```
Could not parse coordinate: invalid_value
```
**Solution**: This is usually non-critical. The coordinate will be set to NULL.

### API Timeout
```
✗ Network error: ReadTimeout
```
**Solution**: The API might be slow. Try again or increase timeout in code.

## Related Files

- **scripts/db_utils.py**: Database utility functions and connection pooling
- **scripts/run_migrations.py**: Database schema migration runner
- **scripts/busDetails.py**: Fetches detailed bus route information (includes stop_details table)
- **migrations/001_initial_schema.sql**: Database schema definition
- **.github/workflows/scrape-data.yml**: GitHub Actions workflow for automated scraping
- **.env**: Database credentials (not committed to repository)
