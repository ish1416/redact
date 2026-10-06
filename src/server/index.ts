interface Env {
  ASSETS: { fetch(request: Request): Promise<Response> };
}

/**
 * Redact is a static site: the extension does the work, and this Worker only
 * serves the built bundle. It exists so the download, the demo and the docs
 * ship from one origin.
 */
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const response = await env.ASSETS.fetch(request);
    const headers = new Headers(response.headers);
    headers.set('x-content-type-options', 'nosniff');
    headers.set('referrer-policy', 'strict-origin-when-cross-origin');
    return new Response(response.body, { status: response.status, headers });
  },
};
