# Tech Community API

Netlify Functions backend for the Tech Community platform.

## What It Does

- serves live community stats
- stores intents, contact messages, and activity logs
- provides admin dashboard endpoints
- sends contact email to me
- uses legacy SQLite stored at `/tmp/tech-community.sqlite` by default for local/backward-compatible mode
- can persist activity documents through ConnectWBT collections when explicitly enabled

## Endpoints

- `GET /.netlify/functions/live-data`
- `GET / POST /.netlify/functions/activity-log`
- `GET / POST /.netlify/functions/intent-submit`
- `GET / POST /.netlify/functions/contact-submit`
- `GET /.netlify/functions/admin-dashboard`
- `GET /.netlify/functions/admin-activities`
- `GET /.netlify/functions/me` authenticated through ConnectWBT

## Environment Variables

- `ADMIN_TOKEN` or `TECH_COMMUNITY_ADMIN_TOKEN`
- `TECH_COMMUNITY_DB_PATH` to override the SQLite path
- `OUTLOOK_SMTP_HOST` default `smtp.office365.com`
- `OUTLOOK_SMTP_PORT` default `587`
- `OUTLOOK_SMTP_SECURE` default `false`
- `OUTLOOK_SMTP_USER` default me
- `OUTLOOK_SMTP_PASS`
- `MAIL_TO` default `my emai`
- `MAIL_FROM` optional sender override
- `CORS_ORIGIN` optional CORS origin override
- `COMMUNITY_PERSISTENCE=legacy` or `connectwbt`
- `CONNECTWBT_BASE_URL` default `https://connectwbt.netlify.app`
- `CONNECTWBT_API_TOKEN` server-side bearer/API token used only by the persistence adapter
- `CONNECTWBT_PROJECT_ID` default `eruditewbt-tech-community`
- `CONNECTWBT_TIMEOUT_MS` request timeout for ConnectWBT persistence/auth calls

## Local Notes

The functions are written for Netlify. If you test locally on Windows, set `TECH_COMMUNITY_DB_PATH` to a writable temp file path. The default persistence mode remains `legacy`; set `COMMUNITY_PERSISTENCE=connectwbt` only after the ConnectWBT project and collection permissions are provisioned.

ConnectWBT mode stores activity documents through the project collection API. It does not place Firebase private keys in this repository or in Netlify functions.

## Frontend Integration

The admin console at `docs/admin.html` accepts an API base URL and admin token. It defaults to `/.netlify/functions`.
