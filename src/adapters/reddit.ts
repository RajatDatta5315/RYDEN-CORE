// src/adapters/reddit.ts

// 1. Trending Posts ko Read karna
export async function getTrendingDiscussions(subreddit: string) {
  const response = await fetch(`https://www.reddit.com/r/${subreddit}/hot.json?limit=10`);
  const data: any = await response.json();
  return data.data.children.map((child: any) => ({
    title: child.data.title,
    id: child.data.name,
    text: child.data.selftext.substring(0, 500),
    url: child.data.url
  }));
}

// 2. Intelligence: Kya reply dena chahiye?
export async function generateSmartReply(postTitle: string, postText: string, env: any) {
  const prompt = `You are RYDEN, a smart, witty AI agent. 
  Post Title: ${postTitle}
  Post Content: ${postText}
  Task: Write a short, high-value, and engaging comment for this Reddit post. Don't sound like a bot. Be human-like and insightful.`;

  const aiResponse = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${env.OPENROUTER_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: "google/gemini-2.0-flash-lite-preview-02-05:free",
      messages: [{ role: "user", content: prompt }]
    })
  });

  const result: any = await aiResponse.json();
  return result.choices[0].message.content;
}

// 3. Action: Post the Reply (Iske liye Token chahiye hoga jo OAuth se aayega)
export async function postComment(parentId: string, text: string, accessToken: string) {
  return await fetch("https://oauth.reddit.com/api/comment", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${accessToken}`,
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": "RYDEN-Bot/1.0"
    },
    body: new URLSearchParams({
      api_type: "json",
      text: text,
      thing_id: parentId
    })
  });
}
