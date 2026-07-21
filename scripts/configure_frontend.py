import argparse
from pathlib import Path


def main():
    parser = argparse.ArgumentParser(description="Actualiza frontend/src/config.js con los outputs de AWS.")
    parser.add_argument("--region", default="us-east-1")
    parser.add_argument("--user-pool-id", required=True)
    parser.add_argument("--user-pool-client-id", required=True)
    parser.add_argument("--http-api-url", required=True)
    parser.add_argument("--websocket-url", required=True)
    args = parser.parse_args()

    config = f'''export const awsConfig = {{
  region: "{args.region}",
  userPoolId: "{args.user_pool_id}",
  userPoolClientId: "{args.user_pool_client_id}",
  httpApiUrl: "{args.http_api_url.rstrip("/")}",
  webSocketUrl: "{args.websocket_url.rstrip("/")}",
}};
'''
    path = Path(__file__).resolve().parents[1] / "frontend" / "src" / "config.js"
    path.write_text(config, encoding="utf-8")
    print(f"Configuracion actualizada en {path}")


if __name__ == "__main__":
    main()
