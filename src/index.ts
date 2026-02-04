// src/index.ts (BACKEND - FULL VERSION)
import { handleRedditAuth, handleRedditCallback, redditActions } from './adapters/reddit';
import { xActions } from './adapters/x';
import { verifyAppKey } from './auth/keyManager';
import { handleTelegramAction } from './adapters/telegram';

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

    try {
      // 🚦 MODULAR ROUTING SYSTEM
      
      // REDDIT ROUTES
      if (url.pathname.startsWith("/auth/reddit")) {
        if (url.pathname === "/auth/reddit") return handleRedditAuth(request, env);
        return handleRedditCallback(request, env);
      }

      // X (TWITTER) ROUTES
      if (url.pathname.startsWith("/api/v1/x")) {
        return xActions(request, env);
      }

      // TELEGRAM & AUTOMATION ROUTES
      if (url.pathname === "/api/automate") {
        const body: any = await request.json();
        const { userId, platform, action, payload } = body; // Included payload
  
        if (platform === "telegram") {
          const result = await handleTelegramAction(userId, action, env, payload);
          return new Response(JSON.stringify(result), { 
            headers: { ...corsHeaders, "Content-Type": "application/json" } 
          });
        }
      }

      return new Response("RYDEN_MASTER_SYSTEM_v2.0_ONLINE", { headers: corsHeaders });
    } catch (err: any) {
      return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
    }
  }
};
