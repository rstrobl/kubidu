--
-- PostgreSQL database dump
--

\restrict uYrMIRwY5jCOIJhkrfgLDtHPj4eTgMRuaE7CXxbcojufCIlFBuksRoUx8JdMQ5r

-- Dumped from database version 15.15
-- Dumped by pg_dump version 15.15

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: kubidu
--

-- *not* creating schema, since initdb creates it


ALTER SCHEMA public OWNER TO kubidu;

--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: kubidu
--

COMMENT ON SCHEMA public IS '';


--
-- Name: uuid-ossp; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public;


--
-- Name: EXTENSION "uuid-ossp"; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION "uuid-ossp" IS 'generate universally unique identifiers (UUIDs)';


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: _prisma_migrations; Type: TABLE; Schema: public; Owner: kubidu
--

CREATE TABLE public._prisma_migrations (
    id character varying(36) NOT NULL,
    checksum character varying(64) NOT NULL,
    finished_at timestamp with time zone,
    migration_name character varying(255) NOT NULL,
    logs text,
    rolled_back_at timestamp with time zone,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    applied_steps_count integer DEFAULT 0 NOT NULL
);


ALTER TABLE public._prisma_migrations OWNER TO kubidu;

--
-- Name: api_keys; Type: TABLE; Schema: public; Owner: kubidu
--

CREATE TABLE public.api_keys (
    id text NOT NULL,
    user_id text NOT NULL,
    name text NOT NULL,
    key_hash text NOT NULL,
    expires_at timestamp(3) without time zone,
    last_used_at timestamp(3) without time zone,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    key_prefix text NOT NULL,
    permissions text[],
    revoked_at timestamp(3) without time zone
);


ALTER TABLE public.api_keys OWNER TO kubidu;

--
-- Name: audit_logs; Type: TABLE; Schema: public; Owner: kubidu
--

CREATE TABLE public.audit_logs (
    id text NOT NULL,
    user_id text,
    action text NOT NULL,
    resource text NOT NULL,
    resource_id text,
    metadata jsonb,
    ip_address text,
    user_agent text,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.audit_logs OWNER TO kubidu;

--
-- Name: build_queue; Type: TABLE; Schema: public; Owner: kubidu
--

CREATE TABLE public.build_queue (
    id text NOT NULL,
    service_id text NOT NULL,
    deployment_id text NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    build_start_time timestamp(3) without time zone,
    build_end_time timestamp(3) without time zone,
    build_duration_seconds integer,
    error_message text,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.build_queue OWNER TO kubidu;

--
-- Name: deployments; Type: TABLE; Schema: public; Owner: kubidu
--

CREATE TABLE public.deployments (
    id text NOT NULL,
    service_id text NOT NULL,
    name text NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    image_url text,
    image_tag text,
    build_logs text,
    deployment_logs text,
    git_commit_sha text,
    git_commit_message text,
    git_author text,
    deployed_at timestamp(3) without time zone,
    stopped_at timestamp(3) without time zone,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.deployments OWNER TO kubidu;

--
-- Name: domains; Type: TABLE; Schema: public; Owner: kubidu
--

CREATE TABLE public.domains (
    id text NOT NULL,
    deployment_id text NOT NULL,
    domain text NOT NULL,
    verification_code text,
    is_verified boolean DEFAULT false NOT NULL,
    ssl_certificate text,
    ssl_key text,
    ssl_expires_at timestamp(3) without time zone,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.domains OWNER TO kubidu;

--
-- Name: environment_variables; Type: TABLE; Schema: public; Owner: kubidu
--

CREATE TABLE public.environment_variables (
    id text NOT NULL,
    deployment_id text,
    service_id text,
    project_id text,
    key text NOT NULL,
    value_encrypted text NOT NULL,
    value_iv text NOT NULL,
    is_secret boolean DEFAULT true NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.environment_variables OWNER TO kubidu;

--
-- Name: gdpr_consents; Type: TABLE; Schema: public; Owner: kubidu
--

CREATE TABLE public.gdpr_consents (
    id text NOT NULL,
    user_id text NOT NULL,
    consent_type text NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    consent_given boolean NOT NULL,
    consent_version text NOT NULL,
    ip_address text,
    user_agent text
);


ALTER TABLE public.gdpr_consents OWNER TO kubidu;

--
-- Name: gdpr_data_requests; Type: TABLE; Schema: public; Owner: kubidu
--

CREATE TABLE public.gdpr_data_requests (
    id text NOT NULL,
    user_id text NOT NULL,
    request_type text NOT NULL,
    status text NOT NULL,
    download_url text,
    expires_at timestamp(3) without time zone,
    completed_at timestamp(3) without time zone,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.gdpr_data_requests OWNER TO kubidu;

--
-- Name: invoices; Type: TABLE; Schema: public; Owner: kubidu
--

CREATE TABLE public.invoices (
    id text NOT NULL,
    user_id text NOT NULL,
    stripe_invoice_id text,
    amount double precision NOT NULL,
    currency text DEFAULT 'usd'::text NOT NULL,
    status text NOT NULL,
    due_date timestamp(3) without time zone,
    paid_at timestamp(3) without time zone,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.invoices OWNER TO kubidu;

--
-- Name: notifications; Type: TABLE; Schema: public; Owner: kubidu
--

CREATE TABLE public.notifications (
    id text NOT NULL,
    user_id text NOT NULL,
    type text NOT NULL,
    title text NOT NULL,
    message text NOT NULL,
    read boolean DEFAULT false NOT NULL,
    read_at timestamp(3) without time zone,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.notifications OWNER TO kubidu;

--
-- Name: projects; Type: TABLE; Schema: public; Owner: kubidu
--

CREATE TABLE public.projects (
    id text NOT NULL,
    user_id text NOT NULL,
    name text NOT NULL,
    slug text NOT NULL,
    description text,
    status text DEFAULT 'active'::text NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    deleted_at timestamp(3) without time zone
);


ALTER TABLE public.projects OWNER TO kubidu;

--
-- Name: services; Type: TABLE; Schema: public; Owner: kubidu
--

CREATE TABLE public.services (
    id text NOT NULL,
    project_id text NOT NULL,
    name text NOT NULL,
    service_type text NOT NULL,
    repository_url text,
    repository_provider text,
    repository_branch text,
    docker_image text,
    docker_tag text,
    port integer DEFAULT 8080 NOT NULL,
    replicas integer DEFAULT 1 NOT NULL,
    cpu_limit text DEFAULT '1000m'::text NOT NULL,
    memory_limit text DEFAULT '512Mi'::text NOT NULL,
    cpu_request text DEFAULT '100m'::text NOT NULL,
    memory_request text DEFAULT '128Mi'::text NOT NULL,
    health_check_path text DEFAULT '/'::text NOT NULL,
    auto_deploy boolean DEFAULT true NOT NULL,
    status text DEFAULT 'active'::text NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.services OWNER TO kubidu;

--
-- Name: subscriptions; Type: TABLE; Schema: public; Owner: kubidu
--

CREATE TABLE public.subscriptions (
    id text NOT NULL,
    user_id text NOT NULL,
    stripe_customer_id text,
    stripe_subscription_id text,
    status text NOT NULL,
    current_period_start timestamp(3) without time zone,
    current_period_end timestamp(3) without time zone,
    canceled_at timestamp(3) without time zone,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    plan_name text NOT NULL
);


ALTER TABLE public.subscriptions OWNER TO kubidu;

--
-- Name: usage_records; Type: TABLE; Schema: public; Owner: kubidu
--

CREATE TABLE public.usage_records (
    id text NOT NULL,
    user_id text NOT NULL,
    resource_type text NOT NULL,
    amount double precision NOT NULL,
    unit text NOT NULL,
    recorded_at timestamp(3) without time zone NOT NULL,
    billing_period text NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.usage_records OWNER TO kubidu;

--
-- Name: users; Type: TABLE; Schema: public; Owner: kubidu
--

CREATE TABLE public.users (
    id text NOT NULL,
    email text NOT NULL,
    password_hash text NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    last_login_at timestamp(3) without time zone,
    avatar_url text,
    deleted_at timestamp(3) without time zone,
    email_verified boolean DEFAULT false NOT NULL,
    name text,
    status text DEFAULT 'active'::text NOT NULL,
    two_factor_enabled boolean DEFAULT false NOT NULL,
    two_factor_secret text
);


ALTER TABLE public.users OWNER TO kubidu;

--
-- Name: webhook_events; Type: TABLE; Schema: public; Owner: kubidu
--

CREATE TABLE public.webhook_events (
    id text NOT NULL,
    service_id text NOT NULL,
    provider text NOT NULL,
    event_type text NOT NULL,
    payload jsonb NOT NULL,
    signature text,
    processed boolean DEFAULT false NOT NULL,
    processed_at timestamp(3) without time zone,
    error text,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.webhook_events OWNER TO kubidu;

--
-- Data for Name: _prisma_migrations; Type: TABLE DATA; Schema: public; Owner: kubidu
--

COPY public._prisma_migrations (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count) FROM stdin;
846cdd40-1247-4988-8329-1b6cbf29fdab	4a4a9f2bc5eab1a3a1ba8f8cc8b1d7a79799c2b1dd78e5c93bd161a63d7b9383	2026-01-28 13:54:16.766324+00	20260128135416_initial_schema	\N	\N	2026-01-28 13:54:16.729376+00	1
cae2789d-879e-4c23-9f7e-286242bbb125	fdde460a2b5611c9e0c3df11add989c6e3fc9274544b9a50b893ed0bf89ce494	2026-01-28 13:56:57.132299+00	20260128135657_update_user_and_related_models	\N	\N	2026-01-28 13:56:57.128648+00	1
\.


--
-- Data for Name: api_keys; Type: TABLE DATA; Schema: public; Owner: kubidu
--

COPY public.api_keys (id, user_id, name, key_hash, expires_at, last_used_at, created_at, key_prefix, permissions, revoked_at) FROM stdin;
\.


--
-- Data for Name: audit_logs; Type: TABLE DATA; Schema: public; Owner: kubidu
--

COPY public.audit_logs (id, user_id, action, resource, resource_id, metadata, ip_address, user_agent, created_at) FROM stdin;
\.


--
-- Data for Name: build_queue; Type: TABLE DATA; Schema: public; Owner: kubidu
--

COPY public.build_queue (id, service_id, deployment_id, status, build_start_time, build_end_time, build_duration_seconds, error_message, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: deployments; Type: TABLE DATA; Schema: public; Owner: kubidu
--

COPY public.deployments (id, service_id, name, status, image_url, image_tag, build_logs, deployment_logs, git_commit_sha, git_commit_message, git_author, deployed_at, stopped_at, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: domains; Type: TABLE DATA; Schema: public; Owner: kubidu
--

COPY public.domains (id, deployment_id, domain, verification_code, is_verified, ssl_certificate, ssl_key, ssl_expires_at, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: environment_variables; Type: TABLE DATA; Schema: public; Owner: kubidu
--

COPY public.environment_variables (id, deployment_id, service_id, project_id, key, value_encrypted, value_iv, is_secret, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: gdpr_consents; Type: TABLE DATA; Schema: public; Owner: kubidu
--

COPY public.gdpr_consents (id, user_id, consent_type, created_at, consent_given, consent_version, ip_address, user_agent) FROM stdin;
567916cd-b8e8-4db4-b1ac-6e33ce2def8f	3efed087-321d-4d84-a10d-330ececac85f	terms_of_service	2026-01-28 13:58:32.71	t	1.0.0	::ffff:192.168.65.1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36
24f415c7-d40b-4538-8f55-5983f64a4dac	3efed087-321d-4d84-a10d-330ececac85f	privacy_policy	2026-01-28 13:58:32.71	t	1.0.0	::ffff:192.168.65.1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36
\.


--
-- Data for Name: gdpr_data_requests; Type: TABLE DATA; Schema: public; Owner: kubidu
--

COPY public.gdpr_data_requests (id, user_id, request_type, status, download_url, expires_at, completed_at, created_at) FROM stdin;
\.


--
-- Data for Name: invoices; Type: TABLE DATA; Schema: public; Owner: kubidu
--

COPY public.invoices (id, user_id, stripe_invoice_id, amount, currency, status, due_date, paid_at, created_at) FROM stdin;
\.


--
-- Data for Name: notifications; Type: TABLE DATA; Schema: public; Owner: kubidu
--

COPY public.notifications (id, user_id, type, title, message, read, read_at, created_at) FROM stdin;
\.


--
-- Data for Name: projects; Type: TABLE DATA; Schema: public; Owner: kubidu
--

COPY public.projects (id, user_id, name, slug, description, status, created_at, updated_at, deleted_at) FROM stdin;
13bfce02-2859-456a-bde3-47a7025555bf	3efed087-321d-4d84-a10d-330ececac85f	test	test	\N	active	2026-01-28 13:58:41.164	2026-01-28 13:58:41.164	\N
\.


--
-- Data for Name: services; Type: TABLE DATA; Schema: public; Owner: kubidu
--

COPY public.services (id, project_id, name, service_type, repository_url, repository_provider, repository_branch, docker_image, docker_tag, port, replicas, cpu_limit, memory_limit, cpu_request, memory_request, health_check_path, auto_deploy, status, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: subscriptions; Type: TABLE DATA; Schema: public; Owner: kubidu
--

COPY public.subscriptions (id, user_id, stripe_customer_id, stripe_subscription_id, status, current_period_start, current_period_end, canceled_at, created_at, updated_at, plan_name) FROM stdin;
1cbca278-9631-4b65-967e-61fa38308331	3efed087-321d-4d84-a10d-330ececac85f	\N	\N	active	\N	\N	\N	2026-01-28 13:58:32.711	2026-01-28 13:58:32.711	free
\.


--
-- Data for Name: usage_records; Type: TABLE DATA; Schema: public; Owner: kubidu
--

COPY public.usage_records (id, user_id, resource_type, amount, unit, recorded_at, billing_period, created_at) FROM stdin;
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: kubidu
--

COPY public.users (id, email, password_hash, created_at, updated_at, last_login_at, avatar_url, deleted_at, email_verified, name, status, two_factor_enabled, two_factor_secret) FROM stdin;
3efed087-321d-4d84-a10d-330ececac85f	mail@rstrobl.com	$2b$10$hOSRt6awuenAkXU/CuS1Pu50FzXOFy1/L.Eha1v8A3RnGw0tVF2/a	2026-01-28 13:58:32.708	2026-01-28 13:58:32.708	\N	\N	\N	f	Robert Strobl	active	f	\N
\.


--
-- Data for Name: webhook_events; Type: TABLE DATA; Schema: public; Owner: kubidu
--

COPY public.webhook_events (id, service_id, provider, event_type, payload, signature, processed, processed_at, error, created_at) FROM stdin;
\.


--
-- Name: _prisma_migrations _prisma_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: kubidu
--

ALTER TABLE ONLY public._prisma_migrations
    ADD CONSTRAINT _prisma_migrations_pkey PRIMARY KEY (id);


--
-- Name: api_keys api_keys_pkey; Type: CONSTRAINT; Schema: public; Owner: kubidu
--

ALTER TABLE ONLY public.api_keys
    ADD CONSTRAINT api_keys_pkey PRIMARY KEY (id);


--
-- Name: audit_logs audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: kubidu
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (id);


--
-- Name: build_queue build_queue_pkey; Type: CONSTRAINT; Schema: public; Owner: kubidu
--

ALTER TABLE ONLY public.build_queue
    ADD CONSTRAINT build_queue_pkey PRIMARY KEY (id);


--
-- Name: deployments deployments_pkey; Type: CONSTRAINT; Schema: public; Owner: kubidu
--

ALTER TABLE ONLY public.deployments
    ADD CONSTRAINT deployments_pkey PRIMARY KEY (id);


--
-- Name: domains domains_pkey; Type: CONSTRAINT; Schema: public; Owner: kubidu
--

ALTER TABLE ONLY public.domains
    ADD CONSTRAINT domains_pkey PRIMARY KEY (id);


--
-- Name: environment_variables environment_variables_pkey; Type: CONSTRAINT; Schema: public; Owner: kubidu
--

ALTER TABLE ONLY public.environment_variables
    ADD CONSTRAINT environment_variables_pkey PRIMARY KEY (id);


--
-- Name: gdpr_consents gdpr_consents_pkey; Type: CONSTRAINT; Schema: public; Owner: kubidu
--

ALTER TABLE ONLY public.gdpr_consents
    ADD CONSTRAINT gdpr_consents_pkey PRIMARY KEY (id);


--
-- Name: gdpr_data_requests gdpr_data_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: kubidu
--

ALTER TABLE ONLY public.gdpr_data_requests
    ADD CONSTRAINT gdpr_data_requests_pkey PRIMARY KEY (id);


--
-- Name: invoices invoices_pkey; Type: CONSTRAINT; Schema: public; Owner: kubidu
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_pkey PRIMARY KEY (id);


--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: kubidu
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- Name: projects projects_pkey; Type: CONSTRAINT; Schema: public; Owner: kubidu
--

ALTER TABLE ONLY public.projects
    ADD CONSTRAINT projects_pkey PRIMARY KEY (id);


--
-- Name: services services_pkey; Type: CONSTRAINT; Schema: public; Owner: kubidu
--

ALTER TABLE ONLY public.services
    ADD CONSTRAINT services_pkey PRIMARY KEY (id);


--
-- Name: subscriptions subscriptions_pkey; Type: CONSTRAINT; Schema: public; Owner: kubidu
--

ALTER TABLE ONLY public.subscriptions
    ADD CONSTRAINT subscriptions_pkey PRIMARY KEY (id);


--
-- Name: usage_records usage_records_pkey; Type: CONSTRAINT; Schema: public; Owner: kubidu
--

ALTER TABLE ONLY public.usage_records
    ADD CONSTRAINT usage_records_pkey PRIMARY KEY (id);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: kubidu
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: webhook_events webhook_events_pkey; Type: CONSTRAINT; Schema: public; Owner: kubidu
--

ALTER TABLE ONLY public.webhook_events
    ADD CONSTRAINT webhook_events_pkey PRIMARY KEY (id);


--
-- Name: domains_domain_key; Type: INDEX; Schema: public; Owner: kubidu
--

CREATE UNIQUE INDEX domains_domain_key ON public.domains USING btree (domain);


--
-- Name: users_email_key; Type: INDEX; Schema: public; Owner: kubidu
--

CREATE UNIQUE INDEX users_email_key ON public.users USING btree (email);


--
-- Name: api_keys api_keys_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: kubidu
--

ALTER TABLE ONLY public.api_keys
    ADD CONSTRAINT api_keys_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: deployments deployments_service_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: kubidu
--

ALTER TABLE ONLY public.deployments
    ADD CONSTRAINT deployments_service_id_fkey FOREIGN KEY (service_id) REFERENCES public.services(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: domains domains_deployment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: kubidu
--

ALTER TABLE ONLY public.domains
    ADD CONSTRAINT domains_deployment_id_fkey FOREIGN KEY (deployment_id) REFERENCES public.deployments(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: environment_variables environment_variables_deployment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: kubidu
--

ALTER TABLE ONLY public.environment_variables
    ADD CONSTRAINT environment_variables_deployment_id_fkey FOREIGN KEY (deployment_id) REFERENCES public.deployments(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: environment_variables environment_variables_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: kubidu
--

ALTER TABLE ONLY public.environment_variables
    ADD CONSTRAINT environment_variables_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: environment_variables environment_variables_service_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: kubidu
--

ALTER TABLE ONLY public.environment_variables
    ADD CONSTRAINT environment_variables_service_id_fkey FOREIGN KEY (service_id) REFERENCES public.services(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: projects projects_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: kubidu
--

ALTER TABLE ONLY public.projects
    ADD CONSTRAINT projects_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: services services_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: kubidu
--

ALTER TABLE ONLY public.services
    ADD CONSTRAINT services_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: SCHEMA public; Type: ACL; Schema: -; Owner: kubidu
--

REVOKE USAGE ON SCHEMA public FROM PUBLIC;


--
-- PostgreSQL database dump complete
--

\unrestrict uYrMIRwY5jCOIJhkrfgLDtHPj4eTgMRuaE7CXxbcojufCIlFBuksRoUx8JdMQ5r

