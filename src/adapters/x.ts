// src/adapters/x.ts
export async function xActions(request: Request, env: any) {
  const url = new URL(request.url);
  
  if (url.pathname === "/api/v1/x/automate") {
    // 1. Get Strategy from Groq
    const aiResponse = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { 
        "Authorization": `Bearer ${env.GROQ_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "mixtral-8x7b-32768",
        messages: [{ role: "user", content: "Analyze current tech trends and write a high-engagement strategic tweet for an AI agency. No hashtags, max 200 chars." }]
      })
    });
    
    const aiData: any = await aiResponse.json();
    const strategyPost = aiData.choices[0].message.content;

    // 2. Post to X
    const xResponse = await fetch("https://api.twitter.com/2/tweets", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${env.X_BEARER_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ text: strategyPost }),
    });

    return new Response(JSON.stringify(await xResponse.json()));
  }
}
