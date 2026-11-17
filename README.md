# Shrink

A URL shortener built with Next.js, Drizzle ORM and Neon Postgres.

- Sign up / log in (cookie session), with user and admin roles
- Users create short links (random code or custom alias), copy and delete them, and see click counts
- Admins see all users and all links
- Public redirect: `GET /{slug}` → target URL (307, counts the click)

## Setup

Create `.env.local` with `DATABASE_URL`, `DATABASE_URL_UNPOOLED` (Neon) and `SESSION_SECRET`, then:

```bash
npm install
npx drizzle-kit push   # create/update tables
npm run dev
```
