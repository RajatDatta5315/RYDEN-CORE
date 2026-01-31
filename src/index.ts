// src/index.ts (BACKEND - Full Code)
import { handleAuth, handleCallback, getTrendingDiscussions, generateSmartReply, postComment } from './adapters/reddit';
import { createKey, verifyKey } from './auth/keyManager';

export default {
  async fetch(request: Request, env: any) {
    const url = new URL(request.url);
    const method = request.method;

    // CORS Headers for Frontend
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, X-RYDEN-KEY",
    };

    if (method === "OPTIONS") return new Response(null, { headers: corsHeaders });

    // --- ROUTE: Key Management ---
    if (url.pathname === "/api/v1/keys/create" && method === "POST") {
      return createKey(request, env);
    }

    // --- ROUTE: Reddit Auth ---
    if (url.pathname === "/auth/reddit") return handleAuth(request, env);
    if (url.pathname === "/auth/reddit/callback") return handleCallback(request, env);

    // --- ROUTE: Brain Trigger (The Auto-Engage Node) ---
    if (url.pathname === "/api/v1/auto-engage" && method === "POST") {
      const clientKey = request.headers.get("X-RYDEN-KEY");
      if (!clientKey || !await verifyKey(clientKey, env)) {
        return new Response("Unauthorized Key", { status: 401 });
      }

      const { subreddit, clerk_id } = await request.json();

      try {
        // 1. Fetch Trending Posts
        const trends = await getTrendingDiscussions(subreddit);
        const topPost = trends[0];

        // 2. AI decides the reply
        const smartReply = await generateSmartReply(topPost.title, topPost.text, env);

        // 3. Get user's token from DB and post
        // Note: For now, it logs the action. Actual post needs the Reddit Client ID.
        console.log(`RYDEN acting on post: ${topPost.title}`);
        console.log(`Generated Intelligence: ${smartReply}`);

        return new Response(JSON.stringify({
          status: "SUCCESS",
          action: "COMMENT_GENERATED",
          target: topPost.url,
          preview: smartReply
        }), { headers: corsHeaders });

      } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
      }
    }

    return new Response("RYDEN_CORE_v1.2_ACTIVE", { headers: corsHeaders });
  }
};
