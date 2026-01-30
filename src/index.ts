import { handleAuth, handleCallback } from './adapters/reddit';
import { createKey } from './auth/keyManager';

export default {
  async fetch(request: Request, env: any) {
    const url = new URL(request.url);

    // Key Generation for Users/MINDEN
    if (url.pathname === "/api/v1/keys/create") return createKey(request, env);

    // Reddit Auth Routes
    if (url.pathname === "/auth/reddit") return handleAuth(request, env);
    if (url.pathname === "/auth/reddit/callback") return handleCallback(request, env);

    return new Response("RYDEN_CORE_ONLINE");
  }
}
