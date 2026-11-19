# Shrink

A URL shortener. Users sign up, turn long URLs into short links, and see how many times each link is clicked. Admins can see every user and every link.

**Stack:** Next.js 16 (App Router, Server Components, Server Actions, Cache Components) · React 19 · Tailwind CSS 4 · Prisma ORM · Neon Postgres · Redis (`ioredis`: redirect cache and login rate limiting) · `jose` (JWT session cookie) · TypeScript

> Read this first: Next.js 16 differs from older versions. Before changing framework-level code, check `node_modules/next/dist/docs/` (see `AGENTS.md`).

---

## 1. What the app does

| Who | Can do |
|---|---|
| Visitor (signed out) | See the landing page, sign up, log in (limited to a few failed attempts, see 2.5), and open any short link (`/{slug}`) |
| User | Create links (random code or custom alias), give them a name, edit, copy, delete, search/filter/sort, see click stats and a 14/30-day chart |
| Admin | See all users and all links, delete any link, deactivate users |
| Signed-in person | Cannot open `/`, `/login` or `/signup`; they are sent to their dashboard |

Admins are never created through sign-up. Every new account is a normal user; promote someone by changing `role` in the database.

---

## 2. High-level design (diagram)

### 2.1 System overview

```mermaid
flowchart LR
    subgraph Browser
      V[Visitor / User / Admin]
    end

    subgraph Next["Next.js app (Vercel or self-hosted)"]
      P["proxy.ts<br/>checks session cookie,<br/>redirects early"]
      PG["Pages (Server Components)<br/>/ · /login · /signup<br/>/dashboard · /dashboard/links<br/>/dashboard/links/[id] · /admin"]
      SA["Server Actions<br/>auth · links · users"]
      RT["Route /[slug]<br/>public redirect"]
      LIB["lib/<br/>dal · session · stats<br/>links · password · prisma<br/>redis · rate-limit"]
    end

    DB[("Neon Postgres<br/>users · links · link_clicks")]
    RD[("Redis<br/>link:{slug} cache<br/>rl:login:* counters")]

    V -->|every page request| P
    P --> PG
    V -->|forms / buttons| SA
    V -->|GET /abc1234| RT
    PG --> LIB
    SA --> LIB
    RT --> LIB
    LIB -->|"Prisma + pooled pg connection"| DB
    LIB -->|"ioredis (fails open)"| RD
```

### 2.2 What happens when someone opens a short link

```mermaid
sequenceDiagram
    participant B as Browser
    participant R as /[slug] route
    participant C as Redis
    participant D as Postgres
    B->>R: GET /abc1234
    R->>R: Validate slug format, skip reserved names
    R->>C: GET link:abc1234
    alt cache hit (about 5 ms)
        C-->>R: {id, url} or "null"
    else cache miss (or Redis down)
        R->>D: SELECT link WHERE slug = ? AND link active AND owner active
        D-->>R: id + target_url (or nothing)
        R->>C: SET link:abc1234 EX 3600 (found) or EX 60 ("null" = not found)
    end
    alt link found
        R-->>B: 307 redirect to target_url
        Note over R,D: after the response is sent:<br/>UPDATE links SET clicks = clicks + 1<br/>INSERT into link_clicks (for the chart)
    else not found / inactive
        R-->>B: 404
    end
```

The redirect itself never waits for a click to be written. If Redis is down, every Redis call is skipped and the route falls back to Postgres, so redirects keep working (just slower).

### 2.3 Login and access control

```mermaid
flowchart TD
    A[Request to /, /login, /signup, /dashboard, /admin] --> B{"proxy.ts: valid<br/>session cookie?"}
    B -->|no, protected page| L[Redirect to /login]
    B -->|yes, on / or /login or /signup| D[Redirect to /dashboard]
    B -->|otherwise| C[Page runs]
    C --> E["lib/dal.ts: load the user from the DB<br/>(must exist and be active)"]
    E -->|no such user| X["/login?expired=1"]
    E -->|role = admin on a user page| AD[Redirect to /admin]
    E -->|role = user on /admin| UD[Redirect to /dashboard]
    E -->|allowed| OK[Render the page]
```

The proxy only does a cheap check of the cookie's signature and expiry (no database). The real authorization, including the user's current role and active flag, happens in `lib/dal.ts` on every request.

### 2.4 Database

```mermaid
erDiagram
    users ||--o{ links : owns
    links ||--o{ link_clicks : "has one row per click"

    users {
        uuid id PK
        text username "unique, case-insensitive"
        text email "unique, case-insensitive"
        text password_hash "scrypt, never plain text"
        enum role "user or admin"
        bool is_active "false = soft-deleted"
        timestamptz created_at
    }
    links {
        uuid id PK
        uuid user_id FK
        text name "optional label"
        text slug "short code, unique"
        text target_url
        int clicks "fast total"
        bool is_active "false = soft-deleted"
        timestamptz created_at
    }
    link_clicks {
        uuid id PK
        uuid link_id FK
        timestamptz clicked_at
    }
```

### 2.5 Redis: redirect cache and login rate limiting

Redis is used for two things. Both **fail open**: if Redis is unreachable the app logs the error and carries on using Postgres (or, for rate limiting, allows the login).

**a) Redirect cache (cache-aside)** in `app/[slug]/route.ts`

| Item | Value |
|---|---|
| Key | `link:{slug}` (slugs are case-sensitive, so the key is not lowercased) |
| Value | `{"id":"…","url":"…"}` for a live link, or the string `"null"` for "no such link" |
| TTL | 3600 s for a found link, 60 s for a not-found marker (stops bad URLs from hitting the database) |
| What is cached | Only the lookup (slug to id and URL). The click is still counted in Postgres, so dashboards stay exact |
| Hit speed | about 4–7 ms, against about 1 s for a cold miss on the dev server |

**Invalidation.** A cached entry would keep working until its TTL ends, so every write that changes where a slug goes deletes its key:

| Action | Keys deleted |
|---|---|
| `createLink` | `link:{slug}` (clears a cached "not found" marker for that slug) |
| `updateLink` | `link:{new alias}` always (also when only the destination changed) and `link:{old alias}` when the alias changed |
| `deleteLink` | `link:{slug}` |
| `deactivateUser` | `link:{slug}` for every link the user owns |

Any new code that changes `slug`, `target_url`, `is_active` of a link or the owner's `is_active` must delete the key too. The 1-hour TTL is only a safety net.

**b) Login rate limiting** in the `login` action (`app/actions/auth.ts`) using `lib/rate-limit.ts`

Only **failed** attempts count, in a 15-minute window that starts at the first failure.

| Key | Limit | Protects against |
|---|---|---|
| `rl:login:pair:{ip}:{email}` | 5 failures | Password guessing on one account from one IP. Because the IP is part of the key, an attacker cannot lock the real owner out from a different IP |
| `rl:login:ip:{ip}` | 20 failures | One machine trying many accounts |

Flow: read both counters (no increment), stop with "Too many attempts. Try again in 15 minutes." if either is full, otherwise check the password. A failure increments both keys. A successful login deletes only the pair key (the IP-wide counter keeps running).

The client IP comes from `x-forwarded-for` (first value), then `x-real-ip`. That header can be forged unless a trusted proxy overwrites it. Vercel does, but a self-hosted deployment needs a proxy in front.

---

## 3. How it works (tables)

### 3.1 Routes

| URL | Type | Who | What it does |
|---|---|---|---|
| `/` | Static page | Signed-out only | Landing page |
| `/login`, `/signup` | Static pages | Signed-out only | Auth forms |
| `/dashboard` | Dynamic page | User | Overview: totals, 14-day chart, top links |
| `/dashboard/links` | Dynamic page | User | Links table with search, filter, sort, paging, create/edit/delete |
| `/dashboard/links/[id]` | Dynamic page | User (owner) | One link: stats, 30-day chart, recent clicks |
| `/admin` | Dynamic page | Admin | All users and all links |
| `/[slug]` | Route handler | Anyone | The public redirect |
| `/api/health/db` | Route handler | Anyone | Returns `{"status":"ok"}` if the DB is reachable (reveals nothing else) |

### 3.2 Server Actions (all writes)

| File | Action | What it does |
|---|---|---|
| `app/actions/auth.ts` | `signup` | Validates input, hashes the password, creates a user (always role `user`), signs in |
| | `login` | Rate-limited per IP + email and per IP (Redis); checks email and password (same timing whether or not the email exists); rejects inactive users |
| | `logout` | Deletes the session cookie |
| `app/actions/links.ts` | `createLink` | Validates the URL, name and alias; inserts; retries on a random-code collision; clears the Redis key for the slug |
| | `updateLink` | Edits name, destination and alias (owner or admin); clears the Redis keys for the new and old alias |
| | `deleteLink` | Soft delete: sets `is_active = false`; clears the Redis key |
| `app/actions/users.ts` | `deactivateUser` | Admin only; soft-deletes a user (never yourself); clears the Redis keys of all their links |

### 3.3 Code map

| Path | Purpose |
|---|---|
| `proxy.ts` | Early redirects based on the session cookie |
| `lib/session.ts` | Signs and reads the session JWT cookie (7 days, `httpOnly`, `sameSite=lax`) |
| `lib/dal.ts` | Data access layer: `getCurrentUser`, `requireUser`, `requireAdmin`, `requireUserWith` |
| `lib/prisma.ts` | Prisma client on a warm Postgres pool (`pg` + `@prisma/adapter-pg`) |
| `lib/prisma-errors.ts` | Reads Prisma unique-constraint errors (which index was violated) |
| `lib/redis.ts` | Shared `ioredis` client (one per process, fail-fast: `maxRetriesPerRequest: 1`, no offline queue, error handler logs instead of crashing) |
| `lib/rate-limit.ts` | Login rate limiting helpers: `clientIp`, `isLimited`, `recordFailure`, `clearKeys` |
| `lib/cache.ts` | Generic `cached(key, ttl, load)` helper with a database fallback. Not used yet; ready for caching other reads |
| `lib/stats.ts` | Overview, link detail and link search queries |
| `lib/links.ts` | Slug rules, reserved names, URL normalization |
| `lib/password.ts` | scrypt hashing and verification |
| `lib/origin.ts` | Works out the public host/protocol for building short URLs |
| `prisma/schema.prisma` | Table definitions (source of truth) |
| `prisma/migrations/` | SQL migrations (`0_init` is the baseline of the existing database) |
| `prisma.config.ts` | Prisma CLI config: schema path and the direct DB URL for migrations |
| `generated/prisma/` | Generated Prisma Client (git-ignored; created by `npm install` / `npm run db:generate`) |
| `app/components/` | UI: shells, tables, modals (details, edit, new link, confirm), forms, chart |
| `scripts/seed-dummy.mjs` | Optional: creates demo users, links and click history |

### 3.4 Key behaviours

| Topic | How it works |
|---|---|
| Sessions | A signed JWT in an `httpOnly` cookie that only holds the user id. The role is always read fresh from the DB, so promoting or deactivating someone applies immediately |
| Passwords | scrypt with a random salt; never stored in plain text |
| Soft delete | "Delete" sets `is_active = false` on a link or user. Rows are never removed. Inactive items disappear everywhere, inactive users cannot log in, and an inactive link (or one owned by an inactive user) returns 404 |
| Slugs | 3–30 chars (`a-z A-Z 0-9 - _`), unique across the whole app, never equal to a route name (`login`, `admin`, `api`, ...). A soft-deleted link keeps its slug reserved |
| Click counting | `links.clicks` is a fast running total; `link_clicks` has one row per click for the charts. Both are written in `after()`, once the redirect has been sent, so they add no delay. The click count is never cached |
| Redirect cache | The slug lookup is cached in Redis (see 2.5). Writes that change a link or its owner delete the cached key |
| Login throttling | 5 failed attempts per IP + email and 20 per IP in 15 minutes (see 2.5) |
| Confirmations | Delete asks "Are you sure…?" first. Edit opens a modal and asks for confirmation only when you press Save |

---

## 4. Performance: what we found and changed

The app felt slow. We measured instead of guessing.

| Finding | Evidence | Fix |
|---|---|---|
| The database is far away (Neon, us-east-2). Every query costs about **210 ms** round trip | `select 1` takes ~210 ms | Fewer round trips per page (below) |
| A new DB connection takes about **1.6 s**, and the pool closed idle connections after 10 s | First query 1.6 s, later ones 0.2 s | Pool keeps connections for 5 min, uses TCP keep-alive, and opens 3 at startup |
| Pages ran their queries one after another (2–4 round trips) | Dashboard took 600 ms – 1 s | Queries now run together: **1 round trip per page**. The links page does search, count and totals in one query. The page data loads at the same time as the login check (`requireUserWith`) |
| Redirects waited for the click to be written | 2 round trips per redirect | The click row is written in `after()`, so the redirect takes 1 round trip |
| Every redirect still needed one database round trip | ~0.22 s per redirect | The slug lookup is cached in Redis, so a repeat redirect needs **no database call** (~5 ms). The click is counted afterwards in `after()` |
| Every navigation went back to the server | Router cache was 0 s for dynamic pages | `staleTimes.dynamic = 30` in `next.config.ts`: revisiting a page within 30 s is instant. Any create/edit/delete clears this cache, so changes still show immediately |
| `next build` was **failing** on `/admin` | "unstable value `Date.now()` while prerendering" | `/admin` and the health route now opt out of prerendering with `await connection()` |
| `/api/health/db` was public and returned the DB name and Postgres version | Read the route | Now returns only `{"status":"ok"}` |

Timings on a production build (`next build && next start`), warm. "After" was measured; "before" is the earlier measurement for the dev server and an estimate from the number of round trips:

| Page | Before | After |
|---|---|---|
| `/dashboard`, `/dashboard/links`, link detail, `/admin` | ~0.6 – 1 s | **~0.25 s** (one DB round trip) |
| `/[slug]` redirect | ~0.45 s | **~0.22 s** (first visit), **~5 ms** (cached, dev server measurement) |
| `/`, `/login` | ~0.02 s | ~0.005 s |
| Visiting a page again within 30 s | ~0.25 s | **instant** (browser cache) |

Two important notes:

- **`npm run dev` is always slower** than production: each route compiles the first time you open it (about 1.7 s). Judge speed with `npm run build && npm start`.
- A hosted Redis must be in the **same region** as the app, or it adds back the same delay it removes (a local Redis answers in about 1 ms).
- The remaining ~0.2 s per page is the distance to the database. **To go lower, create the Neon project in the region closest to where you run the app** (and deploy the app in the same region).

---

## 5. Run it

### Environment variables (`.env.local`)

| Name | What for |
|---|---|
| `DATABASE_URL` | Neon **pooled** connection string (used by the app) |
| `DATABASE_URL_UNPOOLED` | Neon **direct** connection string (used by migrations) |
| `SESSION_SECRET` | Long random string that signs the session cookie |
| `REDIS_URL` | Redis connection string, e.g. `redis://localhost:6379` locally. Use the `rediss://` (TLS) URL for a hosted Redis |
| `DEV_ORIGINS` | Optional, dev only: comma-separated hosts (e.g. your phone on the LAN) |

### Commands

| Command | What it does |
|---|---|
| `npm install` | Install dependencies |
| `npm run dev` | Dev server on http://localhost:3000 (restart it after changing `next.config.ts`) |
| `npm run build` then `npm start` | Production build and server (use this to judge speed) |
| `npm run lint` | ESLint |
| `npm run db:generate` | Regenerate the Prisma Client (also runs on `npm install`) |
| `npm run db:migrate` | Create and apply a migration in development (`prisma migrate dev`) |
| `npm run db:deploy` | Apply pending migrations without creating new ones (production/CI) |
| `npm run db:studio` | Browse the data |
| `node --env-file=.env.local scripts/seed-dummy.mjs` | Create demo data (`--remove` deletes it) |

### Redis

Redis must be running for the cache and rate limiting to work (the app still runs without it, just slower and without throttling). Useful checks:

| Command | What it shows |
|---|---|
| `redis-cli ping` | `PONG` when Redis is up |
| `redis-cli monitor` | Live commands: a first visit shows `get` then `set`, a repeat visit only `get` |
| `redis-cli get link:SLUG` / `redis-cli ttl link:SLUG` | The cached entry and the time left |
| `redis-cli keys 'rl:login:*'` | Active login throttling counters |
| `redis-cli del link:SLUG` | Drop one cached link by hand |

### Changing the database

1. Edit `prisma/schema.prisma`.
2. `npm run db:migrate -- --name what_changed` (creates a folder in `prisma/migrations/`, applies it, and regenerates the client).
3. In production run `npm run db:deploy`.

Never edit an existing migration after it has been applied: Prisma records a checksum of each one in the `_prisma_migrations` table.

Two things Prisma cannot express in `schema.prisma`, so they live only in the migration SQL: the case-insensitive unique indexes on `lower(username)` and `lower(email)`. Keep them when you write new migrations (Prisma will not touch them). Duplicate usernames/emails are detected through `lib/prisma-errors.ts`.

Queries use the Prisma Client. The three places that use raw SQL on purpose are: the redirect (`UPDATE ... RETURNING` in one round trip), the per-day click counts (`to_char`/`group by`), and the links search (case-insensitive sort, `ILIKE` and a window count in one query).

---

## 6. Known limits and ideas

| Item | Note |
|---|---|
| No UI to reactivate a soft-deleted link or user | Set `is_active = true` in the database |
| A deleted link keeps its slug, a deactivated user keeps their email and username | They stay reserved; making the unique indexes apply to active rows only would free them |
| Changing a link's alias breaks URLs already shared with the old one | By design |
| Click counts on a page may be up to 30 s old when you come back to it | Browser router cache (see section 4) |
| A cached redirect can be stale for up to 1 hour if a link is changed by something other than the app's actions (for example directly in the database) | Delete the key with `redis-cli del link:SLUG` |
| Login throttling is skipped if Redis is down | Deliberate: Redis problems must not block logins |
| Login throttling trusts `x-forwarded-for`; users sharing one IP share the 20-attempt IP budget | Put the app behind a trusted proxy; raise the limit if needed |
| Distributed guessing from many IPs against one account is not stopped | Add an account-level slowdown or a CAPTCHA |
| Admin cannot edit links, and admin user deletion has no confirmation yet | Easy follow-ups |
