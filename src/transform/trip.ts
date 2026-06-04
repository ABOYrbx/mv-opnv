import { TripLeg, TripResponse, TripStop } from '../types';

interface TripPoint {
  name: string;
  nameWO?: string;
  platformName?: string;
  plannedPlatformName?: string;
  place?: string;
  usage: 'departure' | 'arrival' | 'intermediateStop';
  dateTime?: {
    date: string;
    time: string;
    rtDate?: string;
    rtTime?: string;
  };
  ref?: {
    id?: string;
    coords?: string;
    platform?: string;
  };
  x?: string;
  y?: string;
}

interface TripLegJson {
  timeMinute: string;
  realtimeStatus?: string;
  points: TripPoint[];
  mode?: {
    name: string;
    number: string;
    product: string;
    destination: string;
    destID?: string;
    diva?: { tripCode?: string };
  };
  footpath?: Array<{
    duration: string;
    footpathElem?: Array<{
      orig?: { stopID?: string };
      dest?: { stopID?: string };
    }>;
  }>;
  stopSeq?: TripPoint[];
}

interface TripResponseJson {
  trips: Array<{
    duration: string;
    interchange: string;
    legs: TripLegJson[];
  }>;
}

function parseCoords(coords?: string): { lat: number; lon: number } {
  if (!coords) return { lat: 0, lon: 0 };
  const parts = coords.split(',');
  if (parts.length !== 2) return { lat: 0, lon: 0 };
  return { lat: parseFloat(parts[1]), lon: parseFloat(parts[0]) };
}

function parseTime(dt: TripPoint['dateTime'] | undefined): string | null {
  if (!dt?.date || !dt?.time) return null;
  const dateStr = dt.date.replace(/\./g, '-');
  const timeStr = dt.time.replace(/\./g, ':');
  return `${dateStr}T${timeStr}`;
}

function parseRtTime(dt: TripPoint['dateTime'] | undefined): string | null {
  if (!dt?.rtDate || !dt?.rtTime) return null;
  const dateStr = dt.rtDate.replace(/\./g, '-');
  const timeStr = dt.rtTime.replace(/\./g, ':');
  return `${dateStr}T${timeStr}`;
}

function toStop(p: TripPoint) {
  const coords = parseCoords(p.ref?.coords);
  return {
    name: p.name || p.place || '',
    id: p.ref?.id || '',
    lat: coords.lat,
    lon: coords.lon,
    plannedTime: parseTime(p.dateTime),
    realtimeTime: parseRtTime(p.dateTime),
    platform: p.platformName || p.plannedPlatformName || p.ref?.platform || '',
  };
}

export function transformTripRequest(data: unknown): TripResponse {
  const resp = data as TripResponseJson;

  if (!resp?.trips || !Array.isArray(resp.trips) || resp.trips.length === 0) {
    throw new Error('No trips found');
  }

  const firstTrip = resp.trips[0];
  const legs: TripLeg[] = [];
  let transfers = 0;

  const rawLegs = firstTrip.legs;
  if (!Array.isArray(rawLegs)) {
    throw new Error('No route legs found');
  }

  for (const leg of rawLegs) {
    const points = leg.points || [];
    const dep = points.find(p => p.usage === 'departure');
    const arr = points.find(p => p.usage === 'arrival');

    if (!dep || !arr) continue; // skip legs without departure/arrival points

    const mode = leg.mode;
    const isFootpath = !mode && !!leg.footpath && leg.footpath.length > 0;

    if (isFootpath) {
      legs.push({
        type: 'footpath',
        origin: toStop(dep),
        destination: toStop(arr),
      });
    } else if (mode) {
      transfers++;

      const intermediateStops: TripLeg['intermediateStops'] = [];
      let allStops: TripStop[] = [];
      const stopSeq = leg.stopSeq;
      const depId = dep.ref?.id;
      const arrId = arr.ref?.id;
      if (Array.isArray(stopSeq)) {
        allStops = stopSeq.map(s => toStop(s));
        for (const stop of stopSeq) {
          const stopId = stop.ref?.id;
          if (stopId === depId || stopId === arrId) continue;
          intermediateStops.push(toStop(stop));
        }
      }

      legs.push({
        type: 'ride',
        origin: toStop(dep),
        destination: toStop(arr),
        line: {
          name: mode.number || mode.name || '',
          direction: mode.destination || '',
          transportType: mode.product || '',
        },
        intermediateStops,
        allStops,
      });
    }
  }

  const durationParts = (firstTrip.duration || '00:00').split(':');
  const duration = parseInt(durationParts[0], 10) * 60 + parseInt(durationParts[1], 10) || 0;

  return { legs, duration, transfers };
}
