

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
      BEGIN
        NEW.updated_at = NOW();
        RETURN NEW;
      END;
      $$;


ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."analysis_cache" (
    "id" integer NOT NULL,
    "url" "text" NOT NULL,
    "url_hash" character varying(64) NOT NULL,
    "content_hash" character varying(64) NOT NULL,
    "last_modified" "text",
    "etag" "text",
    "analysis_result" "jsonb" NOT NULL,
    "tier" character varying(20) DEFAULT 'starter'::character varying NOT NULL,
    "cached_at" timestamp without time zone DEFAULT "now"(),
    "expires_at" timestamp without time zone NOT NULL,
    "hit_count" integer DEFAULT 0
);


ALTER TABLE "public"."analysis_cache" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."analysis_cache_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."analysis_cache_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."analysis_cache_id_seq" OWNED BY "public"."analysis_cache"."id";



CREATE TABLE IF NOT EXISTS "public"."auth_users" (
    "id" integer NOT NULL,
    "email" "text" NOT NULL,
    "password_hash" "text" NOT NULL,
    "email_verified" boolean DEFAULT false,
    "tier" "text" DEFAULT 'starter'::"text",
    "credits_remaining" integer DEFAULT 0,
    "stripe_customer_id" "text",
    "created_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    "updated_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE "public"."auth_users" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."auth_users_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."auth_users_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."auth_users_id_seq" OWNED BY "public"."auth_users"."id";



CREATE TABLE IF NOT EXISTS "public"."cache_savings" (
    "id" integer NOT NULL,
    "user_id" integer,
    "date" "date" NOT NULL,
    "cache_hits" integer DEFAULT 0,
    "api_calls_saved" integer DEFAULT 0,
    "cost_saved" numeric(10,4) DEFAULT 0
);


ALTER TABLE "public"."cache_savings" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."cache_savings_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."cache_savings_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."cache_savings_id_seq" OWNED BY "public"."cache_savings"."id";



CREATE TABLE IF NOT EXISTS "public"."cancellations" (
    "id" integer NOT NULL,
    "user_id" integer NOT NULL,
    "subscription_id" "text",
    "tier" "text" NOT NULL,
    "reason" "text",
    "requested_at" timestamp without time zone DEFAULT "now"() NOT NULL,
    "processed_at" timestamp without time zone,
    "refund_amount" integer,
    "refund_status" "text",
    "refund_stripe_id" "text",
    "purchase_date" timestamp without time zone,
    "days_since_purchase" integer,
    "created_at" timestamp without time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."cancellations" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."cancellations_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."cancellations_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."cancellations_id_seq" OWNED BY "public"."cancellations"."id";



CREATE TABLE IF NOT EXISTS "public"."emailCaptures" (
    "id" integer NOT NULL,
    "email" "text" NOT NULL,
    "websiteUrl" "text",
    "tier" "text" DEFAULT 'free'::"text" NOT NULL,
    "createdAt" timestamp without time zone DEFAULT "now"(),
    "user_id" integer
);


ALTER TABLE "public"."emailCaptures" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."emailCaptures_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."emailCaptures_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."emailCaptures_id_seq" OWNED BY "public"."emailCaptures"."id";



CREATE TABLE IF NOT EXISTS "public"."llmTextFiles" (
    "id" integer NOT NULL,
    "analysis_id" integer,
    "selected_pages" "jsonb",
    "content" "text" NOT NULL,
    "created_at" timestamp without time zone DEFAULT "now"(),
    "user_id" integer
);


ALTER TABLE "public"."llmTextFiles" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."llmTextFiles_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."llmTextFiles_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."llmTextFiles_id_seq" OWNED BY "public"."llmTextFiles"."id";



CREATE TABLE IF NOT EXISTS "public"."one_time_credits" (
    "id" integer NOT NULL,
    "user_id" integer NOT NULL,
    "credits_remaining" integer DEFAULT 0 NOT NULL,
    "credits_total" integer DEFAULT 0 NOT NULL,
    "product_type" "text" DEFAULT 'coffee'::"text" NOT NULL,
    "price_id" "text",
    "stripe_payment_intent_id" "text",
    "created_at" timestamp without time zone DEFAULT "now"(),
    "updated_at" timestamp without time zone DEFAULT "now"(),
    "purchased_at" timestamp without time zone DEFAULT "now"() NOT NULL,
    "refunded" boolean DEFAULT false NOT NULL,
    "refunded_at" timestamp without time zone
);


ALTER TABLE "public"."one_time_credits" OWNER TO "postgres";


COMMENT ON TABLE "public"."one_time_credits" IS 'Coffee tier credits and one-time purchases';



CREATE SEQUENCE IF NOT EXISTS "public"."one_time_credits_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."one_time_credits_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."one_time_credits_id_seq" OWNED BY "public"."one_time_credits"."id";



CREATE TABLE IF NOT EXISTS "public"."payment_history" (
    "id" integer NOT NULL,
    "user_id" integer NOT NULL,
    "subscription_id" integer,
    "stripe_payment_intent_id" "text",
    "amount" integer NOT NULL,
    "currency" "text" DEFAULT 'usd'::"text" NOT NULL,
    "status" "text" NOT NULL,
    "created_at" timestamp without time zone DEFAULT "now"()
);


ALTER TABLE "public"."payment_history" OWNER TO "postgres";


COMMENT ON TABLE "public"."payment_history" IS 'Payment transaction history for Stripe';



CREATE SEQUENCE IF NOT EXISTS "public"."payment_history_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."payment_history_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."payment_history_id_seq" OWNED BY "public"."payment_history"."id";



CREATE TABLE IF NOT EXISTS "public"."refund_requests" (
    "id" integer NOT NULL,
    "user_id" integer NOT NULL,
    "cancellation_id" integer,
    "amount" integer NOT NULL,
    "reason" "text",
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "stripe_refund_id" "text",
    "processed_at" timestamp without time zone,
    "error_message" "text",
    "created_at" timestamp without time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."refund_requests" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."refund_requests_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."refund_requests_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."refund_requests_id_seq" OWNED BY "public"."refund_requests"."id";



CREATE TABLE IF NOT EXISTS "public"."schema_migrations" (
    "id" integer NOT NULL,
    "filename" character varying(255) NOT NULL,
    "applied_at" timestamp without time zone DEFAULT "now"(),
    "checksum" character varying(64)
);


ALTER TABLE "public"."schema_migrations" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."schema_migrations_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."schema_migrations_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."schema_migrations_id_seq" OWNED BY "public"."schema_migrations"."id";



CREATE TABLE IF NOT EXISTS "public"."simple_usage" (
    "id" integer NOT NULL,
    "email" "text" NOT NULL,
    "date" "text" NOT NULL,
    "count" integer DEFAULT 0,
    "tier" "text" DEFAULT 'starter'::"text"
);


ALTER TABLE "public"."simple_usage" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."simple_usage_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."simple_usage_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."simple_usage_id_seq" OWNED BY "public"."simple_usage"."id";



CREATE TABLE IF NOT EXISTS "public"."sitemapAnalysis" (
    "id" integer NOT NULL,
    "url" "text" NOT NULL,
    "sitemapContent" "jsonb",
    "discoveredPages" "jsonb",
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "analysisMetadata" "jsonb",
    "createdAt" timestamp without time zone DEFAULT "now"(),
    "user_email" "text",
    "cost_estimate" numeric(10,4),
    "actual_cost" numeric(10,4),
    "cache_hits" integer DEFAULT 0,
    "user_id" integer,
    "sitemap_content" "text",
    "discovered_pages" "jsonb",
    "analysis_metadata" "jsonb",
    "created_at" timestamp without time zone DEFAULT "now"()
);


ALTER TABLE "public"."sitemapAnalysis" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."sitemapAnalysis_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."sitemapAnalysis_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."sitemapAnalysis_id_seq" OWNED BY "public"."sitemapAnalysis"."id";



CREATE TABLE IF NOT EXISTS "public"."subscriptions" (
    "id" integer NOT NULL,
    "user_id" integer NOT NULL,
    "stripe_customer_id" "text",
    "stripe_subscription_id" "text",
    "tier" "text" DEFAULT 'starter'::"text" NOT NULL,
    "status" "text" DEFAULT 'active'::"text" NOT NULL,
    "current_period_start" timestamp without time zone,
    "current_period_end" timestamp without time zone,
    "cancel_at_period_end" boolean DEFAULT false,
    "created_at" timestamp without time zone DEFAULT "now"(),
    "updated_at" timestamp without time zone DEFAULT "now"()
);


ALTER TABLE "public"."subscriptions" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."subscriptions_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."subscriptions_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."subscriptions_id_seq" OWNED BY "public"."subscriptions"."id";



CREATE TABLE IF NOT EXISTS "public"."usage_limits" (
    "tier" character varying(20) NOT NULL,
    "daily_analyses" integer NOT NULL,
    "max_pages_per_analysis" integer NOT NULL,
    "ai_pages_limit" integer NOT NULL,
    "cache_duration_days" integer NOT NULL,
    "features" "jsonb" NOT NULL
);


ALTER TABLE "public"."usage_limits" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."usage_tracking" (
    "id" integer NOT NULL,
    "user_id" integer,
    "date" "date" NOT NULL,
    "analyses_count" integer DEFAULT 0,
    "pages_processed" integer DEFAULT 0,
    "ai_calls_count" integer DEFAULT 0,
    "html_extractions_count" integer DEFAULT 0,
    "cache_hits" integer DEFAULT 0,
    "total_cost" numeric(10,4) DEFAULT 0
);


ALTER TABLE "public"."usage_tracking" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."usage_tracking_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."usage_tracking_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."usage_tracking_id_seq" OWNED BY "public"."usage_tracking"."id";



CREATE TABLE IF NOT EXISTS "public"."user_profiles" (
    "id" "text" NOT NULL,
    "email" "text" NOT NULL,
    "tier" "text" DEFAULT 'starter'::"text" NOT NULL,
    "credits_remaining" integer DEFAULT 0 NOT NULL,
    "stripe_customer_id" "text",
    "subscription_id" "text",
    "subscription_status" "text",
    "created_at" timestamp without time zone DEFAULT "now"(),
    "updated_at" timestamp without time zone DEFAULT "now"()
);


ALTER TABLE "public"."user_profiles" OWNER TO "postgres";


COMMENT ON TABLE "public"."user_profiles" IS 'Extended user data linked to Supabase auth';



CREATE TABLE IF NOT EXISTS "public"."user_sessions" (
    "id" integer NOT NULL,
    "user_id" integer NOT NULL,
    "token_hash" "text" NOT NULL,
    "refresh_token_hash" "text" NOT NULL,
    "expires_at" timestamp without time zone NOT NULL,
    "refresh_expires_at" timestamp without time zone NOT NULL,
    "last_used_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    "user_agent" "text",
    "ip_address" character varying(45),
    "created_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE "public"."user_sessions" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."user_sessions_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."user_sessions_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."user_sessions_id_seq" OWNED BY "public"."user_sessions"."id";



CREATE TABLE IF NOT EXISTS "public"."users" (
    "id" integer NOT NULL,
    "username" "text" NOT NULL,
    "password" "text" NOT NULL
);


ALTER TABLE "public"."users" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."users_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."users_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."users_id_seq" OWNED BY "public"."users"."id";



ALTER TABLE ONLY "public"."analysis_cache" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."analysis_cache_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."auth_users" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."auth_users_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."cache_savings" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."cache_savings_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."cancellations" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."cancellations_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."emailCaptures" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."emailCaptures_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."llmTextFiles" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."llmTextFiles_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."one_time_credits" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."one_time_credits_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."payment_history" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."payment_history_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."refund_requests" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."refund_requests_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."schema_migrations" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."schema_migrations_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."simple_usage" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."simple_usage_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."sitemapAnalysis" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."sitemapAnalysis_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."subscriptions" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."subscriptions_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."usage_tracking" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."usage_tracking_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."user_sessions" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."user_sessions_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."users" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."users_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."analysis_cache"
    ADD CONSTRAINT "analysis_cache_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."analysis_cache"
    ADD CONSTRAINT "analysis_cache_url_hash_key" UNIQUE ("url_hash");



ALTER TABLE ONLY "public"."analysis_cache"
    ADD CONSTRAINT "analysis_cache_url_hash_unique" UNIQUE ("url_hash");



ALTER TABLE ONLY "public"."auth_users"
    ADD CONSTRAINT "auth_users_email_key" UNIQUE ("email");



ALTER TABLE ONLY "public"."auth_users"
    ADD CONSTRAINT "auth_users_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."cache_savings"
    ADD CONSTRAINT "cache_savings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."cache_savings"
    ADD CONSTRAINT "cache_savings_user_id_date_key" UNIQUE ("user_id", "date");



ALTER TABLE ONLY "public"."cancellations"
    ADD CONSTRAINT "cancellations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."emailCaptures"
    ADD CONSTRAINT "emailCaptures_email_key" UNIQUE ("email");



ALTER TABLE ONLY "public"."emailCaptures"
    ADD CONSTRAINT "emailCaptures_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."llmTextFiles"
    ADD CONSTRAINT "llmTextFiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."one_time_credits"
    ADD CONSTRAINT "one_time_credits_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."payment_history"
    ADD CONSTRAINT "payment_history_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."payment_history"
    ADD CONSTRAINT "payment_history_stripe_payment_intent_id_key" UNIQUE ("stripe_payment_intent_id");



ALTER TABLE ONLY "public"."refund_requests"
    ADD CONSTRAINT "refund_requests_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."schema_migrations"
    ADD CONSTRAINT "schema_migrations_filename_key" UNIQUE ("filename");



ALTER TABLE ONLY "public"."schema_migrations"
    ADD CONSTRAINT "schema_migrations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."simple_usage"
    ADD CONSTRAINT "simple_usage_email_date_key" UNIQUE ("email", "date");



ALTER TABLE ONLY "public"."simple_usage"
    ADD CONSTRAINT "simple_usage_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."sitemapAnalysis"
    ADD CONSTRAINT "sitemapAnalysis_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."subscriptions"
    ADD CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."subscriptions"
    ADD CONSTRAINT "subscriptions_stripe_customer_id_key" UNIQUE ("stripe_customer_id");



ALTER TABLE ONLY "public"."subscriptions"
    ADD CONSTRAINT "subscriptions_stripe_subscription_id_key" UNIQUE ("stripe_subscription_id");



ALTER TABLE ONLY "public"."analysis_cache"
    ADD CONSTRAINT "unique_url_tier" UNIQUE ("url_hash", "tier");



ALTER TABLE ONLY "public"."usage_limits"
    ADD CONSTRAINT "usage_limits_pkey" PRIMARY KEY ("tier");



ALTER TABLE ONLY "public"."usage_tracking"
    ADD CONSTRAINT "usage_tracking_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."usage_tracking"
    ADD CONSTRAINT "usage_tracking_user_id_date_key" UNIQUE ("user_id", "date");



ALTER TABLE ONLY "public"."user_profiles"
    ADD CONSTRAINT "user_profiles_email_key" UNIQUE ("email");



ALTER TABLE ONLY "public"."user_profiles"
    ADD CONSTRAINT "user_profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_profiles"
    ADD CONSTRAINT "user_profiles_stripe_customer_id_key" UNIQUE ("stripe_customer_id");



ALTER TABLE ONLY "public"."user_sessions"
    ADD CONSTRAINT "user_sessions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_sessions"
    ADD CONSTRAINT "user_sessions_refresh_token_hash_key" UNIQUE ("refresh_token_hash");



ALTER TABLE ONLY "public"."user_sessions"
    ADD CONSTRAINT "user_sessions_token_hash_key" UNIQUE ("token_hash");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_username_key" UNIQUE ("username");



CREATE INDEX "idx_auth_users_email" ON "public"."auth_users" USING "btree" ("email");



CREATE INDEX "idx_cache_expires" ON "public"."analysis_cache" USING "btree" ("expires_at");



CREATE INDEX "idx_cache_url_tier" ON "public"."analysis_cache" USING "btree" ("url_hash", "tier");



CREATE INDEX "idx_email_captures_email" ON "public"."emailCaptures" USING "btree" ("email");



CREATE INDEX "idx_email_captures_tier" ON "public"."emailCaptures" USING "btree" ("tier");



CREATE INDEX "idx_llm_files_analysis_id" ON "public"."llmTextFiles" USING "btree" ("analysis_id");



CREATE INDEX "idx_one_time_credits_user_id" ON "public"."one_time_credits" USING "btree" ("user_id");



CREATE INDEX "idx_payment_history_user_id" ON "public"."payment_history" USING "btree" ("user_id");



CREATE INDEX "idx_sitemap_analysis_status" ON "public"."sitemapAnalysis" USING "btree" ("status");



CREATE INDEX "idx_sitemap_analysis_url" ON "public"."sitemapAnalysis" USING "btree" ("url");



CREATE INDEX "idx_sitemap_analysis_user_email" ON "public"."sitemapAnalysis" USING "btree" ("user_email");



CREATE INDEX "idx_user_profiles_email" ON "public"."user_profiles" USING "btree" ("email");



CREATE INDEX "idx_user_profiles_stripe_customer_id" ON "public"."user_profiles" USING "btree" ("stripe_customer_id");



CREATE INDEX "idx_user_sessions_refresh_token_hash" ON "public"."user_sessions" USING "btree" ("refresh_token_hash");



CREATE INDEX "idx_user_sessions_token_hash" ON "public"."user_sessions" USING "btree" ("token_hash");



CREATE INDEX "idx_user_sessions_user_id" ON "public"."user_sessions" USING "btree" ("user_id");



ALTER TABLE ONLY "public"."cancellations"
    ADD CONSTRAINT "cancellations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."auth_users"("id");



ALTER TABLE ONLY "public"."emailCaptures"
    ADD CONSTRAINT "emailCaptures_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."llmTextFiles"
    ADD CONSTRAINT "llmTextFiles_analysisId_fkey" FOREIGN KEY ("analysis_id") REFERENCES "public"."sitemapAnalysis"("id");



ALTER TABLE ONLY "public"."llmTextFiles"
    ADD CONSTRAINT "llmTextFiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."payment_history"
    ADD CONSTRAINT "payment_history_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "public"."subscriptions"("id");



ALTER TABLE ONLY "public"."payment_history"
    ADD CONSTRAINT "payment_history_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."refund_requests"
    ADD CONSTRAINT "refund_requests_cancellation_id_fkey" FOREIGN KEY ("cancellation_id") REFERENCES "public"."cancellations"("id");



ALTER TABLE ONLY "public"."refund_requests"
    ADD CONSTRAINT "refund_requests_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."auth_users"("id");



ALTER TABLE ONLY "public"."sitemapAnalysis"
    ADD CONSTRAINT "sitemapAnalysis_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."subscriptions"
    ADD CONSTRAINT "subscriptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."user_sessions"
    ADD CONSTRAINT "user_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."auth_users"("id") ON DELETE CASCADE;



ALTER DEFAULT PRIVILEGES FOR ROLE "cloud_admin" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "neon_superuser" WITH GRANT OPTION;



ALTER DEFAULT PRIVILEGES FOR ROLE "cloud_admin" IN SCHEMA "public" GRANT ALL ON TABLES TO "neon_superuser" WITH GRANT OPTION;
