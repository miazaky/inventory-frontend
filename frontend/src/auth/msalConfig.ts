export const authConfig = {
  clientId: import.meta.env.VITE_AZURE_CLIENT_ID as string,
  tenantId: import.meta.env.VITE_AZURE_TENANT_ID as string,
  redirectUri: window.location.origin,
};

export function getAuthUrl(): string {
  const params = new URLSearchParams({
    client_id: authConfig.clientId,
    response_type: "token",
    response_mode: "fragment",
    scope: "openid profile email User.Read",
    redirect_uri: authConfig.redirectUri,
    nonce: Math.random().toString(36).slice(2),
  });
  return `https://login.microsoftonline.com/${authConfig.tenantId}/oauth2/v2.0/authorize?${params}`;
}

export function parseTokenFromHash(): string | null {
  const hash = window.location.hash.substring(1);
  const params = new URLSearchParams(hash);
  return params.get("access_token");
}

export function parseEmailFromToken(token: string): string | null {
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    return payload.preferred_username || payload.email || payload.upn || null;
  } catch {
    return null;
  }
}
