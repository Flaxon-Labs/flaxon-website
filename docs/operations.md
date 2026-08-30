# Operations

## Browser smoke test

Start the app, install the browser runtime once, and run the production-site
contract check:

```powershell
pip install playwright
python -m playwright install chromium
$env:FLAXON_ADMIN_PASSWORD = "your-local-password"
python scripts/browser_smoke.py
```

The check validates public navigation, CSRF presence on Admin login, Admin
authentication, dashboard navigation, and CMS reachability. Override
`FLAXON_BROWSER_BASE_URL` for staging or a deployed preview.
