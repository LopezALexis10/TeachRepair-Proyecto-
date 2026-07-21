import { awsConfig } from "../config";

export function decodeJwt(token) {
  const payload = token.split(".")[1];
  const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
  const json = decodeURIComponent(
    atob(normalized)
      .split("")
      .map((char) => `%${`00${char.charCodeAt(0).toString(16)}`.slice(-2)}`)
      .join("")
  );
  return JSON.parse(json);
}

export async function signIn(email, password) {
  const endpoint = `https://cognito-idp.${awsConfig.region}.amazonaws.com/`;
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-amz-json-1.1",
      "X-Amz-Target": "AWSCognitoIdentityProviderService.InitiateAuth",
    },
    body: JSON.stringify({
      AuthFlow: "USER_PASSWORD_AUTH",
      ClientId: awsConfig.userPoolClientId,
      AuthParameters: {
        USERNAME: email,
        PASSWORD: password,
      },
    }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || data.__type || "No se pudo iniciar sesion");
  }

  const idToken = data.AuthenticationResult.IdToken;
  const accessToken = data.AuthenticationResult.AccessToken;
  const claims = decodeJwt(idToken);
  const session = {
    idToken,
    accessToken,
    usuarioId: claims.sub,
    email: claims.email,
    nombre: claims.name || claims.email,
    groups: claims["cognito:groups"] || [],
  };
  localStorage.setItem("techrepairSession", JSON.stringify(session));
  return session;
}

export function getStoredSession() {
  const raw = localStorage.getItem("techrepairSession");
  return raw ? JSON.parse(raw) : null;
}

export function signOut() {
  localStorage.removeItem("techrepairSession");
}
