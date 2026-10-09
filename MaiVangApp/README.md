# MaiCare Expo app

MaiCare supports deploy and local Django gateways. The mobile app talks only to the Django URL configured in **Tài khoản → Máy chủ**; it never connects directly to RAG or YOLO. The preview build gets its deploy default from `EXPO_PUBLIC_API_BASE_URL`, while a saved runtime override can be changed without rebuilding.

## LOCAL BACKEND CONNECTION

1. Install unchanged frontend dependencies once with `npm ci`.
2. Start a teammate's Django server on `0.0.0.0:8000` and keep the phone and backend PC on the same LAN.
3. Run `npx expo start --clear --lan`.
4. In **Tài khoản → Máy chủ**, choose **Máy chủ cục bộ**, enter `http://<BACKEND_PC_IP>:8000`, test the connection, and save.
5. Log in and test chat, history, and image diagnosis. Changing the address clears backend-bound authentication and history state, so credentials never cross servers.

For the bundled developer launcher, `npm run local:start` detects the active LAN address, prepares a runtime SQLite database and Python environment outside both backend repositories, starts Django, writes ignored `.env.local`, and starts Expo. `npm run local:start -- --NoExpo` starts only the backend gateway. `npm run local:check` reports health; `npm run local:stop` stops only task-owned processes.

Real local RAG/YOLO is used when already available. Alternatively, backend developers may provide `FASTAPI_CHAT_URL`, `FASTAPI_IMAGE_CHAT_URL`, and `YOLO_API_URL` (plus any required key) in the launching process environment so local Django uses valid upstream services. If neither local nor upstream AI is configured, Django still starts for auth/history and reports AI as degraded; the tooling never fabricates inference.
