import NodeCache from 'node-cache';

const DEFAULT_TTL = {
  stops: 3600,
  departures: 30,
  trips: 60,
};

const cache = new NodeCache({ checkperiod: 60 });

export function getCacheKey(prefix: string, key: string): string {
  return `${prefix}:${key}`;
}

export function getFromCache<T>(key: string): T | undefined {
  return cache.get<T>(key);
}

export function setInCache<T>(key: string, value: T, ttl: number): void {
  cache.set(key, value, ttl);
}

export { DEFAULT_TTL };
