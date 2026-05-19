-- Stratège — Database schema (6 tables)
-- Run with: npm run db:setup
-- Idempotent: safe to run multiple times.
-- Enums are created by db-setup.mjs (Neon HTTP doesn't support DO blocks).

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1) USERS ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_id             text UNIQUE NOT NULL,
  email                text UNIQUE NOT NULL,
  name                 text,
  plan                 plan_t NOT NULL DEFAULT 'free',
  credits              integer NOT NULL DEFAULT 0,
  ai_messages_today    integer NOT NULL DEFAULT 0,
  last_message_reset   timestamptz,
  whatsapp_reminder    boolean NOT NULL DEFAULT false,
  reminder_time        text,
  created_at           timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_users_clerk_id ON users(clerk_id);

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
  onboarding_complete  boolean NOT NULL DEFAULT false,
  created_at           timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_brand_profiles_user
  ON brand_profiles(user_id);

-- 3) CAMPAIGNS -------------------------------------------------------------
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

-- 4) CREDIT TRANSACTIONS ---------------------------------------------------
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

-- 5) SUBSCRIPTIONS ---------------------------------------------------------
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

-- 6) SECURITY LOGS ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS security_logs (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid,
  input        text,
  reason       text,
  created_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_security_logs_created
  ON security_logs(created_at DESC);
