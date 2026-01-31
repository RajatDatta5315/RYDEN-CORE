// src/adapters/reddit.ts

export async function handleRedditAuth(request: Request, env: any) {
  return new Response("REDDIT_AUTH_INIT");
}

export async function handleRedditCallback(request: Request, env: any) {
  return new Response("REDDIT_CALLBACK_SUCCESS");
}

export async function redditActions(request: Request, env: any) {
  const url = new URL(request.url);
  if (url.pathname.includes("/trending")) {
    const data = await getTrendingDiscussions("programming");
    return new Response(JSON.stringify(data));
  }
  return new Response("REDDIT_NODE_ACTIVE");
}

export async function getTrendingDiscussions(subreddit: string) {
  const response = await fetch(`https://www.reddit.com/r/${subreddit}/hot.json?limit=5`);
  const data: any = await response.json();
  return data.data.children.map((child: any) => ({
    title: child.data.title,
    id: child.data.name,
    text: child.data.selftext.substring(0, 200)
  }));
}

export async function generateSmartReply(postTitle: string, postText: string, env: any) {
  const aiResponse = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { "Authorization": `Bearer ${env.GROQ_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "mixtral-8x7b-32768",
      messages: [{ role: "user", content: `Reply to: ${postTitle}` }]
    })
  });
  const result: any = await aiResponse.json();
  return result.choices[0].message.content;
}
