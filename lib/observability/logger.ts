export type LogLevel = 'info' | 'warn' | 'error';

export type LogFields = {
  level: LogLevel;
  route?: string;
  operation?: string;
  request_id?: string;
  span_id?: string;
  parent_span_id?: string;
  status_code?: number;
  latency_ms?: number;
  error_name?: string;
  error_message?: string;
  [key: string]: unknown;
};

export function logJson(fields: LogFields): void {
  const entry = {
    timestamp: new Date().toISOString(),
    ...fields
  };
  console.log(JSON.stringify(entry));
}
