export const initiateXAuth = (userId: string) => {
  // Redirect to your backend which handles X OAuth2.0
  const backendUrl = "https://ryden-core.nehira.workers.dev/auth/x";
  window.location.href = `${backendUrl}?userId=${userId}`;
};

export const checkConnection = async (userId: string, platform: string) => {
  const response = await fetch(`https://ryden-core.nehira.workers.dev/api/v1/status?userId=${userId}&platform=${platform}`);
  return response.json();
};
