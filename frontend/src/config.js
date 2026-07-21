export const awsConfig = {
  region: import.meta.env.VITE_AWS_REGION || "us-east-1",
  userPoolId: import.meta.env.VITE_COGNITO_USER_POOL_ID || "us-east-1_LvhenGkVL",
  userPoolClientId: import.meta.env.VITE_COGNITO_CLIENT_ID || "69sernaht6guhjpg30cbvhnmn",
  httpApiUrl: import.meta.env.VITE_HTTP_API_URL || "https://5fi4xlq4h8.execute-api.us-east-1.amazonaws.com",
  webSocketUrl: import.meta.env.VITE_WEBSOCKET_URL || "wss://9lcc8pllpg.execute-api.us-east-1.amazonaws.com/prod",
};
