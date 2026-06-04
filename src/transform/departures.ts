import { Departure, DepartureMonitorResponse, StopLocation, TransportType } from '../types';

interface StopEvent {
  realtimeStatus?: string[];
  isRealtimeControlled?: boolean;
  departureTimePlanned?: string;
  departureTimeEstimated?: string;
  location?: {
    id: string;
    name: string;
    type: string;
    coord: [number, number];
    properties?: {
      stopId: string;
      platform?: string;
      area?: string;
    };
    parent?: {
      id: string;
      name: string;
      disassembledName: string;
      type: string;
    };
  };
  transportation?: {
    id?: string;
    name?: string;
    disassembledName?: string;
    number?: string;
    product?: TransportType | string;
    destination?: {
      id: string;
      name: string;
      type: string;
    };
    properties?: {
      tripCode?: number | string;
      lineId?: string;
    };
  };
}

interface DMResponse {
  locations?: Array<{
    id: string;
    name: string;
    disassembledName?: string;
    coord: [number, number];
    type: string;
    properties?: { stopId: string };
    parent?: { id: string; name: string; type: string };
    assignedStops?: Array<{ properties: { stopId: string } }>;
  }>;
  stopEvents?: StopEvent[];
}

function parseIsoTime(iso: string | undefined): string | null {
  if (!iso) return null;
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return null;
    return d.toISOString();
  } catch {
    return null;
  }
}

export function transformDepartureMonitor(data: unknown): DepartureMonitorResponse {
  const resp = data as DMResponse;

  let stop: StopLocation = { id: '', gid: '', name: '', lat: 0, lon: 0, type: 'stop' };

  if (resp.locations && resp.locations.length > 0) {
    const loc = resp.locations[0];
    stop = {
      id: loc.properties?.stopId || loc.id || '',
      gid: loc.id || '',
      name: loc.name || '',
      lat: loc.coord?.[1] || 0,
      lon: loc.coord?.[0] || 0,
      type: 'stop',
    };
  }

  const departures: Departure[] = [];

  if (resp.stopEvents && Array.isArray(resp.stopEvents)) {
    for (const event of resp.stopEvents) {
      const transport = event.transportation;
      if (!transport) continue;

      const line = transport.disassembledName || transport.number || transport.name || '';
      const direction = transport.destination?.name || '';

      let transportTypeValue: string | TransportType = '';
      if (typeof transport.product === 'string') {
        transportTypeValue = transport.product;
      } else if (transport.product && typeof transport.product === 'object') {
        transportTypeValue = transport.product as TransportType;
      } else {
        transportTypeValue = '';
      }

      const tripIdRaw = transport.properties?.tripCode;
      const tripId = typeof tripIdRaw === 'number' ? tripIdRaw : parseInt(tripIdRaw as string || '0', 10) || 0;

      const plannedTime = parseIsoTime(event.departureTimePlanned);
      const realtimeTime = parseIsoTime(event.departureTimeEstimated);

      let delay = 0;
      if (plannedTime && realtimeTime) {
        delay = Math.round((new Date(realtimeTime).getTime() - new Date(plannedTime).getTime()) / 60000);
      }

      const platform = event.location?.properties?.platform || '';
      const stopId = event.location?.properties?.stopId || stop.id;

      departures.push({
        line,
        direction,
        destination: direction,
        platform,
        plannedTime,
        realtimeTime,
        delay,
        occupancy: 'unknown',
        transportType: transportTypeValue,
        stopId,
        tripId,
      });
    }
  }

  return { stop, departures };
}
