"""
Migration runner script for Baku Bus Route Dashboard
Runs SQL migration files to set up the database schema
"""

import os
import sys
from pathlib import Path
import psycopg2
from dotenv import load_dotenv
import logging

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()

DATABASE_URL = os.getenv('DATABASE_URL')

if not DATABASE_URL:
    raise ValueError("DATABASE_URL environment variable is not set")


def run_migration_file(conn, migration_file: Path) -> bool:
    """
    Run a single migration file

    Args:
        conn: Database connection
        migration_file: Path to the migration file

    Returns:
        True if successful, False otherwise
    """
    try:
        logger.info(f"Running migration: {migration_file.name}")

        with open(migration_file, 'r', encoding='utf-8') as f:
            sql = f.read()

        cursor = conn.cursor()
        cursor.execute(sql)
        conn.commit()
        cursor.close()

        logger.info(f"✓ Migration {migration_file.name} completed successfully")
        return True

    except Exception as e:
        conn.rollback()
        logger.error(f"✗ Migration {migration_file.name} failed: {e}")
        return False


def run_all_migrations() -> bool:
    """
    Run all migration files in order

    Returns:
        True if all migrations successful, False otherwise
    """
    # Get migrations directory
    project_root = Path(__file__).parent.parent
    migrations_dir = project_root / 'migrations'

    if not migrations_dir.exists():
        logger.error(f"Migrations directory not found: {migrations_dir}")
        return False

    # Get all SQL files
    migration_files = sorted(migrations_dir.glob('*.sql'))

    if not migration_files:
        logger.warning("No migration files found")
        return True

    logger.info(f"Found {len(migration_files)} migration file(s)")

    # Connect to database
    try:
        conn = psycopg2.connect(DATABASE_URL)
        logger.info("Connected to database")

        # Run each migration
        success = True
        for migration_file in migration_files:
            if not run_migration_file(conn, migration_file):
                success = False
                break

        conn.close()
        return success

    except Exception as e:
        logger.error(f"Database connection failed: {e}")
        return False


def verify_schema() -> bool:
    """
    Verify that the schema and tables were created successfully

    Returns:
        True if verification successful, False otherwise
    """
    try:
        conn = psycopg2.connect(DATABASE_URL)
        cursor = conn.cursor()

        # Check if schema exists
        cursor.execute("""
            SELECT EXISTS (
                SELECT FROM information_schema.schemata
                WHERE schema_name = 'ayna'
            );
        """)
        schema_exists = cursor.fetchone()[0]

        if not schema_exists:
            logger.error("Schema 'ayna' was not created")
            return False

        logger.info("✓ Schema 'ayna' exists")

        # Check if tables exist
        expected_tables = [
            'payment_types',
            'regions',
            'working_zone_types',
            'stops',
            'stop_details',
            'buses',
            'bus_stops',
            'routes',
            'route_coordinates'
        ]

        cursor.execute("""
            SELECT table_name
            FROM information_schema.tables
            WHERE table_schema = 'ayna'
            AND table_type = 'BASE TABLE'
            ORDER BY table_name;
        """)

        existing_tables = [row[0] for row in cursor.fetchall()]

        logger.info(f"Found {len(existing_tables)} tables in schema 'ayna'")

        missing_tables = set(expected_tables) - set(existing_tables)
        if missing_tables:
            logger.error(f"Missing tables: {missing_tables}")
            return False

        for table in expected_tables:
            if table in existing_tables:
                logger.info(f"  ✓ Table ayna.{table} exists")

        # Check views
        cursor.execute("""
            SELECT table_name
            FROM information_schema.views
            WHERE table_schema = 'ayna'
            ORDER BY table_name;
        """)

        views = [row[0] for row in cursor.fetchall()]
        logger.info(f"Found {len(views)} view(s): {views}")

        cursor.close()
        conn.close()

        logger.info("✓ Schema verification complete")
        return True

    except Exception as e:
        logger.error(f"Schema verification failed: {e}")
        return False


def main():
    """Main function"""
    logger.info("=" * 60)
    logger.info("Starting database migrations")
    logger.info("=" * 60)

    # Run migrations
    if run_all_migrations():
        logger.info("\n" + "=" * 60)
        logger.info("All migrations completed successfully!")
        logger.info("=" * 60)

        # Verify schema
        logger.info("\nVerifying database schema...")
        if verify_schema():
            logger.info("\n✓ Database is ready!")
            return 0
        else:
            logger.error("\n✗ Schema verification failed")
            return 1
    else:
        logger.error("\n✗ Migrations failed")
        return 1


if __name__ == "__main__":
    sys.exit(main())
