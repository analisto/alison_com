# busDetails.py

## Overview
Python script that fetches detailed information for all bus routes in the Baku public transportation system and saves it to PostgreSQL database. It retrieves the list of all buses, then iterates through each bus ID to fetch comprehensive route details, stops, and coordinate data, storing them across multiple normalized database tables.

## Purpose
This script provides complete route information including stop sequences, geographic coordinates for route visualization, fare information, carrier details, and bidirectional route data. It replaces existing data with fresh data on each run to ensure accuracy.

## API Endpoints

### 1. Bus List Endpoint
```
GET https://map-api.ayna.gov.az/api/bus/getBusList
```
Returns all bus IDs and numbers.

### 2. Bus Details Endpoint
```
GET https://map-api.ayna.gov.az/api/bus/getBusById?id={bus_id}
```
Returns detailed information for a specific bus route.

## Output

### Database Tables (Schema: ayna)

The script populates 8 tables:

| Table | Records | Description |
|-------|---------|-------------|
| `payment_types` | ~2 | Payment method reference data |
| `regions` | ~1 | Geographic regions reference data |
| `working_zone_types` | ~1 | Zone types reference data |
| `stop_details` | ~2,700 | Detailed stop information with names |
| `buses` | ~208 | Bus route information |
| `bus_stops` | ~11,786 | Junction table linking buses to stops |
| `routes` | ~416 | Direction-specific route metadata |
| `route_coordinates` | ~109,147 | Flow coordinates for route visualization |

**Strategy**: Truncate and replace (drops old data before inserting fresh data)

## Data Structure

### Database Schemas

#### 1. Reference Tables

**ayna.payment_types**
```sql
CREATE TABLE ayna.payment_types (
    id INTEGER PRIMARY KEY,
    name VARCHAR(100),
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    deactived_date DATE,
    priority INTEGER
);
```

**ayna.regions**
```sql
CREATE TABLE ayna.regions (
    id INTEGER PRIMARY KEY,
    name VARCHAR(100),
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    deactived_date DATE,
    priority INTEGER
);
```

**ayna.working_zone_types**
```sql
CREATE TABLE ayna.working_zone_types (
    id INTEGER PRIMARY KEY,
    name VARCHAR(100),
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    deactived_date DATE,
    priority INTEGER
);
```

#### 2. Core Tables

**ayna.buses**
```sql
CREATE TABLE ayna.buses (
    id INTEGER PRIMARY KEY,
    carrier VARCHAR(200),
    number VARCHAR(20),
    first_point VARCHAR(200),
    last_point VARCHAR(200),
    route_length DECIMAL(10, 2),
    payment_type_id INTEGER REFERENCES ayna.payment_types(id),
    card_payment_date DATE,
    tariff INTEGER,
    tariff_str VARCHAR(50),
    region_id INTEGER REFERENCES ayna.regions(id),
    working_zone_type_id INTEGER REFERENCES ayna.working_zone_types(id),
    duration_minuts INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**ayna.stop_details**
```sql
CREATE TABLE ayna.stop_details (
    id INTEGER PRIMARY KEY,
    code VARCHAR(50),
    name VARCHAR(200),
    name_monitor VARCHAR(200),
    utm_coord_x VARCHAR(50),
    utm_coord_y VARCHAR(50),
    longitude DECIMAL(10, 7),
    latitude DECIMAL(10, 7),
    is_transport_hub BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**ayna.bus_stops**
```sql
CREATE TABLE ayna.bus_stops (
    bus_stop_id INTEGER PRIMARY KEY,
    bus_id INTEGER REFERENCES ayna.buses(id) ON DELETE CASCADE,
    stop_id INTEGER REFERENCES ayna.stop_details(id) ON DELETE CASCADE,
    stop_code VARCHAR(50),
    stop_name VARCHAR(200),
    total_distance DECIMAL(10, 2),
    intermediate_distance DECIMAL(10, 2),
    direction_type_id INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**ayna.routes**
```sql
CREATE TABLE ayna.routes (
    id INTEGER PRIMARY KEY,
    code VARCHAR(50),
    customer_name VARCHAR(200),
    type VARCHAR(100),
    name VARCHAR(200),
    destination VARCHAR(500),
    variant VARCHAR(100),
    operator VARCHAR(200),
    bus_id INTEGER REFERENCES ayna.buses(id) ON DELETE CASCADE,
    direction_type_id INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**ayna.route_coordinates**
```sql
CREATE TABLE ayna.route_coordinates (
    id SERIAL PRIMARY KEY,
    route_id INTEGER REFERENCES ayna.routes(id) ON DELETE CASCADE,
    latitude DECIMAL(10, 7),
    longitude DECIMAL(10, 7),
    sequence_order INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### API Response Format

The API returns bus details in this format:

```json
{
  "id": 145,
  "carrier": "Vətən.Az-Trans MMC",
  "number": "210",
  "firstPoint": "Türkan bağları",
  "lastPoint": "Hövsan qəs.",
  "routLength": 30,
  "paymentTypeId": 2,
  "tariff": 50,
  "regionId": 1,
  "workingZoneTypeId": 5,
  "paymentType": { "id": 2, "name": "Nəğd", ... },
  "region": { "id": 1, "name": "Bakı", ... },
  "workingZoneType": { "id": 5, "name": "Şəhərdaxili", ... },
  "stops": [ ... ],
  "routes": [ ... ],
  "tariffStr": "0.50 AZN",
  "durationMinuts": 50
}
```

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

3. Basic stops data loaded (optional but recommended):
   ```bash
   python scripts/stops.py
   ```

### Basic Usage
```bash
cd scripts
python busDetails.py
```

### Expected Output
```
============================================================
BAKU BUS DETAILS DATA FETCHER & DATABASE LOADER
============================================================

Testing database connection...
✓ Database connection successful!

Fetching bus list from API...
URL: https://map-api.ayna.gov.az/api/bus/getBusList
✓ Successfully fetched 209 buses

Fetching details for 209 buses...
============================================================
[1/209] Fetching bus #1 (ID: 1)...
  ✓ Success
[2/209] Fetching bus #2 (ID: 2)...
  ✓ Success
...
[96/209] Fetching bus #144 (ID: 96)...
  ✗ Failed
...
[209/209] Fetching bus #596 (ID: 209)...
  ✓ Success
============================================================
Successfully fetched details for 208/209 buses

============================================================
BUS DATA STATISTICS
============================================================
Total buses: 208
Unique carriers: 15
Total bus stops entries: 11786
Total routes: 416
Total coordinate points: 109147
============================================================

============================================================
SAVING DATA TO DATABASE (REPLACING OLD DATA)
============================================================

Saving reference tables...
  - payment_types: 2 records
  - regions: 1 records
  - working_zone_types: 1 records
✓ Reference tables saved successfully

Saving stop details...
✓ Saved 2700 stop details

Saving buses...
✓ Saved 208 buses

Saving bus stops...
✓ Saved 11786 bus stops

Saving routes...
✓ Saved 416 routes

Saving route coordinates...
  Inserting 109147 coordinate points...
✓ Saved 109147 route coordinates

============================================================
DATABASE ROW COUNTS
============================================================
  ayna.payment_types: 2 rows
  ayna.regions: 1 rows
  ayna.working_zone_types: 1 rows
  ayna.stop_details: 2,700 rows
  ayna.buses: 208 rows
  ayna.bus_stops: 11,786 rows
  ayna.routes: 416 rows
  ayna.route_coordinates: 109,147 rows

============================================================
✓ ALL OPERATIONS COMPLETED SUCCESSFULLY!
============================================================
```

## Functions

### API Fetching Functions

#### `fetch_bus_list()`
Retrieves the complete list of bus routes from API.

**Returns**:
- `List[Dict[str, Any]]`: Array of bus objects with `id` and `number` fields
- `None`: If an error occurs

**Example Response**:
```python
[
  {"id": 1, "number": "1"},
  {"id": 145, "number": "210"}
]
```

#### `fetch_bus_details(bus_id)`
Fetches detailed information for a specific bus route.

**Parameters**:
- `bus_id` (int): The bus route ID

**Returns**:
- `Dict[str, Any]`: Complete bus route information
- `None`: If an error occurs (e.g., 500 error for bus ID 96)

**Example**:
```python
details = fetch_bus_details(145)
if details:
    print(f"Bus #{details['number']}: {details['firstPoint']} - {details['lastPoint']}")
```

#### `fetch_all_bus_details()`
Main orchestration function that fetches details for all buses.

**Process**:
1. Fetches the bus list using `fetch_bus_list()`
2. Iterates through each bus ID
3. Fetches detailed information for each bus
4. Logs progress with visual indicators
5. Applies rate limiting (0.1s delay between requests)
6. Compiles all data into a single array

**Returns**:
- `List[Dict[str, Any]]`: Array of all bus details
- `None`: If bus list fetch fails

**Example**:
```python
all_buses = fetch_all_bus_details()
if all_buses:
    print(f"Fetched {len(all_buses)} buses")
```

### Database Saving Functions

#### `save_reference_tables(all_buses)`
Saves reference tables (payment_types, regions, working_zone_types).

**Parameters**:
- `all_buses` (List[Dict]): List of bus detail dictionaries

**Returns**:
- `bool`: True if successful, False otherwise

**Process**:
1. Extracts unique reference data from all buses
2. Uses `upsert_reference_data()` to insert/update each table
3. Logs count for each reference table

#### `save_stop_details(all_buses)`
Saves detailed stop information from all buses.

**Parameters**:
- `all_buses` (List[Dict]): List of bus detail dictionaries

**Returns**:
- `bool`: True if successful, False otherwise

**Process**:
1. Truncates `ayna.stop_details` table with CASCADE
2. Collects unique stops from all buses
3. Parses coordinates using `parse_coordinate()`
4. Bulk inserts using `execute_values()` (page_size=1000)

**Note**: Uses CASCADE because `bus_stops` references this table.

#### `save_buses(all_buses)`
Saves bus route data.

**Parameters**:
- `all_buses` (List[Dict]): List of bus detail dictionaries

**Returns**:
- `bool`: True if successful, False otherwise

**Process**:
1. Truncates `ayna.buses` table with CASCADE
2. Prepares data tuples from bus details
3. Bulk inserts using `execute_values()` (page_size=500)

#### `save_bus_stops(all_buses)`
Saves bus stops junction table.

**Parameters**:
- `all_buses` (List[Dict]): List of bus detail dictionaries

**Returns**:
- `bool`: True if successful, False otherwise

**Process**:
1. Truncates `ayna.bus_stops` table
2. Collects all bus stop entries from all buses
3. Bulk inserts using `execute_values()` (page_size=1000)

#### `save_routes(all_buses)`
Saves route metadata.

**Parameters**:
- `all_buses` (List[Dict]): List of bus detail dictionaries

**Returns**:
- `bool`: True if successful, False otherwise

**Process**:
1. Truncates `ayna.routes` table with CASCADE
2. Collects all route entries from all buses
3. Bulk inserts using `execute_values()` (page_size=500)

#### `save_route_coordinates(all_buses)`
Saves route flow coordinates for mapping.

**Parameters**:
- `all_buses` (List[Dict]): List of bus detail dictionaries

**Returns**:
- `bool`: True if successful, False otherwise

**Process**:
1. Truncates `ayna.route_coordinates` table
2. Extracts flowCoordinates from all routes
3. Parses coordinates using `parse_coordinate()`
4. Assigns sequence_order to maintain coordinate order
5. Bulk inserts using `execute_values()` (page_size=5000)

**Note**: Inserts ~109,000 coordinate points efficiently.

#### `get_statistics(all_buses)`
Display statistics about the fetched bus data.

**Parameters**:
- `all_buses` (List[Dict]): List of bus detail dictionaries

**Output**:
```
Total buses: 208
Unique carriers: 15
Total bus stops entries: 11786
Total routes: 416
Total coordinate points: 109147
```

## Features

- **Database Integration**: Direct PostgreSQL storage across 8 normalized tables
- **Progress Tracking**: Visual progress indicators with checkmarks (✓/✗)
- **Error Resilience**: Continues processing even if individual bus requests fail
- **Rate Limiting**: 0.1-second delay between requests to avoid server overload
- **Coordinate Parsing**: Handles European number format from API (`'50,206,297'` → `50.206297`)
- **Bulk Insert Optimization**: Uses `execute_values()` for fast insertion (1000-5000 rows per batch)
- **Foreign Key Cascade**: Proper CASCADE delete to maintain referential integrity
- **Connection Pooling**: Efficient database connection management
- **Comprehensive Logging**: Detailed progress and statistics reporting
- **Truncate and Replace**: Ensures fresh data on every run

## Error Handling

The script handles multiple error types:

### Network Errors
```python
requests.exceptions.RequestException
```
Connection timeouts (30 seconds), DNS failures.

### HTTP Errors
```python
response.raise_for_status()
```
4xx/5xx status codes (e.g., 500 Internal Server Error for bus ID 96).

**Note**: Bus ID 96 consistently returns 500 error from the API. The script logs the failure and continues with remaining buses.

### JSON Decode Errors
```python
json.JSONDecodeError
```
Invalid JSON responses from API.

### Database Errors
```python
psycopg2.Error
```
- Connection failures
- Constraint violations
- Foreign key errors
- Transaction rollback

**Example**:
```python
try:
    save_buses(all_buses)
except Exception as e:
    logger.error(f"Error saving buses: {e}")
    return False
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
import requests                          # HTTP requests
import json                              # JSON parsing
import time                              # Rate limiting
import sys                               # Exit codes
import logging                           # Logging
from typing import Optional, List, Dict, Any
from collections import defaultdict      # Data grouping
from db_utils import (                   # Database utilities
    execute_values, execute_many, table_exists, get_row_count,
    truncate_table, test_connection, upsert_reference_data, parse_coordinate
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

## Performance

### API Fetching
- **Total Buses**: 209 routes
- **Success Rate**: 208/209 (99.5%)
- **API Processing Time**: ~25-30 seconds
- **Request Rate**: ~10 requests/second
- **Rate Limiting**: 0.1s delay between requests

### Database Operations
- **Total Records Inserted**: ~125,000 rows across 8 tables
- **Database Processing Time**: ~5-10 seconds
- **Bulk Insert Strategy**: execute_values() with batching
  - Reference tables: page_size=500
  - Stop details: page_size=1000
  - Bus stops: page_size=1000
  - Coordinates: page_size=5000
- **Foreign Key Handling**: CASCADE delete for proper cleanup

### Total Execution Time
~30-40 seconds (API fetch + database insert + verification)

## Use Cases

This comprehensive dataset enables:

1. **Route Optimization**: Analyze route efficiency and suggest improvements using route_length and duration_minuts
2. **Stop Coverage Analysis**: Identify service gaps or redundancies using bus_stops and stop_details
3. **Geographic Visualization**: Plot routes on interactive maps using route_coordinates
4. **Fare Analysis**: Study pricing across different zones using tariff and working_zone_type
5. **Service Planning**: Analyze route lengths and durations for scheduling optimization
6. **Network Analysis**: Study route overlaps and connections using bus_stops junction table
7. **Carrier Performance**: Compare operators and service coverage using carrier data
8. **Stop Frequency Analysis**: Count how many routes serve each stop
9. **Direction Analysis**: Compare outbound vs inbound routes using direction_type_id
10. **Real-time Integration**: Foundation for live bus tracking by joining with real-time vehicle data

## Example Integration

### Basic Queries

```python
from db_utils import fetch_all, fetch_one

# Find bus by number
def find_bus(number):
    return fetch_one("""
        SELECT b.*, pt.name as payment_type_name, r.name as region_name
        FROM ayna.buses b
        LEFT JOIN ayna.payment_types pt ON b.payment_type_id = pt.id
        LEFT JOIN ayna.regions r ON b.region_id = r.id
        WHERE b.number = %s
    """, (number,))

# Get all stops for a bus
def get_bus_stops(bus_id):
    return fetch_all("""
        SELECT bs.*, sd.name, sd.latitude, sd.longitude
        FROM ayna.bus_stops bs
        LEFT JOIN ayna.stop_details sd ON bs.stop_id = sd.id
        WHERE bs.bus_id = %s
        ORDER BY bs.total_distance
    """, (bus_id,))

# Get buses by carrier
def get_buses_by_carrier(carrier_name):
    return fetch_all("""
        SELECT id, number, first_point, last_point, carrier
        FROM ayna.buses
        WHERE carrier ILIKE %s
        ORDER BY number
    """, (f'%{carrier_name}%',))

# Get route coordinates for mapping
def get_route_coordinates(bus_id, direction_type=1):
    """Get flow coordinates for a specific route direction"""
    return fetch_all("""
        SELECT rc.latitude, rc.longitude, rc.sequence_order
        FROM ayna.route_coordinates rc
        JOIN ayna.routes r ON rc.route_id = r.id
        WHERE r.bus_id = %s AND r.direction_type_id = %s
        ORDER BY rc.sequence_order
    """, (bus_id, direction_type))
```

### Advanced Analysis Queries

```python
# Find most popular stops (most routes passing through)
def get_most_popular_stops(limit=10):
    return fetch_all("""
        SELECT
            sd.name,
            sd.code,
            COUNT(DISTINCT bs.bus_id) as route_count,
            sd.latitude,
            sd.longitude,
            sd.is_transport_hub
        FROM ayna.stop_details sd
        JOIN ayna.bus_stops bs ON sd.id = bs.stop_id
        GROUP BY sd.id, sd.name, sd.code, sd.latitude, sd.longitude, sd.is_transport_hub
        ORDER BY route_count DESC
        LIMIT %s
    """, (limit,))

# Get buses that pass through a specific stop
def get_buses_at_stop(stop_id):
    return fetch_all("""
        SELECT DISTINCT
            b.id,
            b.number,
            b.first_point,
            b.last_point,
            b.carrier
        FROM ayna.buses b
        JOIN ayna.bus_stops bs ON b.id = bs.bus_id
        WHERE bs.stop_id = %s
        ORDER BY b.number
    """, (stop_id,))

# Find routes with longest distances
def get_longest_routes(limit=10):
    return fetch_all("""
        SELECT
            number,
            first_point,
            last_point,
            route_length,
            duration_minuts,
            carrier
        FROM ayna.buses
        WHERE route_length IS NOT NULL
        ORDER BY route_length DESC
        LIMIT %s
    """, (limit,))

# Get all buses grouped by payment type
def get_buses_by_payment_type():
    return fetch_all("""
        SELECT
            pt.name as payment_type,
            COUNT(b.id) as bus_count,
            AVG(b.tariff) as avg_tariff
        FROM ayna.payment_types pt
        LEFT JOIN ayna.buses b ON pt.id = b.payment_type_id
        GROUP BY pt.id, pt.name
        ORDER BY bus_count DESC
    """)

# Find transfer hubs (transport hub stops with many routes)
def get_transfer_hubs():
    return fetch_all("""
        SELECT
            sd.name,
            sd.code,
            COUNT(DISTINCT bs.bus_id) as route_count,
            sd.latitude,
            sd.longitude
        FROM ayna.stop_details sd
        JOIN ayna.bus_stops bs ON sd.id = bs.stop_id
        WHERE sd.is_transport_hub = true
        GROUP BY sd.id, sd.name, sd.code, sd.latitude, sd.longitude
        ORDER BY route_count DESC
    """)

# Get complete route information
def get_complete_route_info(bus_number):
    """Get comprehensive route information including stops and coordinates"""
    bus = fetch_one("SELECT * FROM ayna.buses WHERE number = %s", (bus_number,))
    if not bus:
        return None

    return {
        'bus': bus,
        'stops': get_bus_stops(bus[0]),  # bus[0] is the id
        'coordinates': {
            'outbound': get_route_coordinates(bus[0], 1),
            'inbound': get_route_coordinates(bus[0], 2)
        }
    }

# Analyze carrier performance
def analyze_carrier_performance():
    return fetch_all("""
        SELECT
            carrier,
            COUNT(*) as total_routes,
            AVG(route_length) as avg_route_length,
            AVG(duration_minuts) as avg_duration,
            AVG(tariff) as avg_tariff
        FROM ayna.buses
        WHERE carrier IS NOT NULL
        GROUP BY carrier
        ORDER BY total_routes DESC
    """)

# Find nearby stops within a radius (using basic lat/lng distance)
def find_nearby_stops(latitude, longitude, radius_degrees=0.01):
    """
    Find stops near a coordinate (simplified distance calculation)
    radius_degrees: ~0.01 degrees ≈ 1km
    """
    return fetch_all("""
        SELECT
            id,
            name,
            code,
            latitude,
            longitude,
            is_transport_hub,
            SQRT(
                POW(latitude - %s, 2) + POW(longitude - %s, 2)
            ) as distance
        FROM ayna.stop_details
        WHERE
            latitude BETWEEN %s - %s AND %s + %s
            AND longitude BETWEEN %s - %s AND %s + %s
        ORDER BY distance
        LIMIT 20
    """, (latitude, longitude,
          latitude, radius_degrees, latitude, radius_degrees,
          longitude, radius_degrees, longitude, radius_degrees))
```

### Using the Complete Views

The database includes pre-built views for easy querying:

```python
# Use the complete buses view
def get_all_buses_complete():
    return fetch_all("""
        SELECT * FROM ayna.v_buses_complete
        ORDER BY number
    """)

# Use the bus stops details view
def get_bus_stops_with_details(bus_id):
    return fetch_all("""
        SELECT * FROM ayna.v_bus_stops_details
        WHERE bus_id = %s
        ORDER BY total_distance
    """, (bus_id,))
```

## Direction Types

Routes include bidirectional data:
- **direction_type_id = 1**: Outbound direction (firstPoint → lastPoint)
- **direction_type_id = 2**: Inbound direction (lastPoint → firstPoint)

Each bus typically has 2 routes (one for each direction), stored in the `ayna.routes` table with corresponding `route_coordinates`.

## Data Refresh Strategy

The script implements a **truncate-and-replace** strategy with CASCADE:

### Execution Order
1. **Reference tables**: Upserted (INSERT ON CONFLICT UPDATE)
2. **stop_details**: Truncated with CASCADE → inserts fresh data
3. **buses**: Truncated with CASCADE → inserts fresh data
4. **bus_stops**: Truncated (already cleared by CASCADE) → inserts fresh data
5. **routes**: Truncated with CASCADE → inserts fresh data
6. **route_coordinates**: Truncated (already cleared by CASCADE) → inserts fresh data

### CASCADE Behavior
When `stop_details` or `buses` are truncated with CASCADE, all dependent rows in child tables are automatically deleted, maintaining referential integrity.

**Benefits**:
- Always has latest data from API
- No duplicate entries
- Foreign key integrity maintained
- Fast and simple

**Trade-off**: Brief period where tables are empty (during truncate → insert window)

## Exit Codes

- **0**: Success - all data fetched and saved
- **1**: Failure - API error, database connection, or save error

**Usage in CI/CD**:
```bash
python scripts/busDetails.py
if [ $? -eq 0 ]; then
    echo "Bus details updated successfully"
else
    echo "Bus details update failed"
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
- **INFO**: Normal operation (API requests, database operations, statistics)
- **WARNING**: Non-critical issues (failed bus requests like ID 96)
- **ERROR**: Critical failures (connection errors, save failures)

**Example Logs**:
```
2026-02-07 17:20:45,123 - INFO - Fetching bus list from API...
2026-02-07 17:20:45,456 - INFO - ✓ Successfully fetched 209 buses
2026-02-07 17:20:46,789 - INFO - [1/209] Fetching bus #1 (ID: 1)...
2026-02-07 17:20:46,912 - INFO -   ✓ Success
2026-02-07 17:21:15,234 - WARNING -   ✗ Failed
2026-02-07 17:21:45,567 - INFO - ✓ Saved 208 buses
```

## Testing

### Manual Test
```bash
python scripts/busDetails.py
echo "Exit code: $?"
```

### Automated Test
```python
import subprocess

result = subprocess.run(
    ['python', 'scripts/busDetails.py'],
    capture_output=True,
    text=True
)

if result.returncode == 0:
    print("✓ Bus details scraper successful")
    print(result.stdout)
else:
    print("✗ Bus details scraper failed")
    print(result.stderr)
```

### Verify Data in Database
```python
from db_utils import get_row_count

tables = ['payment_types', 'regions', 'working_zone_types',
          'stop_details', 'buses', 'bus_stops', 'routes', 'route_coordinates']

for table in tables:
    count = get_row_count(table)
    print(f"ayna.{table}: {count:,} rows")
```

## Troubleshooting

### Database Connection Failed
```
✗ Database connection failed!
```
**Solution**: Check `DATABASE_URL` in `.env` file

### Table Does Not Exist
```
Table 'ayna.buses' does not exist.
```
**Solution**: Run migrations:
```bash
python scripts/run_migrations.py
```

### Foreign Key Constraint Error
```
ERROR: cannot truncate a table referenced in a foreign key constraint
```
**Solution**: This error should not occur as the script uses `cascade=True`. If it does, check that all truncate_table() calls for parent tables include `cascade=True`.

### API Timeout or Slow Response
```
✗ Network error: ReadTimeout
```
**Solution**: The API might be slow. Try again or increase timeout value in code (currently 30 seconds).

### Bus ID 96 Always Fails
This is expected behavior. Bus ID 96 (number "144") consistently returns 500 Internal Server Error from the Ayna API. The script logs the failure and continues processing remaining buses.

### Coordinate Parsing Warning
```
Could not parse coordinate: invalid_value
```
**Solution**: This is usually non-critical. The coordinate will be set to NULL.

## Known Issues

- **Bus ID 96** (number "144") returns a 500 Internal Server Error from the API (expected behavior)
- **UTM coordinates** in stop data are currently "0" in the API response
- **Success rate**: 208/209 buses (99.5%) due to bus ID 96 failure

## Related Files

- **scripts/db_utils.py**: Database utility functions and connection pooling
- **scripts/run_migrations.py**: Database schema migration runner
- **scripts/stops.py**: Fetches basic stop coordinate data (complements stop_details)
- **migrations/001_initial_schema.sql**: Database schema definition
- **.github/workflows/scrape-data.yml**: GitHub Actions workflow for automated scraping
- **.env**: Database credentials (not committed to repository)

## Notes

- The script includes **rate limiting** (0.1s delay) to prevent overwhelming the Ayna API server
- All data is stored with **UTF-8 encoding** to preserve Azerbaijani characters (ə, ş, ç, etc.)
- **Processing time** depends on network speed and API response times (~30-40 seconds total)
- The script is **idempotent** - safe to run multiple times
- **Foreign key CASCADE** ensures proper cleanup when parent records are deleted
- **Bulk insert optimization** uses `execute_values()` for efficient database operations
