# Dashboard SSR regression fixture

Run from apps/web with the existing Node runtime:

```powershell
node node_modules/next/dist/bin/next dev tests/ssr-dashboard -p 4321 -H 127.0.0.1
# Separate terminal, same directory:
node tests/ssr-dashboard/probe.mjs
```

Uses the real dashboard and Next 16.3.3/RSC rendering; excludes the authenticated layout/proxy and injects a test-only API module. This is NOT a login bypass in the app: it is a separate test project on loopback 4321, not deployed, with no Supabase client, credential, database or Maps/Routes. Keep the real local API on 3002 stopped for the native connection-refused case. Probe exercises refused connection, HTTP 401/503 and reload, never production. No package install or framework replacement.

Original native fetch Error props reproduced HTTP 500 and `frame.join is not a function`. Plain failure state must render HTTP 200, five honest notices and no invented empty data. Fixture uses original component CSS/colors, with Arial fallback instead of downloading Geist; screenshot is not complete app-shell parity or authenticated acceptance. No route-review/quotation actions should be clicked here.
