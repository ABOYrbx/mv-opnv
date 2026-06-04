export interface StopLocation {
  id: string;
  gid: string;
  name: string;
  lat: number;
  lon: number;
  type: 'stop' | 'poi' | 'address';
}

export interface TransportType {
  id: number;
  class: number;
  name: string;
  iconId: number;
}

export interface Departure {
  line: string;
  direction: string;
  destination: string;
  platform: string;
  plannedTime: string | null;
  realtimeTime: string | null;
  delay: number;
  occupancy: string;
  transportType: string | TransportType;
  stopId: string;
  tripId: string | number;
}

export interface DepartureMonitorResponse {
  stop: StopLocation;
  departures: Departure[];
}

export interface TripLeg {
  type: 'footpath' | 'ride';
  origin: TripStop;
  destination: TripStop;
  line?: TripLine;
  intermediateStops?: TripStop[];
  allStops?: TripStop[];
}

export interface TripStop {
  name: string;
  id: string;
  lat: number;
  lon: number;
  plannedTime: string | null;
  realtimeTime: string | null;
  platform: string;
}

export interface TripLine {
  name: string;
  direction: string;
  transportType: string;
}

export interface TripResponse {
  legs: TripLeg[];
  duration: number;
  transfers: number;
}

export interface TripRequest {
  origin: string;
  destination: string;
  time?: string;
  date?: string;
  arrival?: boolean;
}

export interface ApiError {
  error: string;
  message: string;
}
