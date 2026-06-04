import { StopLocation } from '../types';

interface StopFinderPoint {
  usage: string;
  type: string;
  name: string;
  stateless: string;
  anyType: string;
  sort: string;
  quality: string;
  best: string;
  object: string;
  mainLoc: string;
  ref: {
    id: string;
    gid: string;
    omc: string;
    placeID: string;
    place: string;
    coords: string;
  };
}

interface StopFinderResponse {
  stopFinder: {
    message?: Array<{ name: string; value: string }>;
    input: { input: string };
    points: StopFinderPoint[];
  };
}

export function transformStopFinder(data: unknown): StopLocation[] {
  const resp = data as StopFinderResponse;
  const sf = resp?.stopFinder;
  if (!sf) return [];

  let points = sf.points;
  if (!Array.isArray(points)) {
    if (points && typeof points === 'object') {
      const pt = (points as Record<string, unknown>).point;
      points = Array.isArray(pt) ? pt : pt ? [pt] : [];
    } else {
      return [];
    }
  }

  return points.map((p: StopFinderPoint) => {
    const coords = (p.ref?.coords || '0,0').split(',').map(Number);
    return {
      id: p.ref?.id || p.stateless || '',
      gid: p.ref?.gid || '',
      name: p.name || p.object || '',
      lat: coords[1] || 0,
      lon: coords[0] || 0,
      type: (p.anyType === 'poi' ? 'poi' : p.anyType === 'address' ? 'address' : 'stop') as StopLocation['type'],
    };
  });
}
