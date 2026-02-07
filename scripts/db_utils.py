"""
Database utility module for Baku Bus Route Dashboard
Handles database connections, operations, and migrations
"""

import os
import psycopg2
from psycopg2 import pool, extras
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT
from dotenv import load_dotenv
from typing import Optional, List, Dict, Any, Tuple
import logging

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()

# Database configuration
DATABASE_URL = os.getenv('DATABASE_URL')

if not DATABASE_URL:
    raise ValueError("DATABASE_URL environment variable is not set")

# Connection pool
connection_pool: Optional[psycopg2.pool.SimpleConnectionPool] = None


def parse_coordinate(coord_str: str) -> Optional[float]:
    """
    Parse coordinate string from Ayna API that uses commas/periods as separators.

    Geographic coordinates (latitude/longitude) in the format '50,206,297' represent
    50.206297 degrees. The format uses comma as both thousands and fractional separator.

    Examples:
        '50,206,297' -> 50.206297 (longitude)
        '40,43885' -> 40.43885 (latitude)
        '49.961721' -> 49.961721 (longitude)

    Args:
        coord_str: Coordinate string from API

    Returns:
        Float coordinate value
    """
    if not coord_str:
        return None

    coord_str = str(coord_str).strip()

    # Remove all separators (commas and periods)
    digits_only = coord_str.replace(',', '').replace('.', '')

    # For geographic coordinates, we expect 2-3 digits before decimal
    # Baku coordinates: lat ~40.x, lon ~49-50.x
    # Insert decimal point after 2nd digit
    if len(digits_only) > 2:
        coord_str = digits_only[:2] + '.' + digits_only[2:]
    else:
        coord_str = digits_only

    try:
        return float(coord_str)
    except ValueError:
        logger.warning(f"Could not parse coordinate: {coord_str}")
        return None


def init_connection_pool(minconn: int = 1, maxconn: int = 10) -> None:
    """
    Initialize the database connection pool

    Args:
        minconn: Minimum number of connections in the pool
        maxconn: Maximum number of connections in the pool
    """
    global connection_pool

    try:
        connection_pool = psycopg2.pool.SimpleConnectionPool(
            minconn,
            maxconn,
            DATABASE_URL
        )
        logger.info("Database connection pool initialized successfully")
    except Exception as e:
        logger.error(f"Error initializing connection pool: {e}")
        raise


def get_connection():
    """
    Get a connection from the pool

    Returns:
        Database connection object
    """
    global connection_pool

    if connection_pool is None:
        init_connection_pool()

    try:
        conn = connection_pool.getconn()
        return conn
    except Exception as e:
        logger.error(f"Error getting connection from pool: {e}")
        raise


def release_connection(conn) -> None:
    """
    Return a connection to the pool

    Args:
        conn: Database connection object
    """
    global connection_pool

    if connection_pool is not None and conn is not None:
        connection_pool.putconn(conn)


def close_all_connections() -> None:
    """Close all connections in the pool"""
    global connection_pool

    if connection_pool is not None:
        connection_pool.closeall()
        logger.info("All database connections closed")


def execute_query(
    query: str,
    params: Optional[Tuple] = None,
    fetch: bool = False,
    commit: bool = True
) -> Optional[List[Tuple]]:
    """
    Execute a SQL query

    Args:
        query: SQL query string
        params: Query parameters
        fetch: Whether to fetch results
        commit: Whether to commit the transaction

    Returns:
        Query results if fetch=True, otherwise None
    """
    conn = None
    cursor = None

    try:
        conn = get_connection()
        cursor = conn.cursor()

        cursor.execute(query, params)

        result = None
        if fetch:
            result = cursor.fetchall()

        if commit:
            conn.commit()

        return result

    except Exception as e:
        if conn:
            conn.rollback()
        logger.error(f"Error executing query: {e}")
        logger.error(f"Query: {query}")
        raise
    finally:
        if cursor:
            cursor.close()
        if conn:
            release_connection(conn)


def execute_many(
    query: str,
    data: List[Tuple],
    commit: bool = True
) -> int:
    """
    Execute a query with multiple parameter sets (bulk insert)

    Args:
        query: SQL query string with placeholders
        data: List of parameter tuples
        commit: Whether to commit the transaction

    Returns:
        Number of rows affected
    """
    conn = None
    cursor = None

    try:
        conn = get_connection()
        cursor = conn.cursor()

        psycopg2.extras.execute_batch(cursor, query, data)

        rowcount = cursor.rowcount

        if commit:
            conn.commit()

        logger.info(f"Bulk insert: {rowcount} rows affected")
        return rowcount

    except Exception as e:
        if conn:
            conn.rollback()
        logger.error(f"Error executing bulk insert: {e}")
        raise
    finally:
        if cursor:
            cursor.close()
        if conn:
            release_connection(conn)


def execute_values(
    query: str,
    data: List[Tuple],
    page_size: int = 1000
) -> int:
    """
    Execute bulk insert using execute_values (faster for large datasets)

    Args:
        query: SQL query with VALUES placeholder
        data: List of value tuples
        page_size: Number of rows per batch

    Returns:
        Number of rows affected
    """
    conn = None
    cursor = None

    try:
        conn = get_connection()
        cursor = conn.cursor()

        psycopg2.extras.execute_values(
            cursor,
            query,
            data,
            page_size=page_size
        )

        rowcount = cursor.rowcount
        conn.commit()

        logger.info(f"Bulk insert (execute_values): {rowcount} rows affected")
        return rowcount

    except Exception as e:
        if conn:
            conn.rollback()
        logger.error(f"Error executing bulk insert with execute_values: {e}")
        raise
    finally:
        if cursor:
            cursor.close()
        if conn:
            release_connection(conn)


def fetch_one(query: str, params: Optional[Tuple] = None) -> Optional[Tuple]:
    """
    Fetch a single row from the database

    Args:
        query: SQL query string
        params: Query parameters

    Returns:
        Single row tuple or None
    """
    conn = None
    cursor = None

    try:
        conn = get_connection()
        cursor = conn.cursor()

        cursor.execute(query, params)
        result = cursor.fetchone()

        return result

    except Exception as e:
        logger.error(f"Error fetching one: {e}")
        raise
    finally:
        if cursor:
            cursor.close()
        if conn:
            release_connection(conn)


def fetch_all(query: str, params: Optional[Tuple] = None) -> List[Tuple]:
    """
    Fetch all rows from the database

    Args:
        query: SQL query string
        params: Query parameters

    Returns:
        List of row tuples
    """
    conn = None
    cursor = None

    try:
        conn = get_connection()
        cursor = conn.cursor()

        cursor.execute(query, params)
        results = cursor.fetchall()

        return results

    except Exception as e:
        logger.error(f"Error fetching all: {e}")
        raise
    finally:
        if cursor:
            cursor.close()
        if conn:
            release_connection(conn)


def table_exists(table_name: str, schema: str = 'ayna') -> bool:
    """
    Check if a table exists in the database

    Args:
        table_name: Name of the table
        schema: Schema name (default: ayna)

    Returns:
        True if table exists, False otherwise
    """
    query = """
        SELECT EXISTS (
            SELECT FROM information_schema.tables
            WHERE table_schema = %s
            AND table_name = %s
        );
    """

    result = fetch_one(query, (schema, table_name))
    return result[0] if result else False


def truncate_table(table_name: str, schema: str = 'ayna', cascade: bool = False) -> None:
    """
    Truncate a table

    Args:
        table_name: Name of the table
        schema: Schema name (default: ayna)
        cascade: Whether to cascade the truncate
    """
    cascade_str = "CASCADE" if cascade else ""
    query = f"TRUNCATE TABLE {schema}.{table_name} {cascade_str};"

    execute_query(query, commit=True)
    logger.info(f"Table {schema}.{table_name} truncated")


def get_row_count(table_name: str, schema: str = 'ayna') -> int:
    """
    Get the number of rows in a table

    Args:
        table_name: Name of the table
        schema: Schema name (default: ayna)

    Returns:
        Number of rows
    """
    query = f"SELECT COUNT(*) FROM {schema}.{table_name};"

    result = fetch_one(query)
    return result[0] if result else 0


def upsert_reference_data(
    table_name: str,
    data: List[Dict[str, Any]],
    schema: str = 'ayna'
) -> int:
    """
    Insert or update reference data (payment_types, regions, working_zone_types)

    Args:
        table_name: Name of the reference table
        data: List of dictionaries containing the data
        schema: Schema name (default: ayna)

    Returns:
        Number of rows affected
    """
    if not data:
        return 0

    # Build the INSERT ... ON CONFLICT query
    columns = ['id', 'name', 'description', 'is_active', 'deactived_date', 'priority']
    placeholders = ', '.join(['%s'] * len(columns))
    columns_str = ', '.join(columns)

    update_columns = ', '.join([
        f"{col} = EXCLUDED.{col}" for col in columns if col != 'id'
    ])

    query = f"""
        INSERT INTO {schema}.{table_name} ({columns_str})
        VALUES ({placeholders})
        ON CONFLICT (id) DO UPDATE SET
            {update_columns}
    """

    # Prepare data tuples
    data_tuples = [
        (
            item['id'],
            item.get('name'),
            item.get('description'),
            item.get('isActive', True),
            item.get('deactivedDate'),
            item.get('priority')
        )
        for item in data
    ]

    return execute_many(query, data_tuples)


def test_connection() -> bool:
    """
    Test the database connection

    Returns:
        True if connection successful, False otherwise
    """
    try:
        result = fetch_one("SELECT version();")
        if result:
            logger.info(f"Database connection successful")
            logger.info(f"PostgreSQL version: {result[0]}")
            return True
        return False
    except Exception as e:
        logger.error(f"Database connection failed: {e}")
        return False


if __name__ == "__main__":
    # Test the database connection
    print("Testing database connection...")
    if test_connection():
        print("✓ Database connection successful!")

        # Test schema existence
        schema_exists = fetch_one("""
            SELECT EXISTS (
                SELECT FROM information_schema.schemata
                WHERE schema_name = 'ayna'
            );
        """)

        if schema_exists and schema_exists[0]:
            print("✓ Schema 'ayna' exists")
        else:
            print("✗ Schema 'ayna' does not exist - run migrations first")
    else:
        print("✗ Database connection failed!")

    # Close all connections
    close_all_connections()
