-- Stratège — Database schema (authoritative, full)
-- Run with: npm run db:setup
-- Idempotent: safe to run multiple times.
-- Enums are created by db-setup.mjs (Neon HTTP doesn't support DO blocks).
--
-- This file is the single source of truth for a fresh database. The historical
-- scripts/db-migrate-*.mjs files remain for upgrading EXISTING databases in
-- place; new environments only need this schema.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1) USERS ------------------------------------------------------------------
-- clerk_id is a legacy Clerk identifier — nullable now that auth is NextAuth.
CREATE TABLE IF NOT EXISTS users (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_id             text UNIQUE,
  email                text UNIQUE NOT NULL,
  name                 text,
  image                text,
  password_hash        text,
  email_verified       timestamptz,
  plan                 plan_t NOT NULL DEFAULT 'free',
  credits              integer NOT NULL DEFAULT 0,
  ai_messages_today    integer NOT NULL DEFAULT 0,
  last_message_reset   timestamptz,
  whatsapp_reminder    boolean NOT NULL DEFAULT false,
  reminder_time        text,
  created_at           timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_users_clerk_id ON users(clerk_id);

-- OAuth account links (NextAuth remembers "this email signed in via Google").
CREATE TABLE IF NOT EXISTS auth_accounts (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider            text NOT NULL,
  provider_account_id text NOT NULL,
  created_at          timestamptz NOT NULL DEFAULT now(),
  UNIQUE (provider, provider_account_id)
);
CREATE INDEX IF NOT EXISTS idx_auth_accounts_user ON auth_accounts(user_id);

-- 2) BRAND PROFILES --------------------------------------------------------
CREATE TABLE IF NOT EXISTS brand_profiles (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  brand_name           text,
  product              text,
  target_audience      text,
  usp                  text,
  platforms            text[],
  goal                 text,
  content_style        text,
  posting_time         text,
  language             text NOT NULL DEFAULT 'English',
  city                 text,
  country              text NOT NULL DEFAULT 'India',
  whatsapp_enabled     boolean NOT NULL DEFAULT false,
  budget               text,
  brand_colors         text,
  website              text,
  role                 text,
  industry             text,
  logo_url             text,
  onboarding_complete  boolean NOT NULL DEFAULT false,
  created_at           timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_brand_profiles_user
  ON brand_profiles(user_id);

-- 3) VOICE PROFILES --------------------------------------------------------
CREATE TABLE IF NOT EXISTS voice_profiles (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  building_what   text,
  audience        text,
  voice_samples   text,
  voice_source    text,
  platforms       text[] DEFAULT ARRAY[]::text[],
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- 4) POSTS -----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS posts (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  input           text NOT NULL,
  angle_bts       jsonb,
  angle_lesson    jsonb,
  angle_outcome   jsonb,
  picked_angle    text,
  image_url       text,
  posted_at       timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_posts_user_created ON posts(user_id, created_at DESC);

-- 5) CHATS + MESSAGES ------------------------------------------------------
CREATE TABLE IF NOT EXISTS chats (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title         text NOT NULL DEFAULT 'New chat',
  mode          text NOT NULL DEFAULT 'coach',
  pending_brief jsonb,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_chats_user_updated ON chats(user_id, updated_at DESC);

CREATE TABLE IF NOT EXISTS chat_messages (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id     uuid NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
  role        text NOT NULL CHECK (role IN ('user','assistant')),
  content     text NOT NULL,
  image_url   text,
  image_meta  jsonb,
  actions     jsonb,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_chat_messages_chat_created
  ON chat_messages(chat_id, created_at);

-- 6) CAMPAIGNS -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS campaigns (
  id                        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                   uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  caption                   text,
  hashtags                  text,
  hook                      text,
  idea                      text,
  platform                  text,
  post_type                 text,
  best_time                 text,
  why_this_works            text,
  whatsapp_status           text,
  whatsapp_broadcast        text,
  image_urls                text[],
  recommended_image_index   integer NOT NULL DEFAULT 0,
  posted                    boolean NOT NULL DEFAULT false,
  feedback                  text,
  credits_used              integer,
  created_at                timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_campaigns_user_created
  ON campaigns(user_id, created_at DESC);

-- 7) DAILY USAGE (MVP per-user daily counters) -----------------------------
CREATE TABLE IF NOT EXISTS daily_usage (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  day         date NOT NULL,
  post_count  integer NOT NULL DEFAULT 0,
  image_count integer NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, day)
);
CREATE INDEX IF NOT EXISTS idx_daily_usage_user_day ON daily_usage(user_id, day);

-- 8) BRAND ASSETS (Brand Book library) -------------------------------------
CREATE TABLE IF NOT EXISTS brand_assets (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  asset_name            text NOT NULL,
  asset_type            text NOT NULL,
  asset_url             text NOT NULL,
  thumbnail_url         text,
  device_frame_default  text,
  width                 integer,
  height                integer,
  uploaded_at           timestamptz NOT NULL DEFAULT now(),
  last_used_at          timestamptz,
  use_count             integer NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_brand_assets_user ON brand_assets(user_id);
CREATE INDEX IF NOT EXISTS idx_brand_assets_recency
  ON brand_assets(user_id, last_used_at DESC NULLS LAST, uploaded_at DESC);

-- 9) GENERATED IMAGES (Image Studio creations) -----------------------------
CREATE TABLE IF NOT EXISTS generated_images (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  url         text NOT NULL,
  headline    text,
  source      text,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_generated_images_user
  ON generated_images(user_id, created_at DESC);

-- 10) CREDIT TRANSACTIONS --------------------------------------------------
CREATE TABLE IF NOT EXISTS credit_transactions (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount               integer NOT NULL,
  type                 credit_txn_t NOT NULL,
  description          text,
  razorpay_order_id    text,
  created_at           timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_credit_txn_user_created
  ON credit_transactions(user_id, created_at DESC);

-- 11) SUBSCRIPTIONS --------------------------------------------------------
CREATE TABLE IF NOT EXISTS subscriptions (
  id                            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                       uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plan                          text NOT NULL,
  status                        text NOT NULL,
  razorpay_subscription_id      text,
  campaigns_used_this_month     integer NOT NULL DEFAULT 0,
  current_period_start          timestamptz,
  current_period_end            timestamptz,
  created_at                    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_subs_user ON subscriptions(user_id);

-- 12) EVENTS (behaviour tracking) ------------------------------------------
CREATE TABLE IF NOT EXISTS events (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid REFERENCES users(id) ON DELETE CASCADE,
  type        text NOT NULL,
  metadata    jsonb,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_events_user_created ON events(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_events_type ON events(type);
CREATE INDEX IF NOT EXISTS idx_events_created ON events(created_at DESC);

-- 13) SECURITY LOGS --------------------------------------------------------
CREATE TABLE IF NOT EXISTS security_logs (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid,
  input        text,
  reason       text,
  created_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_security_logs_created
  ON security_logs(created_at DESC);
