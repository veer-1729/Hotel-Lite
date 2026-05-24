import { logJson } from './logger';

export type RequestContext = {
  requestId: string;
  spanId: string;
  parentSpanId?: string;
};

export function createRequestContext(request: Request): RequestContext {
  const incoming =
    request.headers.get('x-request-id')?.trim() ||
    request.headers.get('X-Request-Id')?.trim();
  const requestId = incoming || crypto.randomUUID();
  return {
    requestId,
    spanId: crypto.randomUUID()
  };
}

export async function runSpan<T>(
  ctx: RequestContext,
  operation: string,
  fn: () => Promise<T>
): Promise<T> {
  const spanId = crypto.randomUUID();
  const start = Date.now();
  logJson({
    level: 'info',
    operation,
    request_id: ctx.requestId,
    span_id: spanId,
    parent_span_id: ctx.spanId,
    event: 'span.start'
  });

  try {
    const result = await fn();
    logJson({
      level: 'info',
      operation,
      request_id: ctx.requestId,
      span_id: spanId,
      parent_span_id: ctx.spanId,
      event: 'span.end',
      latency_ms: Date.now() - start
    });
    return result;
  } catch (error) {
    logJson({
      level: 'error',
      operation,
      request_id: ctx.requestId,
      span_id: spanId,
      parent_span_id: ctx.spanId,
      event: 'span.error',
      latency_ms: Date.now() - start,
      error_name: error instanceof Error ? error.name : 'Error',
      error_message: error instanceof Error ? error.message : String(error)
    });
    throw error;
  }
}
