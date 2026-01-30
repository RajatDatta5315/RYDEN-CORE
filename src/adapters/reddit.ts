export async function handleAuth(request: Request, env: any) {
  const url = new URL(request.url);
  const clerk_id = url.searchParams.get("clerk_id");
  
  if (!clerk_id) return new Response("Missing Clerk ID", { status: 400 });

  const redditAuthUrl = `https://www.reddit.com/api/v1/authorize?client_id=${env.REDDIT_CLIENT_ID}&response_type=code&state=${clerk_id}&redirect_uri=${env.REDIRECT_URI}&duration=permanent&scope=submit,identity`;
  
  return Response.redirect(redditAuthUrl);
}

export async function handleCallback(request: Request, env: any) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const clerk_id = url.searchParams.get("state");

  // Code exchange logic will go here
  return new Response(`Reddit Linked for User: ${clerk_id}. Setup Complete.`);
}
