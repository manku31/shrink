import { sql } from "drizzle-orm";
import { boolean, index, integer, pgEnum, pgTable, text, timestamp, uuid, uniqueIndex } from "drizzle-orm/pg-core";

// The two roles in the system.
export const userRole = pgEnum("user_role", ["user", "admin"]);

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    username: text("username").notNull(),
    email: text("email").notNull(),
    // Store a hash (e.g. argon2/bcrypt), never the plain-text password.
    passwordHash: text("password_hash").notNull(),
    // Every new account is a normal user. Admins are promoted manually, never via sign-up.
    role: userRole("role").notNull().default("user"),
    // Soft delete: "deleting" a user just sets this to false. Rows are never removed.
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    // Usernames and emails are unique regardless of letter case.
    uniqueIndex("users_username_lower_idx").on(sql`lower(${t.username})`),
    uniqueIndex("users_email_lower_idx").on(sql`lower(${t.email})`),
  ],
);

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export const links = pgTable(
  "links",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    // The short code in /{slug}. Case-sensitive, globally unique.
    // Optional human-friendly label shown in the dashboard.
    name: text("name"),
    slug: text("slug").notNull(),
    targetUrl: text("target_url").notNull(),
    clicks: integer("clicks").notNull().default(0),
    // Soft delete: "deleting" a link just sets this to false. Rows are never removed.
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("links_slug_idx").on(t.slug), index("links_user_id_idx").on(t.userId)],
);

export type Link = typeof links.$inferSelect;

// One row per redirect, so we can chart clicks over time. links.clicks stays as the fast total.
export const linkClicks = pgTable(
  "link_clicks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    linkId: uuid("link_id")
      .notNull()
      .references(() => links.id, { onDelete: "cascade" }),
    clickedAt: timestamp("clicked_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("link_clicks_link_time_idx").on(t.linkId, t.clickedAt)],
);
