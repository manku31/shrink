// Dummy users (role "user") with links and click history, for demos.
//   node --env-file=.env.local scripts/seed-dummy.mjs          create (idempotent)
//   node --env-file=.env.local scripts/seed-dummy.mjs --remove delete them (links + clicks cascade)
// Dummy accounts are recognisable: username "dummy_*" and email "*@example.test".
// Generated passwords are written to .dummy-users.local (git-ignored), never printed.
import { randomBytes, randomInt, scryptSync } from "node:crypto";
import { writeFileSync } from "node:fs";
import pg from "pg";

const hash = (pw) => {
  const salt = randomBytes(16);
  return `scrypt$${salt.toString("hex")}$${scryptSync(pw, salt, 64).toString("hex")}`; // same format as lib/password.ts
};

const USERS = {
  dummy_alice: [
    ["Product launch", "alice-launch", "https://example.com/blog/announcing-our-big-product-launch-2026"],
    ["Docs: getting started", "alice-docs", "https://example.com/documentation/getting-started/installation"],
    ["Summer sale", "alice-summer", "https://example.com/pricing?coupon=SUMMER&ref=social"],
    ["Newsletter signup", "alice-news", "https://example.com/newsletter?utm_source=twitter"],
    ["Meetup RSVP", "alice-meetup", "https://example.com/events/summer-meetup"],
    [null, "alice-misc1", "https://example.com/misc/one"],
  ],
  dummy_bob: [
    ["Portfolio", "bob-portfolio", "https://example.org/bob/portfolio"],
    ["Resume (PDF)", "bob-resume", "https://example.org/files/bob-resume.pdf"],
    ["YouTube channel", "bob-yt", "https://example.org/watch?v=dQw4w9WgXcQ"],
    ["Podcast ep. 12", "bob-pod12", "https://example.org/podcast/episode-12-scaling-databases"],
    [null, "bob-notes", "https://example.org/notes/2026/11/long-form-writing-on-link-shorteners"],
  ],
  dummy_carol: [
    ["Black Friday", "carol-bf", "https://example.net/shop/black-friday?utm_campaign=bf26"],
    ["Support center", "carol-help", "https://example.net/support/contact"],
    ["Careers", "carol-jobs", "https://example.net/careers/open-roles"],
    ["Webinar", "carol-webinar", "https://example.net/events/webinar-link-analytics"],
    ["Referral program", "carol-refer", "https://example.net/refer-a-friend?code=CAROL"],
    [null, "carol-misc", "https://example.net/misc"],
  ],
};

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL_UNPOOLED });
const c = await pool.connect();
try {
  await c.query("begin");
  if (process.argv.includes("--remove")) {
    const r = await c.query("delete from users where username like 'dummy\\_%' and email like '%@example.test'");
    console.log(`removed ${r.rowCount} dummy users (their links and clicks cascade)`);
  } else {
    const creds = [];
    for (const [username, rows] of Object.entries(USERS)) {
      const email = `${username.replace("dummy_", "")}@example.test`;
      const exists = await c.query("select id from users where lower(username)=lower($1)", [username]);
      if (exists.rowCount) { console.log(`skip ${username} (already exists)`); continue; }
      const password = randomBytes(12).toString("base64url");
      const u = await c.query(
        "insert into users (username, email, password_hash, role) values ($1,$2,$3,'user') returning id",
        [username, email, hash(password)],
      );
      creds.push(`${username}  ${email}  ${password}`);
      let linkCount = 0, clickCount = 0;
      for (const [i, [name, slug, url]] of rows.entries()) {
        // Spread link creation over the last ~30 days; a few links stay unclicked.
        const createdDaysAgo = randomInt(2, 30);
        const clicks = i === rows.length - 1 ? 0 : randomInt(1, 60);
        const l = await c.query(
          "insert into links (user_id, name, slug, target_url, clicks, created_at) values ($1,$2,$3,$4,$5, now() - ($6 || ' days')::interval) returning id",
          [u.rows[0].id, name, slug, url, clicks, String(createdDaysAgo)],
        );
        for (let k = 0; k < clicks; k++) {
          await c.query(
            "insert into link_clicks (link_id, clicked_at) values ($1, now() - ($2 || ' minutes')::interval)",
            [l.rows[0].id, String(randomInt(1, createdDaysAgo * 1440))],
          );
        }
        linkCount++; clickCount += clicks;
      }
      console.log(`created ${username}: ${linkCount} links, ${clickCount} clicks`);
    }
    if (creds.length) {
      writeFileSync(".dummy-users.local", "username  email  password\n" + creds.join("\n") + "\n", { mode: 0o600 });
      console.log("passwords written to .dummy-users.local");
    }
  }
  await c.query("commit");
} catch (e) {
  await c.query("rollback");
  console.error("rolled back:", e.message);
  process.exitCode = 1;
} finally {
  c.release();
  await pool.end();
}
