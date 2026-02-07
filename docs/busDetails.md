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

### Basic Usage
```bash
python scripts/busDetails.py
```

### Expected Output
```
Fetching bus list from API...
Successfully fetched 209 buses

Fetching details for 209 buses...
[1/209] Fetching bus #1 (ID: 1)... ✓
[2/209] Fetching bus #2 (ID: 2)... ✓
...
[209/209] Fetching bus #596 (ID: 209)... ✓

Successfully fetched details for 208/209 buses
Bus details saved to data/busDetails.json
```

## Functions

### `fetch_bus_list()`
Retrieves the complete list of bus routes.

**Returns**:
- `list`: Array of bus objects with `id` and `number` fields
- `None`: If an error occurs

**Example Response**:
```python
[
  {"id": 1, "number": "1"},
  {"id": 145, "number": "210"}
]
```

### `fetch_bus_details(bus_id)`
Fetches detailed information for a specific bus route.

**Parameters**:
- `bus_id` (int): The bus route ID

**Returns**:
- `dict`: Complete bus route information
- `None`: If an error occurs

### `fetch_all_bus_details()`
Main orchestration function that:
1. Fetches the bus list
2. Iterates through each bus ID
3. Fetches detailed information for each bus
4. Compiles all data into a single array
5. Saves to JSON file

**Returns**:
- `list`: Array of all bus details
- `None`: If bus list fetch fails

## Features

- **Progress Tracking**: Visual progress indicators with checkmarks (✓/✗)
- **Error Resilience**: Continues processing even if individual requests fail
- **Rate Limiting**: 0.1-second delay between requests to avoid server overload
- **UTF-8 Support**: Proper handling of Azerbaijani characters
- **Comprehensive Error Handling**: Network, HTTP, and JSON errors
- **Detailed Logging**: Shows bus number, ID, and status for each request

## Error Handling

The script handles:
- **Network Errors**: Connection timeouts, DNS failures
- **HTTP Errors**: 4xx/5xx status codes (e.g., 500 Internal Server Error for bus ID 96)
- **JSON Decode Errors**: Invalid JSON responses
- **File System Errors**: Permission and disk space issues

Failed requests are logged but don't stop the script execution.

## Dependencies

```python
import requests  # HTTP requests
import json      # JSON parsing and writing
import os        # File system operations
import time      # Rate limiting delays
```

### Installation
```bash
pip install requests
```

## Performance

- **Total Buses**: 209 routes
- **Success Rate**: 208/209 (99.5%)
- **Processing Time**: ~25-30 seconds
- **Request Rate**: ~10 requests/second
- **Output Size**: ~16MB

## Use Cases

This comprehensive dataset enables:

1. **Route Optimization**: Analyze route efficiency and suggest improvements
2. **Stop Coverage Analysis**: Identify service gaps or redundancies
3. **Geographic Visualization**: Plot routes on maps using flowCoordinates
4. **Fare Analysis**: Study pricing across different zones
5. **Service Planning**: Analyze route lengths and durations
6. **Network Analysis**: Study route overlaps and connections
7. **Carrier Performance**: Compare operators and service coverage

## Example Integration

```python
import json

# Load bus details
with open('data/busDetails.json', 'r', encoding='utf-8') as f:
    buses = json.load(f)

# Find bus by number
def find_bus(number):
    return next((bus for bus in buses if bus['number'] == number), None)

# Get all stops for a bus
def get_bus_stops(bus_id):
    bus = next((b for b in buses if b['id'] == bus_id), None)
    return bus['stops'] if bus else []

# Calculate total route distance
def get_route_distance(bus_id):
    bus = next((b for b in buses if b['id'] == bus_id), None)
    return bus['routLength'] if bus else 0

# Get buses by carrier
def get_buses_by_carrier(carrier_name):
    return [bus for bus in buses if carrier_name in bus['carrier']]

# Extract all unique stops
def get_all_unique_stops():
    stops = set()
    for bus in buses:
        for stop in bus.get('stops', []):
            stops.add((stop['stopId'], stop['stopName']))
    return list(stops)

# Get route coordinates for mapping
def get_route_coordinates(bus_id, direction=1):
    bus = next((b for b in buses if b['id'] == bus_id), None)
    if not bus:
        return []

    route = next((r for r in bus['routes'] if r['directionTypeId'] == direction), None)
    return route['flowCoordinates'] if route else []
```

## Direction Types

Routes include bidirectional data:
- **directionTypeId = 1**: Outbound direction (firstPoint → lastPoint)
- **directionTypeId = 2**: Inbound direction (lastPoint → firstPoint)

## Known Issues

- Bus ID 96 (number "144") returns a 500 Internal Server Error from the API
- Some routes may have incomplete coordinate data
- UTM coordinates in stop data are currently "0"

## Related Scripts

- **stops.py**: Fetches comprehensive stop information
- Can be used together for complete network analysis

## Notes

- The script includes rate limiting to prevent overwhelming the server
- All data is encoded in UTF-8 to preserve Azerbaijani characters
- JSON output is formatted with 2-space indentation for readability
- Processing time depends on network speed and API response times
