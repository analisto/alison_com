# run_migrations.py

## Overview
Migration runner script that executes SQL migration files to set up and update the database schema for the Baku Bus Route Dashboard.

## Purpose
Automates database schema creation and updates by:
- Running SQL migration files in order
- Creating the `ayna` schema with all required tables
- Setting up indexes, foreign keys, and constraints
- Creating database views for easy data access
- Verifying schema correctness after migrations
- Providing detailed logging and error reporting

## Usage

### Basic Usage
```bash
python scripts/run_migrations.py
```

### Expected Output
```
============================================================
Starting database migrations
============================================================
Found 1 migration file(s)
Connected to database
Running migration: 001_initial_schema.sql
✓ Migration 001_initial_schema.sql completed successfully

============================================================
All migrations completed successfully!
============================================================

Verifying database schema...
✓ Schema 'ayna' exists
Found 9 tables in schema 'ayna'
  ✓ Table ayna.payment_types exists
  ✓ Table ayna.regions exists
  ✓ Table ayna.working_zone_types exists
  ✓ Table ayna.stops exists
  ✓ Table ayna.stop_details exists
  ✓ Table ayna.buses exists
  ✓ Table ayna.bus_stops exists
  ✓ Table ayna.routes exists
  ✓ Table ayna.route_coordinates exists
Found 2 view(s): ['v_bus_stops_details', 'v_buses_complete']
✓ Schema verification complete

✓ Database is ready!
```

## Configuration

### Environment Variables
Requires `DATABASE_URL` in `.env` file:
```bash
DATABASE_URL=postgresql://user:password@host:port/database?sslmode=require
```

### Migration Files Location
Migration files must be placed in:
```
migrations/
├── 001_initial_schema.sql
├── 002_future_migration.sql
└── ...
```

**File Naming Convention:**
- Use numeric prefixes for ordering: `001_`, `002_`, `003_`
- Use descriptive names: `001_initial_schema.sql`
- Files are executed in alphabetical order

## Functions

### `run_migration_file(conn, migration_file)`
Run a single migration SQL file.

**Parameters:**
- `conn`: PostgreSQL connection object
- `migration_file` (Path): Path to the migration file

**Returns:** True if successful, False otherwise

**Process:**
1. Opens and reads the SQL file (UTF-8 encoding)
2. Executes all SQL statements in the file
3. Commits the transaction
4. Logs success or failure

**Example:**
```python
from pathlib import Path
import psycopg2

conn = psycopg2.connect(DATABASE_URL)
migration = Path('migrations/001_initial_schema.sql')
success = run_migration_file(conn, migration)
```

### `run_all_migrations()`
Run all migration files in the migrations directory.

**Returns:** True if all migrations successful, False otherwise

**Process:**
1. Locates the migrations directory
2. Finds all `.sql` files
3. Sorts files alphabetically
4. Connects to the database
5. Runs each migration in order
6. Stops on first failure

**Error Handling:**
- Rolls back transaction on SQL errors
- Logs detailed error messages
- Continues to next migration only if current succeeds

### `verify_schema()`
Verify that the schema and tables were created successfully.

**Returns:** True if verification successful, False otherwise

**Checks:**
1. Schema `ayna` exists
2. All expected tables exist:
   - payment_types
   - regions
   - working_zone_types
   - stops
   - stop_details
   - buses
   - bus_stops
   - routes
   - route_coordinates
3. Views are created
4. Logs results for each check

**Example Output:**
```
✓ Schema 'ayna' exists
Found 9 tables in schema 'ayna'
  ✓ Table ayna.payment_types exists
  ✓ Table ayna.regions exists
  ...
Found 2 view(s): ['v_bus_stops_details', 'v_buses_complete']
✓ Schema verification complete
```

## Migration Files

### Current Migration: 001_initial_schema.sql

Creates the complete database schema:

#### Reference Tables
- **payment_types**: Payment methods (Card/Cash)
- **regions**: Geographic regions
- **working_zone_types**: Zone types (Urban/Suburban)

#### Core Tables
- **stops**: Basic stop coordinates (from stops.json API)
- **stop_details**: Detailed stop information with names
- **buses**: Bus route information
- **bus_stops**: Junction table linking buses to stops
- **routes**: Direction-specific route metadata
- **route_coordinates**: Flow coordinates for route visualization

#### Views
- **v_buses_complete**: Complete bus info with joined reference data
- **v_bus_stops_details**: Bus stops with complete details

#### Additional Features
- Indexes on frequently queried columns
- Foreign key constraints
- Triggers for automatic `updated_at` timestamps
- Comments on tables and columns

## Error Handling

The script handles various error scenarios:

### Connection Errors
```python
try:
    conn = psycopg2.connect(DATABASE_URL)
except Exception as e:
    logger.error(f"Database connection failed: {e}")
    return False
```

### Migration Errors
```python
try:
    cursor.execute(sql)
    conn.commit()
except Exception as e:
    conn.rollback()
    logger.error(f"Migration {migration_file.name} failed: {e}")
    return False
```

### Missing Migrations Directory
```
Migrations directory not found: /path/to/migrations
```

### No Migration Files
```
No migration files found
```

## Exit Codes

- **0**: All migrations completed successfully
- **1**: Migration failed or verification failed

**Usage in CI/CD:**
```bash
python scripts/run_migrations.py
if [ $? -eq 0 ]; then
    echo "Migrations successful"
else
    echo "Migrations failed"
    exit 1
fi
```

## Idempotency

The migration system is designed to be **idempotent**:
- Uses `CREATE TABLE IF NOT EXISTS`
- Uses `CREATE SCHEMA IF NOT EXISTS`
- Uses `CREATE OR REPLACE VIEW`
- Can be run multiple times safely

**Example from 001_initial_schema.sql:**
```sql
CREATE SCHEMA IF NOT EXISTS ayna;

CREATE TABLE IF NOT EXISTS ayna.buses (
    id INTEGER PRIMARY KEY,
    ...
);

CREATE OR REPLACE VIEW ayna.v_buses_complete AS
    SELECT ...;
```

## Best Practices

### Adding New Migrations

1. **Create numbered migration file:**
   ```bash
   touch migrations/002_add_new_feature.sql
   ```

2. **Write idempotent SQL:**
   ```sql
   -- Good: Idempotent
   CREATE TABLE IF NOT EXISTS ayna.new_table (...);

   -- Bad: Will fail on second run
   CREATE TABLE ayna.new_table (...);
   ```

3. **Test locally first:**
   ```bash
   python scripts/run_migrations.py
   ```

4. **Commit to repository:**
   ```bash
   git add migrations/002_add_new_feature.sql
   git commit -m "Add new migration for feature X"
   ```

### Migration Order

Migrations run in alphabetical order:
```
001_initial_schema.sql      # First
002_add_indexes.sql         # Second
003_add_views.sql           # Third
```

### Schema Changes

For schema changes:
1. Create new migration file
2. Use `ALTER TABLE` statements
3. Test rollback strategy
4. Document breaking changes

**Example:**
```sql
-- migrations/002_add_user_tracking.sql

ALTER TABLE ayna.buses
ADD COLUMN IF NOT EXISTS last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

CREATE INDEX IF NOT EXISTS idx_buses_last_updated
ON ayna.buses(last_updated);
```

## Rollback Strategy

The script does not include automatic rollback. For manual rollback:

1. **Backup before migrations:**
   ```bash
   pg_dump $DATABASE_URL > backup.sql
   ```

2. **Restore if needed:**
   ```bash
   psql $DATABASE_URL < backup.sql
   ```

3. **Or drop and recreate schema:**
   ```sql
   DROP SCHEMA ayna CASCADE;
   ```
   Then run migrations again.

## Development Workflow

### Initial Setup
```bash
# 1. Configure database
echo "DATABASE_URL=postgresql://..." > .env

# 2. Run migrations
python scripts/run_migrations.py

# 3. Verify tables
psql $DATABASE_URL -c "\dt ayna.*"
```

### Adding New Migrations
```bash
# 1. Create migration file
cat > migrations/002_new_feature.sql << 'EOF'
-- Add your SQL here
ALTER TABLE ayna.buses ADD COLUMN ...;
EOF

# 2. Test migration
python scripts/run_migrations.py

# 3. Verify changes
psql $DATABASE_URL -c "SELECT * FROM ayna.buses LIMIT 1;"
```

## Integration with CI/CD

### GitHub Actions Example
```yaml
- name: Run Database Migrations
  env:
    DATABASE_URL: ${{ secrets.DATABASE_URL }}
  run: |
    python scripts/run_migrations.py

- name: Verify Database
  run: |
    python -c "from scripts.db_utils import test_connection; exit(0 if test_connection() else 1)"
```

### Docker Example
```dockerfile
# Dockerfile
FROM python:3.11-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt

COPY scripts/ scripts/
COPY migrations/ migrations/
COPY .env .env

CMD ["python", "scripts/run_migrations.py"]
```

## Logging

The script uses Python's logging module:

```python
import logging

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
```

**Log Levels:**
- **INFO**: Normal operation (migrations, verification)
- **WARNING**: Non-critical issues
- **ERROR**: Critical failures (connection, SQL errors)

**Example Logs:**
```
2026-02-07 17:20:46,806 - INFO - Running migration: 001_initial_schema.sql
2026-02-07 17:20:46,806 - INFO - ✓ Migration 001_initial_schema.sql completed successfully
2026-02-07 17:20:47,833 - INFO - ✓ Table ayna.buses exists
```

## Dependencies

```python
import os
import sys
import psycopg2
from pathlib import Path
from dotenv import load_dotenv
```

### Installation
```bash
pip install psycopg2-binary python-dotenv
```

## Testing

### Manual Test
```bash
python scripts/run_migrations.py
echo "Exit code: $?"
```

### Automated Test
```python
import subprocess

result = subprocess.run(
    ['python', 'scripts/run_migrations.py'],
    capture_output=True,
    text=True
)

if result.returncode == 0:
    print("✓ Migrations successful")
    print(result.stdout)
else:
    print("✗ Migrations failed")
    print(result.stderr)
```

## Troubleshooting

### Connection Failed
```
Database connection failed: could not connect to server
```
**Solution:** Check DATABASE_URL in `.env` file

### Permission Denied
```
ERROR: permission denied to create schema
```
**Solution:** Ensure database user has CREATE permission

### Table Already Exists
```
ERROR: relation "ayna.buses" already exists
```
**Solution:** Migration not idempotent. Use `CREATE TABLE IF NOT EXISTS`

### Migration Directory Not Found
```
Migrations directory not found: /path/to/migrations
```
**Solution:** Run from project root or check `migrations/` directory exists

## Related Files

- **migrations/001_initial_schema.sql**: Initial database schema
- **scripts/db_utils.py**: Database utility functions
- **scripts/stops.py**: Stops data scraper
- **scripts/busDetails.py**: Bus details scraper
- **.env**: Database configuration
- **README.md**: Project documentation

## Security Notes

- ✅ Never commit `.env` file with credentials
- ✅ Use environment variables for sensitive data
- ✅ Enable SSL mode in DATABASE_URL
- ✅ Limit database user permissions
- ✅ Backup database before running migrations
- ✅ Test migrations in staging environment first

## Future Enhancements

Potential improvements:
1. **Migration versioning table** to track applied migrations
2. **Rollback scripts** for each migration
3. **Migration status command** to show applied migrations
4. **Dry-run mode** to preview changes
5. **Transaction-per-migration** for better isolation
