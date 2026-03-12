--
-- PostgreSQL database dump
--

\restrict ttZmeIMKYaELlAp2Frwdq1Z64HTsrJhC2oVXeTJWs2hVv4e8IFck1dyb2TDjqzk

-- Dumped from database version 15.17
-- Dumped by pg_dump version 18.3

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

--
-- Name: uuid-ossp; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public;


--
-- Name: EXTENSION "uuid-ossp"; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION "uuid-ossp" IS 'generate universally unique identifiers (UUIDs)';


--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: audit_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.audit_logs (
    id text NOT NULL,
    server_id text NOT NULL,
    user_id text,
    action text NOT NULL,
    target_id text,
    target_type text,
    details jsonb DEFAULT '{}'::jsonb,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: bans; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.bans (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    server_id uuid NOT NULL,
    user_id uuid NOT NULL,
    reason text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: categories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.categories (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    server_id uuid NOT NULL,
    name character varying(100) NOT NULL,
    "position" integer DEFAULT 0,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: channel_read_status; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.channel_read_status (
    id text NOT NULL,
    user_id text NOT NULL,
    channel_id text NOT NULL,
    last_read_message_id text,
    last_read_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: channels; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.channels (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    server_id uuid NOT NULL,
    category_id uuid,
    name character varying(100) NOT NULL,
    type character varying(20) DEFAULT 'text'::character varying,
    "position" integer DEFAULT 0,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT channels_type_check CHECK (((type)::text = ANY ((ARRAY['text'::character varying, 'voice'::character varying])::text[])))
);


--
-- Name: dm_channels; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dm_channels (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    user1_id uuid NOT NULL,
    user2_id uuid NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: dm_messages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dm_messages (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    channel_id uuid NOT NULL,
    sender_id uuid NOT NULL,
    content text,
    attachments jsonb DEFAULT '[]'::jsonb,
    is_read boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    edited_at timestamp without time zone
);


--
-- Name: friendships; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.friendships (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    user_id uuid NOT NULL,
    friend_id uuid NOT NULL,
    status character varying(20) DEFAULT 'pending'::character varying,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT friendships_status_check CHECK (((status)::text = ANY ((ARRAY['pending'::character varying, 'accepted'::character varying, 'blocked'::character varying])::text[])))
);


--
-- Name: invites; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.invites (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    server_id uuid NOT NULL,
    code character varying(20) NOT NULL,
    created_by uuid NOT NULL,
    expires_at timestamp without time zone,
    max_uses integer,
    uses integer DEFAULT 0,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    role_id text
);


--
-- Name: member_roles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.member_roles (
    id text NOT NULL,
    user_id text NOT NULL,
    server_id text NOT NULL,
    role_id text NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: messages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.messages (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    channel_id uuid NOT NULL,
    user_id uuid NOT NULL,
    content text,
    reply_to_id uuid,
    attachments jsonb DEFAULT '[]'::jsonb,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    edited_at timestamp without time zone,
    is_pinned boolean DEFAULT false,
    pinned_at timestamp without time zone,
    pinned_by text,
    forwarded_from text
);


--
-- Name: reactions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.reactions (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    message_id uuid NOT NULL,
    user_id uuid NOT NULL,
    emoji character varying(50) NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: role_channel_access; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.role_channel_access (
    id text NOT NULL,
    role_id text NOT NULL,
    channel_id text NOT NULL,
    is_allowed boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: server_members; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.server_members (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    server_id uuid NOT NULL,
    user_id uuid NOT NULL,
    role character varying(20) DEFAULT 'member'::character varying,
    joined_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    join_method text DEFAULT 'manual'::text,
    CONSTRAINT server_members_role_check CHECK (((role)::text = ANY ((ARRAY['owner'::character varying, 'admin'::character varying, 'moderator'::character varying, 'member'::character varying])::text[])))
);


--
-- Name: server_roles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.server_roles (
    id text NOT NULL,
    server_id text NOT NULL,
    name text NOT NULL,
    color text DEFAULT '#99aab5'::text,
    permissions integer DEFAULT 0,
    "position" integer DEFAULT 0,
    is_default boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: servers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.servers (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    name character varying(100) NOT NULL,
    icon character varying(500),
    owner_id uuid NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: user_server_access; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_server_access (
    id text NOT NULL,
    user_id text NOT NULL,
    server_id text NOT NULL,
    access_level text DEFAULT 'read'::text,
    granted_by text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    is_allowed boolean DEFAULT true
);


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    username character varying(32) NOT NULL,
    email character varying(255) NOT NULL,
    password character varying(255) NOT NULL,
    avatar character varying(500),
    status character varying(20) DEFAULT 'offline'::character varying,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    is_master_admin boolean DEFAULT false,
    display_name text,
    joined_via_group_code text,
    token_version integer DEFAULT 0,
    badges text DEFAULT '[]'::text,
    force_password_change boolean DEFAULT false,
    is_active integer DEFAULT 1,
    last_login timestamp without time zone,
    last_login_ip text,
    CONSTRAINT users_status_check CHECK (((status)::text = ANY ((ARRAY['online'::character varying, 'offline'::character varying, 'idle'::character varying, 'dnd'::character varying])::text[])))
);


--
-- Name: voice_participants; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.voice_participants (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    channel_id uuid NOT NULL,
    user_id uuid NOT NULL,
    is_muted boolean DEFAULT false,
    is_deafened boolean DEFAULT false,
    joined_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: voice_signaling_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.voice_signaling_logs (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    channel_id uuid NOT NULL,
    user_id uuid NOT NULL,
    event_type character varying(50) NOT NULL,
    data jsonb DEFAULT '{}'::jsonb,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Data for Name: audit_logs; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.audit_logs (id, server_id, user_id, action, target_id, target_type, details, created_at) FROM stdin;
\.


--
-- Data for Name: bans; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.bans (id, server_id, user_id, reason, created_at) FROM stdin;
\.


--
-- Data for Name: categories; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.categories (id, server_id, name, "position", created_at) FROM stdin;
455726e3-5697-4f33-9674-37184bcd790a	0a43478c-c72d-4cbc-ab98-4821b9d87e20	Operasional	2	2026-03-09 01:35:19.001645
\.


--
-- Data for Name: channel_read_status; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.channel_read_status (id, user_id, channel_id, last_read_message_id, last_read_at) FROM stdin;
bdd66f01-1090-4bb6-a4fe-781e3703be54	fdb2d856-d33f-40de-92a4-8a0753ab26b9	7be573b7-e8c3-40e2-a5d4-64508b223209	80f65c40-3229-4564-bf6e-6456f4e1d856	2026-03-11 22:22:30.879664
\.


--
-- Data for Name: channels; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.channels (id, server_id, category_id, name, type, "position", created_at) FROM stdin;
7be573b7-e8c3-40e2-a5d4-64508b223209	0a43478c-c72d-4cbc-ab98-4821b9d87e20	455726e3-5697-4f33-9674-37184bcd790a	Operasional	text	0	2026-03-09 01:44:40.218387
410407e2-3883-4ec3-b84d-b43622e60016	0a43478c-c72d-4cbc-ab98-4821b9d87e20	455726e3-5697-4f33-9674-37184bcd790a	kendala deposit	text	0	2026-03-09 01:44:55.556139
018ca1d3-2771-49f6-9720-140750142fc0	0a43478c-c72d-4cbc-ab98-4821b9d87e20	455726e3-5697-4f33-9674-37184bcd790a	report izin	text	0	2026-03-09 01:45:06.052753
d84436c1-a157-406a-993e-904822634622	0a43478c-c72d-4cbc-ab98-4821b9d87e20	455726e3-5697-4f33-9674-37184bcd790a	depo up 5 juta	text	0	2026-03-09 01:45:14.581941
f9fbf525-b604-4a83-b7f8-efaf3bd3e710	0a43478c-c72d-4cbc-ab98-4821b9d87e20	455726e3-5697-4f33-9674-37184bcd790a	info bank gangguan	text	0	2026-03-09 01:45:22.938958
3c1e6c33-a21c-4990-bac3-8b41ae4fab10	0a43478c-c72d-4cbc-ab98-4821b9d87e20	455726e3-5697-4f33-9674-37184bcd790a	auditor	text	0	2026-03-09 01:45:42.719986
446e7c5b-9eaf-47ec-ac8c-7232152d07ce	0a43478c-c72d-4cbc-ab98-4821b9d87e20	455726e3-5697-4f33-9674-37184bcd790a	absen harian	text	0	2026-03-09 01:45:51.287561
f4d9e109-12d1-49f1-94a2-dea6eb19bef0	0a43478c-c72d-4cbc-ab98-4821b9d87e20	455726e3-5697-4f33-9674-37184bcd790a	change shift	text	0	2026-03-09 01:46:00.489369
7bc9964f-6ce8-40e5-a415-8c7f5e34a92b	0a43478c-c72d-4cbc-ab98-4821b9d87e20	455726e3-5697-4f33-9674-37184bcd790a	pinjam motor	text	0	2026-03-09 01:46:12.409575
0138ad76-920e-4818-84f5-cc0495382d84	0a43478c-c72d-4cbc-ab98-4821b9d87e20	455726e3-5697-4f33-9674-37184bcd790a	audit izin	text	0	2026-03-09 01:46:22.841
\.


--
-- Data for Name: dm_channels; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.dm_channels (id, user1_id, user2_id, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: dm_messages; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.dm_messages (id, channel_id, sender_id, content, attachments, is_read, created_at, edited_at) FROM stdin;
\.


--
-- Data for Name: friendships; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.friendships (id, user_id, friend_id, status, created_at, updated_at) FROM stdin;
097cd28e-522d-468e-81bf-da68576a7730	fdb2d856-d33f-40de-92a4-8a0753ab26b9	57f5acbb-339c-4c6c-a0a2-bbeb786757c3	accepted	2026-03-10 01:56:11.978033	2026-03-10 01:56:11.978033
878d7997-b419-4491-a449-aabe1b2ca3de	57f5acbb-339c-4c6c-a0a2-bbeb786757c3	fdb2d856-d33f-40de-92a4-8a0753ab26b9	accepted	2026-03-10 01:56:12.000345	2026-03-10 01:56:12.000345
b705847e-f5b3-4e85-aed3-5b9125707586	fdb2d856-d33f-40de-92a4-8a0753ab26b9	1e665798-6255-4bc8-9963-61a552fa3cb7	pending	2026-03-10 20:47:38.35428	2026-03-10 20:47:38.35428
d9376340-827b-4a72-ab27-cb826d167e3b	57f5acbb-339c-4c6c-a0a2-bbeb786757c3	1ec429a4-fccb-4ab4-bba1-76dd301012e2	pending	2026-03-11 19:26:49.660432	2026-03-11 19:26:49.660432
\.


--
-- Data for Name: invites; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.invites (id, server_id, code, created_by, expires_at, max_uses, uses, created_at, role_id) FROM stdin;
\.


--
-- Data for Name: member_roles; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.member_roles (id, user_id, server_id, role_id, created_at) FROM stdin;
f50aae2c-c184-4698-9a66-d5433c6405be	fdb2d856-d33f-40de-92a4-8a0753ab26b9	0a43478c-c72d-4cbc-ab98-4821b9d87e20	11ed33bd-eb6d-45ae-bffb-37cc60005b82	2026-03-09 04:19:35.252409
60cefa4f-0769-46cc-b553-2c2cc73c0781	1ec429a4-fccb-4ab4-bba1-76dd301012e2	0a43478c-c72d-4cbc-ab98-4821b9d87e20	476bde5d-a814-4835-9c6b-1c9c2689783b	2026-03-11 00:52:13.183112
f1a11ba0-8948-46ea-b44e-d484432444c9	57f5acbb-339c-4c6c-a0a2-bbeb786757c3	0a43478c-c72d-4cbc-ab98-4821b9d87e20	76a22680-3bd1-470c-b0f6-4fcfc781277b	2026-03-11 02:30:31.813705
\.


--
-- Data for Name: messages; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.messages (id, channel_id, user_id, content, reply_to_id, attachments, created_at, edited_at, is_pinned, pinned_at, pinned_by, forwarded_from) FROM stdin;
3cf651e8-dc84-4dc2-962e-f2c09072edc4	7be573b7-e8c3-40e2-a5d4-64508b223209	fdb2d856-d33f-40de-92a4-8a0753ab26b9		\N	[{"url": "https://media4.giphy.com/media/v1.Y2lkPTlkYjFmMTA2a25qZzltc3QwZWltcG91Nmk1OHg1Mjh2NHp1dndvcDdudmJuZnpldSZlcD12MV9naWZzX3NlYXJjaCZjdD1n/LPFNd1AJBoYcVUExmE/200_d.gif", "size": 0, "width": 300, "filename": "gif_1773020839675.gif", "mimetype": "image/gif", "originalName": "Lizard Hello GIF"}]	2026-03-09 01:47:20.334804	\N	f	\N	\N	\N
2ebcef8a-1f5d-40fe-979c-118ce22e90ca	7be573b7-e8c3-40e2-a5d4-64508b223209	fdb2d856-d33f-40de-92a4-8a0753ab26b9		\N	[{"url": "https://media3.giphy.com/media/v1.Y2lkPTlkYjFmMTA2NjlvbWI2ZDB6d3NwMHozcDg5MmxvcGN2eGp2amQwemVseXlmcmV0diZlcD12MV9naWZzX3NlYXJjaCZjdD1n/IcGkqdUmYLFGE/200_d.gif", "size": 0, "width": 300, "filename": "gif_1773029937510.gif", "mimetype": "image/gif", "originalName": "Sad The Office GIF"}]	2026-03-09 04:18:57.844307	\N	f	\N	\N	\N
e74d50e1-0a8a-42e8-9f1b-b25db9f8ba05	7be573b7-e8c3-40e2-a5d4-64508b223209	57f5acbb-339c-4c6c-a0a2-bbeb786757c3	AA	\N	[]	2026-03-10 01:47:04.556599	\N	f	\N	\N	\N
6330bd67-aef5-4d8e-b7ff-5ec9bbb9b4d2	7be573b7-e8c3-40e2-a5d4-64508b223209	57f5acbb-339c-4c6c-a0a2-bbeb786757c3	oke	\N	[]	2026-03-10 04:18:45.593583	\N	f	\N	\N	\N
eedd6dad-2406-4125-895a-a1c26418208b	7be573b7-e8c3-40e2-a5d4-64508b223209	57f5acbb-339c-4c6c-a0a2-bbeb786757c3	asdas	\N	[]	2026-03-10 04:18:47.808624	\N	f	\N	\N	\N
dc38feda-705b-4635-b83a-0ded5325b0d3	446e7c5b-9eaf-47ec-ac8c-7232152d07ce	57f5acbb-339c-4c6c-a0a2-bbeb786757c3	<@everyone>	\N	[]	2026-03-10 20:30:37.59911	\N	f	\N	\N	\N
1966af61-e911-4da7-b155-1e4d6d5bec1a	446e7c5b-9eaf-47ec-ac8c-7232152d07ce	57f5acbb-339c-4c6c-a0a2-bbeb786757c3	<@fdb2d856-d33f-40de-92a4-8a0753ab26b9>	\N	[]	2026-03-10 20:30:47.42434	\N	f	\N	\N	\N
84ce14ae-e4b5-408d-b879-464f491cb891	7be573b7-e8c3-40e2-a5d4-64508b223209	1e665798-6255-4bc8-9963-61a552fa3cb7	HALLO	\N	[]	2026-03-10 01:54:32.957747	\N	t	2026-03-10 21:53:48.584699	fdb2d856-d33f-40de-92a4-8a0753ab26b9	\N
5e7dca18-6374-45d7-9fc5-c47746839cc6	7be573b7-e8c3-40e2-a5d4-64508b223209	fdb2d856-d33f-40de-92a4-8a0753ab26b9	<@1ec429a4-fccb-4ab4-bba1-76dd301012e2>	\N	[]	2026-03-11 00:45:40.099183	\N	f	\N	\N	\N
4ea51e18-ac58-4056-8fde-44b896f70ca1	7be573b7-e8c3-40e2-a5d4-64508b223209	fdb2d856-d33f-40de-92a4-8a0753ab26b9		\N	[{"url": "https://media4.giphy.com/media/v1.Y2lkPTlkYjFmMTA2azBoZ3J5MW1vOHY4ZWhjbnJ2eTQ1OTlxOGl4bXg3Zm43ZDd5c2ZlZSZlcD12MV9naWZzX3NlYXJjaCZjdD1n/LPFNd1AJBoYcVUExmE/200_d.gif", "size": 0, "width": 300, "filename": "gif_1773189949623.gif", "mimetype": "image/gif", "originalName": "Lizard Hello GIF"}]	2026-03-11 00:45:50.157578	\N	f	\N	\N	\N
148cb872-dbef-47cf-8442-8dc00dfb3762	7be573b7-e8c3-40e2-a5d4-64508b223209	fdb2d856-d33f-40de-92a4-8a0753ab26b9	A	\N	[]	2026-03-11 00:47:14.398842	\N	f	\N	\N	\N
56f90f30-38ba-4a72-aafd-4999c3c2e3c9	7be573b7-e8c3-40e2-a5d4-64508b223209	fdb2d856-d33f-40de-92a4-8a0753ab26b9	AA	\N	[]	2026-03-11 00:47:40.745227	\N	f	\N	\N	\N
906c56e6-fa83-4859-a86e-4802e856088e	7be573b7-e8c3-40e2-a5d4-64508b223209	1ec429a4-fccb-4ab4-bba1-76dd301012e2	g	\N	[]	2026-03-11 00:48:16.118826	\N	f	\N	\N	\N
bcec109f-5ba9-4975-93c3-a6423655ea5e	7be573b7-e8c3-40e2-a5d4-64508b223209	fdb2d856-d33f-40de-92a4-8a0753ab26b9	<@1ec429a4-fccb-4ab4-bba1-76dd301012e2>	\N	[]	2026-03-11 00:48:56.915149	\N	f	\N	\N	\N
247c6d3a-4458-43ba-b306-e3067443a755	7be573b7-e8c3-40e2-a5d4-64508b223209	fdb2d856-d33f-40de-92a4-8a0753ab26b9	asas	\N	[]	2026-03-11 00:48:59.452874	\N	f	\N	\N	\N
80f65c40-3229-4564-bf6e-6456f4e1d856	7be573b7-e8c3-40e2-a5d4-64508b223209	fdb2d856-d33f-40de-92a4-8a0753ab26b9	asdas	\N	[]	2026-03-11 00:49:00.863493	\N	f	\N	\N	\N
\.


--
-- Data for Name: reactions; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.reactions (id, message_id, user_id, emoji, created_at) FROM stdin;
\.


--
-- Data for Name: role_channel_access; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.role_channel_access (id, role_id, channel_id, is_allowed, created_at) FROM stdin;
\.


--
-- Data for Name: server_members; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.server_members (id, server_id, user_id, role, joined_at, join_method) FROM stdin;
7a5b3a1d-c099-467a-ab2d-f717b608c2c6	0a43478c-c72d-4cbc-ab98-4821b9d87e20	fdb2d856-d33f-40de-92a4-8a0753ab26b9	owner	2026-03-08 21:35:48.249022	invite
f22093ae-1b55-4eff-9569-b30be57f3509	0a43478c-c72d-4cbc-ab98-4821b9d87e20	57f5acbb-339c-4c6c-a0a2-bbeb786757c3	member	2026-03-10 00:00:24.469026	Manual
9b0324e5-ffd0-43dc-bd28-808f60347424	0a43478c-c72d-4cbc-ab98-4821b9d87e20	1e665798-6255-4bc8-9963-61a552fa3cb7	member	2026-03-10 01:54:28.696646	Manual
998e6cb4-9355-4a75-bdb9-200e216d3790	0a43478c-c72d-4cbc-ab98-4821b9d87e20	1ec429a4-fccb-4ab4-bba1-76dd301012e2	member	2026-03-11 00:45:18.41812	Manual
\.


--
-- Data for Name: server_roles; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.server_roles (id, server_id, name, color, permissions, "position", is_default, created_at) FROM stdin;
824bb6ee-28b8-4223-a527-fbb84d7d66dc	0a43478c-c72d-4cbc-ab98-4821b9d87e20	OPERATOR	#00d4ff	0	4	f	2026-03-10 01:29:34.93913
3c4cf103-5c18-417b-ab44-83ff5d7973a9	0a43478c-c72d-4cbc-ab98-4821b9d87e20	KAPTEN KASIR	#9b59b6	0	2	f	2026-03-10 01:29:52.918091
476bde5d-a814-4835-9c6b-1c9c2689783b	0a43478c-c72d-4cbc-ab98-4821b9d87e20	JEBOLTOGEL	#2ecc71	0	1	f	2026-03-11 00:52:04.521104
76a22680-3bd1-470c-b0f6-4fcfc781277b	0a43478c-c72d-4cbc-ab98-4821b9d87e20	CS	#f1c40f	0	3	f	2026-03-10 01:29:43.84599
11ed33bd-eb6d-45ae-bffb-37cc60005b82	0a43478c-c72d-4cbc-ab98-4821b9d87e20	SPV	#3498db	511	5	f	2026-03-09 04:19:31.332536
\.


--
-- Data for Name: servers; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.servers (id, name, icon, owner_id, created_at, updated_at) FROM stdin;
0a43478c-c72d-4cbc-ab98-4821b9d87e20	JEBOLTOGEL	/uploads/file-1773095635550-657796768.jpg	fdb2d856-d33f-40de-92a4-8a0753ab26b9	2026-03-08 21:35:48.241769	2026-03-09 22:35:34.308502
\.


--
-- Data for Name: user_server_access; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.user_server_access (id, user_id, server_id, access_level, granted_by, created_at, is_allowed) FROM stdin;
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.users (id, username, email, password, avatar, status, created_at, updated_at, is_master_admin, display_name, joined_via_group_code, token_version, badges, force_password_change, is_active, last_login, last_login_ip) FROM stdin;
1e665798-6255-4bc8-9963-61a552fa3cb7	jebolkasir2	jebolkasir2@gmail.com	$2b$10$lGltMIhAgeKhoGyEDcjtoO00Jr/nPi4ouvAvWgnUwg.ndYDq07pxu	https://api.dicebear.com/7.x/avataaars/svg?seed=jebolkasir2	offline	2026-03-10 01:54:28.687745	2026-03-11 22:22:11.007662	f	\N	\N	0	[]	f	1	\N	\N
1ec429a4-fccb-4ab4-bba1-76dd301012e2	jebolkasir77	jebolkasir77@gmail.com	$2b$10$ypHL.boloONJhRHtUsL3k.BM3CFsuFHyY.RDCnU6UvVognFnO.uBG	https://api.dicebear.com/7.x/avataaars/svg?seed=jebolkasir77	offline	2026-03-11 00:45:18.402921	2026-03-11 22:22:11.007662	f	\N	\N	0	[]	f	1	\N	\N
57f5acbb-339c-4c6c-a0a2-bbeb786757c3	jebolkasir1	jebolkasir1@gmail.com	$2b$10$/R6PPS6h1y7aG/lPkKsoG.eFFmUatzW067RPr3NBMRqOeIWae.6Rm	/uploads/file-1773100869010-319086324.jpg	offline	2026-03-10 00:00:24.461983	2026-03-11 22:22:11.007662	f	\N	\N	0	[]	f	1	\N	\N
fdb2d856-d33f-40de-92a4-8a0753ab26b9	Admin	admin@workgrid.com	$2b$10$t0wvYEqsQQKkXPl2NaHrR.lpN0kk5Nqw.V5X45vZFUAyo7tMawLXS	/uploads/file-1773021718134-99691555.jpg	online	2026-03-08 20:13:55.947512	2026-03-12 01:56:40.049838	t	\N	\N	0	[]	f	1	\N	\N
\.


--
-- Data for Name: voice_participants; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.voice_participants (id, channel_id, user_id, is_muted, is_deafened, joined_at) FROM stdin;
\.


--
-- Data for Name: voice_signaling_logs; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.voice_signaling_logs (id, channel_id, user_id, event_type, data, created_at) FROM stdin;
\.


--
-- Name: audit_logs audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (id);


--
-- Name: bans bans_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bans
    ADD CONSTRAINT bans_pkey PRIMARY KEY (id);


--
-- Name: bans bans_server_id_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bans
    ADD CONSTRAINT bans_server_id_user_id_key UNIQUE (server_id, user_id);


--
-- Name: categories categories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_pkey PRIMARY KEY (id);


--
-- Name: channel_read_status channel_read_status_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.channel_read_status
    ADD CONSTRAINT channel_read_status_pkey PRIMARY KEY (id);


--
-- Name: channel_read_status channel_read_status_user_id_channel_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.channel_read_status
    ADD CONSTRAINT channel_read_status_user_id_channel_id_key UNIQUE (user_id, channel_id);


--
-- Name: channels channels_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.channels
    ADD CONSTRAINT channels_pkey PRIMARY KEY (id);


--
-- Name: dm_channels dm_channels_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dm_channels
    ADD CONSTRAINT dm_channels_pkey PRIMARY KEY (id);


--
-- Name: dm_channels dm_channels_user1_id_user2_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dm_channels
    ADD CONSTRAINT dm_channels_user1_id_user2_id_key UNIQUE (user1_id, user2_id);


--
-- Name: dm_messages dm_messages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dm_messages
    ADD CONSTRAINT dm_messages_pkey PRIMARY KEY (id);


--
-- Name: friendships friendships_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.friendships
    ADD CONSTRAINT friendships_pkey PRIMARY KEY (id);


--
-- Name: friendships friendships_user_id_friend_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.friendships
    ADD CONSTRAINT friendships_user_id_friend_id_key UNIQUE (user_id, friend_id);


--
-- Name: invites invites_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invites
    ADD CONSTRAINT invites_code_key UNIQUE (code);


--
-- Name: invites invites_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invites
    ADD CONSTRAINT invites_pkey PRIMARY KEY (id);


--
-- Name: member_roles member_roles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.member_roles
    ADD CONSTRAINT member_roles_pkey PRIMARY KEY (id);


--
-- Name: member_roles member_roles_user_id_server_id_role_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.member_roles
    ADD CONSTRAINT member_roles_user_id_server_id_role_id_key UNIQUE (user_id, server_id, role_id);


--
-- Name: messages messages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_pkey PRIMARY KEY (id);


--
-- Name: reactions reactions_message_id_user_id_emoji_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reactions
    ADD CONSTRAINT reactions_message_id_user_id_emoji_key UNIQUE (message_id, user_id, emoji);


--
-- Name: reactions reactions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reactions
    ADD CONSTRAINT reactions_pkey PRIMARY KEY (id);


--
-- Name: role_channel_access role_channel_access_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.role_channel_access
    ADD CONSTRAINT role_channel_access_pkey PRIMARY KEY (id);


--
-- Name: role_channel_access role_channel_access_role_id_channel_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.role_channel_access
    ADD CONSTRAINT role_channel_access_role_id_channel_id_key UNIQUE (role_id, channel_id);


--
-- Name: server_members server_members_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.server_members
    ADD CONSTRAINT server_members_pkey PRIMARY KEY (id);


--
-- Name: server_members server_members_server_id_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.server_members
    ADD CONSTRAINT server_members_server_id_user_id_key UNIQUE (server_id, user_id);


--
-- Name: server_roles server_roles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.server_roles
    ADD CONSTRAINT server_roles_pkey PRIMARY KEY (id);


--
-- Name: servers servers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.servers
    ADD CONSTRAINT servers_pkey PRIMARY KEY (id);


--
-- Name: user_server_access user_server_access_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_server_access
    ADD CONSTRAINT user_server_access_pkey PRIMARY KEY (id);


--
-- Name: user_server_access user_server_access_user_id_server_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_server_access
    ADD CONSTRAINT user_server_access_user_id_server_id_key UNIQUE (user_id, server_id);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: users users_username_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key UNIQUE (username);


--
-- Name: voice_participants voice_participants_channel_id_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.voice_participants
    ADD CONSTRAINT voice_participants_channel_id_user_id_key UNIQUE (channel_id, user_id);


--
-- Name: voice_participants voice_participants_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.voice_participants
    ADD CONSTRAINT voice_participants_pkey PRIMARY KEY (id);


--
-- Name: voice_signaling_logs voice_signaling_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.voice_signaling_logs
    ADD CONSTRAINT voice_signaling_logs_pkey PRIMARY KEY (id);


--
-- Name: idx_audit_logs_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_logs_created ON public.audit_logs USING btree (created_at DESC);


--
-- Name: idx_audit_logs_server; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_logs_server ON public.audit_logs USING btree (server_id);


--
-- Name: idx_bans_server_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bans_server_id ON public.bans USING btree (server_id);


--
-- Name: idx_bans_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bans_user_id ON public.bans USING btree (user_id);


--
-- Name: idx_categories_position; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_categories_position ON public.categories USING btree (server_id, "position");


--
-- Name: idx_categories_server_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_categories_server_id ON public.categories USING btree (server_id);


--
-- Name: idx_channel_read_channel; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_channel_read_channel ON public.channel_read_status USING btree (channel_id);


--
-- Name: idx_channel_read_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_channel_read_user ON public.channel_read_status USING btree (user_id);


--
-- Name: idx_channels_category_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_channels_category_id ON public.channels USING btree (category_id);


--
-- Name: idx_channels_position; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_channels_position ON public.channels USING btree (server_id, "position");


--
-- Name: idx_channels_server_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_channels_server_id ON public.channels USING btree (server_id);


--
-- Name: idx_dm_channels_user1; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dm_channels_user1 ON public.dm_channels USING btree (user1_id);


--
-- Name: idx_dm_channels_user2; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dm_channels_user2 ON public.dm_channels USING btree (user2_id);


--
-- Name: idx_dm_messages_channel_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dm_messages_channel_created ON public.dm_messages USING btree (channel_id, created_at DESC);


--
-- Name: idx_dm_messages_channel_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dm_messages_channel_id ON public.dm_messages USING btree (channel_id);


--
-- Name: idx_dm_messages_sender_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dm_messages_sender_id ON public.dm_messages USING btree (sender_id);


--
-- Name: idx_friendships_friend_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_friendships_friend_id ON public.friendships USING btree (friend_id);


--
-- Name: idx_friendships_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_friendships_status ON public.friendships USING btree (status);


--
-- Name: idx_friendships_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_friendships_user_id ON public.friendships USING btree (user_id);


--
-- Name: idx_invites_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_invites_code ON public.invites USING btree (code);


--
-- Name: idx_invites_server_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_invites_server_id ON public.invites USING btree (server_id);


--
-- Name: idx_member_roles_role; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_member_roles_role ON public.member_roles USING btree (role_id);


--
-- Name: idx_member_roles_server; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_member_roles_server ON public.member_roles USING btree (server_id);


--
-- Name: idx_member_roles_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_member_roles_user ON public.member_roles USING btree (user_id);


--
-- Name: idx_messages_channel_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_messages_channel_created ON public.messages USING btree (channel_id, created_at DESC);


--
-- Name: idx_messages_channel_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_messages_channel_id ON public.messages USING btree (channel_id);


--
-- Name: idx_messages_reply_to; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_messages_reply_to ON public.messages USING btree (reply_to_id);


--
-- Name: idx_messages_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_messages_user_id ON public.messages USING btree (user_id);


--
-- Name: idx_reactions_message_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_reactions_message_id ON public.reactions USING btree (message_id);


--
-- Name: idx_reactions_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_reactions_user_id ON public.reactions USING btree (user_id);


--
-- Name: idx_server_members_server_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_server_members_server_id ON public.server_members USING btree (server_id);


--
-- Name: idx_server_members_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_server_members_user_id ON public.server_members USING btree (user_id);


--
-- Name: idx_server_roles_server; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_server_roles_server ON public.server_roles USING btree (server_id);


--
-- Name: idx_users_email; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_email ON public.users USING btree (email);


--
-- Name: idx_users_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_status ON public.users USING btree (status);


--
-- Name: idx_users_username; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_username ON public.users USING btree (username);


--
-- Name: idx_voice_participants_channel_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_voice_participants_channel_id ON public.voice_participants USING btree (channel_id);


--
-- Name: idx_voice_participants_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_voice_participants_user_id ON public.voice_participants USING btree (user_id);


--
-- Name: idx_voice_signaling_logs_channel_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_voice_signaling_logs_channel_id ON public.voice_signaling_logs USING btree (channel_id);


--
-- Name: idx_voice_signaling_logs_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_voice_signaling_logs_created_at ON public.voice_signaling_logs USING btree (created_at);


--
-- Name: idx_voice_signaling_logs_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_voice_signaling_logs_user_id ON public.voice_signaling_logs USING btree (user_id);


--
-- Name: dm_channels update_dm_channels_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_dm_channels_updated_at BEFORE UPDATE ON public.dm_channels FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: friendships update_friendships_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_friendships_updated_at BEFORE UPDATE ON public.friendships FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: servers update_servers_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_servers_updated_at BEFORE UPDATE ON public.servers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: users update_users_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: bans bans_server_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bans
    ADD CONSTRAINT bans_server_id_fkey FOREIGN KEY (server_id) REFERENCES public.servers(id) ON DELETE CASCADE;


--
-- Name: bans bans_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bans
    ADD CONSTRAINT bans_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: categories categories_server_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_server_id_fkey FOREIGN KEY (server_id) REFERENCES public.servers(id) ON DELETE CASCADE;


--
-- Name: channels channels_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.channels
    ADD CONSTRAINT channels_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(id) ON DELETE SET NULL;


--
-- Name: channels channels_server_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.channels
    ADD CONSTRAINT channels_server_id_fkey FOREIGN KEY (server_id) REFERENCES public.servers(id) ON DELETE CASCADE;


--
-- Name: dm_channels dm_channels_user1_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dm_channels
    ADD CONSTRAINT dm_channels_user1_id_fkey FOREIGN KEY (user1_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: dm_channels dm_channels_user2_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dm_channels
    ADD CONSTRAINT dm_channels_user2_id_fkey FOREIGN KEY (user2_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: dm_messages dm_messages_channel_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dm_messages
    ADD CONSTRAINT dm_messages_channel_id_fkey FOREIGN KEY (channel_id) REFERENCES public.dm_channels(id) ON DELETE CASCADE;


--
-- Name: dm_messages dm_messages_sender_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dm_messages
    ADD CONSTRAINT dm_messages_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: friendships friendships_friend_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.friendships
    ADD CONSTRAINT friendships_friend_id_fkey FOREIGN KEY (friend_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: friendships friendships_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.friendships
    ADD CONSTRAINT friendships_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: invites invites_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invites
    ADD CONSTRAINT invites_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: invites invites_server_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invites
    ADD CONSTRAINT invites_server_id_fkey FOREIGN KEY (server_id) REFERENCES public.servers(id) ON DELETE CASCADE;


--
-- Name: messages messages_channel_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_channel_id_fkey FOREIGN KEY (channel_id) REFERENCES public.channels(id) ON DELETE CASCADE;


--
-- Name: messages messages_reply_to_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_reply_to_id_fkey FOREIGN KEY (reply_to_id) REFERENCES public.messages(id) ON DELETE SET NULL;


--
-- Name: messages messages_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: reactions reactions_message_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reactions
    ADD CONSTRAINT reactions_message_id_fkey FOREIGN KEY (message_id) REFERENCES public.messages(id) ON DELETE CASCADE;


--
-- Name: reactions reactions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reactions
    ADD CONSTRAINT reactions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: server_members server_members_server_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.server_members
    ADD CONSTRAINT server_members_server_id_fkey FOREIGN KEY (server_id) REFERENCES public.servers(id) ON DELETE CASCADE;


--
-- Name: server_members server_members_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.server_members
    ADD CONSTRAINT server_members_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: servers servers_owner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.servers
    ADD CONSTRAINT servers_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: voice_participants voice_participants_channel_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.voice_participants
    ADD CONSTRAINT voice_participants_channel_id_fkey FOREIGN KEY (channel_id) REFERENCES public.channels(id) ON DELETE CASCADE;


--
-- Name: voice_participants voice_participants_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.voice_participants
    ADD CONSTRAINT voice_participants_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict ttZmeIMKYaELlAp2Frwdq1Z64HTsrJhC2oVXeTJWs2hVv4e8IFck1dyb2TDjqzk

