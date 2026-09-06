# Final deployed API contract

Verified 2026-09-05 from deployed OpenAPI and runtime behavior. Frontend integration follows the deployed contract first.

## Services and authentication

| Service | Base URL | Authentication |
|---|---|---|
| Django | `https://chat-bot-maivang-backend.onrender.com` | JWT access token as `Authorization: Bearer <access>` on protected operations |
| Chat | `https://chat-service-nckh.onrender.com` | none |

Django paths require their trailing slash. Chat-service paths do not. Neither service documents pagination for frontend-relevant lists. The Django history list returns a JSON array.

## Django account operations

| Method/path | Auth | Request | Success | Relevant errors |
|---|---|---|---|---|
| `POST /api/v1/user/register/` | no | JSON/form: required `username`, `name`, `email`, `password` | 201: `id`, `username`, `name`, `email` | 400 field arrays for uniqueness, email, username, or password validation |
| `POST /api/v1/user/login/` | no | required `username`, `password` | 200: `access`, `refresh` | 400 when malformed; 401 for invalid credentials |
| `POST /api/v1/user/login/refresh/` | no | required `refresh` | 200: new `access` | 401 for invalid/expired refresh |
| `GET /api/v1/user/me/` | bearer | none | 200: `id`, `username`, `name`, `email`, `is_staff`, `date_joined` | 401 |
| `PUT /api/v1/user/me/` | bearer | required `name`, `email`; schema also exposes `date_joined` | 200 account DTO | 400, 401 |
| `PATCH /api/v1/user/me/` | bearer | optional `name`, `email`, `date_joined` | 200 account DTO | 400, 401 |
| `DELETE /api/v1/user/me/` | bearer | none | 204, no body | 401 |
| `POST /api/v1/user/logout/` | no bearer required by deployed schema | required `refresh` | 200, no documented body | 400 for invalid input |

Passwords are write-only. The frontend stores only access/refresh tokens, using SecureStore on native and browser storage on web.

## Django history and assistant operations

| Method/path | Content type | Request | Success |
|---|---|---|---|
| `GET /api/v1/history/` | none | optional query `search` | array of `id`, `title`, `created_at`, `updated_at` |
| `POST /api/v1/history/` | JSON, form, or multipart | optional `title` (max 255) | 201 history item |
| `GET /api/v1/history/{id}/` | none | numeric path `id` | history item plus ordered `messages[]` |
| `PUT/PATCH /api/v1/history/{id}/` | JSON/form/multipart | `title` | updated history |
| `DELETE /api/v1/history/{id}/` | none | numeric path `id` | 204 |
| `POST /api/v1/history/{id}/chat/` | JSON preferred | required nonblank `question` | `question`, `answer`, `history_id` |
| `POST /api/v1/history/{id}/chat/image/` | `multipart/form-data` | required binary field `image`; optional string `question` | `question`, `answer`, `history_id`, `detections[]` |

All operations above require bearer authentication. History IDs are owner-filtered: another account receives no access to the session. One history item is one conversation; messages are children with `id`, `role` (`user` or `assistant`), `content`, and `created_at`. List ordering is newest `updated_at` first in source/runtime.

For image-only requests the frontend omits `question`. Django substitutes its own analysis prompt. The frontend never sets a multipart boundary. Browser requests append a real Blob/File with the original filename; native requests append `{ uri, name, type }`.

No request-size limit or accepted image-type list is documented. Django uses DRF `ImageField`; invalid files return validation errors. Runtime errors observed/supported by source include 400/401/404 and upstream 502/503/504. POST requests are not automatically retried.

### Persistence semantics

Django persists the question and answer as messages in the existing session. It does not persist the uploaded image or `detections`. MaiCare therefore keeps only the missing image metadata/file in a versioned, user-scoped local fallback after a successful server response:

- native: copied application document file plus JSON metadata;
- web: IndexedDB Blob plus small localStorage metadata.

It never duplicates server messages and never stores a transient object URL. Object URLs created for display are revoked.

Current Django source writes the user message before calling the downstream chat service. A failed follow-up can therefore leave an unmatched user message. The API has no individual-message delete operation, so the frontend cannot roll it back. For a failed first request, MaiCare deletes the newly created empty/session attempt.

## Chat service

| Method/path | Content type | Request | Success |
|---|---|---|---|
| `GET /` | none | none | service status object |
| `POST /chat` | `application/json` | required `question`; optional `history[]` default `[]`, each with required `role`, `content` | required string `answer` |
| `POST /chat/image` | `application/x-www-form-urlencoded` | optional `question` default `""`; optional JSON-string `history` default `"[]"`; optional JSON-string `detections` default `"[]"` | runtime object with `answer`, `detections` |

The frontend does not upload images directly to chat-service `/chat/image`. Django performs detection, then forwards form-encoded detector data to that operation. Sending image bytes directly there would violate the deployed contract.

The chat service returns 422 for invalid JSON request shape on `/chat`; its image-form parser returns 400 for invalid JSON strings. No annotated image and no overall confidence field exist. Detection items returned through Django contain `name` and per-detection `confidence`.

## Diseases

`GET /api/v1/diseases/` (optional `search`) and `GET /api/v1/diseases/{id}/` are bearer-protected and return disease DTOs (`id`, `name`, `infor`, optional `prompt`, optional `img_ex`). They are not required by the current result flow and are not called.

## Verified discrepancies

- Earlier local documentation incorrectly described chat-service `/chat/image` as accepting a binary `image`. Deployed OpenAPI and current source show only form fields `question`, `history`, and `detections`.
- The Django OpenAPI response schemas for both chat actions are intentionally untyped generic objects. Runtime/current source establish the response keys documented above.
- Deployed Django image diagnosis is operational, unlike the earlier local checkout state. The fetched `origin/main` implementation matches the deployed orchestration.
- Neither deployed service allows the tested localhost web origin through CORS. The frontend-owned development bridge is required for React Native Web development only.
