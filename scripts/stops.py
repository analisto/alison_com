"""
Fetch all bus stop data from the Ayna Transport API and save to database

This script retrieves comprehensive information about all public transport stops
in the Baku transportation system and stores them in the PostgreSQL database.

API Endpoint: https://map-api.ayna.gov.az/api/stop/getAll
Database Table: ayna.stops
"""

import requests
import json
import sys
import logging
from typing import Optional, List, Dict, Any
from db_utils import execute_values, table_exists, get_row_count, truncate_table, test_connection

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# API Configuration
API_BASE_URL = "https://map-api.ayna.gov.az/api"
STOPS_ENDPOINT = f"{API_BASE_URL}/stop/getAll"


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


def fetch_stops() -> Optional[List[Dict[str, Any]]]:
    """
    Fetch all stops from the API

    Returns:
        List of stop dictionaries if successful, None otherwise
    """
    try:
        logger.info("Fetching stops data from API...")
        logger.info(f"URL: {STOPS_ENDPOINT}")

        response = requests.get(STOPS_ENDPOINT, timeout=30)
        response.raise_for_status()

        data = response.json()

        if isinstance(data, list):
            logger.info(f"✓ Successfully fetched {len(data)} stops")
            return data
        else:
            logger.error("Unexpected response format (expected list)")
            return None

    except requests.exceptions.RequestException as e:
        logger.error(f"✗ Network error: {e}")
        return None
    except json.JSONDecodeError as e:
        logger.error(f"✗ JSON decode error: {e}")
        return None
    except Exception as e:
        logger.error(f"✗ Unexpected error: {e}")
        return None


def save_stops_to_db(stops: List[Dict[str, Any]]) -> bool:
    """
    Save stops data to the database (replaces all existing data)

    Args:
        stops: List of stop dictionaries

    Returns:
        True if successful, False otherwise
    """
    try:
        # Check if table exists
        if not table_exists('stops'):
            logger.error("Table 'ayna.stops' does not exist. Run migrations first.")
            return False

        # Always truncate before inserting fresh data
        logger.info("Truncating table ayna.stops (removing old data)...")
        truncate_table('stops')

        # Prepare data for bulk insert
        logger.info("Preparing data for database insert...")

        data_tuples = []
        for stop in stops:
            # Convert coordinates using helper function
            longitude = parse_coordinate(stop.get('longitude'))
            latitude = parse_coordinate(stop.get('latitude'))

            data_tuples.append((
                stop['id'],
                longitude,
                latitude,
                stop.get('isTransportHub', False)
            ))

        # Bulk insert using execute_values (no conflict handling needed since table is truncated)
        logger.info(f"Inserting {len(data_tuples)} stops into database...")

        query = """
            INSERT INTO ayna.stops (id, longitude, latitude, is_transport_hub)
            VALUES %s
        """

        rows_affected = execute_values(query, data_tuples, page_size=1000)

        logger.info(f"✓ Successfully saved {rows_affected} stops to database")

        # Verify
        total_rows = get_row_count('stops')
        logger.info(f"Total stops in database: {total_rows}")

        return True

    except Exception as e:
        logger.error(f"✗ Error saving stops to database: {e}")
        return False


def get_statistics(stops: List[Dict[str, Any]]) -> None:
    """
    Display statistics about the stops data

    Args:
        stops: List of stop dictionaries
    """
    logger.info("=" * 60)
    logger.info("STOPS DATA STATISTICS")
    logger.info("=" * 60)

    total = len(stops)
    transport_hubs = sum(1 for s in stops if s.get('isTransportHub'))

    logger.info(f"Total stops: {total}")
    logger.info(f"Transport hubs: {transport_hubs}")
    logger.info(f"Regular stops: {total - transport_hubs}")

    # Check for coordinates
    with_coords = sum(
        1 for s in stops
        if s.get('longitude') and s.get('latitude')
    )
    logger.info(f"Stops with coordinates: {with_coords} ({with_coords/total*100:.1f}%)")

    logger.info("=" * 60)


def main():
    """Main execution function"""
    logger.info("=" * 60)
    logger.info("BAKU BUS STOPS DATA FETCHER")
    logger.info("=" * 60)

    # Test database connection
    logger.info("\nTesting database connection...")
    if not test_connection():
        logger.error("✗ Database connection failed!")
        logger.info("Tip: Check your DATABASE_URL in .env file")
        return 1

    # Fetch stops from API
    stops = fetch_stops()

    if not stops:
        logger.error("✗ Failed to fetch stops data")
        return 1

    # Display statistics
    get_statistics(stops)

    # Save to database
    logger.info("\nSaving stops to database (will replace existing data)...")
    if save_stops_to_db(stops):
        logger.info("\n" + "=" * 60)
        logger.info("✓ ALL OPERATIONS COMPLETED SUCCESSFULLY!")
        logger.info("=" * 60)
        return 0
    else:
        logger.error("✗ Failed to save stops to database")
        logger.info("\nTip: Make sure you've run migrations first:")
        logger.info("  python scripts/run_migrations.py")
        return 1


if __name__ == "__main__":
    sys.exit(main())
