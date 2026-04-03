# Tech Community API

Netlify Functions backend for the Tech Community platform.

## What It Does

- serves live community stats
- stores intents, contact messages, and activity logs
- provides admin dashboard endpoints
- sends contact email to me
- uses SQLite stored at `/tmp/tech-community.sqlite` by default on Netlify

## Endpoints

- `GET /.netlify/functions/live-data`
- `GET / POST /.netlify/functions/activity-log`
- `GET / POST /.netlify/functions/intent-submit`
- `GET / POST /.netlify/functions/contact-submit`
- `GET /.netlify/functions/admin-dashboard`
- `GET /.netlify/functions/admin-activities`

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

## Local Notes

The functions are written for Netlify. If you test locally on Windows, set `TECH_COMMUNITY_DB_PATH` to a writable temp file path.

## Frontend Integration

The admin console at `docs/admin.html` accepts an API base URL and admin token. It defaults to `/.netlify/functions`.
