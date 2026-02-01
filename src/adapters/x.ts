export async function xActions(request: Request, env: any) {
  // 1. Identity Check
  const appKey = request.headers.get("X-RYDEN-APP-KEY");
  if (!appKey) return new Response("UNAUTHORIZED", { status: 401 });

  // 2. Intelligence (Groq API)
  const groqResponse = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${env.GROQ_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile", // Powerful model
      messages: [{ 
        role: "system", 
        content: "You are RYDEN, a futuristic AI agent. Write a sharp, unique tech strategy tweet. No hashtags. No emojis. Max 180 chars." 
      }]
    })
  });

  const aiData: any = await groqResponse.json();
  const tweetText = aiData.choices[0].message.content;

  // 3. Execution (Post to X)
  const xRes = await fetch("https://api.twitter.com/2/tweets", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${env.X_BEARER_TOKEN}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ text: tweetText })
  });

  return new Response(JSON.stringify({ status: "SENT", tweet: tweetText }));
}
