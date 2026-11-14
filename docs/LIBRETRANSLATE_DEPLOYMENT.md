# ApplyVise AI — LibreTranslate Deployment Guide

## 1. Deployment Architecture

LibreTranslate is deployed as a self-hosted, containerized microservice alongside ApplyVise backend services. It is **never** executed inside serverless edge runtimes (e.g. Cloudflare Workers), which are strictly reserved for low-latency routing, asset distribution, and database operations.

```text
[ ApplyVise Web / Mobile ]
           │
           ▼
[ Express / Worker Gateway ] ── (SHA-256 Cache) ── [ Redis / SQLite Memory ]
           │ (Cache Miss)
           ▼
[ Self-Hosted LibreTranslate ] ── [ Argos Translate Models (Offline PyTorch) ]
```

---

## 2. Docker Compose Deployment

The service is configured in [`docker-compose.libretranslate.yml`](file:///d:/ANtigravity/applywise%20AI/docker-compose.libretranslate.yml).

### Starting the Service:
```bash
docker compose -f docker-compose.libretranslate.yml up -d
```

### Preloaded Language Models:
To eliminate cold-start download latencies, the service preloads:
`en,hi,bn,mr,ta,te,kn,ml,gu,pa,ur,or,ne,ar,fr,de,es,pt,it,nl,ja,ko,zh,id,ms,th,vi,ru,tr`

### Health Check Endpoint:
```bash
curl http://localhost:5000/languages
```

---

## 3. Environment Variables

| Variable | Default | Purpose |
| :--- | :--- | :--- |
| `LIBRETRANSLATE_URL` | `http://localhost:5000` | Host URL of self-hosted LibreTranslate container |
| `LIBRETRANSLATE_API_KEY` | *(optional)* | Secret token if LibreTranslate requires authentication |
| `TRANSLATION_CACHE_TTL_MS` | `604800000` (7 days) | Cache expiration time |

---

## 4. Rate Limiting & Resource Bounds
- **Character Limit:** 10,000 characters per single request.
- **Request Timeout:** 6,000 ms before triggering graceful circuit breaker.
- **Retry Policy:** Single immediate retry on network reset, followed by fallback to original text.
