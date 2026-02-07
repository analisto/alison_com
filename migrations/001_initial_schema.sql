-- Initial Database Schema for Baku Bus Route Dashboard
-- Schema: ayna
-- Description: Complete schema for bus routes, stops, and geographic data

-- Create schema if not exists
CREATE SCHEMA IF NOT EXISTS ayna;

-- Set search path
SET search_path TO ayna, public;

-- ============================================================================
-- REFERENCE TABLES (Lookup/Dictionary Tables)
-- ============================================================================

-- Payment Types Table
CREATE TABLE IF NOT EXISTS ayna.payment_types (
    id INTEGER PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    deactived_date TIMESTAMP,
    priority INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_payment_types_active ON ayna.payment_types(is_active);
COMMENT ON TABLE ayna.payment_types IS 'Payment methods for bus routes (Card/Cash)';

-- Regions Table
CREATE TABLE IF NOT EXISTS ayna.regions (
    id INTEGER PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    deactived_date TIMESTAMP,
    priority INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_regions_active ON ayna.regions(is_active);
COMMENT ON TABLE ayna.regions IS 'Geographic regions (e.g., Baku)';

-- Working Zone Types Table
CREATE TABLE IF NOT EXISTS ayna.working_zone_types (
    id INTEGER PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    deactived_date TIMESTAMP,
    priority INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_working_zone_types_active ON ayna.working_zone_types(is_active);
COMMENT ON TABLE ayna.working_zone_types IS 'Zone types (Urban, Suburban, etc.)';

-- ============================================================================
-- CORE DATA TABLES
-- ============================================================================

-- Stops Table (from stops.json)
CREATE TABLE IF NOT EXISTS ayna.stops (
    id INTEGER PRIMARY KEY,
    longitude DECIMAL(10, 7) NOT NULL,
    latitude DECIMAL(10, 7) NOT NULL,
    is_transport_hub BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_stops_coordinates ON ayna.stops(latitude, longitude);
CREATE INDEX idx_stops_transport_hub ON ayna.stops(is_transport_hub);
COMMENT ON TABLE ayna.stops IS 'All bus stops with geographic coordinates';

-- Stop Details Table (from busDetails stops.stop nested data)
CREATE TABLE IF NOT EXISTS ayna.stop_details (
    id INTEGER PRIMARY KEY,
    code VARCHAR(50),
    name VARCHAR(255) NOT NULL,
    name_monitor VARCHAR(255),
    utm_coord_x VARCHAR(50),
    utm_coord_y VARCHAR(50),
    longitude DECIMAL(10, 7) NOT NULL,
    latitude DECIMAL(10, 7) NOT NULL,
    is_transport_hub BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_stop_details_code ON ayna.stop_details(code);
CREATE INDEX idx_stop_details_name ON ayna.stop_details(name);
CREATE INDEX idx_stop_details_coordinates ON ayna.stop_details(latitude, longitude);
COMMENT ON TABLE ayna.stop_details IS 'Detailed stop information including names and codes';

-- Buses Table (Main bus routes)
CREATE TABLE IF NOT EXISTS ayna.buses (
    id INTEGER PRIMARY KEY,
    carrier VARCHAR(255) NOT NULL,
    number VARCHAR(50) NOT NULL,
    first_point VARCHAR(255) NOT NULL,
    last_point VARCHAR(255) NOT NULL,
    route_length DECIMAL(10, 2),
    payment_type_id INTEGER REFERENCES ayna.payment_types(id),
    card_payment_date TIMESTAMP,
    tariff INTEGER NOT NULL,
    tariff_str VARCHAR(50),
    region_id INTEGER REFERENCES ayna.regions(id),
    working_zone_type_id INTEGER REFERENCES ayna.working_zone_types(id),
    duration_minuts INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_buses_number ON ayna.buses(number);
CREATE INDEX idx_buses_carrier ON ayna.buses(carrier);
CREATE INDEX idx_buses_payment_type ON ayna.buses(payment_type_id);
CREATE INDEX idx_buses_region ON ayna.buses(region_id);
CREATE INDEX idx_buses_zone_type ON ayna.buses(working_zone_type_id);
COMMENT ON TABLE ayna.buses IS 'Bus routes with operator and fare information';

-- Bus Stops Junction Table (links buses to stops with sequence)
CREATE TABLE IF NOT EXISTS ayna.bus_stops (
    id SERIAL PRIMARY KEY,
    bus_stop_id INTEGER NOT NULL,  -- Original ID from API
    bus_id INTEGER NOT NULL REFERENCES ayna.buses(id) ON DELETE CASCADE,
    stop_id INTEGER NOT NULL REFERENCES ayna.stop_details(id),
    stop_code VARCHAR(50),
    stop_name VARCHAR(255) NOT NULL,
    total_distance DECIMAL(10, 2),
    intermediate_distance DECIMAL(10, 2),
    direction_type_id INTEGER NOT NULL,  -- 1=outbound, 2=inbound
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(bus_id, bus_stop_id, direction_type_id)
);

CREATE INDEX idx_bus_stops_bus ON ayna.bus_stops(bus_id);
CREATE INDEX idx_bus_stops_stop ON ayna.bus_stops(stop_id);
CREATE INDEX idx_bus_stops_direction ON ayna.bus_stops(direction_type_id);
CREATE INDEX idx_bus_stops_bus_direction ON ayna.bus_stops(bus_id, direction_type_id);
COMMENT ON TABLE ayna.bus_stops IS 'Junction table linking buses to stops with sequence and distance';

-- Routes Table (Direction-specific route information)
CREATE TABLE IF NOT EXISTS ayna.routes (
    id INTEGER PRIMARY KEY,
    code VARCHAR(50),
    customer_name VARCHAR(255),
    type VARCHAR(50),
    name VARCHAR(255),
    destination VARCHAR(255),
    variant VARCHAR(50),
    operator VARCHAR(255),
    bus_id INTEGER NOT NULL REFERENCES ayna.buses(id) ON DELETE CASCADE,
    direction_type_id INTEGER NOT NULL,  -- 1=outbound, 2=inbound
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_routes_bus ON ayna.routes(bus_id);
CREATE INDEX idx_routes_direction ON ayna.routes(direction_type_id);
CREATE INDEX idx_routes_bus_direction ON ayna.routes(bus_id, direction_type_id);
CREATE INDEX idx_routes_code ON ayna.routes(code);
COMMENT ON TABLE ayna.routes IS 'Route directions with metadata for each bus';

-- Route Coordinates Table (Flow coordinates for mapping)
CREATE TABLE IF NOT EXISTS ayna.route_coordinates (
    id SERIAL PRIMARY KEY,
    route_id INTEGER NOT NULL REFERENCES ayna.routes(id) ON DELETE CASCADE,
    latitude DECIMAL(10, 7) NOT NULL,
    longitude DECIMAL(10, 7) NOT NULL,
    sequence_order INTEGER NOT NULL,  -- Order of coordinates along the route
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_route_coordinates_route ON ayna.route_coordinates(route_id);
CREATE INDEX idx_route_coordinates_sequence ON ayna.route_coordinates(route_id, sequence_order);
CREATE INDEX idx_route_coordinates_location ON ayna.route_coordinates(latitude, longitude);
COMMENT ON TABLE ayna.route_coordinates IS 'Geographic coordinates defining the route path for visualization';

-- ============================================================================
-- VIEWS FOR EASY DATA ACCESS
-- ============================================================================

-- Complete Bus Information View
CREATE OR REPLACE VIEW ayna.v_buses_complete AS
SELECT
    b.id,
    b.number,
    b.carrier,
    b.first_point,
    b.last_point,
    b.route_length,
    b.duration_minuts,
    b.tariff,
    b.tariff_str,
    b.card_payment_date,
    pt.name as payment_type,
    r.name as region,
    wzt.name as working_zone_type,
    b.created_at,
    b.updated_at
FROM ayna.buses b
LEFT JOIN ayna.payment_types pt ON b.payment_type_id = pt.id
LEFT JOIN ayna.regions r ON b.region_id = r.id
LEFT JOIN ayna.working_zone_types wzt ON b.working_zone_type_id = wzt.id;

COMMENT ON VIEW ayna.v_buses_complete IS 'Complete bus information with joined reference data';

-- Bus Stops with Details View
CREATE OR REPLACE VIEW ayna.v_bus_stops_details AS
SELECT
    bs.id,
    bs.bus_id,
    b.number as bus_number,
    bs.stop_id,
    sd.name as stop_name,
    sd.code as stop_code,
    sd.latitude,
    sd.longitude,
    bs.total_distance,
    bs.intermediate_distance,
    bs.direction_type_id,
    CASE
        WHEN bs.direction_type_id = 1 THEN 'Outbound'
        WHEN bs.direction_type_id = 2 THEN 'Inbound'
        ELSE 'Unknown'
    END as direction_name,
    sd.is_transport_hub
FROM ayna.bus_stops bs
JOIN ayna.buses b ON bs.bus_id = b.id
JOIN ayna.stop_details sd ON bs.stop_id = sd.id;

COMMENT ON VIEW ayna.v_bus_stops_details IS 'Bus stops with complete details and human-readable direction';

-- ============================================================================
-- UTILITY FUNCTIONS
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION ayna.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply update triggers to all tables
CREATE TRIGGER update_payment_types_updated_at BEFORE UPDATE ON ayna.payment_types
    FOR EACH ROW EXECUTE FUNCTION ayna.update_updated_at_column();

CREATE TRIGGER update_regions_updated_at BEFORE UPDATE ON ayna.regions
    FOR EACH ROW EXECUTE FUNCTION ayna.update_updated_at_column();

CREATE TRIGGER update_working_zone_types_updated_at BEFORE UPDATE ON ayna.working_zone_types
    FOR EACH ROW EXECUTE FUNCTION ayna.update_updated_at_column();

CREATE TRIGGER update_stops_updated_at BEFORE UPDATE ON ayna.stops
    FOR EACH ROW EXECUTE FUNCTION ayna.update_updated_at_column();

CREATE TRIGGER update_stop_details_updated_at BEFORE UPDATE ON ayna.stop_details
    FOR EACH ROW EXECUTE FUNCTION ayna.update_updated_at_column();

CREATE TRIGGER update_buses_updated_at BEFORE UPDATE ON ayna.buses
    FOR EACH ROW EXECUTE FUNCTION ayna.update_updated_at_column();

CREATE TRIGGER update_bus_stops_updated_at BEFORE UPDATE ON ayna.bus_stops
    FOR EACH ROW EXECUTE FUNCTION ayna.update_updated_at_column();

CREATE TRIGGER update_routes_updated_at BEFORE UPDATE ON ayna.routes
    FOR EACH ROW EXECUTE FUNCTION ayna.update_updated_at_column();

-- ============================================================================
-- GRANTS (Adjust as needed for your security requirements)
-- ============================================================================

-- Grant usage on schema
-- GRANT USAGE ON SCHEMA ayna TO your_app_user;
-- GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA ayna TO your_app_user;
-- GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA ayna TO your_app_user;

COMMENT ON SCHEMA ayna IS 'Baku bus route dashboard - Complete transportation network data';
