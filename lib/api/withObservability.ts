import { NextResponse } from 'next/server';
import { logJson } from '@/lib/observability/logger';
import { createRequestContext, type RequestContext } from '@/lib/observability/trace';

type RouteMeta = {
  route: string;
  operation: string;
};

export async function withObservability(
  request: Request,
  meta: RouteMeta,
  handler: (ctx: RequestContext) => Promise<NextResponse>
): Promise<NextResponse> {
  const ctx = createRequestContext(request);
  const start = Date.now();

  try {
    const response = await handler(ctx);
    const headers = new Headers(response.headers);
    headers.set('x-request-id', ctx.requestId);

    logJson({
      level: 'info',
      route: meta.route,
      operation: meta.operation,
      request_id: ctx.requestId,
      span_id: ctx.spanId,
      status_code: response.status,
      latency_ms: Date.now() - start
    });

    return new NextResponse(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers
    });
  } catch (error) {
    logJson({
      level: 'error',
      route: meta.route,
      operation: meta.operation,
      request_id: ctx.requestId,
      span_id: ctx.spanId,
      status_code: 500,
      latency_ms: Date.now() - start,
      error_name: error instanceof Error ? error.name : 'Error',
      error_message: error instanceof Error ? error.message : String(error)
    });

    const headers = new Headers({ 'content-type': 'application/json' });
    headers.set('x-request-id', ctx.requestId);

    return new NextResponse(
      JSON.stringify({
        error: 'internal_error',
        message: error instanceof Error ? error.message : 'Unexpected error'
      }),
      { status: 500, headers }
    );
  }
}
