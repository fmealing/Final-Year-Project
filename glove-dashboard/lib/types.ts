export interface TelemetryRow {
  id: number;
  received_utc: string;
  device_id: string;
  ts_ms: number;
  flex1: number;
  flex2: number;
  flex3: number;
  flex4: number;
  ax: number;
  ay: number;
  az: number;
  gx: number;
  gy: number;
  gz: number;
  rep_count: number | null;
  displacement: number | null;
}
