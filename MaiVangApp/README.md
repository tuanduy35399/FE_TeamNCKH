# MaiCare Expo app

MaiCare reads its Django gateway from `EXPO_PUBLIC_API_BASE_URL` in `.env` (or the build environment). The app never connects directly to RAG or YOLO and has no server configuration step in the product UI. Previously saved server overrides are ignored. When the configured gateway changes, backend-bound authentication and history state are cleared.

## LOCAL BACKEND CONNECTION

1. Install unchanged frontend dependencies once with `npm ci`.
2. Start a teammate's Django server on `0.0.0.0:8000` and keep the phone and backend PC on the same LAN.
3. Copy `.env.example` to `.env` and set `EXPO_PUBLIC_API_BASE_URL=http://<BACKEND_PC_IP>:8000`.
4. Run `npx expo start --clear --lan`, then log in and test chat, history, and image diagnosis.
5. After changing the env value, restart Expo. For deployed web or native builds, rebuild and redeploy the app. Missing or invalid configuration shows an unavailable screen instead of asking users for a server address.

For the bundled developer launcher, `npm run local:start` detects the active LAN address, prepares a runtime SQLite database and Python environment outside both backend repositories, starts Django, writes ignored `.env.local`, and starts Expo. `npm run local:start -- --NoExpo` starts only the backend gateway. `npm run local:check` reports health; `npm run local:stop` stops only task-owned processes.

Real local RAG/YOLO is used when already available. Alternatively, backend developers may provide `FASTAPI_CHAT_URL`, `FASTAPI_IMAGE_CHAT_URL`, and `YOLO_API_URL` (plus any required key) in the launching process environment so local Django uses valid upstream services. If neither local nor upstream AI is configured, Django still starts for auth/history and reports AI as degraded; the tooling never fabricates inference.
