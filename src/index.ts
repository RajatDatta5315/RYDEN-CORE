// ryden-core/src/index.ts
export default {
  async fetch(request: Request, env: any) {
    const url = new URL(request.url);
    const method = request.method;

    // --- 1. REDDIT OAUTH REDIRECT ---
    if (url.pathname === "/auth/reddit") {
      const state = url.searchParams.get("clerk_id"); // Passing Clerk ID to track user
      const redditAuthUrl = `https://www.reddit.com/api/v1/authorize?client_id=${env.REDDIT_CLIENT_ID}&response_type=code&state=${state}&redirect_uri=${env.REDIRECT_URI}&duration=permanent&scope=submit,identity,edit`;
      return Response.redirect(redditAuthUrl);
    }

    // --- 2. OAUTH CALLBACK (Handling Code from Reddit) ---
    if (url.pathname === "/auth/reddit/callback") {
      const code = url.searchParams.get("code");
      const clerk_id = url.searchParams.get("state");

      // Exchange code for Access Token
      const tokenResponse = await fetch("https://www.reddit.com/api/v1/access_token", {
        method: "POST",
        headers: {
          "Authorization": `Basic ${btoa(env.REDDIT_CLIENT_ID + ":" + env.REDDIT_CLIENT_SECRET)}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: `grant_type=authorization_code&code=${code}&redirect_uri=${env.REDIRECT_URI}`,
      });

      const tokens: any = await tokenResponse.json();

      // SAVE TO NEON DB (Using fetch to Neon HTTP API or your DB proxy)
      await fetch(`${env.DB_HTTP_URL}/execute`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${env.DB_API_KEY}` },
        body: JSON.stringify({
          sql: "INSERT INTO users_config (clerk_id, reddit_access_token, reddit_refresh_token) VALUES ($1, $2, $3) ON CONFLICT (clerk_id) DO UPDATE SET reddit_access_token = $2, reddit_refresh_token = $3",
          params: [clerk_id, tokens.access_token, tokens.refresh_token]
        })
      });

      return new Response("REDDIT_CONNECTED_RYDEN_ACTIVE. Close this tab.");
    }

    // --- 3. EXECUTE ACTION (For MINDEN/External Tools) ---
    if (url.pathname === "/api/v1/execute" && method === "POST") {
      const clientKey = request.headers.get("X-RYDEN-KEY");
      
      // Verification Logic
      // 1. Hash clientKey
      // 2. Query Neon DB to find which clerk_id owns this key
      // 3. Get that user's Reddit Token
      // 4. Call OpenRouter -> Post to Reddit
      
      return new Response(JSON.stringify({ status: "Processing" }));
    }

    return new Response("RYDEN_CORE_v1_READY");
  }
};
