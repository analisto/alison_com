# db_utils.py

## Overview
Database utility module providing connection pooling, query execution, and helper functions for PostgreSQL database operations in the Baku Bus Route Dashboard.

## Purpose
Centralized database operations module that:
- Manages connection pooling for efficient database access
- Provides secure credential management via environment variables
- Offers bulk insert optimization for large datasets
- Handles coordinate parsing from API responses
- Includes helper functions for common database operations

## Configuration

### Environment Variables
```bash
DATABASE_URL=postgresql://user:password@host:port/database?sslmode=require
```

The module automatically loads credentials from `.env` file using `python-dotenv`.

## Core Components

### Connection Management

#### `init_connection_pool(minconn=1, maxconn=10)`
Initialize a PostgreSQL connection pool.

**Parameters:**
- `minconn` (int): Minimum number of connections in pool (default: 1)
- `maxconn` (int): Maximum number of connections in pool (default: 10)

**Example:**
```python
from db_utils import init_connection_pool

init_connection_pool(minconn=2, maxconn=20)
```

#### `get_connection()`
Get a connection from the pool. Automatically initializes pool if not already created.

**Returns:** Database connection object

#### `release_connection(conn)`
Return a connection back to the pool.

**Parameters:**
- `conn`: Database connection object to release

#### `close_all_connections()`
Close all connections in the pool. Should be called when shutting down.

### Query Execution

#### `execute_query(query, params=None, fetch=False, commit=True)`
Execute a SQL query with optional parameters.

**Parameters:**
- `query` (str): SQL query string
- `params` (tuple): Query parameters for prepared statements
- `fetch` (bool): Whether to fetch and return results
- `commit` (bool): Whether to commit the transaction

**Returns:** Query results if `fetch=True`, otherwise None

**Example:**
```python
# Insert with parameters
execute_query(
    "INSERT INTO ayna.buses (id, number) VALUES (%s, %s)",
    (1, "210"),
    commit=True
)

# Select with fetch
results = execute_query(
    "SELECT * FROM ayna.buses WHERE number = %s",
    ("210",),
    fetch=True
)
```

#### `execute_many(query, data, commit=True)`
Execute a query with multiple parameter sets (bulk insert using `execute_batch`).

**Parameters:**
- `query` (str): SQL query with placeholders
- `data` (List[Tuple]): List of parameter tuples
- `commit` (bool): Whether to commit the transaction

**Returns:** Number of rows affected

**Example:**
```python
query = "INSERT INTO ayna.stops (id, latitude, longitude) VALUES (%s, %s, %s)"
data = [
    (1, 40.4388, 49.9617),
    (2, 40.4309, 49.9869),
    (3, 40.3758, 49.9574)
]
rows = execute_many(query, data)
print(f"Inserted {rows} rows")
```

#### `execute_values(query, data, page_size=1000)`
Execute bulk insert using `psycopg2.extras.execute_values` (faster for large datasets).

**Parameters:**
- `query` (str): SQL query with VALUES placeholder
- `data` (List[Tuple]): List of value tuples
- `page_size` (int): Number of rows per batch (default: 1000)

**Returns:** Number of rows affected

**Example:**
```python
query = """
    INSERT INTO ayna.stops (id, latitude, longitude)
    VALUES %s
"""
data = [(i, lat, lng) for i, lat, lng in large_dataset]
rows = execute_values(query, data, page_size=5000)
```

**Performance Note:** `execute_values` is significantly faster than `execute_many` for large datasets (10x-20x improvement for 10,000+ rows).

### Fetch Operations

#### `fetch_one(query, params=None)`
Fetch a single row from the database.

**Returns:** Single row tuple or None

**Example:**
```python
bus = fetch_one(
    "SELECT * FROM ayna.buses WHERE id = %s",
    (145,)
)
if bus:
    print(f"Bus: {bus}")
```

#### `fetch_all(query, params=None)`
Fetch all rows from the database.

**Returns:** List of row tuples

**Example:**
```python
buses = fetch_all("SELECT id, number FROM ayna.buses ORDER BY number")
for bus_id, number in buses:
    print(f"Bus #{number} (ID: {bus_id})")
```

### Helper Functions

#### `table_exists(table_name, schema='ayna')`
Check if a table exists in the database.

**Parameters:**
- `table_name` (str): Name of the table
- `schema` (str): Schema name (default: 'ayna')

**Returns:** True if table exists, False otherwise

**Example:**
```python
if table_exists('buses'):
    print("Buses table exists")
else:
    print("Run migrations first!")
```

#### `truncate_table(table_name, schema='ayna', cascade=False)`
Truncate a table (remove all rows).

**Parameters:**
- `table_name` (str): Name of the table
- `schema` (str): Schema name (default: 'ayna')
- `cascade` (bool): Whether to cascade the truncate to dependent tables

**Example:**
```python
# Simple truncate
truncate_table('buses')

# Truncate with cascade (removes dependent rows)
truncate_table('buses', cascade=True)
```

**Warning:** Truncate is a fast operation but cannot be rolled back. Use with caution.

#### `get_row_count(table_name, schema='ayna')`
Get the number of rows in a table.

**Returns:** Integer count

**Example:**
```python
count = get_row_count('buses')
print(f"Total buses: {count}")
```

#### `upsert_reference_data(table_name, data, schema='ayna')`
Insert or update reference data (payment_types, regions, working_zone_types).

**Parameters:**
- `table_name` (str): Name of the reference table
- `data` (List[Dict]): List of dictionaries containing the data
- `schema` (str): Schema name (default: 'ayna')

**Returns:** Number of rows affected

**Example:**
```python
payment_types = [
    {
        'id': 1,
        'name': 'Kart',
        'description': None,
        'isActive': True,
        'deactivedDate': None,
        'priority': 1
    },
    {
        'id': 2,
        'name': 'Nəğd',
        'description': None,
        'isActive': True,
        'deactivedDate': None,
        'priority': 2
    }
]

rows = upsert_reference_data('payment_types', payment_types)
print(f"Upserted {rows} payment types")
```

#### `parse_coordinate(coord_str)`
Parse coordinate string from Ayna API that uses commas/periods as separators.

Geographic coordinates in the format `'50,206,297'` represent `50.206297` degrees.

**Parameters:**
- `coord_str` (str): Coordinate string from API

**Returns:** Float coordinate value or None

**Examples:**
```python
# European format with comma decimal separator
parse_coordinate('50,206,297')  # Returns: 50.206297
parse_coordinate('40,43885')     # Returns: 40.43885

# Standard format with period decimal separator
parse_coordinate('49.961721')    # Returns: 49.961721
```

**Implementation Details:**
- Removes all separators (commas and periods)
- Inserts decimal point after 2nd digit
- Handles various formats from API consistently

#### `test_connection()`
Test the database connection and log PostgreSQL version.

**Returns:** True if connection successful, False otherwise

**Example:**
```python
if test_connection():
    print("Database connection OK!")
else:
    print("Database connection failed!")
```

## Error Handling

All functions include comprehensive error handling:
- **Network errors**: Connection timeouts, DNS failures
- **SQL errors**: Syntax errors, constraint violations
- **Transaction errors**: Automatic rollback on failure
- **Logging**: All errors logged with context

**Example:**
```python
try:
    execute_query("INSERT INTO ayna.buses (id, number) VALUES (%s, %s)", (1, "210"))
except Exception as e:
    print(f"Insert failed: {e}")
    # Transaction automatically rolled back
```

## Connection Pooling Benefits

1. **Performance**: Reuses connections instead of creating new ones
2. **Resource Management**: Limits concurrent database connections
3. **Automatic Cleanup**: Connections properly released and closed
4. **Thread Safety**: Pool handles concurrent access

**Pool Configuration:**
```python
# For high-concurrency applications
init_connection_pool(minconn=5, maxconn=50)

# For low-traffic scripts
init_connection_pool(minconn=1, maxconn=10)
```

## Usage Example

```python
from db_utils import (
    test_connection,
    execute_values,
    get_row_count,
    truncate_table,
    close_all_connections,
    parse_coordinate
)

# Test connection
if not test_connection():
    print("Database connection failed!")
    exit(1)

# Parse coordinates
lat = parse_coordinate('40,43885')     # 40.43885
lng = parse_coordinate('49,961721')    # 49.961721

# Prepare data
data = [
    (1, lat, lng, False),
    (2, 40.3758, 49.9574, False)
]

# Truncate and insert
truncate_table('stops')
query = "INSERT INTO ayna.stops (id, latitude, longitude, is_transport_hub) VALUES %s"
rows = execute_values(query, data)

print(f"Inserted {rows} stops")
print(f"Total stops: {get_row_count('stops')}")

# Cleanup
close_all_connections()
```

## Dependencies

```python
import psycopg2
from psycopg2 import pool, extras
from dotenv import load_dotenv
```

### Installation
```bash
pip install psycopg2-binary python-dotenv
```

## Security Notes

- ✅ Credentials stored in environment variables (never hardcoded)
- ✅ Uses prepared statements to prevent SQL injection
- ✅ Automatic transaction rollback on errors
- ✅ Connection pooling prevents connection exhaustion
- ✅ SSL mode enforced via DATABASE_URL

## Performance Tips

1. **Use `execute_values` for bulk inserts** (10,000+ rows)
2. **Adjust page_size** based on data size:
   - Small records (< 10 columns): `page_size=5000`
   - Large records (> 50 columns): `page_size=500`
3. **Use connection pooling** for repeated operations
4. **Close connections** when done with `close_all_connections()`

## Testing

Test the module:
```bash
python scripts/db_utils.py
```

Expected output:
```
Testing database connection...
✓ Database connection successful!
✓ Schema 'ayna' exists
```

## Related Files

- **migrations/001_initial_schema.sql**: Database schema definition
- **scripts/run_migrations.py**: Migration runner
- **scripts/stops.py**: Uses db_utils for stops data
- **scripts/busDetails.py**: Uses db_utils for bus details
- **.env**: Database credentials configuration
