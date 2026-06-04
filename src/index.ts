import path from 'path';
import express from 'express';
import { EfaClient } from './efa-client';
import { transformStopFinder } from './transform/stops';
import { transformDepartureMonitor } from './transform/departures';
import { transformTripRequest } from './transform/trip';
import { getFromCache, setInCache, getCacheKey, DEFAULT_TTL } from './cache';
import { TripRequest } from './types';

const app = express();
const efa = new EfaClient();
const PORT = process.env.PORT || 3000;

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

app.use((_req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (_req.method === 'OPTIONS') { res.sendStatus(204); return; }
  next();
});

app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

function asyncHandler(fn: (req: express.Request, res: express.Response, next: express.NextFunction) => Promise<void>) {
  return (req: express.Request, res: express.Response, next: express.NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

app.get('/api/stops', asyncHandler(async (req, res) => {
  try {
    const query = String(req.query.q || '').trim();
    if (!query) {
      res.status(400).json({ error: 'BAD_REQUEST', message: 'Query parameter "q" is required' });
      return;
    }

    const cacheKey = getCacheKey('stops', query.toLowerCase());
    const cached = getFromCache(cacheKey);
    if (cached) { res.json(cached); return; }

    const raw = await efa.stopFinder(query);
    const stops = transformStopFinder(raw);

    setInCache(cacheKey, stops, DEFAULT_TTL.stops);
    res.json(stops);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ error: 'STOP_FINDER_ERROR', message });
  }
}));

app.get('/api/departures/:stopId', asyncHandler(async (req, res) => {
  try {
    const stopId = req.params.stopId;
    const limit = Math.min(parseInt(String(req.query.limit || '20'), 10), 50);
    const time = typeof req.query.time === 'string' ? req.query.time : undefined;
    const date = typeof req.query.date === 'string' ? req.query.date : undefined;

    const cacheKey = getCacheKey('departures', `${stopId}:${limit}:${time || ''}:${date || ''}`);
    const cached = getFromCache(cacheKey);
    if (cached) { res.json(cached); return; }

    const raw = await efa.departureMonitor(stopId as string, limit, time as string | undefined, date as string | undefined);
    const result = transformDepartureMonitor(raw);

    setInCache(cacheKey, result, DEFAULT_TTL.departures);
    res.json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ error: 'DEPARTURE_MONITOR_ERROR', message });
  }
}));

app.post('/api/trip', asyncHandler(async (req, res) => {
  try {
    const body = req.body as TripRequest;
    if (!body.origin || !body.destination) {
      res.status(400).json({
        error: 'BAD_REQUEST',
        message: '"origin" and "destination" are required',
      });
      return;
    }

    const cacheKey = getCacheKey('trip', `${body.origin}:${body.destination}:${body.time || ''}:${body.date || ''}:${body.arrival || false}`);
    const cached = getFromCache(cacheKey);
    if (cached) { res.json(cached); return; }

    const raw = await efa.tripRequest(body.origin, body.destination, body.time, body.date, body.arrival);
    const result = transformTripRequest(raw);

    setInCache(cacheKey, result, DEFAULT_TTL.trips);
    res.json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ error: 'TRIP_REQUEST_ERROR', message });
  }
}));

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Express error:', err);
  res.status(500).json({ error: 'INTERNAL_ERROR', message: err.message });
});

app.listen(PORT, () => {
  console.log(`ÖPNV API läuft auf http://localhost:${PORT}`);
  console.log(`Region: VMV (Mecklenburg-Vorpommern)`);
  console.log(`EFA-Endpoint: ${(efa as unknown as { client: { defaults: { baseURL: string } } }).client.defaults.baseURL}/`);
});
