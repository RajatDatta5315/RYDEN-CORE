// Reddit OAuth2 + Actions adapter for RYDEN

// ─────────────────────────────────────────────────────────
// Auth: Reddit uses OAuth2 with Authorization Code Flow
// ─────────────────────────────────────────────────────────
export async function handleRedditAuth(request: Request, env: any) {
  const state = Math.random().toString(36).substring(2);
  const scope = 'identity submit read';
  const redirectUri = encodeURIComponent(env.REDDIT_REDIRECT_URI || 'https://ryden.kryv.network/auth/reddit/callback');
  const authUrl = `https://www.reddit.com/api/v1/authorize?client_id=${env.REDDIT_CLIENT_ID}&response_type=code&state=${state}&redirect_uri=${redirectUri}&duration=permanent&scope=${scope}`;
  
  return Response.redirect(authUrl, 302);
}

export async function handleRedditCallback(request: Request, env: any) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  
  if (!code) {
    return new Response(JSON.stringify({ error: 'No code received from Reddit' }), { status: 400 });
  }

  const credentials = btoa(`${env.REDDIT_CLIENT_ID}:${env.REDDIT_CLIENT_SECRET}`);
  const redirectUri = env.REDDIT_REDIRECT_URI || 'https://ryden.kryv.network/auth/reddit/callback';

  const tokenRes = await fetch('https://www.reddit.com/api/v1/access_token', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': 'RYDEN/1.0 by KRYV_Network',
    },
    body: `grant_type=authorization_code&code=${code}&redirect_uri=${encodeURIComponent(redirectUri)}`,
  });

  const tokens: any = await tokenRes.json();
  
  if (!tokens.access_token) {
    return new Response(JSON.stringify({ error: 'Token exchange failed', details: tokens }), { status: 400 });
  }

  // Save tokens to KV (userId from state or default)
  if (env.KV) {
    await env.KV.put('reddit_access_token', tokens.access_token);
    if (tokens.refresh_token) {
      await env.KV.put('reddit_refresh_token', tokens.refresh_token);
    }
  }

  return new Response(JSON.stringify({ success: true, message: 'Reddit connected to RYDEN' }), {
    headers: { 'Content-Type': 'application/json' },
  });
}

// ─────────────────────────────────────────────────────────
// Get Reddit access token (from KV or refresh)
// ─────────────────────────────────────────────────────────
async function getRedditToken(env: any): Promise<string> {
  if (env.KV) {
    const token = await env.KV.get('reddit_access_token');
    if (token) return token;
  }
  // Fallback: app-only token (read-only, no user actions)
  const credentials = btoa(`${env.REDDIT_CLIENT_ID}:${env.REDDIT_CLIENT_SECRET}`);
  const res = await fetch('https://www.reddit.com/api/v1/access_token', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': 'RYDEN/1.0 by KRYV_Network',
    },
    body: 'grant_type=client_credentials',
  });
  const data: any = await res.json();
  return data.access_token || '';
}

// ─────────────────────────────────────────────────────────
// Get trending posts from a subreddit
// ─────────────────────────────────────────────────────────
export async function getTrendingDiscussions(subreddit: string, limit = 5) {
  const response = await fetch(`https://www.reddit.com/r/${subreddit}/hot.json?limit=${limit}`, {
    headers: { 'User-Agent': 'RYDEN/1.0 by KRYV_Network' }
  });
  const data: any = await response.json();
  return (data.data?.children || []).map((child: any) => ({
    id: child.data.name,
    title: child.data.title,
    text: child.data.selftext?.substring(0, 300) || '',
    url: child.data.url,
    score: child.data.score,
    subreddit: child.data.subreddit,
    permalink: `https://reddit.com${child.data.permalink}`,
  }));
}

// ─────────────────────────────────────────────────────────
// Generate smart reply using Groq
// ─────────────────────────────────────────────────────────
export async function generateSmartReply(postTitle: string, postText: string, env: any): Promise<string> {
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.GROQ_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [
        {
          role: 'system',
          content:
            'You write helpful, genuine Reddit comments. Sound like a knowledgeable human. Be insightful. No self-promotion unless it genuinely helps. Max 3 sentences.',
        },
        {
          role: 'user',
          content: `Post title: "${postTitle}"\nPost content: "${postText.substring(0, 500)}"\n\nWrite a helpful reply:`,
        },
      ],
    }),
  });
  const data: any = await res.json();
  return data.choices?.[0]?.message?.content?.trim() || '';
}

// ─────────────────────────────────────────────────────────
// Post a comment to Reddit
// ─────────────────────────────────────────────────────────
async function postRedditComment(thingId: string, text: string, env: any): Promise<any> {
  const token = await getRedditToken(env);
  const res = await fetch('https://oauth.reddit.com/api/comment', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': 'RYDEN/1.0 by KRYV_Network',
    },
    body: `api_type=json&thing_id=${thingId}&text=${encodeURIComponent(text)}`,
  });
  return await res.json();
}

// ─────────────────────────────────────────────────────────
// Submit a new post to Reddit
// ─────────────────────────────────────────────────────────
async function submitRedditPost(subreddit: string, title: string, text: string, env: any): Promise<any> {
  const token = await getRedditToken(env);
  const res = await fetch('https://oauth.reddit.com/api/submit', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': 'RYDEN/1.0 by KRYV_Network',
    },
    body: `api_type=json&sr=${subreddit}&kind=self&title=${encodeURIComponent(title)}&text=${encodeURIComponent(text)}`,
  });
  return await res.json();
}

// ─────────────────────────────────────────────────────────
// MAIN REDDIT ACTIONS ROUTER
// ─────────────────────────────────────────────────────────
export async function redditActions(request: Request, env: any) {
  const url = new URL(request.url);
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-RYDEN-APP-KEY',
    'Content-Type': 'application/json',
  };

  try {
    // GET trending from a subreddit
    if (url.pathname.includes('/trending')) {
      const subreddit = url.searchParams.get('subreddit') || 'programming';
      const data = await getTrendingDiscussions(subreddit);
      return new Response(JSON.stringify(data), { headers: corsHeaders });
    }

    // POST auto-reply to a post
    if (url.pathname.includes('/reply') && request.method === 'POST') {
      const body: any = await request.json();
      if (!body.post_id || !body.post_title) {
        return new Response(JSON.stringify({ error: 'post_id and post_title required' }), { status: 400, headers: corsHeaders });
      }
      const reply = body.reply_text || await generateSmartReply(body.post_title, body.post_text || '', env);
      const result = await postRedditComment(body.post_id, reply, env);
      return new Response(JSON.stringify({ status: 'REPLIED', reply, result }), { headers: corsHeaders });
    }

    // POST submit a new post
    if (url.pathname.includes('/submit') && request.method === 'POST') {
      const body: any = await request.json();
      if (!body.subreddit || !body.title || !body.text) {
        return new Response(JSON.stringify({ error: 'subreddit, title, and text required' }), { status: 400, headers: corsHeaders });
      }
      const result = await submitRedditPost(body.subreddit, body.title, body.text, env);
      return new Response(JSON.stringify({ status: 'SUBMITTED', result }), { headers: corsHeaders });
    }

    return new Response(JSON.stringify({ status: 'REDDIT_NODE_ACTIVE', routes: ['/trending', '/reply', '/submit'] }), { headers: corsHeaders });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
  }
}
