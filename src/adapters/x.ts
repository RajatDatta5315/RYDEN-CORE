// src/adapters/x.ts (BACKEND)
import { generateSmartReply } from './reddit'; // Reusing the AI brain logic

export async function postToX(text: string, env: any) {
  // Twitter API v2 Post Tweet endpoint
  const response = await fetch("https://api.twitter.com/2/tweets", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${env.X_BEARER_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ text: text }),
  });

  return response.json();
}

export async function autoEngageX(topic: string, env: any) {
  // Logic: Search for tweets -> Analyze -> Reply
  // Note: Twitter API search requires 'Basic' tier ($100/mo) or Free tier (Post only)
  console.log(`Searching X for topic: ${topic}`);
  
  const aiPost = await generateSmartReply("Trending on X", `Write a viral tweet about ${topic}`, env);
  return await postToX(aiPost, env);
}
