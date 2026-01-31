// src/index.ts (BACKEND - ZERO TOUCH VERSION)
import { handleRedditAuth, handleRedditCallback, redditActions } from './adapters/reddit';
import { xActions } from './adapters/x';
import { verifyAppKey } from './auth/keyManager';

export default {
  async fetch(request: Request, env: any) {
    const url = new URL(request.url);
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, X-RYDEN-APP-KEY",
    };

    if (request.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

    // 🛡️ CENTRAL AUTH GATEWAY
    const appKey = request.headers.get("X-RYDEN-APP-KEY");
    const isPublicRoute = url.pathname.includes("/auth/");
    
    if (!isPublicRoute && (!appKey || !await verifyAppKey(appKey, env))) {
      return new Response(JSON.stringify({ error: "UNAUTHORIZED_ACCESS" }), { status: 401, headers: corsHeaders });
    }

    // 🚦 MODULAR ROUTING SYSTEM
    try {
      // REDDIT ROUTES
      if (url.pathname.startsWith("/auth/reddit")) {
        if (url.pathname === "/auth/reddit") return handleRedditAuth(request, env);
        return handleRedditCallback(request, env);
      }

      // X (TWITTER) ROUTES
      if (url.pathname.startsWith("/api/v1/x")) {
        return xActions(request, env);
      }

      // FUTURE PLATFORMS (LinkedIn/Insta) YAHAN ADD HONGE WITHOUT BREAKING OTHERS
      
      return new Response("RYDEN_MASTER_SYSTEM_v2.0_ONLINE", { headers: corsHeaders });
    } catch (err) {
      return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
    }
  }
};
