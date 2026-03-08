import CryptoJS from 'crypto-js';

// ─────────────────────────────────────────────────────────
// OAuth 1.0a Signature Builder for X (Twitter) API v2
// Bearer Token = read-only. For posting tweets we need OAuth 1.0a.
// ─────────────────────────────────────────────────────────
function buildOAuth1Header(
  method: string,
  url: string,
  params: Record<string, string>,
  env: any
): string {
  const oauthParams: Record<string, string> = {
    oauth_consumer_key: env.X_API_KEY,
    oauth_nonce: Math.random().toString(36).substring(2) + Date.now().toString(36),
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
    oauth_token: env.X_ACCESS_TOKEN,
    oauth_version: '1.0',
  };

  const allParams = { ...params, ...oauthParams };
  const sortedKeys = Object.keys(allParams).sort();
  const paramString = sortedKeys
    .map(k => `${encodeURIComponent(k)}=${encodeURIComponent(allParams[k])}`)
    .join('&');

  const signatureBase = [
    method.toUpperCase(),
    encodeURIComponent(url),
    encodeURIComponent(paramString),
  ].join('&');

  const signingKey = `${encodeURIComponent(env.X_API_SECRET)}&${encodeURIComponent(env.X_ACCESS_TOKEN_SECRET)}`;
  const signature = CryptoJS.HmacSHA1(signatureBase, signingKey).toString(CryptoJS.enc.Base64);

  oauthParams['oauth_signature'] = signature;

  return 'OAuth ' + Object.keys(oauthParams)
    .sort()
    .map(k => `${encodeURIComponent(k)}="${encodeURIComponent(oauthParams[k])}"`)
    .join(', ');
}

// ─────────────────────────────────────────────────────────
// Generate AI-powered tweet content using Groq
// ─────────────────────────────────────────────────────────
async function generateTweetContent(topic: string, env: any): Promise<string> {
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
            'You are RYDEN, a sharp AI agent. Write powerful tech/SaaS tweets. No hashtags. No emojis. No quotes. Just clean, punchy text under 280 chars.',
        },
        {
          role: 'user',
          content: topic
            ? `Write a tweet about: ${topic}`
            : 'Write a sharp, unique insight about AI, SaaS, or indie hacking.',
        },
      ],
    }),
  });
  const data: any = await res.json();
  return data.choices?.[0]?.message?.content?.trim() || 'RYDEN intelligence online.';
}

// ─────────────────────────────────────────────────────────
// Post Tweet using OAuth 1.0a (required for write operations)
// ─────────────────────────────────────────────────────────
async function postTweet(text: string, env: any): Promise<any> {
  const url = 'https://api.twitter.com/2/tweets';
  const body = JSON.stringify({ text });

  const authHeader = buildOAuth1Header('POST', url, {}, env);

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: authHeader,
      'Content-Type': 'application/json',
    },
    body,
  });

  const data: any = await res.json();
  return data;
}

// ─────────────────────────────────────────────────────────
// Reply to a tweet
// ─────────────────────────────────────────────────────────
async function replyToTweet(text: string, replyToId: string, env: any): Promise<any> {
  const url = 'https://api.twitter.com/2/tweets';
  const bodyObj = { text, reply: { in_reply_to_tweet_id: replyToId } };
  const body = JSON.stringify(bodyObj);

  const authHeader = buildOAuth1Header('POST', url, {}, env);

  const res = await fetch(url, {
    method: 'POST',
    headers: { Authorization: authHeader, 'Content-Type': 'application/json' },
    body,
  });

  return await res.json();
}

// ─────────────────────────────────────────────────────────
// MAIN X ACTIONS ROUTER
// ─────────────────────────────────────────────────────────
export async function xActions(request: Request, env: any) {
  const url = new URL(request.url);
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-RYDEN-APP-KEY',
    'Content-Type': 'application/json',
  };

  try {
    // POST /api/v1/x/post — generate + post a tweet
    if (url.pathname === '/api/v1/x/post' && request.method === 'POST') {
      const body: any = await request.json();
      const topic = body.topic || '';

      // Use provided text or generate via AI
      const tweetText = body.text || (await generateTweetContent(topic, env));
      const result = await postTweet(tweetText, env);

      if (result.data?.id) {
        return new Response(
          JSON.stringify({ status: 'POSTED', tweet: tweetText, id: result.data.id }),
          { headers: corsHeaders }
        );
      } else {
        return new Response(
          JSON.stringify({ status: 'FAILED', error: result, tweet: tweetText }),
          { status: 400, headers: corsHeaders }
        );
      }
    }

    // POST /api/v1/x/reply — reply to a tweet
    if (url.pathname === '/api/v1/x/reply' && request.method === 'POST') {
      const body: any = await request.json();
      if (!body.tweet_id || !body.text) {
        return new Response(JSON.stringify({ error: 'tweet_id and text required' }), { status: 400, headers: corsHeaders });
      }
      const result = await replyToTweet(body.text, body.tweet_id, env);
      return new Response(JSON.stringify({ status: 'REPLIED', result }), { headers: corsHeaders });
    }

    // POST /api/v1/x/auto — auto-generate + post based on schedule topic
    if (url.pathname === '/api/v1/x/auto' && request.method === 'POST') {
      const body: any = await request.json();
      const topics = body.topics || ['AI and the future of work', 'SaaS growth tactics', 'Indie hacking tips'];
      const topic = topics[Math.floor(Math.random() * topics.length)];
      const tweetText = await generateTweetContent(topic, env);
      const result = await postTweet(tweetText, env);
      return new Response(
        JSON.stringify({ status: result.data?.id ? 'POSTED' : 'FAILED', topic, tweet: tweetText, result }),
        { headers: corsHeaders }
      );
    }

    return new Response(JSON.stringify({ status: 'X_NODE_ACTIVE', routes: ['/api/v1/x/post', '/api/v1/x/reply', '/api/v1/x/auto'] }), { headers: corsHeaders });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
  }
}
