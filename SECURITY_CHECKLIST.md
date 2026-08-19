# Production security checklist

- Set `NODE_ENV=production`.
- Set strong, unique production database credentials.
- Set a long random `JWT_SECRET`; changing it invalidates existing tokens.
- Set `FRONTEND_URL` to the exact HTTPS frontend origin.
- Set `VITE_API_URL` and `VITE_SOCKET_URL` to HTTPS production endpoints.
- Keep `TRUST_PROXY_HOPS=0` without a reverse proxy. Set it to the exact number
  of trusted proxy hops documented by the hosting platform (commonly `1`, but
  verify this with the provider).
- Terminate TLS at the hosting platform or a correctly configured reverse proxy.
- Never commit `.env` files or expose secrets through `VITE_*` variables.
- Run `npm audit` in both `backend` and `frontend` before deployment.
- Rotate any secret that has ever been committed or otherwise exposed.
