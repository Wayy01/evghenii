// Mirrors db/schema.sql (the source of truth, applied by scripts/db-reset.ts).
import {
  boolean,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  serial,
  smallint,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

export const bookingStatus = pgEnum("booking_status", [
  "confirmed",
  "completed",
  "cancelled",
  "no_show",
]);
export const bookingSource = pgEnum("booking_source", ["online", "manual"]);
export const mediaKind = pgEnum("media_kind", ["video", "photo"]);
export const serviceCategory = pgEnum("service_category", ["hair", "beard", "color"]);

const tz = (name: string) => timestamp(name, { withTimezone: true, mode: "date" });

export const services = pgTable("services", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  category: serviceCategory("category").notNull().default("hair"),
  nameRo: text("name_ro").notNull(),
  nameRu: text("name_ru").notNull(),
  descriptionRo: text("description_ro").notNull().default(""),
  descriptionRu: text("description_ru").notNull().default(""),
  price: integer("price").notNull(),
  durationMin: integer("duration_min").notNull(),
  active: boolean("active").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
  image: text("image"),
  createdAt: tz("created_at").notNull().defaultNow(),
});

export const clients = pgTable("clients", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  phone: text("phone").notNull().unique(),
  notes: text("notes").notNull().default(""),
  createdAt: tz("created_at").notNull().defaultNow(),
});

export const bookings = pgTable("bookings", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id")
    .notNull()
    .references(() => clients.id, { onDelete: "cascade" }),
  serviceId: integer("service_id")
    .notNull()
    .references(() => services.id),
  startsAt: tz("starts_at").notNull(),
  endsAt: tz("ends_at").notNull(),
  status: bookingStatus("status").notNull().default("confirmed"),
  price: integer("price").notNull(),
  comment: text("comment").notNull().default(""),
  source: bookingSource("source").notNull().default("online"),
  locale: text("locale").notNull().default("ro"),
  manageToken: text("manage_token").notNull().unique(),
  createdAt: tz("created_at").notNull().defaultNow(),
});

export const workingHours = pgTable("working_hours", {
  weekday: smallint("weekday").primaryKey(),
  isOpen: boolean("is_open").notNull().default(true),
  openTime: text("open_time").notNull().default("10:00"),
  closeTime: text("close_time").notNull().default("19:00"),
});

export const timeOff = pgTable("time_off", {
  id: serial("id").primaryKey(),
  startsAt: tz("starts_at").notNull(),
  endsAt: tz("ends_at").notNull(),
  reason: text("reason").notNull().default(""),
  createdAt: tz("created_at").notNull().defaultNow(),
});

export const media = pgTable("media", {
  id: serial("id").primaryKey(),
  kind: mediaKind("kind").notNull().default("video"),
  src: text("src").notNull(),
  poster: text("poster"),
  captionRo: text("caption_ro").notNull().default(""),
  captionRu: text("caption_ru").notNull().default(""),
  instagramUrl: text("instagram_url"),
  featured: boolean("featured").notNull().default(false),
  published: boolean("published").notNull().default(true),
  width: integer("width").notNull().default(720),
  height: integer("height").notNull().default(1280),
  durationS: integer("duration_s"),
  sortOrder: integer("sort_order").notNull().default(0),
  takenAt: tz("taken_at").notNull().defaultNow(),
  createdAt: tz("created_at").notNull().defaultNow(),
});

export const posts = pgTable("posts", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  titleRo: text("title_ro").notNull(),
  titleRu: text("title_ru").notNull(),
  excerptRo: text("excerpt_ro").notNull().default(""),
  excerptRu: text("excerpt_ru").notNull().default(""),
  bodyRo: text("body_ro").notNull().default(""),
  bodyRu: text("body_ru").notNull().default(""),
  cover: text("cover"),
  videoId: integer("video_id").references(() => media.id, { onDelete: "set null" }),
  published: boolean("published").notNull().default(false),
  publishedAt: tz("published_at"),
  createdAt: tz("created_at").notNull().defaultNow(),
  updatedAt: tz("updated_at").notNull().defaultNow(),
});

export const siteTexts = pgTable(
  "site_texts",
  {
    locale: text("locale").notNull(),
    key: text("key").notNull(),
    value: text("value").notNull(),
    updatedAt: tz("updated_at").notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.locale, t.key] })],
);

export const siteConfig = pgTable("site_config", {
  key: text("key").primaryKey(),
  value: jsonb("value").notNull(),
  updatedAt: tz("updated_at").notNull().defaultNow(),
});

export type Service = typeof services.$inferSelect;
export type Client = typeof clients.$inferSelect;
export type Booking = typeof bookings.$inferSelect;
export type BookingStatus = Booking["status"];
export type WorkingHours = typeof workingHours.$inferSelect;
export type TimeOff = typeof timeOff.$inferSelect;
export type Media = typeof media.$inferSelect;
export type Post = typeof posts.$inferSelect;
