"""
Fetch detailed information for all bus routes and save to database

This script retrieves comprehensive route information including stops, coordinates,
fare information, and carrier details for all buses in the Baku public transportation system.

API Endpoints:
  - Bus List: https://map-api.ayna.gov.az/api/bus/getBusList
  - Bus Details: https://map-api.ayna.gov.az/api/bus/getBusById?id={bus_id}

Database Tables: ayna.payment_types, ayna.regions, ayna.working_zone_types,
                 ayna.buses, ayna.stop_details, ayna.bus_stops, ayna.routes,
                 ayna.route_coordinates
"""

import requests
import json
import time
import sys
import logging
from typing import Optional, List, Dict, Any
from collections import defaultdict
from db_utils import (
    execute_values, execute_many, table_exists, get_row_count,
    truncate_table, test_connection, upsert_reference_data, parse_coordinate
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# API Configuration
API_BASE_URL = "https://map-api.ayna.gov.az/api"
BUS_LIST_ENDPOINT = f"{API_BASE_URL}/bus/getBusList"
BUS_DETAILS_ENDPOINT = f"{API_BASE_URL}/bus/getBusById"


def fetch_bus_list() -> Optional[List[Dict[str, Any]]]:
    """
    Fetch the list of all bus IDs from the API

    Returns:
        List of bus dictionaries if successful, None otherwise
    """
    try:
        logger.info("Fetching bus list from API...")
        logger.info(f"URL: {BUS_LIST_ENDPOINT}")

        response = requests.get(BUS_LIST_ENDPOINT, timeout=30)
        response.raise_for_status()

        bus_list = response.json()
        logger.info(f"✓ Successfully fetched {len(bus_list)} buses")
        return bus_list

    except requests.exceptions.RequestException as e:
        logger.error(f"✗ Network error: {e}")
        return None
    except json.JSONDecodeError as e:
        logger.error(f"✗ JSON decode error: {e}")
        return None


def fetch_bus_details(bus_id: int) -> Optional[Dict[str, Any]]:
    """
    Fetch detailed information for a specific bus ID

    Args:
        bus_id: The bus route ID

    Returns:
        Bus details dictionary if successful, None otherwise
    """
    url = f"{BUS_DETAILS_ENDPOINT}?id={bus_id}"

    try:
        response = requests.get(url, timeout=30)
        response.raise_for_status()
        return response.json()

    except requests.exceptions.RequestException as e:
        logger.error(f"  ✗ Error: {e}")
        return None
    except json.JSONDecodeError as e:
        logger.error(f"  ✗ JSON decode error: {e}")
        return None


def fetch_all_bus_details() -> Optional[List[Dict[str, Any]]]:
    """
    Fetch details for all buses

    Returns:
        List of bus detail dictionaries if successful, None otherwise
    """
    # First, get the list of all bus IDs
    bus_list = fetch_bus_list()
    if not bus_list:
        logger.error("Failed to fetch bus list")
        return None

    # Fetch details for each bus
    all_bus_details = []
    total_buses = len(bus_list)

    logger.info(f"\nFetching details for {total_buses} buses...")
    logger.info("=" * 60)

    for idx, bus in enumerate(bus_list, 1):
        bus_id = bus['id']
        bus_number = bus['number']

        logger.info(f"[{idx}/{total_buses}] Fetching bus #{bus_number} (ID: {bus_id})...")

        details = fetch_bus_details(bus_id)

        if details:
            all_bus_details.append(details)
            logger.info(f"  ✓ Success")
        else:
            logger.warning(f"  ✗ Failed")

        # Rate limiting
        time.sleep(0.1)

    logger.info("=" * 60)
    logger.info(f"Successfully fetched details for {len(all_bus_details)}/{total_buses} buses")

    return all_bus_details


def save_reference_tables(all_buses: List[Dict[str, Any]]) -> bool:
    """
    Save reference tables (payment_types, regions, working_zone_types)

    Args:
        all_buses: List of bus detail dictionaries

    Returns:
        True if successful, False otherwise
    """
    try:
        logger.info("\nSaving reference tables...")

        # Collect unique reference data
        payment_types = {}
        regions = {}
        working_zone_types = {}

        for bus in all_buses:
            if bus.get('paymentType'):
                pt = bus['paymentType']
                payment_types[pt['id']] = pt

            if bus.get('region'):
                r = bus['region']
                regions[r['id']] = r

            if bus.get('workingZoneType'):
                wzt = bus['workingZoneType']
                working_zone_types[wzt['id']] = wzt

        # Save to database
        logger.info(f"  - payment_types: {len(payment_types)} records")
        upsert_reference_data('payment_types', list(payment_types.values()))

        logger.info(f"  - regions: {len(regions)} records")
        upsert_reference_data('regions', list(regions.values()))

        logger.info(f"  - working_zone_types: {len(working_zone_types)} records")
        upsert_reference_data('working_zone_types', list(working_zone_types.values()))

        logger.info("✓ Reference tables saved successfully")
        return True

    except Exception as e:
        logger.error(f"✗ Error saving reference tables: {e}")
        return False


def save_stop_details(all_buses: List[Dict[str, Any]]) -> bool:
    """
    Save stop details from all buses

    Args:
        all_buses: List of bus detail dictionaries

    Returns:
        True if successful, False otherwise
    """
    try:
        logger.info("\nSaving stop details...")

        # Truncate table (CASCADE because referenced by bus_stops)
        truncate_table('stop_details', cascade=True)

        # Collect unique stops
        stops_dict = {}

        for bus in all_buses:
            for bus_stop in bus.get('stops', []):
                stop = bus_stop.get('stop')
                if stop and stop['id'] not in stops_dict:
                    stops_dict[stop['id']] = stop

        # Prepare data
        data_tuples = []
        for stop in stops_dict.values():
            # Convert coordinates using helper function
            longitude = parse_coordinate(stop.get('longitude'))
            latitude = parse_coordinate(stop.get('latitude'))

            data_tuples.append((
                stop['id'],
                stop.get('code'),
                stop.get('name'),
                stop.get('nameMonitor'),
                stop.get('utmCoordX'),
                stop.get('utmCoordY'),
                longitude,
                latitude,
                stop.get('isTransportHub', False)
            ))

        # Insert
        query = """
            INSERT INTO ayna.stop_details
            (id, code, name, name_monitor, utm_coord_x, utm_coord_y,
             longitude, latitude, is_transport_hub)
            VALUES %s
        """

        rows_affected = execute_values(query, data_tuples, page_size=1000)
        logger.info(f"✓ Saved {rows_affected} stop details")

        return True

    except Exception as e:
        logger.error(f"✗ Error saving stop details: {e}")
        return False


def save_buses(all_buses: List[Dict[str, Any]]) -> bool:
    """
    Save bus routes data

    Args:
        all_buses: List of bus detail dictionaries

    Returns:
        True if successful, False otherwise
    """
    try:
        logger.info("\nSaving buses...")

        # Truncate table
        truncate_table('buses', cascade=True)

        # Prepare data
        data_tuples = []
        for bus in all_buses:
            data_tuples.append((
                bus['id'],
                bus.get('carrier'),
                bus.get('number'),
                bus.get('firstPoint'),
                bus.get('lastPoint'),
                float(bus['routLength']) if bus.get('routLength') else None,
                bus.get('paymentTypeId'),
                bus.get('cardPaymentDate'),
                bus.get('tariff'),
                bus.get('tariffStr'),
                bus.get('regionId'),
                bus.get('workingZoneTypeId'),
                bus.get('durationMinuts')
            ))

        # Insert
        query = """
            INSERT INTO ayna.buses
            (id, carrier, number, first_point, last_point, route_length,
             payment_type_id, card_payment_date, tariff, tariff_str,
             region_id, working_zone_type_id, duration_minuts)
            VALUES %s
        """

        rows_affected = execute_values(query, data_tuples, page_size=500)
        logger.info(f"✓ Saved {rows_affected} buses")

        return True

    except Exception as e:
        logger.error(f"✗ Error saving buses: {e}")
        return False


def save_bus_stops(all_buses: List[Dict[str, Any]]) -> bool:
    """
    Save bus stops (junction table linking buses to stops)

    Args:
        all_buses: List of bus detail dictionaries

    Returns:
        True if successful, False otherwise
    """
    try:
        logger.info("\nSaving bus stops...")

        # Note: CASCADE delete should have cleared this, but we'll truncate anyway
        truncate_table('bus_stops')

        # Prepare data
        data_tuples = []
        for bus in all_buses:
            for bus_stop in bus.get('stops', []):
                data_tuples.append((
                    bus_stop['id'],
                    bus_stop['busId'],
                    bus_stop['stopId'],
                    bus_stop.get('stopCode'),
                    bus_stop.get('stopName'),
                    float(bus_stop['totalDistance']) if bus_stop.get('totalDistance') else None,
                    float(bus_stop['intermediateDistance']) if bus_stop.get('intermediateDistance') else None,
                    bus_stop['directionTypeId']
                ))

        # Insert
        query = """
            INSERT INTO ayna.bus_stops
            (bus_stop_id, bus_id, stop_id, stop_code, stop_name,
             total_distance, intermediate_distance, direction_type_id)
            VALUES %s
        """

        rows_affected = execute_values(query, data_tuples, page_size=1000)
        logger.info(f"✓ Saved {rows_affected} bus stops")

        return True

    except Exception as e:
        logger.error(f"✗ Error saving bus stops: {e}")
        return False


def save_routes(all_buses: List[Dict[str, Any]]) -> bool:
    """
    Save routes (direction-specific route information)

    Args:
        all_buses: List of bus detail dictionaries

    Returns:
        True if successful, False otherwise
    """
    try:
        logger.info("\nSaving routes...")

        # Note: CASCADE delete should have cleared this
        truncate_table('routes', cascade=True)

        # Prepare data
        data_tuples = []
        for bus in all_buses:
            for route in bus.get('routes', []):
                data_tuples.append((
                    route['id'],
                    route.get('code'),
                    route.get('customerName'),
                    route.get('type'),
                    route.get('name'),
                    route.get('destination'),
                    route.get('variant'),
                    route.get('operator'),
                    route['busId'],
                    route['directionTypeId']
                ))

        # Insert
        query = """
            INSERT INTO ayna.routes
            (id, code, customer_name, type, name, destination, variant,
             operator, bus_id, direction_type_id)
            VALUES %s
        """

        rows_affected = execute_values(query, data_tuples, page_size=500)
        logger.info(f"✓ Saved {rows_affected} routes")

        return True

    except Exception as e:
        logger.error(f"✗ Error saving routes: {e}")
        return False


def save_route_coordinates(all_buses: List[Dict[str, Any]]) -> bool:
    """
    Save route coordinates (flow coordinates for mapping)

    Args:
        all_buses: List of bus detail dictionaries

    Returns:
        True if successful, False otherwise
    """
    try:
        logger.info("\nSaving route coordinates...")

        # Note: CASCADE delete should have cleared this
        truncate_table('route_coordinates')

        # Prepare data
        data_tuples = []
        for bus in all_buses:
            for route in bus.get('routes', []):
                route_id = route['id']
                flow_coords = route.get('flowCoordinates', [])

                for idx, coord in enumerate(flow_coords):
                    # Convert coordinates using helper function
                    lat = parse_coordinate(coord.get('lat'))
                    lng = parse_coordinate(coord.get('lng'))

                    data_tuples.append((
                        route_id,
                        lat,
                        lng,
                        idx + 1  # sequence_order (1-indexed)
                    ))

        # Insert
        logger.info(f"  Inserting {len(data_tuples)} coordinate points...")

        query = """
            INSERT INTO ayna.route_coordinates
            (route_id, latitude, longitude, sequence_order)
            VALUES %s
        """

        rows_affected = execute_values(query, data_tuples, page_size=5000)
        logger.info(f"✓ Saved {rows_affected} route coordinates")

        return True

    except Exception as e:
        logger.error(f"✗ Error saving route coordinates: {e}")
        return False


def get_statistics(all_buses: List[Dict[str, Any]]) -> None:
    """
    Display statistics about the bus data

    Args:
        all_buses: List of bus detail dictionaries
    """
    logger.info("=" * 60)
    logger.info("BUS DATA STATISTICS")
    logger.info("=" * 60)

    total_buses = len(all_buses)
    carriers = set(b.get('carrier') for b in all_buses if b.get('carrier'))

    total_stops = sum(len(b.get('stops', [])) for b in all_buses)
    total_routes = sum(len(b.get('routes', [])) for b in all_buses)
    total_coordinates = sum(
        len(r.get('flowCoordinates', []))
        for b in all_buses
        for r in b.get('routes', [])
    )

    logger.info(f"Total buses: {total_buses}")
    logger.info(f"Unique carriers: {len(carriers)}")
    logger.info(f"Total bus stops entries: {total_stops}")
    logger.info(f"Total routes: {total_routes}")
    logger.info(f"Total coordinate points: {total_coordinates}")
    logger.info("=" * 60)


def main():
    """Main execution function"""
    logger.info("=" * 60)
    logger.info("BAKU BUS DETAILS DATA FETCHER & DATABASE LOADER")
    logger.info("=" * 60)

    # Test database connection
    logger.info("\nTesting database connection...")
    if not test_connection():
        logger.error("✗ Database connection failed!")
        logger.info("Tip: Check your DATABASE_URL in .env file")
        return 1

    # Fetch all bus details from API
    all_buses = fetch_all_bus_details()

    if not all_buses:
        logger.error("✗ Failed to fetch bus details")
        return 1

    # Display statistics
    get_statistics(all_buses)

    # Save to database
    logger.info("\n" + "=" * 60)
    logger.info("SAVING DATA TO DATABASE (REPLACING OLD DATA)")
    logger.info("=" * 60)

    # Save in correct order (respecting foreign key constraints)
    if not save_reference_tables(all_buses):
        return 1

    if not save_stop_details(all_buses):
        return 1

    if not save_buses(all_buses):
        return 1

    if not save_bus_stops(all_buses):
        return 1

    if not save_routes(all_buses):
        return 1

    if not save_route_coordinates(all_buses):
        return 1

    # Display final row counts
    logger.info("\n" + "=" * 60)
    logger.info("DATABASE ROW COUNTS")
    logger.info("=" * 60)
    tables = [
        'payment_types', 'regions', 'working_zone_types',
        'stop_details', 'buses', 'bus_stops', 'routes', 'route_coordinates'
    ]

    for table in tables:
        count = get_row_count(table)
        logger.info(f"  ayna.{table}: {count:,} rows")

    logger.info("\n" + "=" * 60)
    logger.info("✓ ALL OPERATIONS COMPLETED SUCCESSFULLY!")
    logger.info("=" * 60)

    return 0


if __name__ == "__main__":
    sys.exit(main())
