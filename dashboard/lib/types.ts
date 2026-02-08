export interface Bus {
  id: number;
  carrier: string;
  number: string;
  first_point: string;
  last_point: string;
  route_length: number;
  payment_type_id: number;
  card_payment_date: string | null;
  tariff: number;
  tariff_str: string;
  region_id: number;
  working_zone_type_id: number;
  duration_minuts: number;
}

export interface Stop {
  id: number;
  longitude: number;
  latitude: number;
  is_transport_hub: boolean;
}

export interface StopDetail {
  id: number;
  code: string | null;
  name: string;
  name_monitor: string | null;
  utm_coord_x: number | null;
  utm_coord_y: number | null;
  longitude: number;
  latitude: number;
  is_transport_hub: boolean;
}

export interface Route {
  id: number;
  code: string;
  customer_name: string;
  type: string;
  name: string;
  destination: string;
  variant: string;
  operator: string;
  bus_id: number;
  direction_type_id: number;
}

export interface RouteCoordinate {
  id: number;
  route_id: number;
  latitude: number;
  longitude: number;
  sequence_order: number;
}

export interface BusStop {
  id: number;
  bus_stop_id: number;
  bus_id: number;
  stop_id: number;
  stop_code: string | null;
  stop_name: string;
  total_distance: number;
  intermediate_distance: number;
  direction_type_id: number;
}

export interface PaymentType {
  id: number;
  name: string;
  description: string | null;
  is_active: boolean;
  deactivated_date: string | null;
  priority: number;
}

export interface Region {
  id: number;
  name: string;
  description: string | null;
  is_active: boolean;
  deactivated_date: string | null;
  priority: number;
}

export interface WorkingZoneType {
  id: number;
  name: string;
  description: string | null;
  is_active: boolean;
  deactivated_date: string | null;
  priority: number;
}

export interface DashboardStats {
  totalBuses: number;
  totalStops: number;
  totalRoutes: number;
  totalCoordinates: number;
}
