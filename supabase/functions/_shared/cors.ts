const ALLOWED = (Deno.env.get('ALLOWED_ORIGINS') ?? 'http://localhost:5173')
  .split(',')
  .map((s) => s.trim());

export function corsHeaders(origin: string | null): Record<string, string> {
  const allow =
    origin && ALLOWED.includes(origin)
      ? origin
      : ALLOWED[0];

  return {
    'Access-Control-Allow-Origin': allow,
    'Access-Control-Allow-Headers':
      'authorization, x-client-info, x-application-name, apikey, content-type',
    'Access-Control-Allow-Methods':
      'POST, GET, OPTIONS',
    'Access-Control-Max-Age':
      '86400',
    'Vary':
      'Origin',
  };
}

export function json(
  body: unknown,
  status: number,
  origin: string | null
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders(origin),
      'Content-Type': 'application/json',
    },
  });
}