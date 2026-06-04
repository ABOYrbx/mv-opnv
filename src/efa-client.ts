import axios, { AxiosInstance } from 'axios';

const BASE_URL = 'https://fahrplanauskunft-mv.de/vmv-efa';
const TIMEOUT = 20000;

export class EfaClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: BASE_URL,
      timeout: TIMEOUT,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json',
        'User-Agent': 'opnv-backend/1.0',
      },
    });
  }

  async stopFinder(query: string): Promise<unknown> {
    const params = new URLSearchParams({
      locationServerActive: '1',
      type_sf: 'any',
      name_sf: query,
      anyObjFilter_sf: '2',
      coordOutputFormat: 'WGS84[DD.DDDDD]',
      outputFormat: 'JSON',
    });
    const res = await this.client.post('/XML_STOPFINDER_REQUEST', params.toString());
    return res.data;
  }

  async departureMonitor(
    stopId: string,
    limit: number = 20,
    time?: string,
    date?: string,
  ): Promise<unknown> {
    const params: Record<string, string> = {
      language: 'de',
      type_dm: 'stop',
      name_dm: stopId,
      useRealtime: '1',
      mode: 'direct',
      limit: String(limit),
      outputFormat: 'rapidJson',
    };
    // Parse time (HH:MM) into hour/minute
    if (time) {
      const [hour, minute] = time.split(':');
      params.itdTimeHour = hour;
      params.itdTimeMinute = minute;
    }
    // Parse date (DD.MM.YYYY or YYYY-MM-DD)
    if (date) {
      if (date.includes('.')) {
        const [day, month, year] = date.split('.');
        params.itdDateDay = day;
        params.itdDateMonth = month;
        params.itdDateYear = year;
      } else {
        const [year, month, day] = date.split('-');
        params.itdDateDay = day;
        params.itdDateMonth = month;
        params.itdDateYear = year;
      }
    }
    const form = new URLSearchParams(params);
    const res = await this.client.post('/XML_DM_REQUEST', form.toString());
    return res.data;
  }

  async tripRequest(
    origin: string,
    destination: string,
    time?: string,
    date?: string,
    arrival: boolean = false,
  ): Promise<unknown> {
    const params: Record<string, string> = {
      language: 'de',
      type_origin: 'stop',
      name_origin: origin,
      type_destination: 'stop',
      name_destination: destination,
      useRealtime: '1',
      coordOutputFormat: 'WGS84[DD.DDDDD]',
      outputFormat: 'JSON',
      calcNumberOfTrips: '6',
      routeType: 'LEASTTIME',
    };
    if (time) {
      const [hour, minute] = time.split(':');
      params.itdTimeHour = hour;
      params.itdTimeMinute = minute;
      params.itdTripDateTimeDepArr = arrival ? 'arr' : 'dep';
    }
    if (date) {
      if (date.includes('.')) {
        const [day, month, year] = date.split('.');
        params.itdDateDay = day;
        params.itdDateMonth = month;
        params.itdDateYear = year || String(new Date().getFullYear());
      } else {
        const [year, month, day] = date.split('-');
        params.itdDateDay = day;
        params.itdDateMonth = month;
        params.itdDateYear = year;
      }
    }
    const form = new URLSearchParams(params);
    const res = await this.client.post('/XML_TRIP_REQUEST2', form.toString());
    return res.data;
  }
}
