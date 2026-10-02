--
-- PostgreSQL database dump
--

\restrict 8cJFdqV9eHaQncfYGUdafqxipNaRvpPDAfTSLFv9nHVYpuvFJxUAwPfmuycE0Cf

-- Dumped from database version 18.6
-- Dumped by pg_dump version 18.6

-- Started on 2026-10-02 13:16:35

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
-- TOC entry 889 (class 1247 OID 16390)
-- Name: tipo_estado; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.tipo_estado AS ENUM (
    'en_progreso',
    'completado'
);


ALTER TYPE public.tipo_estado OWNER TO postgres;

--
-- TOC entry 256 (class 1255 OID 16740)
-- Name: touch_actualizado_en(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.touch_actualizado_en() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
        BEGIN NEW.actualizado_en = NOW(); RETURN NEW; END; $$;


ALTER FUNCTION public.touch_actualizado_en() OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- TOC entry 230 (class 1259 OID 16572)
-- Name: actividades_criticas; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.actividades_criticas (
    id integer NOT NULL,
    nombre character varying(120) NOT NULL,
    descripcion text,
    tipo_interaccion character varying(50),
    proyecto_id integer
);


ALTER TABLE public.actividades_criticas OWNER TO postgres;

--
-- TOC entry 229 (class 1259 OID 16571)
-- Name: actividades_criticas_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.actividades_criticas_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.actividades_criticas_id_seq OWNER TO postgres;

--
-- TOC entry 5279 (class 0 OID 0)
-- Dependencies: 229
-- Name: actividades_criticas_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.actividades_criticas_id_seq OWNED BY public.actividades_criticas.id;


--
-- TOC entry 231 (class 1259 OID 16584)
-- Name: actividades_habilidades; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.actividades_habilidades (
    actividad_id integer NOT NULL,
    habilidad_id integer NOT NULL,
    peso numeric(5,2) DEFAULT 1.0
);


ALTER TABLE public.actividades_habilidades OWNER TO postgres;

--
-- TOC entry 253 (class 1259 OID 24802)
-- Name: avance_rutas; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.avance_rutas (
    id integer NOT NULL,
    alumno_id integer NOT NULL,
    ruta_id integer NOT NULL,
    estado_general public.tipo_estado DEFAULT 'en_progreso'::public.tipo_estado,
    detalle_avance jsonb DEFAULT '{}'::jsonb NOT NULL,
    actualizado_en timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.avance_rutas OWNER TO postgres;

--
-- TOC entry 252 (class 1259 OID 24801)
-- Name: avance_rutas_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE public.avance_rutas ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.avance_rutas_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- TOC entry 255 (class 1259 OID 24822)
-- Name: calificaciones; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.calificaciones (
    id integer NOT NULL,
    alumno_id integer NOT NULL,
    practica_id integer NOT NULL,
    calificacion_final numeric(5,2),
    respuestas_alumno jsonb DEFAULT '{}'::jsonb NOT NULL,
    fecha_realizacion timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT calificaciones_calificacion_final_check CHECK (((calificacion_final >= (0)::numeric) AND (calificacion_final <= (100)::numeric)))
);


ALTER TABLE public.calificaciones OWNER TO postgres;

--
-- TOC entry 254 (class 1259 OID 24821)
-- Name: calificaciones_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE public.calificaciones ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.calificaciones_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- TOC entry 245 (class 1259 OID 24704)
-- Name: casa_preguntas; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.casa_preguntas (
    id bigint NOT NULL,
    proyecto_id integer NOT NULL,
    autor_id integer NOT NULL,
    titulo character varying(200) NOT NULL,
    cuerpo text,
    creado_en timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.casa_preguntas OWNER TO postgres;

--
-- TOC entry 244 (class 1259 OID 24703)
-- Name: casa_preguntas_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.casa_preguntas_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.casa_preguntas_id_seq OWNER TO postgres;

--
-- TOC entry 5280 (class 0 OID 0)
-- Dependencies: 244
-- Name: casa_preguntas_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.casa_preguntas_id_seq OWNED BY public.casa_preguntas.id;


--
-- TOC entry 247 (class 1259 OID 24730)
-- Name: casa_respuestas; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.casa_respuestas (
    id bigint NOT NULL,
    pregunta_id bigint NOT NULL,
    autor_id integer NOT NULL,
    cuerpo text NOT NULL,
    creado_en timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.casa_respuestas OWNER TO postgres;

--
-- TOC entry 246 (class 1259 OID 24729)
-- Name: casa_respuestas_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.casa_respuestas_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.casa_respuestas_id_seq OWNER TO postgres;

--
-- TOC entry 5281 (class 0 OID 0)
-- Dependencies: 246
-- Name: casa_respuestas_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.casa_respuestas_id_seq OWNED BY public.casa_respuestas.id;


--
-- TOC entry 226 (class 1259 OID 16540)
-- Name: dimensiones_steam; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.dimensiones_steam (
    id integer NOT NULL,
    nombre character varying(50) NOT NULL,
    descripcion text,
    color_hex character varying(7)
);


ALTER TABLE public.dimensiones_steam OWNER TO postgres;

--
-- TOC entry 225 (class 1259 OID 16539)
-- Name: dimensiones_steam_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.dimensiones_steam_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.dimensiones_steam_id_seq OWNER TO postgres;

--
-- TOC entry 5282 (class 0 OID 0)
-- Dependencies: 225
-- Name: dimensiones_steam_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.dimensiones_steam_id_seq OWNED BY public.dimensiones_steam.id;


--
-- TOC entry 237 (class 1259 OID 16647)
-- Name: evaluaciones_habilidad; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.evaluaciones_habilidad (
    id bigint NOT NULL,
    sesion_id integer NOT NULL,
    habilidad_id integer NOT NULL,
    puntaje numeric(5,2) DEFAULT 0 NOT NULL,
    intentos_fallidos integer DEFAULT 0,
    tiempo_segundos integer DEFAULT 0,
    creado_en timestamp without time zone DEFAULT now()
);


ALTER TABLE public.evaluaciones_habilidad OWNER TO postgres;

--
-- TOC entry 236 (class 1259 OID 16646)
-- Name: evaluaciones_habilidad_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.evaluaciones_habilidad_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.evaluaciones_habilidad_id_seq OWNER TO postgres;

--
-- TOC entry 5283 (class 0 OID 0)
-- Dependencies: 236
-- Name: evaluaciones_habilidad_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.evaluaciones_habilidad_id_seq OWNED BY public.evaluaciones_habilidad.id;


--
-- TOC entry 228 (class 1259 OID 16553)
-- Name: habilidades; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.habilidades (
    id integer NOT NULL,
    dimension_id integer NOT NULL,
    nombre character varying(120) NOT NULL,
    descripcion text
);


ALTER TABLE public.habilidades OWNER TO postgres;

--
-- TOC entry 227 (class 1259 OID 16552)
-- Name: habilidades_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.habilidades_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.habilidades_id_seq OWNER TO postgres;

--
-- TOC entry 5284 (class 0 OID 0)
-- Dependencies: 227
-- Name: habilidades_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.habilidades_id_seq OWNED BY public.habilidades.id;


--
-- TOC entry 219 (class 1259 OID 16422)
-- Name: practicas; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.practicas (
    id integer NOT NULL,
    ruta_id integer NOT NULL,
    titulo character varying(255) NOT NULL,
    intentos_permitidos integer DEFAULT 0,
    configuracion_preguntas jsonb DEFAULT '[]'::jsonb NOT NULL,
    creado_en timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.practicas OWNER TO postgres;

--
-- TOC entry 220 (class 1259 OID 16434)
-- Name: practicas_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE public.practicas ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.practicas_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- TOC entry 241 (class 1259 OID 16700)
-- Name: proyecto_guardados; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.proyecto_guardados (
    id bigint NOT NULL,
    usuario_id integer NOT NULL,
    proyecto_id integer NOT NULL,
    slot smallint DEFAULT 1 NOT NULL,
    schema_version integer DEFAULT 1 NOT NULL,
    estado jsonb NOT NULL,
    progreso jsonb DEFAULT '{}'::jsonb NOT NULL,
    bytes integer GENERATED ALWAYS AS (octet_length((estado)::text)) STORED,
    creado_en timestamp with time zone DEFAULT now() NOT NULL,
    actualizado_en timestamp with time zone DEFAULT now() NOT NULL,
    entregado_en timestamp with time zone,
    CONSTRAINT chk_estado_obj CHECK ((jsonb_typeof(estado) = 'object'::text)),
    CONSTRAINT chk_tamano CHECK ((octet_length((estado)::text) < ((2 * 1024) * 1024)))
);


ALTER TABLE public.proyecto_guardados OWNER TO postgres;

--
-- TOC entry 243 (class 1259 OID 16743)
-- Name: proyecto_guardados_hist; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.proyecto_guardados_hist (
    id bigint NOT NULL,
    guardado_id bigint,
    schema_version integer NOT NULL,
    estado jsonb NOT NULL,
    archivado_en timestamp with time zone DEFAULT now() NOT NULL,
    usuario_id integer,
    proyecto_id integer,
    slot smallint,
    motivo character varying(30) DEFAULT 'reinicio'::character varying
);


ALTER TABLE public.proyecto_guardados_hist OWNER TO postgres;

--
-- TOC entry 242 (class 1259 OID 16742)
-- Name: proyecto_guardados_hist_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.proyecto_guardados_hist_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.proyecto_guardados_hist_id_seq OWNER TO postgres;

--
-- TOC entry 5285 (class 0 OID 0)
-- Dependencies: 242
-- Name: proyecto_guardados_hist_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.proyecto_guardados_hist_id_seq OWNED BY public.proyecto_guardados_hist.id;


--
-- TOC entry 240 (class 1259 OID 16699)
-- Name: proyecto_guardados_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.proyecto_guardados_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.proyecto_guardados_id_seq OWNER TO postgres;

--
-- TOC entry 5286 (class 0 OID 0)
-- Dependencies: 240
-- Name: proyecto_guardados_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.proyecto_guardados_id_seq OWNED BY public.proyecto_guardados.id;


--
-- TOC entry 239 (class 1259 OID 16677)
-- Name: proyectos; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.proyectos (
    id integer NOT NULL,
    nombre character varying(100) NOT NULL,
    descripcion text,
    url_simulador character varying(200)
);


ALTER TABLE public.proyectos OWNER TO postgres;

--
-- TOC entry 238 (class 1259 OID 16676)
-- Name: proyectos_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.proyectos_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.proyectos_id_seq OWNER TO postgres;

--
-- TOC entry 5287 (class 0 OID 0)
-- Dependencies: 238
-- Name: proyectos_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.proyectos_id_seq OWNED BY public.proyectos.id;


--
-- TOC entry 249 (class 1259 OID 24760)
-- Name: registro_actividad; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.registro_actividad (
    id bigint NOT NULL,
    usuario_id integer,
    tipo_accion character varying(60) NOT NULL,
    detalle jsonb DEFAULT '{}'::jsonb NOT NULL,
    creado_en timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.registro_actividad OWNER TO postgres;

--
-- TOC entry 248 (class 1259 OID 24759)
-- Name: registro_actividad_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.registro_actividad_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.registro_actividad_id_seq OWNER TO postgres;

--
-- TOC entry 5288 (class 0 OID 0)
-- Dependencies: 248
-- Name: registro_actividad_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.registro_actividad_id_seq OWNED BY public.registro_actividad.id;


--
-- TOC entry 221 (class 1259 OID 16435)
-- Name: roles; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.roles (
    id integer NOT NULL,
    nombre character varying(50) NOT NULL,
    descripcion character varying(255)
);


ALTER TABLE public.roles OWNER TO postgres;

--
-- TOC entry 222 (class 1259 OID 16440)
-- Name: roles_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE public.roles ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.roles_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- TOC entry 251 (class 1259 OID 24789)
-- Name: rutas_aprendizaje; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.rutas_aprendizaje (
    id integer NOT NULL,
    profesor_id integer NOT NULL,
    titulo character varying(150) NOT NULL,
    descripcion text,
    orden_secuencia integer NOT NULL,
    creado_en timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.rutas_aprendizaje OWNER TO postgres;

--
-- TOC entry 250 (class 1259 OID 24788)
-- Name: rutas_aprendizaje_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE public.rutas_aprendizaje ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.rutas_aprendizaje_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- TOC entry 233 (class 1259 OID 16603)
-- Name: sesiones_simulacion; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.sesiones_simulacion (
    id integer NOT NULL,
    usuario_id integer NOT NULL,
    fecha_inicio timestamp without time zone DEFAULT now() NOT NULL,
    fecha_fin timestamp without time zone,
    metadata jsonb DEFAULT '{}'::jsonb,
    proyecto_id integer
);


ALTER TABLE public.sesiones_simulacion OWNER TO postgres;

--
-- TOC entry 232 (class 1259 OID 16602)
-- Name: sesiones_simulacion_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.sesiones_simulacion_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.sesiones_simulacion_id_seq OWNER TO postgres;

--
-- TOC entry 5289 (class 0 OID 0)
-- Dependencies: 232
-- Name: sesiones_simulacion_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.sesiones_simulacion_id_seq OWNED BY public.sesiones_simulacion.id;


--
-- TOC entry 235 (class 1259 OID 16622)
-- Name: telemetria_3d; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.telemetria_3d (
    id bigint NOT NULL,
    sesion_id integer NOT NULL,
    actividad_id integer,
    marca_tiempo timestamp without time zone DEFAULT now() NOT NULL,
    tipo_evento character varying(50) NOT NULL,
    pos_x real,
    pos_y real,
    pos_z real,
    contexto jsonb DEFAULT '{}'::jsonb
);


ALTER TABLE public.telemetria_3d OWNER TO postgres;

--
-- TOC entry 234 (class 1259 OID 16621)
-- Name: telemetria_3d_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.telemetria_3d_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.telemetria_3d_id_seq OWNER TO postgres;

--
-- TOC entry 5290 (class 0 OID 0)
-- Dependencies: 234
-- Name: telemetria_3d_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.telemetria_3d_id_seq OWNED BY public.telemetria_3d.id;


--
-- TOC entry 223 (class 1259 OID 16452)
-- Name: usuarios; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.usuarios (
    id integer NOT NULL,
    nombre_completo character varying(255) NOT NULL,
    email character varying(255) NOT NULL,
    password_hash character varying(255) NOT NULL,
    rol_id integer NOT NULL,
    creado_en timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.usuarios OWNER TO postgres;

--
-- TOC entry 224 (class 1259 OID 16463)
-- Name: usuarios_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE public.usuarios ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.usuarios_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- TOC entry 4955 (class 2604 OID 16575)
-- Name: actividades_criticas id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.actividades_criticas ALTER COLUMN id SET DEFAULT nextval('public.actividades_criticas_id_seq'::regclass);


--
-- TOC entry 4979 (class 2604 OID 24707)
-- Name: casa_preguntas id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.casa_preguntas ALTER COLUMN id SET DEFAULT nextval('public.casa_preguntas_id_seq'::regclass);


--
-- TOC entry 4981 (class 2604 OID 24733)
-- Name: casa_respuestas id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.casa_respuestas ALTER COLUMN id SET DEFAULT nextval('public.casa_respuestas_id_seq'::regclass);


--
-- TOC entry 4953 (class 2604 OID 16543)
-- Name: dimensiones_steam id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.dimensiones_steam ALTER COLUMN id SET DEFAULT nextval('public.dimensiones_steam_id_seq'::regclass);


--
-- TOC entry 4963 (class 2604 OID 16650)
-- Name: evaluaciones_habilidad id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.evaluaciones_habilidad ALTER COLUMN id SET DEFAULT nextval('public.evaluaciones_habilidad_id_seq'::regclass);


--
-- TOC entry 4954 (class 2604 OID 16556)
-- Name: habilidades id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.habilidades ALTER COLUMN id SET DEFAULT nextval('public.habilidades_id_seq'::regclass);


--
-- TOC entry 4969 (class 2604 OID 16703)
-- Name: proyecto_guardados id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.proyecto_guardados ALTER COLUMN id SET DEFAULT nextval('public.proyecto_guardados_id_seq'::regclass);


--
-- TOC entry 4976 (class 2604 OID 16746)
-- Name: proyecto_guardados_hist id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.proyecto_guardados_hist ALTER COLUMN id SET DEFAULT nextval('public.proyecto_guardados_hist_id_seq'::regclass);


--
-- TOC entry 4968 (class 2604 OID 16680)
-- Name: proyectos id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.proyectos ALTER COLUMN id SET DEFAULT nextval('public.proyectos_id_seq'::regclass);


--
-- TOC entry 4983 (class 2604 OID 24763)
-- Name: registro_actividad id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.registro_actividad ALTER COLUMN id SET DEFAULT nextval('public.registro_actividad_id_seq'::regclass);


--
-- TOC entry 4957 (class 2604 OID 16606)
-- Name: sesiones_simulacion id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sesiones_simulacion ALTER COLUMN id SET DEFAULT nextval('public.sesiones_simulacion_id_seq'::regclass);


--
-- TOC entry 4960 (class 2604 OID 16625)
-- Name: telemetria_3d id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.telemetria_3d ALTER COLUMN id SET DEFAULT nextval('public.telemetria_3d_id_seq'::regclass);


--
-- TOC entry 5248 (class 0 OID 16572)
-- Dependencies: 230
-- Data for Name: actividades_criticas; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.actividades_criticas (id, nombre, descripcion, tipo_interaccion, proyecto_id) FROM stdin;
1	Calcular área del terreno		calculo	\N
2	Crear mezcla de concreto		calculo	\N
3	Construir pared simple		construccion	\N
4	Construir pared con puerta		construccion	\N
5	Construir pared con ventana		construccion	\N
6	Construir piso		diseno	\N
7	Programar foco inteligente		programacion	\N
8	Diseñar casa completa		diseno	\N
\.


--
-- TOC entry 5249 (class 0 OID 16584)
-- Dependencies: 231
-- Data for Name: actividades_habilidades; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.actividades_habilidades (actividad_id, habilidad_id, peso) FROM stdin;
1	17	0.30
1	18	0.40
1	19	0.30
2	20	0.50
2	1	0.30
2	3	0.20
3	10	0.50
3	9	0.30
3	12	0.20
7	5	0.40
7	6	0.40
7	8	0.20
6	13	0.40
6	15	0.30
6	18	0.30
\.


--
-- TOC entry 5271 (class 0 OID 24802)
-- Dependencies: 253
-- Data for Name: avance_rutas; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.avance_rutas (id, alumno_id, ruta_id, estado_general, detalle_avance, actualizado_en) FROM stdin;
\.


--
-- TOC entry 5273 (class 0 OID 24822)
-- Dependencies: 255
-- Data for Name: calificaciones; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.calificaciones (id, alumno_id, practica_id, calificacion_final, respuestas_alumno, fecha_realizacion) FROM stdin;
1	7	1	\N	{"total_objetos": 19}	2026-09-29 13:43:32.821196
2	6	1	\N	{"total_objetos": 9}	2026-09-30 08:29:46.75334
\.


--
-- TOC entry 5263 (class 0 OID 24704)
-- Dependencies: 245
-- Data for Name: casa_preguntas; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.casa_preguntas (id, proyecto_id, autor_id, titulo, cuerpo, creado_en) FROM stdin;
\.


--
-- TOC entry 5265 (class 0 OID 24730)
-- Dependencies: 247
-- Data for Name: casa_respuestas; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.casa_respuestas (id, pregunta_id, autor_id, cuerpo, creado_en) FROM stdin;
\.


--
-- TOC entry 5244 (class 0 OID 16540)
-- Dependencies: 226
-- Data for Name: dimensiones_steam; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.dimensiones_steam (id, nombre, descripcion, color_hex) FROM stdin;
1	Ciencia	Exploración y comprensión de las ciencias naturales.	#2e915f
2	Tecnología	Aplicación de la tecnología y programación.	#3a70db
3	Ingeniería	Principios de ingeniería y construcción.	#63637a
4	Arte	Diseño, estética y composición espacial.	#814eb8
5	Matemáticas	Cálculo, proporciones y lógica matemática.	#d45945
\.


--
-- TOC entry 5255 (class 0 OID 16647)
-- Dependencies: 237
-- Data for Name: evaluaciones_habilidad; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.evaluaciones_habilidad (id, sesion_id, habilidad_id, puntaje, intentos_fallidos, tiempo_segundos, creado_en) FROM stdin;
\.


--
-- TOC entry 5246 (class 0 OID 16553)
-- Dependencies: 228
-- Data for Name: habilidades; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.habilidades (id, dimension_id, nombre, descripcion) FROM stdin;
1	1	Propiedades del concreto	
2	1	Tipos de suelo	
3	1	Física de materiales	
4	1	Fraguado y curado	
5	2	Programación por bloques	
6	2	Lógica condicional	
7	2	Domótica básica	
8	2	Automatización	
9	3	Cálculo estructural	
10	3	Construcción de muros	
11	3	Cimentación	
12	3	Resistencia de materiales	
13	4	Diseño cromático	
14	4	Psicología del color	
15	4	Composición espacial	
16	4	Acabados y texturas	
17	5	Cálculo de perímetro	
18	5	Cálculo de área	
19	5	Cálculo de volumen	
20	5	Proporciones y mezclas	
\.


--
-- TOC entry 5237 (class 0 OID 16422)
-- Dependencies: 219
-- Data for Name: practicas; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.practicas (id, ruta_id, titulo, intentos_permitidos, configuracion_preguntas, creado_en) FROM stdin;
1	1	Examen Final: Construcción de Casa	0	[]	2026-09-23 11:53:15.85025
\.


--
-- TOC entry 5259 (class 0 OID 16700)
-- Dependencies: 241
-- Data for Name: proyecto_guardados; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.proyecto_guardados (id, usuario_id, proyecto_id, slot, schema_version, estado, progreso, creado_en, actualizado_en, entregado_en) FROM stdin;
212	7	1	1	1	{"v": 1, "objetos": [{"p": [0, 0, 0], "r": [0, 0, 0], "id": 1, "type": "concreto_slab_20"}, {"d": 15, "p": [-5.02, 0, 9.748], "r": [0, 3.142, 0], "w": 10, "id": 2, "type": "wall_block", "wallMode": "simple"}, {"d": 15, "p": [4.988, 0, 9.748], "r": [0, 3.142, 0], "w": 10, "id": 3, "type": "wall_block", "wallMode": "simple"}, {"d": 15, "p": [-9.749, 0, 4.496], "r": [0, 1.571, 0], "w": 10, "id": 4, "type": "wall_block", "wallMode": "simple"}, {"d": 15, "p": [9.749, 0, 4.493], "r": [0, -1.571, 0], "w": 10, "id": 5, "type": "wall_block", "wallMode": "simple"}, {"d": 15, "p": [-9.749, 0, -2.999], "r": [0, 1.571, 0], "w": 5, "id": 6, "type": "wall_block", "wallMode": "simple"}, {"d": 15, "p": [-7.52, 0, -5.768], "r": [0, 3.142, 0], "w": 5, "id": 10, "type": "wall_block", "wallMode": "ventana"}, {"p": [0, 8.4, 0], "r": [0, 0, 0], "id": 11, "type": "ventana", "embeddedInWall": 10}, {"d": 15, "p": [-0.03, 0, -5.763], "r": [0, 3.142, 0], "w": 10, "id": 14, "type": "wall_block", "wallMode": "puerta"}, {"p": [0.5, 0, 0], "r": [0, 0, 0], "id": 15, "type": "puerta", "embeddedInWall": 14}, {"d": 15, "p": [7.461, 0, -5.756], "r": [0, 3.142, 0], "w": 5, "id": 16, "type": "wall_block", "wallMode": "simple"}, {"d": 15, "p": [0.009, 10.215, -0.953], "r": [-1.571, 3.142, 0], "w": 20, "id": 17, "type": "wall_block", "wallMode": "simple"}, {"d": 6, "p": [0, 10.313, -1.017], "r": [-1.571, 0, 0], "w": 20, "id": 19, "type": "wall_block", "wallMode": "simple"}, {"d": 2, "p": [0, 10.309, -4.629], "r": [-1.571, 0, 0], "w": 20, "id": 20, "type": "wall_block", "wallMode": "simple"}, {"p": [9.693, 0, -9.589], "r": [0, 2.618, 0], "id": 21, "type": "lampara"}, {"p": [-1, 8.4, 0], "r": [0, 0, 0], "id": 23, "type": "ventana", "embeddedInWall": 22}, {"p": [1, 8.4, 0], "r": [0, 0, 0], "id": 24, "type": "ventana", "embeddedInWall": 22}, {"d": 15, "p": [9.75, 0, -2.996], "r": [0, 1.571, 0], "w": 5, "id": 22, "type": "wall_block", "wallMode": "ventana"}], "contador": 25, "progreso": {"focoState": "off", "buildPhase": 4, "progSequence": ["if", "es_dia", "apaga_foco", "es_noche", "else", "enciende_foco"], "concretoUnlocked": true, "puertas_colocadas": 1, "ventanas_colocadas": 3, "matematicasValidadas": true}}	{"focoState": "off", "buildPhase": 4, "progSequence": ["if", "es_dia", "apaga_foco", "es_noche", "else", "enciende_foco"], "concretoUnlocked": true, "puertas_colocadas": 1, "ventanas_colocadas": 3, "matematicasValidadas": true}	2026-09-29 13:28:00.339469-06	2026-09-30 13:43:22.698189-06	2026-09-29 13:43:32.809309-06
67	1	1	1	1	{"v": 1, "objetos": [{"p": [0, 0, 0], "r": [0, 0, 0], "id": 2, "type": "concreto_slab_20"}, {"d": 10, "p": [0.134, 0.2, 9.226], "r": [0, -3.141, 0], "w": 16, "id": 3, "type": "wall_block", "wallMode": "simple"}, {"d": 4, "p": [0.101, 2.748, -7.297], "r": [0, -3.141, 0], "w": 16, "id": 6, "type": "wall_block", "wallMode": "ventana"}, {"p": [-3.5, 0.7, 0], "r": [0, 0, 0], "id": 7, "type": "ventana", "embeddedInWall": 6}, {"p": [4.5, 0.7, 0], "r": [0, 0, 0], "id": 8, "type": "ventana", "embeddedInWall": 6}, {"d": 4, "p": [0.085, 0.174, -7.301], "r": [0, 0, 0], "w": 16, "id": 9, "type": "wall_block", "wallMode": "simple"}, {"d": 4, "p": [0.001, 4.868, -7.275], "r": [0, -3.141, 0], "w": 16, "id": 10, "type": "wall_block", "wallMode": "simple"}, {"d": 4, "p": [-8.13, 8.421, 0.945], "r": [0, -1.571, 3.142], "s": [1, 1, 1], "w": 16, "id": 11, "type": "wall_block", "wallMode": "ventana"}, {"p": [0.5, 0.7, 0], "r": [0, 0, 0], "id": 12, "type": "ventana", "embeddedInWall": 11}, {"d": 10, "p": [8.48, 0.198, 1.088], "r": [0, 1.571, 0], "w": 16, "id": 13, "type": "wall_block", "wallMode": "puerta"}, {"p": [0.5, 0, 0], "r": [0, 0, 0], "id": 14, "type": "puerta", "embeddedInWall": 13}, {"d": 10, "p": [-8.127, 0, 0.978], "r": [0, -1.571, 0], "s": [1, 1, 1], "w": 16, "id": 16, "type": "wall_block", "wallMode": "puerta"}, {"p": [0.5, 0, 0], "r": [0, 0, 0], "id": 17, "type": "puerta", "embeddedInWall": 16}, {"d": 4, "p": [0.094, 5.773, 9.208], "r": [0, 0, 0], "w": 16, "id": 18, "type": "wall_block", "wallMode": "simple"}, {"d": 4, "p": [-0.014, 5.756, -7.275], "r": [0, -3.141, 0], "w": 16, "id": 19, "type": "wall_block", "wallMode": "simple"}, {"d": 4, "p": [8.457, 5.662, 1.096], "r": [0, 1.571, 0], "w": 16, "id": 20, "type": "wall_block", "wallMode": "simple"}, {"d": 4, "p": [-6.726, 8.802, -4.979], "r": [-1.571, 0, 0], "w": 4, "id": 21, "type": "wall_block", "wallMode": "simple"}, {"d": 4, "p": [-2.629, 8.787, -5.191], "r": [-1.571, 0, 0], "w": 4, "id": 22, "type": "wall_block", "wallMode": "simple"}, {"d": 4, "p": [1.397, 8.815, -4.972], "r": [-1.571, 0, 0], "w": 4, "id": 23, "type": "wall_block", "wallMode": "simple"}, {"d": 4, "p": [5.401, 8.84, -4.901], "r": [-1.571, 0, 0], "w": 4, "id": 24, "type": "wall_block", "wallMode": "simple"}, {"d": 4, "p": [7.485, 8.825, -5.687], "r": [-1.571, -1.571, 0], "w": 4, "id": 25, "type": "wall_block", "wallMode": "simple"}], "contador": 26, "progreso": {"focoState": "off", "buildPhase": 2, "progSequence": [], "concretoUnlocked": true, "puertas_colocadas": 2, "ventanas_colocadas": 3, "matematicasValidadas": true}}	{"focoState": "off", "buildPhase": 2, "progSequence": [], "concretoUnlocked": true, "puertas_colocadas": 2, "ventanas_colocadas": 3, "matematicasValidadas": true}	2026-09-21 10:20:44.966243-06	2026-09-23 12:38:11.912026-06	2026-09-22 08:55:37.963338-06
\.


--
-- TOC entry 5261 (class 0 OID 16743)
-- Dependencies: 243
-- Data for Name: proyecto_guardados_hist; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.proyecto_guardados_hist (id, guardado_id, schema_version, estado, archivado_en, usuario_id, proyecto_id, slot, motivo) FROM stdin;
4	274	1	{"v": 1, "objetos": [{"p": [0, 0, 0], "r": [0, 0, 0], "id": 1, "type": "concreto_slab_20"}, {"p": [0.5, 0, 0], "r": [0, 0, 0], "id": 3, "type": "puerta", "embeddedInWall": 2}, {"d": 10, "p": [0, 0, -9.75], "r": [0, 3.142, 0], "w": 20, "id": 2, "type": "wall_block", "wallMode": "puerta"}, {"p": [0.5, 0, 0], "r": [0, 0, 0], "id": 5, "type": "puerta", "embeddedInWall": 4}, {"d": 10, "p": [0, 0, 5.173], "r": [0, 0, 0], "w": 20, "id": 4, "type": "wall_block", "wallMode": "puerta"}, {"d": 10, "p": [9.75, 0, -0.027], "r": [0, -1.571, 0], "w": 10, "id": 6, "type": "wall_block", "wallMode": "simple"}, {"d": 10, "p": [-9.75, 0, 0], "r": [0, 1.571, 0], "w": 10, "id": 7, "type": "wall_block", "wallMode": "simple"}, {"d": 10, "p": [9.75, 0, -7.52], "r": [0, -1.571, 0], "w": 5, "id": 8, "type": "wall_block", "wallMode": "simple"}, {"d": 10, "p": [-9.75, 0, -7.493], "r": [0, 1.571, 0], "w": 5, "id": 9, "type": "wall_block", "wallMode": "simple"}], "contador": 10, "progreso": {"focoState": "off", "buildPhase": 4, "progSequence": [], "concretoUnlocked": true, "puertas_colocadas": 2, "ventanas_colocadas": 0, "matematicasValidadas": true}}	2026-10-02 12:59:03.248449-06	\N	\N	\N	reinicio
\.


--
-- TOC entry 5257 (class 0 OID 16677)
-- Dependencies: 239
-- Data for Name: proyectos; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.proyectos (id, nombre, descripcion, url_simulador) FROM stdin;
1	Constructor de Casa	Simulador 3D para diseñar, calcular y construir una vivienda sustentable.	/sandbox.html
\.


--
-- TOC entry 5267 (class 0 OID 24760)
-- Dependencies: 249
-- Data for Name: registro_actividad; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.registro_actividad (id, usuario_id, tipo_accion, detalle, creado_en) FROM stdin;
1	1	login	{"rol": "admin"}	2026-09-23 12:17:37.308674-06
2	1	login	{"rol": "admin"}	2026-09-23 13:14:57.727988-06
3	1	login	{"rol": "admin"}	2026-09-23 14:34:29.926717-06
4	1	login	{"rol": "admin"}	2026-09-25 08:18:30.362631-06
5	1	login	{"rol": "admin"}	2026-09-28 10:03:20.002357-06
6	6	login	{"rol": "alumno"}	2026-09-28 13:25:42.228188-06
7	1	login	{"rol": "admin"}	2026-09-28 13:27:42.45761-06
8	5	login	{"rol": "alumno"}	2026-09-28 13:28:22.271494-06
9	1	login	{"rol": "admin"}	2026-09-28 13:40:41.638399-06
10	5	login	{"rol": "alumno"}	2026-09-28 15:48:02.433571-06
11	6	login	{"rol": "alumno"}	2026-09-28 15:48:40.715802-06
12	6	login	{"rol": "alumno"}	2026-09-28 15:56:13.75184-06
13	1	login	{"rol": "admin"}	2026-09-28 15:56:55.481509-06
14	1	login	{"rol": "admin"}	2026-09-29 13:15:33.250411-06
15	7	entrega_casa	{"proyecto_id": 1, "total_objetos": 19}	2026-09-29 13:43:32.832194-06
16	6	login	{"rol": "alumno"}	2026-09-29 13:44:04.064395-06
17	5	login	{"rol": "alumno"}	2026-09-29 14:33:59.357544-06
18	1	login	{"rol": "admin"}	2026-09-29 14:36:10.846765-06
19	5	login	{"rol": "maestro"}	2026-09-29 14:36:39.192823-06
20	1	login	{"rol": "admin"}	2026-09-29 15:44:23.493641-06
21	1	login	{"rol": "admin"}	2026-09-29 15:44:55.821638-06
22	1	login	{"rol": "admin"}	2026-09-29 15:51:12.43754-06
23	5	login	{"rol": "maestro"}	2026-09-29 15:51:23.557164-06
24	1	login	{"rol": "admin"}	2026-09-29 15:52:09.907787-06
25	1	login	{"rol": "admin"}	2026-09-29 15:54:23.275305-06
26	1	login	{"rol": "admin"}	2026-09-29 15:54:29.735459-06
27	1	login	{"rol": "admin"}	2026-09-29 15:57:54.36818-06
28	5	login	{"rol": "maestro"}	2026-09-29 16:02:21.32008-06
29	1	login	{"rol": "admin"}	2026-09-30 08:14:33.565179-06
30	5	login	{"rol": "maestro"}	2026-09-30 08:15:47.906685-06
31	1	login	{"rol": "admin"}	2026-09-30 08:24:01.423015-06
32	6	login	{"rol": "alumno"}	2026-09-30 08:29:32.973013-06
33	6	entrega_casa	{"proyecto_id": 1, "total_objetos": 9}	2026-09-30 08:29:46.757542-06
34	7	login	{"rol": "alumno"}	2026-09-30 12:25:08.064135-06
35	1	login	{"rol": "admin"}	2026-09-30 13:43:48.201975-06
36	1	login	{"rol": "admin"}	2026-09-30 20:02:35.285048-06
37	1	login	{"rol": "admin"}	2026-10-01 09:54:03.17507-06
38	1	login	{"rol": "admin"}	2026-10-01 10:28:01.62808-06
39	1	login	{"rol": "admin"}	2026-10-01 12:16:03.342891-06
40	5	login	{"rol": "maestro"}	2026-10-01 12:16:37.919356-06
41	5	login	{"rol": "maestro"}	2026-10-01 12:17:39.289174-06
42	5	login	{"rol": "maestro"}	2026-10-01 12:21:12.070674-06
43	1	login	{"rol": "admin"}	2026-10-01 12:39:35.874315-06
44	5	login	{"rol": "maestro"}	2026-10-01 14:06:43.392699-06
45	6	login	{"rol": "alumno"}	2026-10-01 14:06:59.189784-06
46	5	login	{"rol": "maestro"}	2026-10-01 14:07:20.32661-06
47	1	login	{"rol": "admin"}	2026-10-01 14:07:32.446726-06
48	1	login	{"rol": "admin"}	2026-10-02 12:00:48.984974-06
49	6	login	{"rol": "alumno"}	2026-10-02 12:01:04.387364-06
50	5	login	{"rol": "maestro"}	2026-10-02 12:01:16.224797-06
51	6	login	{"rol": "alumno"}	2026-10-02 12:01:36.564854-06
52	5	login	{"rol": "maestro"}	2026-10-02 12:13:30.452591-06
53	1	login	{"rol": "admin"}	2026-10-02 12:13:37.659973-06
54	5	login	{"rol": "maestro"}	2026-10-02 12:13:51.429442-06
55	1	login	{"rol": "admin"}	2026-10-02 12:57:37.465785-06
56	5	login	{"rol": "maestro"}	2026-10-02 12:57:48.693306-06
57	6	login	{"rol": "alumno"}	2026-10-02 12:57:56.84367-06
58	6	reinicio_casa	{"proyecto_id": 1}	2026-10-02 12:59:03.260426-06
\.


--
-- TOC entry 5239 (class 0 OID 16435)
-- Dependencies: 221
-- Data for Name: roles; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.roles (id, nombre, descripcion) FROM stdin;
1	alumno	Estudiante que interactúa con los módulos y minijuegos
3	admin	Administrador del sistema
2	maestro	Creador de rutas de aprendizaje y auditor de calificaciones
\.


--
-- TOC entry 5269 (class 0 OID 24789)
-- Dependencies: 251
-- Data for Name: rutas_aprendizaje; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.rutas_aprendizaje (id, profesor_id, titulo, descripcion, orden_secuencia, creado_en) FROM stdin;
1	1	Constructor de Casa	Ruta principal del simulador STEAM	1	2026-09-23 11:53:15.842565
2	5	Constructor de Casa	Curso asignado automáticamente	1	2026-09-29 14:36:41.402792
\.


--
-- TOC entry 5251 (class 0 OID 16603)
-- Dependencies: 233
-- Data for Name: sesiones_simulacion; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.sesiones_simulacion (id, usuario_id, fecha_inicio, fecha_fin, metadata, proyecto_id) FROM stdin;
1	1	2026-09-17 15:31:38.096927	\N	{"pagina": "sandbox"}	1
2	1	2026-09-17 15:32:40.364584	\N	{"pagina": "sandbox"}	1
3	1	2026-09-17 15:41:29.041518	\N	{"pagina": "sandbox"}	1
4	1	2026-09-17 15:53:52.389135	\N	{"pagina": "sandbox"}	1
5	1	2026-09-17 15:54:42.247989	\N	{"pagina": "sandbox"}	1
6	1	2026-09-18 07:50:59.367812	\N	{"pagina": "sandbox"}	1
7	1	2026-09-18 08:19:19.012682	2026-09-18 08:19:23.832866	{"pagina": "sandbox"}	1
8	1	2026-09-18 08:20:31.90108	\N	{"pagina": "sandbox"}	1
9	1	2026-09-18 08:22:15.905027	2026-09-18 08:22:21.369795	{"pagina": "sandbox"}	1
10	1	2026-09-18 08:30:02.982388	\N	{"pagina": "sandbox"}	1
11	1	2026-09-18 09:52:26.729507	2026-09-18 11:36:28.147102	{"pagina": "sandbox"}	1
12	1	2026-09-18 11:36:36.549416	2026-09-18 11:36:42.552718	{"pagina": "sandbox"}	1
13	1	2026-09-18 14:02:12.388348	\N	{"pagina": "sandbox"}	1
14	1	2026-09-18 14:02:40.520578	\N	{"pagina": "sandbox"}	1
15	1	2026-09-18 14:54:15.289823	\N	{"pagina": "sandbox"}	1
16	1	2026-09-18 14:54:22.497947	\N	{"pagina": "sandbox"}	1
17	1	2026-09-21 08:21:26.890637	\N	{"pagina": "sandbox"}	1
18	1	2026-09-21 08:32:00.807862	\N	{"pagina": "sandbox"}	1
19	1	2026-09-21 08:32:08.226965	\N	{"pagina": "sandbox"}	1
20	1	2026-09-21 08:33:52.811278	\N	{"pagina": "sandbox"}	1
21	1	2026-09-21 10:19:11.659978	2026-09-21 10:20:00.621479	{"pagina": "sandbox"}	1
22	1	2026-09-21 10:20:00.858228	\N	{"pagina": "sandbox"}	1
23	1	2026-09-21 10:20:24.396737	2026-09-21 10:20:31.181708	{"pagina": "sandbox"}	1
24	1	2026-09-21 10:20:31.410881	\N	{"pagina": "sandbox"}	1
25	1	2026-09-21 14:15:20.665448	2026-09-21 14:15:27.346276	{"pagina": "sandbox"}	1
26	1	2026-09-21 14:16:51.945961	\N	{"pagina": "sandbox"}	1
27	1	2026-09-21 15:00:24.482927	\N	{"pagina": "sandbox"}	1
28	1	2026-09-21 15:38:34.509633	2026-09-21 15:39:07.543727	{"pagina": "sandbox"}	1
29	1	2026-09-22 08:04:05.905011	\N	{"pagina": "sandbox"}	1
30	1	2026-09-22 08:27:25.505531	\N	{"pagina": "sandbox"}	1
31	1	2026-09-22 08:55:34.193853	2026-09-22 08:55:45.419142	{"pagina": "sandbox"}	1
32	1	2026-09-22 09:41:31.003523	2026-09-22 09:41:34.808564	{"pagina": "sandbox"}	1
33	1	2026-09-22 13:04:49.832072	2026-09-22 13:04:56.331647	{"pagina": "sandbox"}	1
34	1	2026-09-23 12:19:58.21102	2026-09-23 12:20:46.83986	{"pagina": "sandbox"}	1
35	1	2026-09-23 12:23:26.881724	2026-09-23 12:44:40.817044	{"pagina": "sandbox"}	1
36	6	2026-09-28 15:56:40.443371	2026-09-28 15:56:47.083173	{"pagina": "sandbox"}	1
37	1	2026-09-28 15:56:59.41318	2026-09-28 15:57:30.510556	{"pagina": "sandbox"}	1
38	7	2026-09-29 13:26:16.75742	2026-09-29 13:43:34.428519	{"pagina": "sandbox"}	1
39	7	2026-09-29 13:43:38.81584	2026-09-29 13:43:45.394959	{"pagina": "sandbox"}	1
40	6	2026-09-29 13:45:23.040999	2026-09-29 13:52:33.503313	{"pagina": "sandbox"}	1
41	5	2026-09-29 14:34:06.74027	2026-09-29 14:34:08.455073	{"pagina": "sandbox"}	1
42	6	2026-09-30 08:29:37.026166	\N	{"pagina": "sandbox"}	1
43	6	2026-09-30 08:29:56.456959	\N	{"pagina": "sandbox"}	1
44	7	2026-09-30 12:25:15.6595	\N	{"pagina": "sandbox"}	1
45	7	2026-09-30 13:41:39.91211	2026-09-30 13:41:56.578239	{"pagina": "sandbox"}	1
46	7	2026-09-30 13:41:56.820975	2026-09-30 13:43:40.734275	{"pagina": "sandbox"}	1
47	1	2026-09-30 20:02:48.095877	\N	{"pagina": "sandbox"}	1
48	1	2026-10-01 09:54:07.024292	\N	{"pagina": "sandbox"}	1
49	1	2026-10-01 10:28:05.735426	\N	{"pagina": "sandbox"}	1
50	5	2026-10-01 12:17:28.074058	2026-10-01 12:17:31.50322	{"pagina": "sandbox"}	1
51	1	2026-10-01 13:28:12.570414	\N	{"pagina": "sandbox"}	1
52	6	2026-10-02 12:58:42.753732	\N	{"pagina": "sandbox"}	1
53	6	2026-10-02 12:59:03.548125	2026-10-02 12:59:11.241119	{"pagina": "sandbox"}	1
\.


--
-- TOC entry 5253 (class 0 OID 16622)
-- Dependencies: 235
-- Data for Name: telemetria_3d; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.telemetria_3d (id, sesion_id, actividad_id, marca_tiempo, tipo_evento, pos_x, pos_y, pos_z, contexto) FROM stdin;
1	1	\N	2026-09-17 21:31:45.161	modal_abierto	\N	\N	\N	{"modal": "matematicas"}
2	1	\N	2026-09-17 21:31:48.151	camara_posicion	1.49422e-15	17.450493	-24.402466	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 30}
3	1	\N	2026-09-17 21:31:55.146	matematicas_intento	\N	\N	\N	{"area": 400, "volumen": 6000, "correcto": false, "perimetro": 80, "unidad_area": "", "unidad_volumen": "", "unidad_perimetro": ""}
4	1	\N	2026-09-17 21:31:55.146	modal_cerrado	\N	\N	\N	{"modal": "matematicas"}
5	1	\N	2026-09-17 21:31:56.683	modal_abierto	\N	\N	\N	{"modal": "matematicas"}
6	1	\N	2026-09-17 21:31:58.149	camara_posicion	1.49422e-15	17.450493	-24.402466	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 30}
7	1	\N	2026-09-17 21:32:01.596	matematicas_intento	\N	\N	\N	{"area": 400, "volumen": 6000, "correcto": true, "perimetro": 80, "unidad_area": "m2", "unidad_volumen": "m3", "unidad_perimetro": "m"}
8	1	\N	2026-09-17 21:32:01.596	modal_cerrado	\N	\N	\N	{"modal": "matematicas"}
9	1	\N	2026-09-17 21:32:02.925	modal_abierto	\N	\N	\N	{"modal": "concreto"}
10	1	\N	2026-09-17 21:32:08.152	camara_posicion	1.49422e-15	17.450493	-24.402466	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 30}
11	1	\N	2026-09-17 21:32:13.592	concreto_intento	\N	\N	\N	{"agua": 600, "arena": 2000, "grava": 3000, "cemento": 1000, "correcto": true}
12	1	\N	2026-09-17 21:32:13.595	modal_cerrado	\N	\N	\N	{"modal": "concreto"}
13	1	\N	2026-09-17 21:32:13.595	modal_cerrado	\N	\N	\N	{"modal": "concreto"}
14	1	\N	2026-09-17 21:32:18.152	camara_posicion	1.49422e-15	17.450493	-24.402466	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 30}
15	1	\N	2026-09-17 21:32:27.909	pared_construida	0	0	0	{"alto": 10, "modo": "simple", "ancho": 16, "material": "block"}
16	1	\N	2026-09-17 21:32:28.164	camara_posicion	1.49422e-15	17.450493	-24.402466	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 30}
17	1	\N	2026-09-17 21:32:38.156	camara_posicion	1.49422e-15	17.450493	-24.402466	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 30}
18	2	\N	2026-09-17 21:32:50.427	camara_posicion	1.4986891e-15	17.502684	-24.475449	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 30.089725233159243}
19	2	\N	2026-09-17 21:32:53.72	modal_abierto	\N	\N	\N	{"modal": "matematicas"}
20	2	\N	2026-09-17 21:33:00.429	camara_posicion	1.4986891e-15	17.502684	-24.475449	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 30.089725233159243}
21	2	\N	2026-09-17 21:33:05.142	matematicas_intento	\N	\N	\N	{"area": 400, "volumen": 6000, "correcto": true, "perimetro": 80, "unidad_area": "m2", "unidad_volumen": "m3", "unidad_perimetro": "m"}
22	2	\N	2026-09-17 21:33:05.142	modal_cerrado	\N	\N	\N	{"modal": "matematicas"}
23	2	\N	2026-09-17 21:33:06.32	modal_abierto	\N	\N	\N	{"modal": "concreto"}
24	2	\N	2026-09-17 21:33:10.429	camara_posicion	1.4986891e-15	17.502684	-24.475449	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 30.089725233159243}
25	2	\N	2026-09-17 21:33:20.429	camara_posicion	1.4986891e-15	17.502684	-24.475449	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 30.089725233159243}
26	2	\N	2026-09-17 21:33:20.896	concreto_intento	\N	\N	\N	{"agua": 600, "arena": 2000, "grava": 3000, "cemento": 1000, "correcto": true}
27	2	\N	2026-09-17 21:33:20.898	modal_cerrado	\N	\N	\N	{"modal": "concreto"}
28	2	\N	2026-09-17 21:33:20.899	modal_cerrado	\N	\N	\N	{"modal": "concreto"}
29	2	\N	2026-09-17 21:33:31.004	camara_posicion	1.4986891e-15	17.502684	-24.475449	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 30.089725233159243}
30	2	\N	2026-09-17 21:33:40.99	camara_posicion	1.4986891e-15	17.502684	-24.475449	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 30.089725233159243}
31	2	\N	2026-09-17 21:33:50.997	camara_posicion	1.4986891e-15	17.502684	-24.475449	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 30.089725233159243}
32	2	\N	2026-09-17 21:34:00.99	camara_posicion	1.4986891e-15	17.502684	-24.475449	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 30.089725233159243}
33	2	\N	2026-09-17 21:34:10.997	camara_posicion	1.4986891e-15	17.502684	-24.475449	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 30.089725233159243}
34	2	\N	2026-09-17 21:34:21.003	camara_posicion	1.4986891e-15	17.502684	-24.475449	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 30.089725233159243}
35	2	\N	2026-09-17 21:35:01.997	camara_posicion	1.4986891e-15	17.502684	-24.475449	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 30.089725233159243}
36	2	\N	2026-09-17 21:35:41.006	inactividad	\N	\N	\N	{"duracion_ms": 39009}
37	2	\N	2026-09-17 21:36:02.005	camara_posicion	1.4986891e-15	17.502684	-24.475449	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 30.089725233159243}
38	2	\N	2026-09-17 21:37:01.994	camara_posicion	1.4986891e-15	17.502684	-24.475449	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 30.089725233159243}
39	2	\N	2026-09-17 21:37:21.456	camara_posicion	1.4986891e-15	17.502684	-24.475449	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 30.089725233159243}
40	2	\N	2026-09-17 21:37:30.429	camara_posicion	1.4986891e-15	17.502684	-24.475449	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 30.089725233159243}
41	2	\N	2026-09-17 21:37:40.429	camara_posicion	1.4986891e-15	17.502684	-24.475449	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 30.089725233159243}
42	2	\N	2026-09-17 21:37:50.429	camara_posicion	1.4986891e-15	17.502684	-24.475449	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 30.089725233159243}
43	2	\N	2026-09-17 21:38:00.429	camara_posicion	1.4986891e-15	17.502684	-24.475449	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 30.089725233159243}
44	2	\N	2026-09-17 21:38:10.428	camara_posicion	1.4986891e-15	17.502684	-24.475449	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 30.089725233159243}
45	2	\N	2026-09-17 21:38:20.429	camara_posicion	1.4986891e-15	17.502684	-24.475449	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 30.089725233159243}
46	2	\N	2026-09-17 21:38:30.429	camara_posicion	1.4986891e-15	17.502684	-24.475449	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 30.089725233159243}
47	2	\N	2026-09-17 21:38:40.429	camara_posicion	1.4986891e-15	17.502684	-24.475449	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 30.089725233159243}
48	2	\N	2026-09-17 21:38:50.428	camara_posicion	1.4986891e-15	17.502684	-24.475449	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 30.089725233159243}
49	2	\N	2026-09-17 21:39:00.427	camara_posicion	1.4986891e-15	17.502684	-24.475449	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 30.089725233159243}
459	11	\N	2026-09-18 17:26:25.686	objeto_eliminado	\N	\N	\N	{"id": 7, "tipo": "wall_block"}
50	2	\N	2026-09-17 21:39:10.427	camara_posicion	1.4986891e-15	17.502684	-24.475449	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 30.089725233159243}
51	2	\N	2026-09-17 21:39:20.427	camara_posicion	1.4986891e-15	17.502684	-24.475449	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 30.089725233159243}
52	2	\N	2026-09-17 21:39:30.429	camara_posicion	1.4986891e-15	17.502684	-24.475449	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 30.089725233159243}
53	2	\N	2026-09-17 21:39:40.427	camara_posicion	1.4986891e-15	17.502684	-24.475449	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 30.089725233159243}
54	2	\N	2026-09-17 21:39:50.43	camara_posicion	1.4986891e-15	17.502684	-24.475449	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 30.089725233159243}
55	2	\N	2026-09-17 21:40:00.427	camara_posicion	1.4986891e-15	17.502684	-24.475449	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 30.089725233159243}
56	2	\N	2026-09-17 21:40:10.428	camara_posicion	1.4986891e-15	17.502684	-24.475449	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 30.089725233159243}
57	2	\N	2026-09-17 21:40:20.428	camara_posicion	1.4986891e-15	17.502684	-24.475449	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 30.089725233159243}
58	2	\N	2026-09-17 21:40:30.428	camara_posicion	1.4986891e-15	17.502684	-24.475449	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 30.089725233159243}
59	2	\N	2026-09-17 21:40:40.426	camara_posicion	1.4986891e-15	17.502684	-24.475449	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 30.089725233159243}
60	2	\N	2026-09-17 21:40:50.431	camara_posicion	1.4986891e-15	17.502684	-24.475449	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 30.089725233159243}
61	2	\N	2026-09-17 21:41:00.43	camara_posicion	1.4986891e-15	17.502684	-24.475449	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 30.089725233159243}
62	2	\N	2026-09-17 21:41:10.432	camara_posicion	1.4986891e-15	17.502684	-24.475449	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 30.089725233159243}
63	2	\N	2026-09-17 21:41:15.494	pared_construida	0	0	0	{"alto": 10, "modo": "simple", "ancho": 16, "material": "block"}
64	2	\N	2026-09-17 21:41:20.429	camara_posicion	1.4986891e-15	17.502684	-24.475449	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 30.089725233159243}
65	3	\N	2026-09-17 21:41:39.114	camara_posicion	1.49422e-15	17.450493	-24.402466	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 30}
66	3	\N	2026-09-17 21:41:49.99	camara_posicion	1.49422e-15	17.450493	-24.402466	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 30}
67	4	\N	2026-09-17 21:53:58.416	modal_abierto	\N	\N	\N	{"modal": "matematicas"}
68	4	\N	2026-09-17 21:54:02.473	camara_posicion	2.282618e-15	26.657928	-37.27798	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 45.828954814893656}
69	4	\N	2026-09-17 21:54:11.205	matematicas_intento	\N	\N	\N	{"area": 400, "volumen": 6000, "correcto": true, "perimetro": 80, "unidad_area": "m2", "unidad_volumen": "m3", "unidad_perimetro": "m"}
70	4	\N	2026-09-17 21:54:11.206	modal_cerrado	\N	\N	\N	{"modal": "matematicas"}
71	4	\N	2026-09-17 21:54:12.473	camara_posicion	2.282618e-15	26.657928	-37.27798	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 45.828954814893656}
72	4	\N	2026-09-17 21:54:12.737	modal_abierto	\N	\N	\N	{"modal": "concreto"}
73	4	\N	2026-09-17 21:54:22.471	camara_posicion	2.282618e-15	26.657928	-37.27798	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 45.828954814893656}
74	4	\N	2026-09-17 21:54:25.039	concreto_intento	\N	\N	\N	{"agua": 600, "arena": 2000, "grava": 3000, "cemento": 1000, "correcto": true}
75	4	\N	2026-09-17 21:54:25.043	modal_cerrado	\N	\N	\N	{"modal": "concreto"}
76	4	\N	2026-09-17 21:54:25.043	modal_cerrado	\N	\N	\N	{"modal": "concreto"}
77	4	\N	2026-09-17 21:54:32.475	camara_posicion	2.282618e-15	26.657928	-37.27798	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 45.828954814893656}
78	4	\N	2026-09-17 21:54:33.228	pared_construida	0	0	0	{"alto": 10, "modo": "simple", "ancho": 16, "material": "block"}
79	5	\N	2026-09-17 21:54:52.545	camara_posicion	2.5382238e-15	29.643063	-41.452343	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 50.960845415704114}
80	6	\N	2026-09-18 13:51:10.401	camara_posicion	1.49422e-15	17.450493	-24.402466	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 30}
81	6	\N	2026-09-18 13:51:20.409	camara_posicion	1.49422e-15	17.450493	-24.402466	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 30}
82	6	\N	2026-09-18 13:51:30.4	camara_posicion	1.49422e-15	17.450493	-24.402466	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 30}
83	6	\N	2026-09-18 13:51:40.414	camara_posicion	1.49422e-15	17.450493	-24.402466	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 30}
84	6	\N	2026-09-18 13:51:50.409	camara_posicion	1.49422e-15	17.450493	-24.402466	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 30}
85	6	\N	2026-09-18 13:52:00.408	camara_posicion	1.49422e-15	17.450493	-24.402466	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 30}
86	6	\N	2026-09-18 13:52:59.404	camara_posicion	1.49422e-15	17.450493	-24.402466	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 30}
87	6	\N	2026-09-18 13:53:30.41	inactividad	\N	\N	\N	{"duracion_ms": 31006}
88	6	\N	2026-09-18 13:53:59.41	camara_posicion	1.49422e-15	17.450493	-24.402466	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 30}
89	6	\N	2026-09-18 13:54:59.41	camara_posicion	1.49422e-15	17.450493	-24.402466	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 30}
90	6	\N	2026-09-18 13:55:59.404	camara_posicion	1.49422e-15	17.450493	-24.402466	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 30}
91	6	\N	2026-09-18 13:56:59.401	camara_posicion	1.49422e-15	17.450493	-24.402466	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 30}
92	6	\N	2026-09-18 13:57:59.407	camara_posicion	1.49422e-15	17.450493	-24.402466	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 30}
93	6	\N	2026-09-18 13:58:59.411	camara_posicion	1.49422e-15	17.450493	-24.402466	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 30}
94	6	\N	2026-09-18 13:59:59.409	camara_posicion	1.49422e-15	17.450493	-24.402466	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 30}
95	6	\N	2026-09-18 14:00:59.401	camara_posicion	1.49422e-15	17.450493	-24.402466	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 30}
96	6	\N	2026-09-18 14:01:59.402	camara_posicion	1.49422e-15	17.450493	-24.402466	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 30}
97	6	\N	2026-09-18 14:02:59.403	camara_posicion	1.49422e-15	17.450493	-24.402466	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 30}
98	6	\N	2026-09-18 14:03:59.411	camara_posicion	1.49422e-15	17.450493	-24.402466	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 30}
99	6	\N	2026-09-18 14:04:59.415	camara_posicion	1.49422e-15	17.450493	-24.402466	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 30}
100	6	\N	2026-09-18 14:05:59.407	camara_posicion	1.49422e-15	17.450493	-24.402466	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 30}
101	6	\N	2026-09-18 14:06:59.414	camara_posicion	1.49422e-15	17.450493	-24.402466	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 30}
102	6	\N	2026-09-18 14:07:59.413	camara_posicion	1.49422e-15	17.450493	-24.402466	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 30}
103	6	\N	2026-09-18 14:08:59.401	camara_posicion	1.49422e-15	17.450493	-24.402466	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 30}
104	6	\N	2026-09-18 14:09:59.403	camara_posicion	1.49422e-15	17.450493	-24.402466	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 30}
105	6	\N	2026-09-18 14:10:59.408	camara_posicion	1.49422e-15	17.450493	-24.402466	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 30}
106	6	\N	2026-09-18 14:11:59.414	camara_posicion	1.49422e-15	17.450493	-24.402466	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 30}
107	6	\N	2026-09-18 14:12:59.406	camara_posicion	1.49422e-15	17.450493	-24.402466	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 30}
108	6	\N	2026-09-18 14:13:59.404	camara_posicion	1.49422e-15	17.450493	-24.402466	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 30}
109	6	\N	2026-09-18 14:14:59.405	camara_posicion	1.49422e-15	17.450493	-24.402466	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 30}
110	6	\N	2026-09-18 14:15:59.405	camara_posicion	1.49422e-15	17.450493	-24.402466	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 30}
111	6	\N	2026-09-18 14:16:35.142	camara_posicion	1.49422e-15	17.450493	-24.402466	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 30}
112	6	\N	2026-09-18 14:16:40.403	camara_posicion	1.49422e-15	17.450493	-24.402466	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 30}
113	6	\N	2026-09-18 14:16:50.41	camara_posicion	1.49422e-15	17.450493	-24.402466	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 30}
114	6	\N	2026-09-18 14:17:00.403	camara_posicion	1.49422e-15	17.450493	-24.402466	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 30}
115	6	\N	2026-09-18 14:17:10.413	camara_posicion	1.49422e-15	17.450493	-24.402466	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 30}
116	6	\N	2026-09-18 14:17:20.408	camara_posicion	1.49422e-15	17.450493	-24.402466	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 30}
117	6	\N	2026-09-18 14:17:30.406	camara_posicion	1.49422e-15	17.450493	-24.402466	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 30}
118	6	\N	2026-09-18 14:17:53.472	camara_posicion	1.49422e-15	17.450493	-24.402466	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 30}
119	6	\N	2026-09-18 14:18:00.406	camara_posicion	1.49422e-15	17.450493	-24.402466	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 30}
120	6	\N	2026-09-18 14:18:10.407	camara_posicion	1.49422e-15	17.450493	-24.402466	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 30}
121	6	\N	2026-09-18 14:18:20.402	camara_posicion	1.49422e-15	17.450493	-24.402466	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 30}
122	6	\N	2026-09-18 14:18:30.403	camara_posicion	1.49422e-15	17.450493	-24.402466	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 30}
123	6	\N	2026-09-18 14:18:40.407	camara_posicion	1.49422e-15	17.450493	-24.402466	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 30}
124	6	\N	2026-09-18 14:18:50.403	camara_posicion	1.49422e-15	17.450493	-24.402466	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 30}
125	6	\N	2026-09-18 14:18:59.457	camara_posicion	1.49422e-15	17.450493	-24.402466	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 30}
126	6	\N	2026-09-18 14:19:09.456	camara_posicion	1.49422e-15	17.450493	-24.402466	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 30}
127	8	\N	2026-09-18 14:20:40.643	pared_construida	0	0	0	{"alto": 10, "modo": "simple", "ancho": 16, "material": "block"}
128	8	\N	2026-09-18 14:20:41.929	camara_posicion	1.49422e-15	17.450493	-24.402466	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 30}
129	8	\N	2026-09-18 14:20:51.923	camara_posicion	1.49422e-15	17.450493	-24.402466	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 30}
130	8	\N	2026-09-18 14:21:01.933	camara_posicion	1.49422e-15	17.450493	-24.402466	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 30}
131	8	\N	2026-09-18 14:21:11.935	camara_posicion	-4.238509	41.818443	7.341313	{"beta": 0.2, "alpha": -4.1887902047863905, "radius": 42.66898256015887}
132	8	\N	2026-09-18 14:21:21.928	camara_posicion	-31.270563	22.734215	18.054068	{"beta": 1.008885445665015, "alpha": -3.665191429188092, "radius": 42.66898256015887}
133	8	\N	2026-09-18 14:21:31.933	camara_posicion	24.465681	31.977325	-14.125267	{"beta": 0.7235987755982989, "alpha": -6.806784082777886, "radius": 42.66898256015887}
134	8	\N	2026-09-18 14:21:41.923	camara_posicion	-1.15841446e-14	37.742477	-19.903458	{"beta": 0.4852866700667161, "alpha": -7.853981633974484, "radius": 42.66898256015887}
135	8	\N	2026-09-18 14:21:51.941	camara_posicion	19.903458	37.742477	4.874941e-15	{"beta": 0.4852866700667161, "alpha": -6.283185307179586, "radius": 42.66898256015887}
136	8	\N	2026-09-18 14:22:01.924	camara_posicion	-10.911777	7.3193617	-18.899752	{"beta": 1.2471975511965976, "alpha": -8.377580409572783, "radius": 23.01826527327551}
137	8	\N	2026-09-18 14:22:11.939	camara_posicion	-1.7002494e-14	18.392977	-29.213068	{"beta": 1.008885445665015, "alpha": -7.853981633974484, "radius": 34.521079878066665}
138	10	\N	2026-09-18 14:30:13.03	camara_posicion	1.8291856e-15	21.362442	-29.872868	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 36.72522445367402}
139	10	\N	2026-09-18 14:30:23.052	camara_posicion	1.8291856e-15	21.362442	-29.872868	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 36.72522445367402}
140	10	\N	2026-09-18 14:30:33.021	camara_posicion	1.8291856e-15	21.362442	-29.872868	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 36.72522445367402}
141	10	\N	2026-09-18 14:30:43.016	camara_posicion	1.8291856e-15	21.362442	-29.872868	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 36.72522445367402}
142	10	\N	2026-09-18 14:30:53.021	camara_posicion	1.8291856e-15	21.362442	-29.872868	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 36.72522445367402}
143	10	\N	2026-09-18 14:31:03.022	camara_posicion	1.8291856e-15	21.362442	-29.872868	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 36.72522445367402}
144	10	\N	2026-09-18 14:31:13.117	camara_posicion	1.8291856e-15	21.362442	-29.872868	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 36.72522445367402}
145	10	\N	2026-09-18 14:31:23.035	camara_posicion	1.8291856e-15	21.362442	-29.872868	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 36.72522445367402}
146	10	\N	2026-09-18 14:31:33.033	camara_posicion	1.8291856e-15	21.362442	-29.872868	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 36.72522445367402}
147	10	\N	2026-09-18 14:31:43.027	camara_posicion	1.8291856e-15	21.362442	-29.872868	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 36.72522445367402}
148	10	\N	2026-09-18 14:31:53.017	camara_posicion	1.8291856e-15	21.362442	-29.872868	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 36.72522445367402}
149	10	\N	2026-09-18 14:32:03.404	camara_posicion	1.8291856e-15	21.362442	-29.872868	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 36.72522445367402}
150	10	\N	2026-09-18 14:32:13.403	camara_posicion	1.8291856e-15	21.362442	-29.872868	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 36.72522445367402}
151	10	\N	2026-09-18 14:32:23.407	camara_posicion	1.8291856e-15	21.362442	-29.872868	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 36.72522445367402}
152	10	\N	2026-09-18 14:32:33.404	camara_posicion	1.8291856e-15	21.362442	-29.872868	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 36.72522445367402}
153	10	\N	2026-09-18 14:32:43.409	camara_posicion	1.8291856e-15	21.362442	-29.872868	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 36.72522445367402}
154	10	\N	2026-09-18 14:32:53.038	camara_posicion	1.8291856e-15	21.362442	-29.872868	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 36.72522445367402}
155	10	\N	2026-09-18 14:33:03.028	camara_posicion	1.8291856e-15	21.362442	-29.872868	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 36.72522445367402}
156	10	\N	2026-09-18 14:33:13.039	camara_posicion	1.8291856e-15	21.362442	-29.872868	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 36.72522445367402}
157	10	\N	2026-09-18 14:33:23.016	camara_posicion	1.8291856e-15	21.362442	-29.872868	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 36.72522445367402}
158	10	\N	2026-09-18 14:33:33.023	camara_posicion	1.8291856e-15	21.362442	-29.872868	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 36.72522445367402}
159	10	\N	2026-09-18 14:33:43.407	camara_posicion	1.8291856e-15	21.362442	-29.872868	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 36.72522445367402}
160	10	\N	2026-09-18 14:33:53.413	camara_posicion	1.8291856e-15	21.362442	-29.872868	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 36.72522445367402}
161	10	\N	2026-09-18 14:34:03.402	camara_posicion	1.8291856e-15	21.362442	-29.872868	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 36.72522445367402}
162	10	\N	2026-09-18 14:34:13.405	camara_posicion	1.8291856e-15	21.362442	-29.872868	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 36.72522445367402}
163	10	\N	2026-09-18 14:34:23.406	camara_posicion	1.8291856e-15	21.362442	-29.872868	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 36.72522445367402}
164	10	\N	2026-09-18 14:34:33.406	camara_posicion	1.8291856e-15	21.362442	-29.872868	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 36.72522445367402}
165	10	\N	2026-09-18 14:34:59.404	camara_posicion	1.8291856e-15	21.362442	-29.872868	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 36.72522445367402}
166	10	\N	2026-09-18 14:35:22.48	camara_posicion	1.8291856e-15	21.362442	-29.872868	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 36.72522445367402}
167	10	\N	2026-09-18 14:35:23.046	camara_posicion	1.8291856e-15	21.362442	-29.872868	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 36.72522445367402}
168	10	\N	2026-09-18 14:35:33.406	camara_posicion	1.8291856e-15	21.362442	-29.872868	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 36.72522445367402}
169	10	\N	2026-09-18 14:35:43.403	camara_posicion	1.8291856e-15	21.362442	-29.872868	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 36.72522445367402}
170	10	\N	2026-09-18 14:35:53.407	camara_posicion	1.8291856e-15	21.362442	-29.872868	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 36.72522445367402}
171	10	\N	2026-09-18 14:36:03.416	camara_posicion	1.8291856e-15	21.362442	-29.872868	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 36.72522445367402}
172	10	\N	2026-09-18 14:36:13.407	camara_posicion	1.8291856e-15	21.362442	-29.872868	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 36.72522445367402}
173	10	\N	2026-09-18 14:36:23.405	camara_posicion	1.8291856e-15	21.362442	-29.872868	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 36.72522445367402}
174	10	\N	2026-09-18 14:36:59.414	camara_posicion	1.8291856e-15	21.362442	-29.872868	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 36.72522445367402}
175	10	\N	2026-09-18 14:37:21.586	camara_posicion	1.8291856e-15	21.362442	-29.872868	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 36.72522445367402}
176	10	\N	2026-09-18 14:37:23.404	camara_posicion	1.8291856e-15	21.362442	-29.872868	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 36.72522445367402}
177	10	\N	2026-09-18 14:37:33.403	camara_posicion	1.8291856e-15	21.362442	-29.872868	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 36.72522445367402}
178	10	\N	2026-09-18 14:37:43.41	camara_posicion	1.8291856e-15	21.362442	-29.872868	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 36.72522445367402}
179	10	\N	2026-09-18 14:37:53.41	camara_posicion	1.8291856e-15	21.362442	-29.872868	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 36.72522445367402}
180	10	\N	2026-09-18 14:38:03.402	camara_posicion	1.8291856e-15	21.362442	-29.872868	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 36.72522445367402}
181	10	\N	2026-09-18 14:38:13.414	camara_posicion	1.8291856e-15	21.362442	-29.872868	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 36.72522445367402}
182	10	\N	2026-09-18 14:38:59.401	camara_posicion	1.8291856e-15	21.362442	-29.872868	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 36.72522445367402}
183	10	\N	2026-09-18 14:39:59.406	camara_posicion	1.8291856e-15	21.362442	-29.872868	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 36.72522445367402}
184	10	\N	2026-09-18 14:40:18.249	camara_posicion	1.8291856e-15	21.362442	-29.872868	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 36.72522445367402}
185	10	\N	2026-09-18 14:40:23.02	camara_posicion	1.8291856e-15	21.362442	-29.872868	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 36.72522445367402}
186	10	\N	2026-09-18 14:40:33.041	camara_posicion	1.8291856e-15	21.362442	-29.872868	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 36.72522445367402}
187	10	\N	2026-09-18 14:40:43.024	camara_posicion	1.8291856e-15	21.362442	-29.872868	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 36.72522445367402}
188	10	\N	2026-09-18 14:40:53.031	camara_posicion	1.8291856e-15	21.362442	-29.872868	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 36.72522445367402}
189	10	\N	2026-09-18 14:41:03.041	camara_posicion	1.8291856e-15	21.362442	-29.872868	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 36.72522445367402}
190	10	\N	2026-09-18 14:41:13.026	camara_posicion	1.8291856e-15	21.362442	-29.872868	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 36.72522445367402}
191	10	\N	2026-09-18 14:41:23.032	camara_posicion	1.8291856e-15	21.362442	-29.872868	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 36.72522445367402}
192	10	\N	2026-09-18 14:41:33.035	camara_posicion	1.8291856e-15	21.362442	-29.872868	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 36.72522445367402}
193	10	\N	2026-09-18 14:41:43.033	camara_posicion	1.8291856e-15	21.362442	-29.872868	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 36.72522445367402}
194	10	\N	2026-09-18 14:41:53.044	camara_posicion	1.8291856e-15	21.362442	-29.872868	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 36.72522445367402}
195	10	\N	2026-09-18 14:42:03.034	camara_posicion	1.8291856e-15	21.362442	-29.872868	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 36.72522445367402}
196	10	\N	2026-09-18 14:42:13.042	camara_posicion	1.8291856e-15	21.362442	-29.872868	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 36.72522445367402}
197	10	\N	2026-09-18 14:42:23.028	camara_posicion	1.8291856e-15	21.362442	-29.872868	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 36.72522445367402}
198	10	\N	2026-09-18 14:42:33.036	camara_posicion	1.8291856e-15	21.362442	-29.872868	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 36.72522445367402}
199	10	\N	2026-09-18 14:42:43.02	camara_posicion	1.8291856e-15	21.362442	-29.872868	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 36.72522445367402}
200	10	\N	2026-09-18 14:42:53.044	camara_posicion	1.8291856e-15	21.362442	-29.872868	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 36.72522445367402}
201	10	\N	2026-09-18 14:43:03.018	camara_posicion	1.8291856e-15	21.362442	-29.872868	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 36.72522445367402}
202	10	\N	2026-09-18 14:43:13.04	camara_posicion	1.8291856e-15	21.362442	-29.872868	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 36.72522445367402}
203	10	\N	2026-09-18 14:43:23.033	camara_posicion	1.8291856e-15	21.362442	-29.872868	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 36.72522445367402}
204	10	\N	2026-09-18 14:43:33.017	camara_posicion	1.8291856e-15	21.362442	-29.872868	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 36.72522445367402}
205	10	\N	2026-09-18 14:43:43.033	camara_posicion	1.8291856e-15	21.362442	-29.872868	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 36.72522445367402}
206	10	\N	2026-09-18 14:43:53.027	camara_posicion	1.8291856e-15	21.362442	-29.872868	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 36.72522445367402}
207	10	\N	2026-09-18 14:44:03.048	camara_posicion	1.8291856e-15	21.362442	-29.872868	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 36.72522445367402}
208	10	\N	2026-09-18 14:44:13.042	camara_posicion	1.8291856e-15	21.362442	-29.872868	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 36.72522445367402}
209	10	\N	2026-09-18 14:44:23.034	camara_posicion	1.8291856e-15	21.362442	-29.872868	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 36.72522445367402}
210	10	\N	2026-09-18 14:44:33.051	camara_posicion	1.8291856e-15	21.362442	-29.872868	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 36.72522445367402}
211	10	\N	2026-09-18 14:44:43.031	camara_posicion	1.8291856e-15	21.362442	-29.872868	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 36.72522445367402}
212	10	\N	2026-09-18 14:44:53.02	camara_posicion	1.8291856e-15	21.362442	-29.872868	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 36.72522445367402}
213	10	\N	2026-09-18 14:45:03.037	camara_posicion	1.8291856e-15	21.362442	-29.872868	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 36.72522445367402}
214	10	\N	2026-09-18 14:45:13.017	camara_posicion	1.8291856e-15	21.362442	-29.872868	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 36.72522445367402}
215	10	\N	2026-09-18 14:45:23.025	camara_posicion	1.8291856e-15	21.362442	-29.872868	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 36.72522445367402}
216	10	\N	2026-09-18 14:45:33.034	camara_posicion	1.8291856e-15	21.362442	-29.872868	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 36.72522445367402}
217	10	\N	2026-09-18 14:45:43.414	camara_posicion	1.8291856e-15	21.362442	-29.872868	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 36.72522445367402}
218	10	\N	2026-09-18 14:45:53.406	camara_posicion	1.8291856e-15	21.362442	-29.872868	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 36.72522445367402}
219	10	\N	2026-09-18 14:46:03.403	camara_posicion	1.8291856e-15	21.362442	-29.872868	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 36.72522445367402}
220	10	\N	2026-09-18 14:46:13.414	camara_posicion	1.8291856e-15	21.362442	-29.872868	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 36.72522445367402}
221	10	\N	2026-09-18 14:46:23.401	camara_posicion	1.8291856e-15	21.362442	-29.872868	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 36.72522445367402}
222	10	\N	2026-09-18 14:46:59.406	camara_posicion	1.8291856e-15	21.362442	-29.872868	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 36.72522445367402}
223	10	\N	2026-09-18 14:47:59.421	camara_posicion	1.8291856e-15	21.362442	-29.872868	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 36.72522445367402}
224	10	\N	2026-09-18 14:48:03.038	camara_posicion	1.8291856e-15	21.362442	-29.872868	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 36.72522445367402}
225	10	\N	2026-09-18 14:48:13.03	camara_posicion	1.8291856e-15	21.362442	-29.872868	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 36.72522445367402}
226	10	\N	2026-09-18 14:48:23.027	camara_posicion	1.8291856e-15	21.362442	-29.872868	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 36.72522445367402}
227	10	\N	2026-09-18 14:48:33.018	camara_posicion	1.8291856e-15	21.362442	-29.872868	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 36.72522445367402}
228	10	\N	2026-09-18 14:48:43.031	camara_posicion	1.8291856e-15	21.362442	-29.872868	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 36.72522445367402}
229	10	\N	2026-09-18 14:48:53.021	camara_posicion	1.8291856e-15	21.362442	-29.872868	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 36.72522445367402}
230	10	\N	2026-09-18 14:49:03.033	camara_posicion	1.8291856e-15	21.362442	-29.872868	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 36.72522445367402}
231	10	\N	2026-09-18 14:49:13.018	camara_posicion	1.8291856e-15	21.362442	-29.872868	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 36.72522445367402}
232	10	\N	2026-09-18 14:49:23.033	camara_posicion	1.8291856e-15	21.362442	-29.872868	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 36.72522445367402}
233	10	\N	2026-09-18 14:49:33.016	camara_posicion	1.8291856e-15	21.362442	-29.872868	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 36.72522445367402}
234	10	\N	2026-09-18 14:49:43.044	camara_posicion	1.8291856e-15	21.362442	-29.872868	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 36.72522445367402}
235	10	\N	2026-09-18 14:49:53.023	camara_posicion	1.8291856e-15	21.362442	-29.872868	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 36.72522445367402}
236	10	\N	2026-09-18 14:50:03.02	camara_posicion	1.8291856e-15	21.362442	-29.872868	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 36.72522445367402}
237	10	\N	2026-09-18 14:50:13.025	camara_posicion	1.8291856e-15	21.362442	-29.872868	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 36.72522445367402}
238	10	\N	2026-09-18 14:50:23.027	camara_posicion	1.8291856e-15	21.362442	-29.872868	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 36.72522445367402}
239	10	\N	2026-09-18 14:50:33.035	camara_posicion	1.8291856e-15	21.362442	-29.872868	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 36.72522445367402}
240	10	\N	2026-09-18 14:50:43.031	camara_posicion	1.8291856e-15	21.362442	-29.872868	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 36.72522445367402}
241	10	\N	2026-09-18 14:50:53.028	camara_posicion	1.8291856e-15	21.362442	-29.872868	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 36.72522445367402}
242	10	\N	2026-09-18 14:51:03.043	camara_posicion	1.8291856e-15	21.362442	-29.872868	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 36.72522445367402}
243	10	\N	2026-09-18 14:51:13.029	camara_posicion	1.8291856e-15	21.362442	-29.872868	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 36.72522445367402}
244	10	\N	2026-09-18 14:51:23.025	camara_posicion	1.8291856e-15	21.362442	-29.872868	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 36.72522445367402}
245	10	\N	2026-09-18 14:51:33.039	camara_posicion	1.8291856e-15	21.362442	-29.872868	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 36.72522445367402}
246	10	\N	2026-09-18 14:51:43.037	camara_posicion	1.8291856e-15	21.362442	-29.872868	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 36.72522445367402}
247	10	\N	2026-09-18 14:51:53.036	camara_posicion	1.8291856e-15	21.362442	-29.872868	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 36.72522445367402}
248	10	\N	2026-09-18 14:52:03.024	camara_posicion	1.8291856e-15	21.362442	-29.872868	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 36.72522445367402}
249	10	\N	2026-09-18 14:52:13.043	camara_posicion	1.8291856e-15	21.362442	-29.872868	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 36.72522445367402}
250	10	\N	2026-09-18 14:52:23.016	camara_posicion	1.8291856e-15	21.362442	-29.872868	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 36.72522445367402}
251	10	\N	2026-09-18 14:52:33.028	camara_posicion	1.8291856e-15	21.362442	-29.872868	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 36.72522445367402}
252	10	\N	2026-09-18 14:52:43.039	camara_posicion	1.8291856e-15	21.362442	-29.872868	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 36.72522445367402}
253	10	\N	2026-09-18 14:52:53.02	camara_posicion	1.8291856e-15	21.362442	-29.872868	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 36.72522445367402}
254	10	\N	2026-09-18 14:53:03.409	camara_posicion	1.8291856e-15	21.362442	-29.872868	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 36.72522445367402}
255	10	\N	2026-09-18 14:53:13.41	camara_posicion	1.8291856e-15	21.362442	-29.872868	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 36.72522445367402}
256	10	\N	2026-09-18 14:53:23.404	camara_posicion	1.8291856e-15	21.362442	-29.872868	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 36.72522445367402}
257	10	\N	2026-09-18 14:53:33.405	camara_posicion	1.8291856e-15	21.362442	-29.872868	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 36.72522445367402}
258	10	\N	2026-09-18 14:53:43.403	camara_posicion	1.8291856e-15	21.362442	-29.872868	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 36.72522445367402}
259	10	\N	2026-09-18 14:53:53.408	camara_posicion	1.8291856e-15	21.362442	-29.872868	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 36.72522445367402}
260	10	\N	2026-09-18 14:54:59.403	camara_posicion	1.8291856e-15	21.362442	-29.872868	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 36.72522445367402}
261	10	\N	2026-09-18 14:55:59.416	camara_posicion	1.8291856e-15	21.362442	-29.872868	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 36.72522445367402}
262	10	\N	2026-09-18 14:56:59.41	camara_posicion	1.8291856e-15	21.362442	-29.872868	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 36.72522445367402}
263	10	\N	2026-09-18 14:57:59.41	camara_posicion	1.8291856e-15	21.362442	-29.872868	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 36.72522445367402}
264	10	\N	2026-09-18 14:58:59.405	camara_posicion	1.8291856e-15	21.362442	-29.872868	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 36.72522445367402}
265	10	\N	2026-09-18 14:59:59.403	camara_posicion	1.8291856e-15	21.362442	-29.872868	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 36.72522445367402}
266	10	\N	2026-09-18 15:00:59.415	camara_posicion	1.8291856e-15	21.362442	-29.872868	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 36.72522445367402}
267	10	\N	2026-09-18 15:01:59.401	camara_posicion	1.8291856e-15	21.362442	-29.872868	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 36.72522445367402}
268	10	\N	2026-09-18 15:02:59.411	camara_posicion	1.8291856e-15	21.362442	-29.872868	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 36.72522445367402}
269	10	\N	2026-09-18 15:03:59.404	camara_posicion	1.8291856e-15	21.362442	-29.872868	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 36.72522445367402}
270	10	\N	2026-09-18 15:04:59.402	camara_posicion	1.8291856e-15	21.362442	-29.872868	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 36.72522445367402}
271	10	\N	2026-09-18 15:05:59.407	camara_posicion	1.8291856e-15	21.362442	-29.872868	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 36.72522445367402}
272	10	\N	2026-09-18 15:06:38.894	camara_posicion	1.8291856e-15	21.362442	-29.872868	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 36.72522445367402}
273	10	\N	2026-09-18 15:06:43.016	camara_posicion	1.8291856e-15	21.362442	-29.872868	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 36.72522445367402}
274	10	\N	2026-09-18 15:06:53.407	camara_posicion	1.8291856e-15	21.362442	-29.872868	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 36.72522445367402}
275	10	\N	2026-09-18 15:07:03.405	camara_posicion	1.8291856e-15	21.362442	-29.872868	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 36.72522445367402}
276	10	\N	2026-09-18 15:07:13.406	camara_posicion	1.8291856e-15	21.362442	-29.872868	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 36.72522445367402}
277	10	\N	2026-09-18 15:07:23.406	camara_posicion	1.8291856e-15	21.362442	-29.872868	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 36.72522445367402}
278	10	\N	2026-09-18 15:07:33.401	camara_posicion	1.8291856e-15	21.362442	-29.872868	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 36.72522445367402}
279	10	\N	2026-09-18 15:07:43.405	camara_posicion	1.8291856e-15	21.362442	-29.872868	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 36.72522445367402}
280	10	\N	2026-09-18 15:07:59.402	camara_posicion	1.8291856e-15	21.362442	-29.872868	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 36.72522445367402}
281	10	\N	2026-09-18 15:08:59.409	camara_posicion	1.8291856e-15	21.362442	-29.872868	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 36.72522445367402}
282	10	\N	2026-09-18 15:09:59.403	camara_posicion	1.8291856e-15	21.362442	-29.872868	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 36.72522445367402}
283	10	\N	2026-09-18 15:10:59.406	camara_posicion	1.8291856e-15	21.362442	-29.872868	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 36.72522445367402}
284	10	\N	2026-09-18 15:11:59.407	camara_posicion	1.8291856e-15	21.362442	-29.872868	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 36.72522445367402}
285	10	\N	2026-09-18 15:12:59.406	camara_posicion	1.8291856e-15	21.362442	-29.872868	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 36.72522445367402}
286	10	\N	2026-09-18 15:13:59.411	camara_posicion	1.8291856e-15	21.362442	-29.872868	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 36.72522445367402}
287	10	\N	2026-09-18 15:14:59.405	camara_posicion	1.8291856e-15	21.362442	-29.872868	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 36.72522445367402}
288	10	\N	2026-09-18 15:15:59.414	camara_posicion	1.8291856e-15	21.362442	-29.872868	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 36.72522445367402}
289	10	\N	2026-09-18 15:16:59.4	camara_posicion	1.8291856e-15	21.362442	-29.872868	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 36.72522445367402}
290	10	\N	2026-09-18 15:17:59.41	camara_posicion	1.8291856e-15	21.362442	-29.872868	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 36.72522445367402}
291	10	\N	2026-09-18 15:18:59.404	camara_posicion	1.8291856e-15	21.362442	-29.872868	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 36.72522445367402}
292	10	\N	2026-09-18 15:19:59.409	camara_posicion	1.8291856e-15	21.362442	-29.872868	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 36.72522445367402}
293	10	\N	2026-09-18 15:20:59.402	camara_posicion	1.8291856e-15	21.362442	-29.872868	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 36.72522445367402}
294	10	\N	2026-09-18 15:21:59.404	camara_posicion	1.8291856e-15	21.362442	-29.872868	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 36.72522445367402}
295	10	\N	2026-09-18 15:22:59.404	camara_posicion	1.8291856e-15	21.362442	-29.872868	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 36.72522445367402}
296	10	\N	2026-09-18 15:23:59.409	camara_posicion	1.8291856e-15	21.362442	-29.872868	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 36.72522445367402}
297	10	\N	2026-09-18 15:24:59.404	camara_posicion	1.8291856e-15	21.362442	-29.872868	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 36.72522445367402}
298	10	\N	2026-09-18 15:25:59.402	camara_posicion	1.8291856e-15	21.362442	-29.872868	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 36.72522445367402}
299	10	\N	2026-09-18 15:26:59.411	camara_posicion	1.8291856e-15	21.362442	-29.872868	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 36.72522445367402}
300	10	\N	2026-09-18 15:27:59.402	camara_posicion	1.8291856e-15	21.362442	-29.872868	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 36.72522445367402}
301	10	\N	2026-09-18 15:28:59.407	camara_posicion	1.8291856e-15	21.362442	-29.872868	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 36.72522445367402}
302	10	\N	2026-09-18 15:29:59.406	camara_posicion	1.8291856e-15	21.362442	-29.872868	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 36.72522445367402}
303	10	\N	2026-09-18 15:30:59.413	camara_posicion	1.8291856e-15	21.362442	-29.872868	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 36.72522445367402}
304	10	\N	2026-09-18 15:31:39.866	camara_posicion	1.8291856e-15	21.362442	-29.872868	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 36.72522445367402}
305	10	\N	2026-09-18 15:31:43.412	camara_posicion	1.8291856e-15	21.362442	-29.872868	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 36.72522445367402}
306	10	\N	2026-09-18 15:31:53.406	camara_posicion	1.8291856e-15	21.362442	-29.872868	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 36.72522445367402}
307	10	\N	2026-09-18 15:32:03.407	camara_posicion	1.8291856e-15	21.362442	-29.872868	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 36.72522445367402}
308	10	\N	2026-09-18 15:32:13.401	camara_posicion	1.8291856e-15	21.362442	-29.872868	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 36.72522445367402}
309	10	\N	2026-09-18 15:32:23.402	camara_posicion	1.8291856e-15	21.362442	-29.872868	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 36.72522445367402}
310	10	\N	2026-09-18 15:32:33.406	camara_posicion	1.8291856e-15	21.362442	-29.872868	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 36.72522445367402}
311	10	\N	2026-09-18 15:32:59.406	camara_posicion	1.8291856e-15	21.362442	-29.872868	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 36.72522445367402}
312	10	\N	2026-09-18 15:33:59.403	camara_posicion	1.8291856e-15	21.362442	-29.872868	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 36.72522445367402}
313	10	\N	2026-09-18 15:34:59.41	camara_posicion	1.8291856e-15	21.362442	-29.872868	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 36.72522445367402}
314	10	\N	2026-09-18 15:35:59.41	camara_posicion	1.8291856e-15	21.362442	-29.872868	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 36.72522445367402}
315	10	\N	2026-09-18 15:36:59.409	camara_posicion	1.8291856e-15	21.362442	-29.872868	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 36.72522445367402}
316	10	\N	2026-09-18 15:37:59.411	camara_posicion	1.8291856e-15	21.362442	-29.872868	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 36.72522445367402}
317	10	\N	2026-09-18 15:38:59.401	camara_posicion	1.8291856e-15	21.362442	-29.872868	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 36.72522445367402}
318	10	\N	2026-09-18 15:39:59.414	camara_posicion	1.8291856e-15	21.362442	-29.872868	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 36.72522445367402}
319	10	\N	2026-09-18 15:40:59.414	camara_posicion	1.8291856e-15	21.362442	-29.872868	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 36.72522445367402}
320	10	\N	2026-09-18 15:41:59.401	camara_posicion	1.8291856e-15	21.362442	-29.872868	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 36.72522445367402}
321	10	\N	2026-09-18 15:42:59.408	camara_posicion	1.8291856e-15	21.362442	-29.872868	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 36.72522445367402}
322	10	\N	2026-09-18 15:43:59.404	camara_posicion	1.8291856e-15	21.362442	-29.872868	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 36.72522445367402}
323	10	\N	2026-09-18 15:44:59.41	camara_posicion	1.8291856e-15	21.362442	-29.872868	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 36.72522445367402}
324	10	\N	2026-09-18 15:45:59.409	camara_posicion	1.8291856e-15	21.362442	-29.872868	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 36.72522445367402}
325	10	\N	2026-09-18 15:46:59.404	camara_posicion	1.8291856e-15	21.362442	-29.872868	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 36.72522445367402}
326	10	\N	2026-09-18 15:47:59.41	camara_posicion	1.8291856e-15	21.362442	-29.872868	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 36.72522445367402}
327	10	\N	2026-09-18 15:48:59.403	camara_posicion	1.8291856e-15	21.362442	-29.872868	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 36.72522445367402}
328	10	\N	2026-09-18 15:49:59.421	camara_posicion	1.8291856e-15	21.362442	-29.872868	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 36.72522445367402}
329	10	\N	2026-09-18 15:50:59.41	camara_posicion	1.8291856e-15	21.362442	-29.872868	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 36.72522445367402}
330	10	\N	2026-09-18 15:51:59.407	camara_posicion	1.8291856e-15	21.362442	-29.872868	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 36.72522445367402}
331	10	\N	2026-09-18 15:52:22.011	camara_posicion	1.8291856e-15	21.362442	-29.872868	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 36.72522445367402}
332	10	\N	2026-09-18 15:52:23.036	camara_posicion	1.8291856e-15	21.362442	-29.872868	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 36.72522445367402}
333	11	\N	2026-09-18 15:52:36.84	camara_posicion	-4.4249862e-14	21.523403	-30.097952	{"beta": 0.95, "alpha": -7.853981633974485, "radius": 37.00193929153159}
334	11	\N	2026-09-18 15:52:46.825	camara_posicion	-4.4249862e-14	21.523403	-30.097952	{"beta": 0.95, "alpha": -7.853981633974485, "radius": 37.00193929153159}
335	11	\N	2026-09-18 15:52:56.85	camara_posicion	-4.4249862e-14	21.523403	-30.097952	{"beta": 0.95, "alpha": -7.853981633974485, "radius": 37.00193929153159}
336	11	\N	2026-09-18 15:53:06.828	camara_posicion	-4.4249862e-14	21.523403	-30.097952	{"beta": 0.95, "alpha": -7.853981633974485, "radius": 37.00193929153159}
337	11	\N	2026-09-18 15:53:16.836	camara_posicion	-4.4249862e-14	21.523403	-30.097952	{"beta": 0.95, "alpha": -7.853981633974485, "radius": 37.00193929153159}
338	11	\N	2026-09-18 15:53:26.83	camara_posicion	-4.4249862e-14	21.523403	-30.097952	{"beta": 0.95, "alpha": -7.853981633974485, "radius": 37.00193929153159}
339	11	\N	2026-09-18 15:53:36.824	camara_posicion	-4.4249862e-14	21.523403	-30.097952	{"beta": 0.95, "alpha": -7.853981633974485, "radius": 37.00193929153159}
340	11	\N	2026-09-18 15:53:46.826	camara_posicion	-4.4249862e-14	21.523403	-30.097952	{"beta": 0.95, "alpha": -7.853981633974485, "radius": 37.00193929153159}
341	11	\N	2026-09-18 15:53:56.823	camara_posicion	-4.4249862e-14	21.523403	-30.097952	{"beta": 0.95, "alpha": -7.853981633974485, "radius": 37.00193929153159}
342	11	\N	2026-09-18 15:54:06.851	camara_posicion	-4.4249862e-14	21.523403	-30.097952	{"beta": 0.95, "alpha": -7.853981633974485, "radius": 37.00193929153159}
343	11	\N	2026-09-18 15:54:16.835	camara_posicion	-4.4249862e-14	21.523403	-30.097952	{"beta": 0.95, "alpha": -7.853981633974485, "radius": 37.00193929153159}
344	11	\N	2026-09-18 15:54:26.839	camara_posicion	-4.4249862e-14	21.523403	-30.097952	{"beta": 0.95, "alpha": -7.853981633974485, "radius": 37.00193929153159}
345	11	\N	2026-09-18 15:54:36.829	camara_posicion	-4.4249862e-14	21.523403	-30.097952	{"beta": 0.95, "alpha": -7.853981633974485, "radius": 37.00193929153159}
346	11	\N	2026-09-18 15:54:46.823	camara_posicion	-4.4249862e-14	21.523403	-30.097952	{"beta": 0.95, "alpha": -7.853981633974485, "radius": 37.00193929153159}
347	11	\N	2026-09-18 15:54:56.833	camara_posicion	-4.4249862e-14	21.523403	-30.097952	{"beta": 0.95, "alpha": -7.853981633974485, "radius": 37.00193929153159}
348	11	\N	2026-09-18 15:55:06.834	camara_posicion	-4.4249862e-14	21.523403	-30.097952	{"beta": 0.95, "alpha": -7.853981633974485, "radius": 37.00193929153159}
349	11	\N	2026-09-18 15:55:16.85	camara_posicion	-4.4249862e-14	21.523403	-30.097952	{"beta": 0.95, "alpha": -7.853981633974485, "radius": 37.00193929153159}
350	11	\N	2026-09-18 15:55:27.408	camara_posicion	-4.4249862e-14	21.523403	-30.097952	{"beta": 0.95, "alpha": -7.853981633974485, "radius": 37.00193929153159}
351	11	\N	2026-09-18 15:55:37.402	camara_posicion	-4.4249862e-14	21.523403	-30.097952	{"beta": 0.95, "alpha": -7.853981633974485, "radius": 37.00193929153159}
352	11	\N	2026-09-18 15:55:47.406	camara_posicion	-4.4249862e-14	21.523403	-30.097952	{"beta": 0.95, "alpha": -7.853981633974485, "radius": 37.00193929153159}
353	11	\N	2026-09-18 15:55:57.411	camara_posicion	-4.4249862e-14	21.523403	-30.097952	{"beta": 0.95, "alpha": -7.853981633974485, "radius": 37.00193929153159}
354	11	\N	2026-09-18 15:56:07.409	camara_posicion	-4.4249862e-14	21.523403	-30.097952	{"beta": 0.95, "alpha": -7.853981633974485, "radius": 37.00193929153159}
355	11	\N	2026-09-18 15:56:17.405	camara_posicion	-4.4249862e-14	21.523403	-30.097952	{"beta": 0.95, "alpha": -7.853981633974485, "radius": 37.00193929153159}
356	11	\N	2026-09-18 15:56:59.405	camara_posicion	-4.4249862e-14	21.523403	-30.097952	{"beta": 0.95, "alpha": -7.853981633974485, "radius": 37.00193929153159}
357	11	\N	2026-09-18 15:57:59.405	camara_posicion	-4.4249862e-14	21.523403	-30.097952	{"beta": 0.95, "alpha": -7.853981633974485, "radius": 37.00193929153159}
358	11	\N	2026-09-18 15:58:59.403	camara_posicion	-4.4249862e-14	21.523403	-30.097952	{"beta": 0.95, "alpha": -7.853981633974485, "radius": 37.00193929153159}
359	11	\N	2026-09-18 15:59:59.411	camara_posicion	-4.4249862e-14	21.523403	-30.097952	{"beta": 0.95, "alpha": -7.853981633974485, "radius": 37.00193929153159}
360	11	\N	2026-09-18 16:00:59.409	camara_posicion	-4.4249862e-14	21.523403	-30.097952	{"beta": 0.95, "alpha": -7.853981633974485, "radius": 37.00193929153159}
361	11	\N	2026-09-18 16:01:59.41	camara_posicion	-4.4249862e-14	21.523403	-30.097952	{"beta": 0.95, "alpha": -7.853981633974485, "radius": 37.00193929153159}
362	11	\N	2026-09-18 16:02:59.41	camara_posicion	-4.4249862e-14	21.523403	-30.097952	{"beta": 0.95, "alpha": -7.853981633974485, "radius": 37.00193929153159}
363	11	\N	2026-09-18 16:03:59.412	camara_posicion	-4.4249862e-14	21.523403	-30.097952	{"beta": 0.95, "alpha": -7.853981633974485, "radius": 37.00193929153159}
364	11	\N	2026-09-18 16:04:59.405	camara_posicion	-4.4249862e-14	21.523403	-30.097952	{"beta": 0.95, "alpha": -7.853981633974485, "radius": 37.00193929153159}
365	11	\N	2026-09-18 16:05:59.411	camara_posicion	-4.4249862e-14	21.523403	-30.097952	{"beta": 0.95, "alpha": -7.853981633974485, "radius": 37.00193929153159}
366	11	\N	2026-09-18 16:06:59.406	camara_posicion	-4.4249862e-14	21.523403	-30.097952	{"beta": 0.95, "alpha": -7.853981633974485, "radius": 37.00193929153159}
367	11	\N	2026-09-18 16:07:59.415	camara_posicion	-4.4249862e-14	21.523403	-30.097952	{"beta": 0.95, "alpha": -7.853981633974485, "radius": 37.00193929153159}
368	11	\N	2026-09-18 16:08:59.419	camara_posicion	-4.4249862e-14	21.523403	-30.097952	{"beta": 0.95, "alpha": -7.853981633974485, "radius": 37.00193929153159}
369	11	\N	2026-09-18 16:09:59.411	camara_posicion	-4.4249862e-14	21.523403	-30.097952	{"beta": 0.95, "alpha": -7.853981633974485, "radius": 37.00193929153159}
370	11	\N	2026-09-18 16:10:59.411	camara_posicion	-4.4249862e-14	21.523403	-30.097952	{"beta": 0.95, "alpha": -7.853981633974485, "radius": 37.00193929153159}
371	11	\N	2026-09-18 16:11:59.406	camara_posicion	-4.4249862e-14	21.523403	-30.097952	{"beta": 0.95, "alpha": -7.853981633974485, "radius": 37.00193929153159}
372	11	\N	2026-09-18 16:12:59.413	camara_posicion	-4.4249862e-14	21.523403	-30.097952	{"beta": 0.95, "alpha": -7.853981633974485, "radius": 37.00193929153159}
373	11	\N	2026-09-18 16:13:59.414	camara_posicion	-4.4249862e-14	21.523403	-30.097952	{"beta": 0.95, "alpha": -7.853981633974485, "radius": 37.00193929153159}
374	11	\N	2026-09-18 16:14:59.412	camara_posicion	-4.4249862e-14	21.523403	-30.097952	{"beta": 0.95, "alpha": -7.853981633974485, "radius": 37.00193929153159}
375	11	\N	2026-09-18 16:15:59.41	camara_posicion	-4.4249862e-14	21.523403	-30.097952	{"beta": 0.95, "alpha": -7.853981633974485, "radius": 37.00193929153159}
376	11	\N	2026-09-18 16:16:59.419	camara_posicion	-4.4249862e-14	21.523403	-30.097952	{"beta": 0.95, "alpha": -7.853981633974485, "radius": 37.00193929153159}
377	11	\N	2026-09-18 16:17:59.411	camara_posicion	-4.4249862e-14	21.523403	-30.097952	{"beta": 0.95, "alpha": -7.853981633974485, "radius": 37.00193929153159}
378	11	\N	2026-09-18 16:18:59.411	camara_posicion	-4.4249862e-14	21.523403	-30.097952	{"beta": 0.95, "alpha": -7.853981633974485, "radius": 37.00193929153159}
379	11	\N	2026-09-18 16:19:59.411	camara_posicion	-4.4249862e-14	21.523403	-30.097952	{"beta": 0.95, "alpha": -7.853981633974485, "radius": 37.00193929153159}
380	11	\N	2026-09-18 16:20:59.407	camara_posicion	-4.4249862e-14	21.523403	-30.097952	{"beta": 0.95, "alpha": -7.853981633974485, "radius": 37.00193929153159}
381	11	\N	2026-09-18 16:21:59.408	camara_posicion	-4.4249862e-14	21.523403	-30.097952	{"beta": 0.95, "alpha": -7.853981633974485, "radius": 37.00193929153159}
382	11	\N	2026-09-18 16:22:59.41	camara_posicion	-4.4249862e-14	21.523403	-30.097952	{"beta": 0.95, "alpha": -7.853981633974485, "radius": 37.00193929153159}
383	11	\N	2026-09-18 16:23:59.411	camara_posicion	-4.4249862e-14	21.523403	-30.097952	{"beta": 0.95, "alpha": -7.853981633974485, "radius": 37.00193929153159}
384	11	\N	2026-09-18 16:24:59.409	camara_posicion	-4.4249862e-14	21.523403	-30.097952	{"beta": 0.95, "alpha": -7.853981633974485, "radius": 37.00193929153159}
385	11	\N	2026-09-18 16:25:59.417	camara_posicion	-4.4249862e-14	21.523403	-30.097952	{"beta": 0.95, "alpha": -7.853981633974485, "radius": 37.00193929153159}
386	11	\N	2026-09-18 16:26:59.412	camara_posicion	-4.4249862e-14	21.523403	-30.097952	{"beta": 0.95, "alpha": -7.853981633974485, "radius": 37.00193929153159}
387	11	\N	2026-09-18 16:27:59.414	camara_posicion	-4.4249862e-14	21.523403	-30.097952	{"beta": 0.95, "alpha": -7.853981633974485, "radius": 37.00193929153159}
388	11	\N	2026-09-18 16:28:59.406	camara_posicion	-4.4249862e-14	21.523403	-30.097952	{"beta": 0.95, "alpha": -7.853981633974485, "radius": 37.00193929153159}
389	11	\N	2026-09-18 16:29:59.401	camara_posicion	-4.4249862e-14	21.523403	-30.097952	{"beta": 0.95, "alpha": -7.853981633974485, "radius": 37.00193929153159}
390	11	\N	2026-09-18 16:30:59.41	camara_posicion	-4.4249862e-14	21.523403	-30.097952	{"beta": 0.95, "alpha": -7.853981633974485, "radius": 37.00193929153159}
391	11	\N	2026-09-18 16:31:59.406	camara_posicion	-4.4249862e-14	21.523403	-30.097952	{"beta": 0.95, "alpha": -7.853981633974485, "radius": 37.00193929153159}
392	11	\N	2026-09-18 16:32:59.404	camara_posicion	-4.4249862e-14	21.523403	-30.097952	{"beta": 0.95, "alpha": -7.853981633974485, "radius": 37.00193929153159}
393	11	\N	2026-09-18 16:33:59.413	camara_posicion	-4.4249862e-14	21.523403	-30.097952	{"beta": 0.95, "alpha": -7.853981633974485, "radius": 37.00193929153159}
394	11	\N	2026-09-18 16:34:59.412	camara_posicion	-4.4249862e-14	21.523403	-30.097952	{"beta": 0.95, "alpha": -7.853981633974485, "radius": 37.00193929153159}
395	11	\N	2026-09-18 16:35:59.408	camara_posicion	-4.4249862e-14	21.523403	-30.097952	{"beta": 0.95, "alpha": -7.853981633974485, "radius": 37.00193929153159}
396	11	\N	2026-09-18 16:36:59.403	camara_posicion	-4.4249862e-14	21.523403	-30.097952	{"beta": 0.95, "alpha": -7.853981633974485, "radius": 37.00193929153159}
397	11	\N	2026-09-18 16:37:59.407	camara_posicion	-4.4249862e-14	21.523403	-30.097952	{"beta": 0.95, "alpha": -7.853981633974485, "radius": 37.00193929153159}
398	11	\N	2026-09-18 16:38:59.408	camara_posicion	-4.4249862e-14	21.523403	-30.097952	{"beta": 0.95, "alpha": -7.853981633974485, "radius": 37.00193929153159}
399	11	\N	2026-09-18 16:39:59.401	camara_posicion	-4.4249862e-14	21.523403	-30.097952	{"beta": 0.95, "alpha": -7.853981633974485, "radius": 37.00193929153159}
400	11	\N	2026-09-18 16:40:59.41	camara_posicion	-4.4249862e-14	21.523403	-30.097952	{"beta": 0.95, "alpha": -7.853981633974485, "radius": 37.00193929153159}
401	11	\N	2026-09-18 16:41:59.411	camara_posicion	-4.4249862e-14	21.523403	-30.097952	{"beta": 0.95, "alpha": -7.853981633974485, "radius": 37.00193929153159}
402	11	\N	2026-09-18 16:42:59.403	camara_posicion	-4.4249862e-14	21.523403	-30.097952	{"beta": 0.95, "alpha": -7.853981633974485, "radius": 37.00193929153159}
403	11	\N	2026-09-18 16:43:59.407	camara_posicion	-4.4249862e-14	21.523403	-30.097952	{"beta": 0.95, "alpha": -7.853981633974485, "radius": 37.00193929153159}
404	11	\N	2026-09-18 16:44:59.403	camara_posicion	-4.4249862e-14	21.523403	-30.097952	{"beta": 0.95, "alpha": -7.853981633974485, "radius": 37.00193929153159}
405	11	\N	2026-09-18 16:45:59.404	camara_posicion	-4.4249862e-14	21.523403	-30.097952	{"beta": 0.95, "alpha": -7.853981633974485, "radius": 37.00193929153159}
406	11	\N	2026-09-18 16:46:59.415	camara_posicion	-4.4249862e-14	21.523403	-30.097952	{"beta": 0.95, "alpha": -7.853981633974485, "radius": 37.00193929153159}
407	11	\N	2026-09-18 16:47:59.404	camara_posicion	-4.4249862e-14	21.523403	-30.097952	{"beta": 0.95, "alpha": -7.853981633974485, "radius": 37.00193929153159}
408	11	\N	2026-09-18 16:48:59.408	camara_posicion	-4.4249862e-14	21.523403	-30.097952	{"beta": 0.95, "alpha": -7.853981633974485, "radius": 37.00193929153159}
409	11	\N	2026-09-18 16:49:59.414	camara_posicion	-4.4249862e-14	21.523403	-30.097952	{"beta": 0.95, "alpha": -7.853981633974485, "radius": 37.00193929153159}
410	11	\N	2026-09-18 16:50:59.407	camara_posicion	-4.4249862e-14	21.523403	-30.097952	{"beta": 0.95, "alpha": -7.853981633974485, "radius": 37.00193929153159}
411	11	\N	2026-09-18 16:51:59.414	camara_posicion	-4.4249862e-14	21.523403	-30.097952	{"beta": 0.95, "alpha": -7.853981633974485, "radius": 37.00193929153159}
412	11	\N	2026-09-18 16:52:59.419	camara_posicion	-4.4249862e-14	21.523403	-30.097952	{"beta": 0.95, "alpha": -7.853981633974485, "radius": 37.00193929153159}
413	11	\N	2026-09-18 16:53:59.407	camara_posicion	-4.4249862e-14	21.523403	-30.097952	{"beta": 0.95, "alpha": -7.853981633974485, "radius": 37.00193929153159}
414	11	\N	2026-09-18 16:54:59.415	camara_posicion	-4.4249862e-14	21.523403	-30.097952	{"beta": 0.95, "alpha": -7.853981633974485, "radius": 37.00193929153159}
415	11	\N	2026-09-18 16:55:59.405	camara_posicion	-4.4249862e-14	21.523403	-30.097952	{"beta": 0.95, "alpha": -7.853981633974485, "radius": 37.00193929153159}
416	11	\N	2026-09-18 16:56:59.416	camara_posicion	-4.4249862e-14	21.523403	-30.097952	{"beta": 0.95, "alpha": -7.853981633974485, "radius": 37.00193929153159}
417	11	\N	2026-09-18 16:57:59.401	camara_posicion	-4.4249862e-14	21.523403	-30.097952	{"beta": 0.95, "alpha": -7.853981633974485, "radius": 37.00193929153159}
418	11	\N	2026-09-18 16:58:59.413	camara_posicion	-4.4249862e-14	21.523403	-30.097952	{"beta": 0.95, "alpha": -7.853981633974485, "radius": 37.00193929153159}
419	11	\N	2026-09-18 16:59:59.412	camara_posicion	-4.4249862e-14	21.523403	-30.097952	{"beta": 0.95, "alpha": -7.853981633974485, "radius": 37.00193929153159}
420	11	\N	2026-09-18 17:00:59.41	camara_posicion	-4.4249862e-14	21.523403	-30.097952	{"beta": 0.95, "alpha": -7.853981633974485, "radius": 37.00193929153159}
421	11	\N	2026-09-18 17:01:59.407	camara_posicion	-4.4249862e-14	21.523403	-30.097952	{"beta": 0.95, "alpha": -7.853981633974485, "radius": 37.00193929153159}
422	11	\N	2026-09-18 17:02:59.416	camara_posicion	-4.4249862e-14	21.523403	-30.097952	{"beta": 0.95, "alpha": -7.853981633974485, "radius": 37.00193929153159}
423	11	\N	2026-09-18 17:03:59.414	camara_posicion	-4.4249862e-14	21.523403	-30.097952	{"beta": 0.95, "alpha": -7.853981633974485, "radius": 37.00193929153159}
424	11	\N	2026-09-18 17:04:59.407	camara_posicion	-4.4249862e-14	21.523403	-30.097952	{"beta": 0.95, "alpha": -7.853981633974485, "radius": 37.00193929153159}
425	11	\N	2026-09-18 17:05:59.404	camara_posicion	-4.4249862e-14	21.523403	-30.097952	{"beta": 0.95, "alpha": -7.853981633974485, "radius": 37.00193929153159}
426	11	\N	2026-09-18 17:06:59.408	camara_posicion	-4.4249862e-14	21.523403	-30.097952	{"beta": 0.95, "alpha": -7.853981633974485, "radius": 37.00193929153159}
427	11	\N	2026-09-18 17:07:59.413	camara_posicion	-4.4249862e-14	21.523403	-30.097952	{"beta": 0.95, "alpha": -7.853981633974485, "radius": 37.00193929153159}
428	11	\N	2026-09-18 17:08:59.412	camara_posicion	-4.4249862e-14	21.523403	-30.097952	{"beta": 0.95, "alpha": -7.853981633974485, "radius": 37.00193929153159}
429	11	\N	2026-09-18 17:09:59.406	camara_posicion	-4.4249862e-14	21.523403	-30.097952	{"beta": 0.95, "alpha": -7.853981633974485, "radius": 37.00193929153159}
430	11	\N	2026-09-18 17:10:59.404	camara_posicion	-4.4249862e-14	21.523403	-30.097952	{"beta": 0.95, "alpha": -7.853981633974485, "radius": 37.00193929153159}
431	11	\N	2026-09-18 17:11:59.406	camara_posicion	-4.4249862e-14	21.523403	-30.097952	{"beta": 0.95, "alpha": -7.853981633974485, "radius": 37.00193929153159}
432	11	\N	2026-09-18 17:12:59.404	camara_posicion	-4.4249862e-14	21.523403	-30.097952	{"beta": 0.95, "alpha": -7.853981633974485, "radius": 37.00193929153159}
433	11	\N	2026-09-18 17:13:59.416	camara_posicion	-4.4249862e-14	21.523403	-30.097952	{"beta": 0.95, "alpha": -7.853981633974485, "radius": 37.00193929153159}
434	11	\N	2026-09-18 17:14:59.413	camara_posicion	-4.4249862e-14	21.523403	-30.097952	{"beta": 0.95, "alpha": -7.853981633974485, "radius": 37.00193929153159}
435	11	\N	2026-09-18 17:15:59.42	camara_posicion	-4.4249862e-14	21.523403	-30.097952	{"beta": 0.95, "alpha": -7.853981633974485, "radius": 37.00193929153159}
436	11	\N	2026-09-18 17:16:59.402	camara_posicion	-4.4249862e-14	21.523403	-30.097952	{"beta": 0.95, "alpha": -7.853981633974485, "radius": 37.00193929153159}
437	11	\N	2026-09-18 17:17:59.402	camara_posicion	-4.4249862e-14	21.523403	-30.097952	{"beta": 0.95, "alpha": -7.853981633974485, "radius": 37.00193929153159}
438	11	\N	2026-09-18 17:18:59.416	camara_posicion	-4.4249862e-14	21.523403	-30.097952	{"beta": 0.95, "alpha": -7.853981633974485, "radius": 37.00193929153159}
439	11	\N	2026-09-18 17:19:59.408	camara_posicion	-4.4249862e-14	21.523403	-30.097952	{"beta": 0.95, "alpha": -7.853981633974485, "radius": 37.00193929153159}
440	11	\N	2026-09-18 17:20:59.41	camara_posicion	-4.4249862e-14	21.523403	-30.097952	{"beta": 0.95, "alpha": -7.853981633974485, "radius": 37.00193929153159}
441	11	\N	2026-09-18 17:21:59.415	camara_posicion	-4.4249862e-14	21.523403	-30.097952	{"beta": 0.95, "alpha": -7.853981633974485, "radius": 37.00193929153159}
442	11	\N	2026-09-18 17:22:59.403	camara_posicion	-4.4249862e-14	21.523403	-30.097952	{"beta": 0.95, "alpha": -7.853981633974485, "radius": 37.00193929153159}
443	11	\N	2026-09-18 17:23:59.404	camara_posicion	-4.4249862e-14	21.523403	-30.097952	{"beta": 0.95, "alpha": -7.853981633974485, "radius": 37.00193929153159}
444	11	\N	2026-09-18 17:24:27.448	camara_posicion	-4.4249862e-14	21.523403	-30.097952	{"beta": 0.95, "alpha": -7.853981633974485, "radius": 37.00193929153159}
445	11	\N	2026-09-18 17:24:36.836	camara_posicion	-4.4249862e-14	21.523403	-30.097952	{"beta": 0.95, "alpha": -7.853981633974485, "radius": 37.00193929153159}
446	11	\N	2026-09-18 17:24:43.345	pared_construida	0	0	0	{"alto": 10, "modo": "puerta", "ancho": 16, "material": "block"}
447	11	\N	2026-09-18 17:24:46.836	camara_posicion	-4.4249862e-14	21.523403	-30.097952	{"beta": 0.95, "alpha": -7.853981633974485, "radius": 37.00193929153159}
448	11	\N	2026-09-18 17:24:56.845	camara_posicion	6.366283	36.264362	-3.6755753	{"beta": 0.2, "alpha": -6.806784082777885, "radius": 37.00193929153159}
449	11	\N	2026-09-18 17:25:06.853	camara_posicion	-11.468928	14.990209	-6.621589	{"beta": 0.7235987755982989, "alpha": -8.901179185171081, "radius": 20.002203033366982}
450	11	\N	2026-09-18 17:25:16.858	camara_posicion	19.265926	21.807472	7.78839e-14	{"beta": 0.7235987755982989, "alpha": -12.566370614359169, "radius": 29.09882773834455}
451	11	\N	2026-09-18 17:25:26.858	camara_posicion	2.0262421e-13	39.004753	-34.458954	{"beta": 0.7235987755982988, "alpha": -14.137166941154064, "radius": 52.046039423531994}
452	11	\N	2026-09-18 17:25:36.86	camara_posicion	2.0262421e-13	39.004753	-34.458954	{"beta": 0.7235987755982988, "alpha": -14.137166941154064, "radius": 52.046039423531994}
453	11	\N	2026-09-18 17:25:36.947	objeto_eliminado	\N	\N	\N	{"id": 2, "tipo": "wall_block"}
454	11	\N	2026-09-18 17:25:46.84	camara_posicion	2.0262421e-13	39.004753	-34.458954	{"beta": 0.7235987755982988, "alpha": -14.137166941154064, "radius": 52.046039423531994}
455	11	\N	2026-09-18 17:25:48.228	pared_construida	0	0	0	{"alto": 10, "modo": "ventana", "ancho": 16, "material": "block"}
456	11	\N	2026-09-18 17:25:56.877	camara_posicion	2.0262421e-13	39.004753	-34.458954	{"beta": 0.7235987755982988, "alpha": -14.137166941154064, "radius": 52.046039423531994}
457	11	\N	2026-09-18 17:26:06.866	camara_posicion	-4.9695263e-13	1.9935056	52.007847	{"beta": 1.5324842212633139, "alpha": -17.278759594743853, "radius": 52.046039423531994}
458	11	\N	2026-09-18 17:26:16.865	camara_posicion	-3.1298065e-13	1.2555093	32.754528	{"beta": 1.5324842212633136, "alpha": -17.278759594743853, "radius": 32.7785808195058}
460	11	\N	2026-09-18 17:26:26.839	camara_posicion	-3.1298065e-13	1.2555093	32.754528	{"beta": 1.5324842212633136, "alpha": -17.278759594743853, "radius": 32.7785808195058}
461	11	\N	2026-09-18 17:26:36.84	camara_posicion	-2.6505079e-13	17.464567	27.738499	{"beta": 1.008885445665015, "alpha": -17.278759594743853, "radius": 32.7785808195058}
462	11	\N	2026-09-18 17:26:44.456	pared_construida	0	0	0	{"alto": 10, "modo": "ventana", "ancho": 16, "material": "block"}
463	11	\N	2026-09-18 17:26:46.863	camara_posicion	-2.6505079e-13	17.464567	27.738499	{"beta": 1.008885445665015, "alpha": -17.278759594743853, "radius": 32.7785808195058}
464	11	\N	2026-09-18 17:26:56.897	camara_posicion	8.990744e-14	28.994007	-15.289961	{"beta": 0.4852866700667161, "alpha": -14.137166941154064, "radius": 32.7785808195058}
465	11	\N	2026-09-18 17:27:01.645	objeto_eliminado	\N	\N	\N	{"id": 3, "tipo": "wall_block"}
466	11	\N	2026-09-18 17:27:05.42	pared_construida	0	0	0	{"alto": 10, "modo": "puerta", "ancho": 16, "material": "block"}
467	11	\N	2026-09-18 17:27:06.862	camara_posicion	7.6449804	28.994007	-13.241494	{"beta": 0.4852866700667161, "alpha": -13.613568165555765, "radius": 32.7785808195058}
468	11	\N	2026-09-18 17:27:16.866	camara_posicion	-16.470512	36.06437	9.509254	{"beta": 0.4852866700667161, "alpha": -16.231562043547257, "radius": 40.77183466328008}
469	11	\N	2026-09-18 17:27:26.852	camara_posicion	-11.530488	25.247532	-6.6571302	{"beta": 0.4852866700667161, "alpha": -15.18436449235066, "radius": 28.54307988141202}
470	11	\N	2026-09-18 17:27:36.849	camara_posicion	-10.190537	12.832225	17.650528	{"beta": 1.008885445665015, "alpha": -16.755160819145555, "radius": 24.08431409077003}
471	11	\N	2026-09-18 17:27:46.844	camara_posicion	2.5528437e-13	27.33442	-43.414516	{"beta": 1.008885445665015, "alpha": -14.137166941154064, "radius": 51.30293071389678}
472	11	\N	2026-09-18 17:27:56.828	camara_posicion	2.5528437e-13	27.33442	-43.414516	{"beta": 1.008885445665015, "alpha": -14.137166941154064, "radius": 51.30293071389678}
473	11	\N	2026-09-18 17:28:05.267	programa_ejecutado	\N	\N	\N	{"bloques": ["es_dia", "if", "enciende_foco", "es_noche", "else", "apaga_foco"], "resultado": "invalido"}
474	11	\N	2026-09-18 17:28:06.864	camara_posicion	2.5528437e-13	27.33442	-43.414516	{"beta": 1.008885445665015, "alpha": -14.137166941154064, "radius": 51.30293071389678}
475	11	\N	2026-09-18 17:28:16.857	camara_posicion	2.5528437e-13	27.33442	-43.414516	{"beta": 1.008885445665015, "alpha": -14.137166941154064, "radius": 51.30293071389678}
476	11	\N	2026-09-18 17:28:21.441	programa_ejecutado	\N	\N	\N	{"bloques": ["es_dia", "else", "apaga_foco", "es_noche"], "resultado": "invalido"}
477	11	\N	2026-09-18 17:28:22.123	programa_ejecutado	\N	\N	\N	{"bloques": ["es_dia", "else", "apaga_foco", "es_noche"], "resultado": "invalido"}
478	11	\N	2026-09-18 17:28:22.32	programa_ejecutado	\N	\N	\N	{"bloques": ["es_dia", "else", "apaga_foco", "es_noche"], "resultado": "invalido"}
479	11	\N	2026-09-18 17:28:22.524	programa_ejecutado	\N	\N	\N	{"bloques": ["es_dia", "else", "apaga_foco", "es_noche"], "resultado": "invalido"}
480	11	\N	2026-09-18 17:28:26.838	camara_posicion	2.5528437e-13	27.33442	-43.414516	{"beta": 1.008885445665015, "alpha": -14.137166941154064, "radius": 51.30293071389678}
481	11	\N	2026-09-18 17:28:36.847	camara_posicion	2.5528437e-13	27.33442	-43.414516	{"beta": 1.008885445665015, "alpha": -14.137166941154064, "radius": 51.30293071389678}
482	11	\N	2026-09-18 17:28:47.407	camara_posicion	2.5528437e-13	27.33442	-43.414516	{"beta": 1.008885445665015, "alpha": -14.137166941154064, "radius": 51.30293071389678}
483	11	\N	2026-09-18 17:28:57.414	camara_posicion	2.5528437e-13	27.33442	-43.414516	{"beta": 1.008885445665015, "alpha": -14.137166941154064, "radius": 51.30293071389678}
484	11	\N	2026-09-18 17:29:07.405	camara_posicion	2.5528437e-13	27.33442	-43.414516	{"beta": 1.008885445665015, "alpha": -14.137166941154064, "radius": 51.30293071389678}
485	11	\N	2026-09-18 17:29:17.41	camara_posicion	2.5528437e-13	27.33442	-43.414516	{"beta": 1.008885445665015, "alpha": -14.137166941154064, "radius": 51.30293071389678}
486	11	\N	2026-09-18 17:29:26.906	camara_posicion	2.5528437e-13	27.33442	-43.414516	{"beta": 1.008885445665015, "alpha": -14.137166941154064, "radius": 51.30293071389678}
487	11	\N	2026-09-18 17:29:37.403	camara_posicion	2.5528437e-13	27.33442	-43.414516	{"beta": 1.008885445665015, "alpha": -14.137166941154064, "radius": 51.30293071389678}
488	11	\N	2026-09-18 17:29:46.869	camara_posicion	2.5528437e-13	27.33442	-43.414516	{"beta": 1.008885445665015, "alpha": -14.137166941154064, "radius": 51.30293071389678}
489	11	\N	2026-09-18 17:29:57.412	camara_posicion	2.5528437e-13	27.33442	-43.414516	{"beta": 1.008885445665015, "alpha": -14.137166941154064, "radius": 51.30293071389678}
490	11	\N	2026-09-18 17:30:06.844	camara_posicion	2.5528437e-13	27.33442	-43.414516	{"beta": 1.008885445665015, "alpha": -14.137166941154064, "radius": 51.30293071389678}
491	11	\N	2026-09-18 17:30:09.254	programa_ejecutado	\N	\N	\N	{"bloques": ["es_dia", "if", "enciende_foco", "es_noche", "else", "apaga_foco"], "resultado": "invalido"}
492	11	\N	2026-09-18 17:30:13.2	programa_ejecutado	\N	\N	\N	{"bloques": ["es_dia", "if", "enciende_foco", "es_noche", "else", "apaga_foco"], "resultado": "invalido"}
493	11	\N	2026-09-18 17:30:16.837	camara_posicion	2.5528437e-13	27.33442	-43.414516	{"beta": 1.008885445665015, "alpha": -14.137166941154064, "radius": 51.30293071389678}
494	11	\N	2026-09-18 17:30:26.825	camara_posicion	2.5528437e-13	27.33442	-43.414516	{"beta": 1.008885445665015, "alpha": -14.137166941154064, "radius": 51.30293071389678}
495	11	\N	2026-09-18 17:30:26.998	programa_ejecutado	\N	\N	\N	{"bloques": ["if", "es_dia", "enciende_foco", "es_noche", "else", "apaga_foco"], "resultado": "ejecutado"}
496	11	\N	2026-09-18 17:30:30.153	programa_ejecutado	\N	\N	\N	{"bloques": ["if", "es_dia", "enciende_foco", "es_noche", "else", "apaga_foco"], "resultado": "ejecutado"}
497	11	\N	2026-09-18 17:30:36.871	camara_posicion	2.5528437e-13	27.33442	-43.414516	{"beta": 1.008885445665015, "alpha": -14.137166941154064, "radius": 51.30293071389678}
498	11	\N	2026-09-18 17:30:37.102	programa_ejecutado	\N	\N	\N	{"bloques": ["if", "es_dia", "enciende_foco", "es_noche", "else", "apaga_foco"], "resultado": "ejecutado"}
499	11	\N	2026-09-18 17:30:46.863	camara_posicion	2.5528437e-13	27.33442	-43.414516	{"beta": 1.008885445665015, "alpha": -14.137166941154064, "radius": 51.30293071389678}
500	11	\N	2026-09-18 17:30:49.801	programa_ejecutado	\N	\N	\N	{"bloques": ["if", "es_dia", "enciende_foco", "es_noche", "else", "apaga_foco"], "resultado": "ejecutado"}
501	11	\N	2026-09-18 17:30:56.825	camara_posicion	2.9856117e-13	31.968254	-50.77431	{"beta": 1.008885445665015, "alpha": -14.137166941154064, "radius": 60}
502	11	\N	2026-09-18 17:31:06.876	camara_posicion	6.717705e-13	31.968254	-50.77431	{"beta": 1.008885445665015, "alpha": -20.420352248333643, "radius": 60}
503	11	\N	2026-09-18 17:31:17.404	camara_posicion	6.717705e-13	31.968254	-50.77431	{"beta": 1.008885445665015, "alpha": -20.420352248333643, "radius": 60}
504	11	\N	2026-09-18 17:31:27.41	camara_posicion	6.717705e-13	31.968254	-50.77431	{"beta": 1.008885445665015, "alpha": -20.420352248333643, "radius": 60}
505	11	\N	2026-09-18 17:31:37.408	camara_posicion	6.717705e-13	31.968254	-50.77431	{"beta": 1.008885445665015, "alpha": -20.420352248333643, "radius": 60}
506	11	\N	2026-09-18 17:31:47.408	camara_posicion	6.717705e-13	31.968254	-50.77431	{"beta": 1.008885445665015, "alpha": -20.420352248333643, "radius": 60}
507	11	\N	2026-09-18 17:31:56.847	camara_posicion	6.717705e-13	31.968254	-50.77431	{"beta": 1.008885445665015, "alpha": -20.420352248333643, "radius": 60}
508	11	\N	2026-09-18 17:31:57.758	cambio_noche	\N	\N	\N	{"es_noche": true}
509	11	\N	2026-09-18 17:32:00.369	programa_ejecutado	\N	\N	\N	{"bloques": ["if", "es_dia", "enciende_foco", "es_noche", "else", "apaga_foco"], "resultado": "no_ejecutado"}
510	11	\N	2026-09-18 17:32:01.419	programa_ejecutado	\N	\N	\N	{"bloques": ["if", "es_dia", "enciende_foco", "es_noche", "else", "apaga_foco"], "resultado": "no_ejecutado"}
511	11	\N	2026-09-18 17:32:06.868	camara_posicion	6.717705e-13	31.968254	-50.77431	{"beta": 1.008885445665015, "alpha": -20.420352248333643, "radius": 60}
512	11	\N	2026-09-18 17:32:15.434	programa_ejecutado	\N	\N	\N	{"bloques": ["es_noche", "if", "enciende_foco", "es_dia", "else", "apaga_foco"], "resultado": "invalido"}
513	11	\N	2026-09-18 17:32:16.235	programa_ejecutado	\N	\N	\N	{"bloques": ["es_noche", "if", "enciende_foco", "es_dia", "else", "apaga_foco"], "resultado": "invalido"}
514	11	\N	2026-09-18 17:32:16.856	camara_posicion	6.717705e-13	31.968254	-50.77431	{"beta": 1.008885445665015, "alpha": -20.420352248333643, "radius": 60}
515	11	\N	2026-09-18 17:32:26.866	camara_posicion	6.717705e-13	31.968254	-50.77431	{"beta": 1.008885445665015, "alpha": -20.420352248333643, "radius": 60}
516	11	\N	2026-09-18 17:32:29.997	programa_ejecutado	\N	\N	\N	{"bloques": ["if", "es_noche", "enciende_foco", "es_dia", "else", "apaga_foco"], "resultado": "ejecutado"}
517	11	\N	2026-09-18 17:32:34.33	programa_ejecutado	\N	\N	\N	{"bloques": ["if", "es_noche", "enciende_foco", "es_dia", "else", "apaga_foco"], "resultado": "ejecutado"}
518	11	\N	2026-09-18 17:32:34.507	programa_ejecutado	\N	\N	\N	{"bloques": ["if", "es_noche", "enciende_foco", "es_dia", "else", "apaga_foco"], "resultado": "ejecutado"}
519	11	\N	2026-09-18 17:32:34.681	programa_ejecutado	\N	\N	\N	{"bloques": ["if", "es_noche", "enciende_foco", "es_dia", "else", "apaga_foco"], "resultado": "ejecutado"}
520	11	\N	2026-09-18 17:32:34.834	programa_ejecutado	\N	\N	\N	{"bloques": ["if", "es_noche", "enciende_foco", "es_dia", "else", "apaga_foco"], "resultado": "ejecutado"}
521	11	\N	2026-09-18 17:32:36.834	camara_posicion	6.717705e-13	31.968254	-50.77431	{"beta": 1.008885445665015, "alpha": -20.420352248333643, "radius": 60}
522	11	\N	2026-09-18 17:32:41.756	objeto_colocado	-12	0	-12	{"id": 14, "tipo": "lampara"}
523	11	\N	2026-09-18 17:32:46.857	camara_posicion	6.717705e-13	31.968254	-50.77431	{"beta": 1.008885445665015, "alpha": -20.420352248333643, "radius": 60}
524	11	\N	2026-09-18 17:32:53.47	objeto_eliminado	\N	\N	\N	{"id": 14, "tipo": "lampara"}
525	11	\N	2026-09-18 17:32:56.855	camara_posicion	6.717705e-13	31.968254	-50.77431	{"beta": 1.008885445665015, "alpha": -20.420352248333643, "radius": 60}
526	11	\N	2026-09-18 17:32:57.461	objeto_colocado	12	0	-12	{"id": 15, "tipo": "lampara"}
527	11	\N	2026-09-18 17:33:04.022	programa_ejecutado	\N	\N	\N	{"bloques": ["if", "es_noche", "enciende_foco", "es_dia", "else", "apaga_foco"], "resultado": "ejecutado"}
528	11	\N	2026-09-18 17:33:06.172	cambio_noche	\N	\N	\N	{"es_noche": false}
529	11	\N	2026-09-18 17:33:06.842	camara_posicion	6.717705e-13	31.968254	-50.77431	{"beta": 1.008885445665015, "alpha": -20.420352248333643, "radius": 60}
530	11	\N	2026-09-18 17:33:07.566	cambio_noche	\N	\N	\N	{"es_noche": true}
531	11	\N	2026-09-18 17:33:08.66	cambio_noche	\N	\N	\N	{"es_noche": false}
532	11	\N	2026-09-18 17:33:10.896	objeto_colocado	3.4734745	0	-6.6635785	{"id": 16, "tipo": "vitropiso"}
533	11	\N	2026-09-18 17:33:16.874	camara_posicion	6.717705e-13	31.968254	-50.77431	{"beta": 1.008885445665015, "alpha": -20.420352248333643, "radius": 60}
534	11	\N	2026-09-18 17:33:27.412	camara_posicion	6.717705e-13	31.968254	-50.77431	{"beta": 1.008885445665015, "alpha": -20.420352248333643, "radius": 60}
535	11	\N	2026-09-18 17:33:37.41	camara_posicion	6.717705e-13	31.968254	-50.77431	{"beta": 1.008885445665015, "alpha": -20.420352248333643, "radius": 60}
536	11	\N	2026-09-18 17:33:47.404	camara_posicion	6.717705e-13	31.968254	-50.77431	{"beta": 1.008885445665015, "alpha": -20.420352248333643, "radius": 60}
537	11	\N	2026-09-18 17:33:57.404	camara_posicion	6.717705e-13	31.968254	-50.77431	{"beta": 1.008885445665015, "alpha": -20.420352248333643, "radius": 60}
538	11	\N	2026-09-18 17:34:07.411	camara_posicion	6.717705e-13	31.968254	-50.77431	{"beta": 1.008885445665015, "alpha": -20.420352248333643, "radius": 60}
539	11	\N	2026-09-18 17:34:17.405	camara_posicion	6.717705e-13	31.968254	-50.77431	{"beta": 1.008885445665015, "alpha": -20.420352248333643, "radius": 60}
540	11	\N	2026-09-18 17:34:41.683	camara_posicion	6.717705e-13	31.968254	-50.77431	{"beta": 1.008885445665015, "alpha": -20.420352248333643, "radius": 60}
541	11	\N	2026-09-18 17:34:44.82	cambio_noche	\N	\N	\N	{"es_noche": true}
542	11	\N	2026-09-18 17:34:45.354	cambio_noche	\N	\N	\N	{"es_noche": false}
543	11	\N	2026-09-18 17:34:46.865	camara_posicion	6.717705e-13	31.968254	-50.77431	{"beta": 1.008885445665015, "alpha": -20.420352248333643, "radius": 60}
544	11	\N	2026-09-18 17:34:54.175	objeto_colocado	-4.8432326	0	3.5158336	{"id": 17, "tipo": "concreto"}
545	11	\N	2026-09-18 17:34:56.666	objeto_colocado	6.052686	0	-5.5494723	{"id": 18, "tipo": "vitropiso"}
546	11	\N	2026-09-18 17:34:56.836	camara_posicion	6.717705e-13	31.968254	-50.77431	{"beta": 1.008885445665015, "alpha": -20.420352248333643, "radius": 60}
547	11	\N	2026-09-18 17:35:06.823	camara_posicion	1.4067427e-13	20.162283	-10.63256	{"beta": 0.4852866700667161, "alpha": -20.420352248333643, "radius": 22.79405529686248}
548	11	\N	2026-09-18 17:35:16.842	camara_posicion	1.6774033e-13	14.3508	-12.678288	{"beta": 0.7235987755982989, "alpha": -20.420352248333643, "radius": 19.149006460732135}
549	11	\N	2026-09-18 17:35:26.842	camara_posicion	-12.671952	14.343627	-2.8408572e-13	{"beta": 0.7235987755982989, "alpha": -28.274333882308117, "radius": 19.139436201741713}
550	11	\N	2026-09-18 17:35:36.838	camara_posicion	6.7639365	2.6194894	-3.9051607	{"beta": 1.2471975511965976, "alpha": -25.656340004316625, "radius": 8.23789075880595}
551	11	\N	2026-09-18 17:35:46.826	camara_posicion	-8.371383	3.2420099	4.83322	{"beta": 1.2471975511965976, "alpha": -22.514747350726836, "radius": 10.195621211528014}
552	11	\N	2026-09-18 17:35:56.836	camara_posicion	-8.299691	3.2142456	4.7918286	{"beta": 1.2471975511965976, "alpha": -22.514747350726836, "radius": 10.108306857086886}
553	11	\N	2026-09-18 17:35:59.996	objeto_eliminado	\N	\N	\N	{"id": 17, "tipo": "concreto"}
554	11	\N	2026-09-18 17:36:06.853	camara_posicion	-8.299691	3.2142456	4.7918286	{"beta": 1.2471975511965976, "alpha": -22.514747350726836, "radius": 10.108306857086886}
555	11	\N	2026-09-18 17:36:15.761	objeto_eliminado	\N	\N	\N	{"id": 18, "tipo": "vitropiso"}
556	11	\N	2026-09-18 17:36:16.857	camara_posicion	8.299691	3.2142456	-4.7918286	{"beta": 1.2471975511965976, "alpha": -19.373154697137046, "radius": 10.108306857086886}
557	11	\N	2026-09-18 17:36:26.842	camara_posicion	8.299691	3.2142456	-4.7918286	{"beta": 1.2471975511965976, "alpha": -19.373154697137046, "radius": 10.108306857086886}
558	13	\N	2026-09-18 20:02:22.669	camara_posicion	1.9788138e-15	23.1099	-32.31648	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 39.72936366214324}
559	13	\N	2026-09-18 20:02:32.645	camara_posicion	-1.1303439e-14	52.022476	-10.545478	{"beta": 0.2, "alpha": 4.712388980384689, "radius": 53.08055323701028}
560	14	\N	2026-09-18 20:02:50.603	camara_posicion	1.7416264e-15	9.539418	-28.442917	{"beta": 1.2471975511965976, "alpha": -1.5707963267948966, "radius": 30}
561	15	\N	2026-09-18 20:54:25.507	camara_posicion	1.49422e-15	17.450493	-24.402466	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 30}
562	16	\N	2026-09-18 20:54:32.637	camara_posicion	1.49422e-15	17.450493	-24.402466	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 30}
563	16	\N	2026-09-18 20:54:34.949	cambio_noche	\N	\N	\N	{"es_noche": true}
564	16	\N	2026-09-18 20:54:35.696	cambio_noche	\N	\N	\N	{"es_noche": false}
565	16	\N	2026-09-18 20:54:42.641	camara_posicion	-31.22479	25.783562	18.027641	{"beta": 0.95, "alpha": -3.6651914291880914, "radius": 44.32578760222294}
566	16	\N	2026-09-18 20:54:52.648	camara_posicion	7.4204927e-13	25.783562	-36.055283	{"beta": 0.9500000000000001, "alpha": -26.703537555513222, "radius": 44.32578760222294}
567	16	\N	2026-09-18 20:55:02.653	camara_posicion	25.415665	33.218983	-14.673741	{"beta": 0.7235987755982989, "alpha": -94.77137838329242, "radius": 44.32578760222294}
568	16	\N	2026-09-18 20:55:12.639	camara_posicion	-5.988033e-12	39.20799	-20.676292	{"beta": 0.4852866700667161, "alpha": -89.5353906273094, "radius": 44.32578760222294}
569	16	\N	2026-09-18 20:55:22.648	camara_posicion	-2.5503443e-12	43.442223	-8.806174	{"beta": 0.2, "alpha": -89.5353906273094, "radius": 44.32578760222294}
570	16	\N	2026-09-18 20:55:31.657	pared_construida	0	0	0	{"alto": 10, "modo": "simple", "ancho": 16, "material": "madera"}
571	16	\N	2026-09-18 20:55:32.666	camara_posicion	-2.5503443e-12	43.442223	-8.806174	{"beta": 0.2, "alpha": -89.5353906273094, "radius": 44.32578760222294}
572	16	\N	2026-09-18 20:55:42.638	camara_posicion	-8.499285e-12	33.218983	-29.347483	{"beta": 0.7235987755982988, "alpha": -89.5353906273094, "radius": 44.32578760222294}
573	16	\N	2026-09-18 20:55:52.647	camara_posicion	-8.499285e-12	33.218983	-29.347483	{"beta": 0.7235987755982988, "alpha": -89.5353906273094, "radius": 44.32578760222294}
574	16	\N	2026-09-18 20:55:54.101	objeto_eliminado	\N	\N	\N	{"id": 19, "tipo": "wall_madera"}
575	16	\N	2026-09-18 20:55:59.483	pared_construida	0	0	0	{"alto": 15, "modo": "simple", "ancho": 16, "material": "madera"}
576	16	\N	2026-09-18 20:56:02.655	camara_posicion	-8.499285e-12	33.218983	-29.347483	{"beta": 0.7235987755982988, "alpha": -89.5353906273094, "radius": 44.32578760222294}
577	16	\N	2026-09-18 20:56:13.511	camara_posicion	14.673741	33.218983	25.415665	{"beta": 0.7235987755982988, "alpha": -93.20058205649751, "radius": 44.32578760222294}
578	16	\N	2026-09-18 20:56:22.67	camara_posicion	25.415665	33.218983	-14.673741	{"beta": 0.7235987755982988, "alpha": -94.77137838329242, "radius": 44.32578760222294}
579	16	\N	2026-09-18 20:56:28.895	objeto_eliminado	\N	\N	\N	{"id": 20, "tipo": "wall_madera"}
580	16	\N	2026-09-18 20:56:32.651	camara_posicion	9.017006e-12	33.218983	29.347483	{"beta": 0.7235987755982988, "alpha": -92.67698328089921, "radius": 44.32578760222294}
581	16	\N	2026-09-18 20:56:38.384	pared_construida	0	0	0	{"alto": 15, "modo": "simple", "ancho": 12, "material": "madera"}
582	16	\N	2026-09-18 20:56:42.666	camara_posicion	9.017006e-12	33.218983	29.347483	{"beta": 0.7235987755982988, "alpha": -92.67698328089921, "radius": 44.32578760222294}
583	16	\N	2026-09-18 20:56:52.637	camara_posicion	29.347483	33.218983	-9.275867e-12	{"beta": 0.7235987755982988, "alpha": -94.24777960769411, "radius": 44.32578760222294}
584	16	\N	2026-09-18 20:56:58.854	pared_construida	0	0	0	{"alto": 15, "modo": "simple", "ancho": 7, "material": "madera"}
585	16	\N	2026-09-18 20:57:02.659	camara_posicion	29.347483	33.218983	-9.275867e-12	{"beta": 0.7235987755982988, "alpha": -94.24777960769411, "radius": 44.32578760222294}
586	16	\N	2026-09-18 20:57:12.677	camara_posicion	29.347483	33.218983	-9.275867e-12	{"beta": 0.7235987755982988, "alpha": -94.24777960769411, "radius": 44.32578760222294}
587	16	\N	2026-09-18 20:57:22.66	camara_posicion	-25.415665	33.218983	14.673741	{"beta": 0.7235987755982988, "alpha": -97.91297103688223, "radius": 44.32578760222294}
588	16	\N	2026-09-18 20:57:32.64	camara_posicion	14.673741	33.218983	-25.415665	{"beta": 0.7235987755982988, "alpha": -101.57816246607034, "radius": 44.32578760222294}
589	16	\N	2026-09-18 20:57:42.666	camara_posicion	14.673741	33.218983	-25.415665	{"beta": 0.7235987755982988, "alpha": -101.57816246607034, "radius": 44.32578760222294}
590	16	\N	2026-09-18 20:57:52.671	camara_posicion	14.673741	33.218983	-25.415665	{"beta": 0.7235987755982988, "alpha": -101.57816246607034, "radius": 44.32578760222294}
591	16	\N	2026-09-18 20:58:02.68	camara_posicion	14.673741	33.218983	-25.415665	{"beta": 0.7235987755982988, "alpha": -101.57816246607034, "radius": 44.32578760222294}
592	16	\N	2026-09-18 20:58:12.661	camara_posicion	-25.415665	33.218983	14.673741	{"beta": 0.7235987755982988, "alpha": -104.19615634406185, "radius": 44.32578760222294}
593	16	\N	2026-09-18 20:58:22.678	camara_posicion	1.10878945e-11	33.218983	29.347483	{"beta": 0.7235987755982988, "alpha": -105.24335389525845, "radius": 44.32578760222294}
594	16	\N	2026-09-18 20:58:32.641	camara_posicion	1.10878945e-11	33.218983	29.347483	{"beta": 0.7235987755982988, "alpha": -105.24335389525845, "radius": 44.32578760222294}
595	16	\N	2026-09-18 20:58:32.727	objeto_eliminado	\N	\N	\N	{"id": 23, "tipo": "wall_madera"}
596	16	\N	2026-09-18 20:58:40.601	pared_construida	0	0	0	{"alto": 15, "modo": "simple", "ancho": 4, "material": "madera"}
597	16	\N	2026-09-18 20:58:42.671	camara_posicion	1.10878945e-11	33.218983	29.347483	{"beta": 0.7235987755982988, "alpha": -105.24335389525845, "radius": 44.32578760222294}
598	16	\N	2026-09-18 20:58:52.656	camara_posicion	3.3270975e-12	43.442223	8.806174	{"beta": 0.2, "alpha": -105.24335389525845, "radius": 44.32578760222294}
599	16	\N	2026-09-18 20:59:02.638	camara_posicion	3.3270975e-12	43.442223	8.806174	{"beta": 0.2, "alpha": -105.24335389525845, "radius": 44.32578760222294}
600	16	\N	2026-09-18 20:59:12.644	camara_posicion	-8.176549e-12	39.20799	-20.676292	{"beta": 0.4852866700667161, "alpha": -108.38494654884826, "radius": 44.32578760222294}
601	16	\N	2026-09-18 20:59:23.515	camara_posicion	-8.176549e-12	39.20799	-20.676292	{"beta": 0.4852866700667161, "alpha": -108.38494654884826, "radius": 44.32578760222294}
602	16	\N	2026-09-18 20:59:33.502	camara_posicion	-8.176549e-12	39.20799	-20.676292	{"beta": 0.4852866700667161, "alpha": -108.38494654884826, "radius": 44.32578760222294}
603	16	\N	2026-09-18 20:59:43.509	camara_posicion	-8.176549e-12	39.20799	-20.676292	{"beta": 0.4852866700667161, "alpha": -108.38494654884826, "radius": 44.32578760222294}
604	16	\N	2026-09-18 20:59:53.51	camara_posicion	-8.176549e-12	39.20799	-20.676292	{"beta": 0.4852866700667161, "alpha": -108.38494654884826, "radius": 44.32578760222294}
605	16	\N	2026-09-18 21:00:03.509	camara_posicion	-8.176549e-12	39.20799	-20.676292	{"beta": 0.4852866700667161, "alpha": -108.38494654884826, "radius": 44.32578760222294}
606	16	\N	2026-09-18 21:00:13.508	camara_posicion	-8.176549e-12	39.20799	-20.676292	{"beta": 0.4852866700667161, "alpha": -108.38494654884826, "radius": 44.32578760222294}
607	16	\N	2026-09-18 21:00:56.51	camara_posicion	-8.176549e-12	39.20799	-20.676292	{"beta": 0.4852866700667161, "alpha": -108.38494654884826, "radius": 44.32578760222294}
608	16	\N	2026-09-18 21:01:02.66	camara_posicion	-8.176549e-12	39.20799	-20.676292	{"beta": 0.4852866700667161, "alpha": -108.38494654884826, "radius": 44.32578760222294}
609	16	\N	2026-09-18 21:01:12.685	camara_posicion	-8.625303e-12	41.359844	-21.811071	{"beta": 0.4852866700667161, "alpha": -108.38494654884826, "radius": 46.75852259759806}
610	16	\N	2026-09-18 21:01:23.506	camara_posicion	-8.625303e-12	41.359844	-21.811071	{"beta": 0.4852866700667161, "alpha": -108.38494654884826, "radius": 46.75852259759806}
611	16	\N	2026-09-18 21:01:33.502	camara_posicion	-8.625303e-12	41.359844	-21.811071	{"beta": 0.4852866700667161, "alpha": -108.38494654884826, "radius": 46.75852259759806}
612	16	\N	2026-09-18 21:01:43.503	camara_posicion	-8.625303e-12	41.359844	-21.811071	{"beta": 0.4852866700667161, "alpha": -108.38494654884826, "radius": 46.75852259759806}
613	16	\N	2026-09-18 21:01:53.507	camara_posicion	-8.625303e-12	41.359844	-21.811071	{"beta": 0.4852866700667161, "alpha": -108.38494654884826, "radius": 46.75852259759806}
614	16	\N	2026-09-18 21:02:03.511	camara_posicion	-8.625303e-12	41.359844	-21.811071	{"beta": 0.4852866700667161, "alpha": -108.38494654884826, "radius": 46.75852259759806}
615	16	\N	2026-09-18 21:02:13.507	camara_posicion	-8.625303e-12	41.359844	-21.811071	{"beta": 0.4852866700667161, "alpha": -108.38494654884826, "radius": 46.75852259759806}
616	16	\N	2026-09-18 21:02:56.505	camara_posicion	-8.625303e-12	41.359844	-21.811071	{"beta": 0.4852866700667161, "alpha": -108.38494654884826, "radius": 46.75852259759806}
617	16	\N	2026-09-18 21:03:56.504	camara_posicion	-8.625303e-12	41.359844	-21.811071	{"beta": 0.4852866700667161, "alpha": -108.38494654884826, "radius": 46.75852259759806}
618	16	\N	2026-09-18 21:04:56.506	camara_posicion	-8.625303e-12	41.359844	-21.811071	{"beta": 0.4852866700667161, "alpha": -108.38494654884826, "radius": 46.75852259759806}
619	16	\N	2026-09-18 21:05:40.162	camara_posicion	-8.625303e-12	41.359844	-21.811071	{"beta": 0.4852866700667161, "alpha": -108.38494654884826, "radius": 46.75852259759806}
620	16	\N	2026-09-18 21:05:42.667	camara_posicion	-8.625303e-12	41.359844	-21.811071	{"beta": 0.4852866700667161, "alpha": -108.38494654884826, "radius": 46.75852259759806}
621	16	\N	2026-09-18 21:05:52.653	camara_posicion	-4.71389e-12	58.803993	-11.92016	{"beta": 0.2, "alpha": -108.38494654884826, "radius": 60}
622	16	\N	2026-09-18 21:06:03.511	camara_posicion	5.96008	58.803993	-10.323161	{"beta": 0.2, "alpha": -107.86134777324996, "radius": 60}
623	16	\N	2026-09-18 21:06:13.506	camara_posicion	5.96008	58.803993	-10.323161	{"beta": 0.2, "alpha": -107.86134777324996, "radius": 60}
624	16	\N	2026-09-18 21:06:23.506	camara_posicion	5.96008	58.803993	-10.323161	{"beta": 0.2, "alpha": -107.86134777324996, "radius": 60}
625	16	\N	2026-09-18 21:06:33.51	camara_posicion	5.96008	58.803993	-10.323161	{"beta": 0.2, "alpha": -107.86134777324996, "radius": 60}
626	16	\N	2026-09-18 21:06:43.501	camara_posicion	5.96008	58.803993	-10.323161	{"beta": 0.2, "alpha": -107.86134777324996, "radius": 60}
627	16	\N	2026-09-18 21:06:53.505	camara_posicion	5.96008	58.803993	-10.323161	{"beta": 0.2, "alpha": -107.86134777324996, "radius": 60}
628	16	\N	2026-09-18 21:07:56.506	camara_posicion	5.96008	58.803993	-10.323161	{"beta": 0.2, "alpha": -107.86134777324996, "radius": 60}
629	16	\N	2026-09-18 21:08:35.76	camara_posicion	5.96008	58.803993	-10.323161	{"beta": 0.2, "alpha": -107.86134777324996, "radius": 60}
630	16	\N	2026-09-18 21:08:42.648	camara_posicion	5.96008	58.803993	-10.323161	{"beta": 0.2, "alpha": -107.86134777324996, "radius": 60}
631	16	\N	2026-09-18 21:08:52.636	camara_posicion	5.96008	58.803993	-10.323161	{"beta": 0.2, "alpha": -107.86134777324996, "radius": 60}
632	16	\N	2026-09-18 21:09:02.67	camara_posicion	5.96008	58.803993	-10.323161	{"beta": 0.2, "alpha": -107.86134777324996, "radius": 60}
633	16	\N	2026-09-18 21:09:12.643	camara_posicion	5.96008	58.803993	-10.323161	{"beta": 0.2, "alpha": -107.86134777324996, "radius": 60}
634	16	\N	2026-09-18 21:09:22.634	camara_posicion	5.96008	58.803993	-10.323161	{"beta": 0.2, "alpha": -107.86134777324996, "radius": 60}
635	16	\N	2026-09-18 21:09:32.642	camara_posicion	5.96008	58.803993	-10.323161	{"beta": 0.2, "alpha": -107.86134777324996, "radius": 60}
636	16	\N	2026-09-18 21:09:42.647	camara_posicion	5.96008	58.803993	-10.323161	{"beta": 0.2, "alpha": -107.86134777324996, "radius": 60}
637	16	\N	2026-09-18 21:09:52.644	camara_posicion	5.96008	58.803993	-10.323161	{"beta": 0.2, "alpha": -107.86134777324996, "radius": 60}
638	16	\N	2026-09-18 21:10:02.633	camara_posicion	5.96008	58.803993	-10.323161	{"beta": 0.2, "alpha": -107.86134777324996, "radius": 60}
639	16	\N	2026-09-18 21:10:12.637	camara_posicion	5.96008	58.803993	-10.323161	{"beta": 0.2, "alpha": -107.86134777324996, "radius": 60}
640	16	\N	2026-09-18 21:10:22.645	camara_posicion	5.96008	58.803993	-10.323161	{"beta": 0.2, "alpha": -107.86134777324996, "radius": 60}
641	16	\N	2026-09-18 21:10:32.655	camara_posicion	5.96008	58.803993	-10.323161	{"beta": 0.2, "alpha": -107.86134777324996, "radius": 60}
642	16	\N	2026-09-18 21:10:42.643	camara_posicion	5.96008	58.803993	-10.323161	{"beta": 0.2, "alpha": -107.86134777324996, "radius": 60}
643	16	\N	2026-09-18 21:10:52.636	camara_posicion	5.96008	58.803993	-10.323161	{"beta": 0.2, "alpha": -107.86134777324996, "radius": 60}
644	16	\N	2026-09-18 21:11:02.642	camara_posicion	5.96008	58.803993	-10.323161	{"beta": 0.2, "alpha": -107.86134777324996, "radius": 60}
645	16	\N	2026-09-18 21:11:12.641	camara_posicion	5.96008	58.803993	-10.323161	{"beta": 0.2, "alpha": -107.86134777324996, "radius": 60}
646	16	\N	2026-09-18 21:11:22.635	camara_posicion	5.96008	58.803993	-10.323161	{"beta": 0.2, "alpha": -107.86134777324996, "radius": 60}
647	16	\N	2026-09-18 21:11:32.635	camara_posicion	5.96008	58.803993	-10.323161	{"beta": 0.2, "alpha": -107.86134777324996, "radius": 60}
648	16	\N	2026-09-18 21:11:43.511	camara_posicion	5.96008	58.803993	-10.323161	{"beta": 0.2, "alpha": -107.86134777324996, "radius": 60}
649	16	\N	2026-09-18 21:11:53.513	camara_posicion	5.96008	58.803993	-10.323161	{"beta": 0.2, "alpha": -107.86134777324996, "radius": 60}
650	16	\N	2026-09-18 21:12:03.516	camara_posicion	5.96008	58.803993	-10.323161	{"beta": 0.2, "alpha": -107.86134777324996, "radius": 60}
651	16	\N	2026-09-18 21:12:13.504	camara_posicion	5.96008	58.803993	-10.323161	{"beta": 0.2, "alpha": -107.86134777324996, "radius": 60}
652	16	\N	2026-09-18 21:12:23.504	camara_posicion	5.96008	58.803993	-10.323161	{"beta": 0.2, "alpha": -107.86134777324996, "radius": 60}
653	16	\N	2026-09-18 21:12:33.503	camara_posicion	5.96008	58.803993	-10.323161	{"beta": 0.2, "alpha": -107.86134777324996, "radius": 60}
654	16	\N	2026-09-18 21:12:56.51	camara_posicion	5.96008	58.803993	-10.323161	{"beta": 0.2, "alpha": -107.86134777324996, "radius": 60}
655	16	\N	2026-09-18 21:13:56.509	camara_posicion	5.96008	58.803993	-10.323161	{"beta": 0.2, "alpha": -107.86134777324996, "radius": 60}
656	16	\N	2026-09-18 21:14:56.508	camara_posicion	5.96008	58.803993	-10.323161	{"beta": 0.2, "alpha": -107.86134777324996, "radius": 60}
657	16	\N	2026-09-18 21:15:56.511	camara_posicion	5.96008	58.803993	-10.323161	{"beta": 0.2, "alpha": -107.86134777324996, "radius": 60}
658	16	\N	2026-09-18 21:16:17.405	camara_posicion	5.96008	58.803993	-10.323161	{"beta": 0.2, "alpha": -107.86134777324996, "radius": 60}
659	16	\N	2026-09-18 21:16:22.65	camara_posicion	5.96008	58.803993	-10.323161	{"beta": 0.2, "alpha": -107.86134777324996, "radius": 60}
660	16	\N	2026-09-18 21:16:32.633	camara_posicion	5.96008	58.803993	-10.323161	{"beta": 0.2, "alpha": -107.86134777324996, "radius": 60}
661	16	\N	2026-09-18 21:16:42.643	camara_posicion	5.96008	58.803993	-10.323161	{"beta": 0.2, "alpha": -107.86134777324996, "radius": 60}
662	16	\N	2026-09-18 21:16:52.643	camara_posicion	5.96008	58.803993	-10.323161	{"beta": 0.2, "alpha": -107.86134777324996, "radius": 60}
663	16	\N	2026-09-18 21:17:02.635	camara_posicion	5.96008	58.803993	-10.323161	{"beta": 0.2, "alpha": -107.86134777324996, "radius": 60}
664	16	\N	2026-09-18 21:17:12.649	camara_posicion	5.96008	58.803993	-10.323161	{"beta": 0.2, "alpha": -107.86134777324996, "radius": 60}
665	16	\N	2026-09-18 21:17:22.664	camara_posicion	5.96008	58.803993	-10.323161	{"beta": 0.2, "alpha": -107.86134777324996, "radius": 60}
666	16	\N	2026-09-18 21:17:33.502	camara_posicion	5.96008	58.803993	-10.323161	{"beta": 0.2, "alpha": -107.86134777324996, "radius": 60}
667	16	\N	2026-09-18 21:17:43.51	camara_posicion	5.96008	58.803993	-10.323161	{"beta": 0.2, "alpha": -107.86134777324996, "radius": 60}
668	16	\N	2026-09-18 21:17:53.509	camara_posicion	5.96008	58.803993	-10.323161	{"beta": 0.2, "alpha": -107.86134777324996, "radius": 60}
669	16	\N	2026-09-18 21:18:03.504	camara_posicion	5.96008	58.803993	-10.323161	{"beta": 0.2, "alpha": -107.86134777324996, "radius": 60}
670	16	\N	2026-09-18 21:18:13.506	camara_posicion	5.96008	58.803993	-10.323161	{"beta": 0.2, "alpha": -107.86134777324996, "radius": 60}
671	16	\N	2026-09-18 21:18:23.514	camara_posicion	5.96008	58.803993	-10.323161	{"beta": 0.2, "alpha": -107.86134777324996, "radius": 60}
672	16	\N	2026-09-18 21:18:32.671	camara_posicion	-28.442917	19.078836	-49.264576	{"beta": 1.2471975511965976, "alpha": -108.90854532444656, "radius": 60}
673	16	\N	2026-09-18 21:18:41.959	objeto_eliminado	\N	\N	\N	{"id": 16, "tipo": "vitropiso"}
674	16	\N	2026-09-18 21:18:42.673	camara_posicion	-1.5709522e-11	44.96567	-39.72516	{"beta": 0.7235987755982988, "alpha": -108.38494654884826, "radius": 60}
675	16	\N	2026-09-18 21:18:50.19	objeto_eliminado	\N	\N	\N	{"id": 15, "tipo": "lampara"}
676	16	\N	2026-09-18 21:18:52.663	camara_posicion	-1.5709522e-11	44.96567	-39.72516	{"beta": 0.7235987755982988, "alpha": -108.38494654884826, "radius": 60}
677	16	\N	2026-09-18 21:18:53.114	objeto_colocado	-12	0	12	{"id": 25, "tipo": "lampara"}
678	16	\N	2026-09-18 21:19:02.646	camara_posicion	-1.5709522e-11	44.96567	-39.72516	{"beta": 0.7235987755982988, "alpha": -108.38494654884826, "radius": 60}
679	16	\N	2026-09-18 21:19:12.648	camara_posicion	-1.5709522e-11	44.96567	-39.72516	{"beta": 0.7235987755982988, "alpha": -108.38494654884826, "radius": 60}
680	16	\N	2026-09-18 21:19:22.639	camara_posicion	-1.5709522e-11	44.96567	-39.72516	{"beta": 0.7235987755982988, "alpha": -108.38494654884826, "radius": 60}
681	16	\N	2026-09-18 21:19:32.651	camara_posicion	-1.5709522e-11	44.96567	-39.72516	{"beta": 0.7235987755982988, "alpha": -108.38494654884826, "radius": 60}
682	16	\N	2026-09-18 21:19:42.642	camara_posicion	-1.5709522e-11	44.96567	-39.72516	{"beta": 0.7235987755982988, "alpha": -108.38494654884826, "radius": 60}
683	16	\N	2026-09-18 21:19:52.653	camara_posicion	-1.5709522e-11	44.96567	-39.72516	{"beta": 0.7235987755982988, "alpha": -108.38494654884826, "radius": 60}
684	16	\N	2026-09-18 21:20:02.635	camara_posicion	-1.5709522e-11	44.96567	-39.72516	{"beta": 0.7235987755982988, "alpha": -108.38494654884826, "radius": 60}
685	16	\N	2026-09-18 21:20:12.654	camara_posicion	-1.5709522e-11	44.96567	-39.72516	{"beta": 0.7235987755982988, "alpha": -108.38494654884826, "radius": 60}
686	16	\N	2026-09-18 21:20:22.66	camara_posicion	-1.5709522e-11	44.96567	-39.72516	{"beta": 0.7235987755982988, "alpha": -108.38494654884826, "radius": 60}
687	16	\N	2026-09-18 21:20:32.661	camara_posicion	-1.5709522e-11	44.96567	-39.72516	{"beta": 0.7235987755982988, "alpha": -108.38494654884826, "radius": 60}
688	16	\N	2026-09-18 21:20:42.655	camara_posicion	-1.5709522e-11	44.96567	-39.72516	{"beta": 0.7235987755982988, "alpha": -108.38494654884826, "radius": 60}
689	16	\N	2026-09-18 21:20:52.658	camara_posicion	-2.2495802e-11	19.078836	-56.885834	{"beta": 1.2471975511965976, "alpha": -108.38494654884826, "radius": 60}
690	16	\N	2026-09-18 21:21:03.509	camara_posicion	-2.2495802e-11	19.078836	-56.885834	{"beta": 1.2471975511965976, "alpha": -108.38494654884826, "radius": 60}
691	16	\N	2026-09-18 21:21:13.502	camara_posicion	-2.2495802e-11	19.078836	-56.885834	{"beta": 1.2471975511965976, "alpha": -108.38494654884826, "radius": 60}
692	16	\N	2026-09-18 21:21:23.511	camara_posicion	-2.2495802e-11	19.078836	-56.885834	{"beta": 1.2471975511965976, "alpha": -108.38494654884826, "radius": 60}
693	16	\N	2026-09-18 21:21:33.505	camara_posicion	-2.2495802e-11	19.078836	-56.885834	{"beta": 1.2471975511965976, "alpha": -108.38494654884826, "radius": 60}
694	16	\N	2026-09-18 21:21:43.505	camara_posicion	-2.2495802e-11	19.078836	-56.885834	{"beta": 1.2471975511965976, "alpha": -108.38494654884826, "radius": 60}
695	16	\N	2026-09-18 21:21:56.51	camara_posicion	-2.2495802e-11	19.078836	-56.885834	{"beta": 1.2471975511965976, "alpha": -108.38494654884826, "radius": 60}
696	16	\N	2026-09-18 21:22:56.504	camara_posicion	-2.2495802e-11	19.078836	-56.885834	{"beta": 1.2471975511965976, "alpha": -108.38494654884826, "radius": 60}
697	16	\N	2026-09-18 21:23:56.515	camara_posicion	-2.2495802e-11	19.078836	-56.885834	{"beta": 1.2471975511965976, "alpha": -108.38494654884826, "radius": 60}
698	16	\N	2026-09-18 21:24:56.505	camara_posicion	-2.2495802e-11	19.078836	-56.885834	{"beta": 1.2471975511965976, "alpha": -108.38494654884826, "radius": 60}
699	16	\N	2026-09-18 21:25:56.504	camara_posicion	-2.2495802e-11	19.078836	-56.885834	{"beta": 1.2471975511965976, "alpha": -108.38494654884826, "radius": 60}
700	16	\N	2026-09-18 21:26:56.506	camara_posicion	-2.2495802e-11	19.078836	-56.885834	{"beta": 1.2471975511965976, "alpha": -108.38494654884826, "radius": 60}
701	16	\N	2026-09-18 21:27:56.51	camara_posicion	-2.2495802e-11	19.078836	-56.885834	{"beta": 1.2471975511965976, "alpha": -108.38494654884826, "radius": 60}
702	16	\N	2026-09-18 21:28:56.51	camara_posicion	-2.2495802e-11	19.078836	-56.885834	{"beta": 1.2471975511965976, "alpha": -108.38494654884826, "radius": 60}
703	16	\N	2026-09-18 21:29:56.509	camara_posicion	-2.2495802e-11	19.078836	-56.885834	{"beta": 1.2471975511965976, "alpha": -108.38494654884826, "radius": 60}
704	16	\N	2026-09-18 21:30:03.601	camara_posicion	-2.2495802e-11	19.078836	-56.885834	{"beta": 1.2471975511965976, "alpha": -108.38494654884826, "radius": 60}
705	16	\N	2026-09-18 21:30:13.511	camara_posicion	-2.2495802e-11	19.078836	-56.885834	{"beta": 1.2471975511965976, "alpha": -108.38494654884826, "radius": 60}
706	16	\N	2026-09-18 21:30:23.513	camara_posicion	-2.2495802e-11	19.078836	-56.885834	{"beta": 1.2471975511965976, "alpha": -108.38494654884826, "radius": 60}
707	16	\N	2026-09-18 21:30:33.514	camara_posicion	-2.2495802e-11	19.078836	-56.885834	{"beta": 1.2471975511965976, "alpha": -108.38494654884826, "radius": 60}
708	16	\N	2026-09-18 21:30:43.505	camara_posicion	-2.2495802e-11	19.078836	-56.885834	{"beta": 1.2471975511965976, "alpha": -108.38494654884826, "radius": 60}
709	16	\N	2026-09-18 21:30:53.504	camara_posicion	-2.2495802e-11	19.078836	-56.885834	{"beta": 1.2471975511965976, "alpha": -108.38494654884826, "radius": 60}
710	16	\N	2026-09-18 21:31:03.515	camara_posicion	-2.2495802e-11	19.078836	-56.885834	{"beta": 1.2471975511965976, "alpha": -108.38494654884826, "radius": 60}
711	16	\N	2026-09-18 21:31:56.509	camara_posicion	-2.2495802e-11	19.078836	-56.885834	{"beta": 1.2471975511965976, "alpha": -108.38494654884826, "radius": 60}
712	16	\N	2026-09-18 21:32:02.649	camara_posicion	-2.2495802e-11	19.078836	-56.885834	{"beta": 1.2471975511965976, "alpha": -108.38494654884826, "radius": 60}
713	16	\N	2026-09-18 21:32:13.503	camara_posicion	-2.2495802e-11	19.078836	-56.885834	{"beta": 1.2471975511965976, "alpha": -108.38494654884826, "radius": 60}
714	16	\N	2026-09-18 21:32:23.502	camara_posicion	-2.2495802e-11	19.078836	-56.885834	{"beta": 1.2471975511965976, "alpha": -108.38494654884826, "radius": 60}
715	16	\N	2026-09-18 21:32:33.508	camara_posicion	-2.2495802e-11	19.078836	-56.885834	{"beta": 1.2471975511965976, "alpha": -108.38494654884826, "radius": 60}
716	16	\N	2026-09-18 21:32:42.652	camara_posicion	-1.1913965e-11	10.104311	-30.127213	{"beta": 1.2471975511965976, "alpha": -108.38494654884826, "radius": 31.776501377444742}
717	16	\N	2026-09-18 21:32:52.637	camara_posicion	-11.456795	21.725262	4.6317047e-12	{"beta": 0.4852866700667161, "alpha": -109.95574287564317, "radius": 24.561048581326926}
718	16	\N	2026-09-18 21:33:02.666	camara_posicion	-24.47182	46.40536	9.893366e-12	{"beta": 0.4852866700667161, "alpha": -109.95574287564317, "radius": 52.46263200671736}
719	16	\N	2026-09-18 21:33:05.77	programa_ejecutado	\N	\N	\N	{"bloques": ["if", "es_noche", "enciende_foco", "es_dia", "else", "apaga_foco"], "resultado": "no_ejecutado"}
720	16	\N	2026-09-18 21:33:08.422	programa_ejecutado	\N	\N	\N	{"bloques": ["if", "es_noche", "enciende_foco", "es_dia", "else", "apaga_foco"], "resultado": "no_ejecutado"}
721	16	\N	2026-09-18 21:33:09.243	programa_ejecutado	\N	\N	\N	{"bloques": ["if", "es_noche", "enciende_foco", "es_dia", "else", "apaga_foco"], "resultado": "no_ejecutado"}
722	16	\N	2026-09-18 21:33:12.682	camara_posicion	-24.47182	46.40536	9.893366e-12	{"beta": 0.4852866700667161, "alpha": -109.95574287564317, "radius": 52.46263200671736}
723	16	\N	2026-09-18 21:33:14.141	cambio_noche	\N	\N	\N	{"es_noche": true}
724	16	\N	2026-09-18 21:33:19.569	programa_ejecutado	\N	\N	\N	{"bloques": ["if", "es_noche", "enciende_foco", "es_dia", "else", "apaga_foco"], "resultado": "ejecutado"}
725	16	\N	2026-09-18 21:33:21.183	programa_ejecutado	\N	\N	\N	{"bloques": ["if", "es_noche", "enciende_foco", "es_dia", "else", "apaga_foco"], "resultado": "ejecutado"}
726	16	\N	2026-09-18 21:33:22.655	camara_posicion	-24.47182	46.40536	9.893366e-12	{"beta": 0.4852866700667161, "alpha": -109.95574287564317, "radius": 52.46263200671736}
727	16	\N	2026-09-18 21:33:26.34	cambio_noche	\N	\N	\N	{"es_noche": false}
728	16	\N	2026-09-18 21:33:32.67	camara_posicion	-24.47182	46.40536	9.893366e-12	{"beta": 0.4852866700667161, "alpha": -109.95574287564317, "radius": 52.46263200671736}
729	16	\N	2026-09-18 21:33:43.502	camara_posicion	-24.47182	46.40536	9.893366e-12	{"beta": 0.4852866700667161, "alpha": -109.95574287564317, "radius": 52.46263200671736}
730	16	\N	2026-09-18 21:33:53.503	camara_posicion	-24.47182	46.40536	9.893366e-12	{"beta": 0.4852866700667161, "alpha": -109.95574287564317, "radius": 52.46263200671736}
731	16	\N	2026-09-18 21:34:03.509	camara_posicion	-24.47182	46.40536	9.893366e-12	{"beta": 0.4852866700667161, "alpha": -109.95574287564317, "radius": 52.46263200671736}
732	16	\N	2026-09-18 21:34:13.512	camara_posicion	-24.47182	46.40536	9.893366e-12	{"beta": 0.4852866700667161, "alpha": -109.95574287564317, "radius": 52.46263200671736}
733	16	\N	2026-09-18 21:34:22.649	camara_posicion	-24.47182	46.40536	9.893366e-12	{"beta": 0.4852866700667161, "alpha": -109.95574287564317, "radius": 52.46263200671736}
734	16	\N	2026-09-18 21:34:33.505	camara_posicion	-24.47182	46.40536	9.893366e-12	{"beta": 0.4852866700667161, "alpha": -109.95574287564317, "radius": 52.46263200671736}
735	16	\N	2026-09-18 21:34:43.502	camara_posicion	-24.47182	46.40536	9.893366e-12	{"beta": 0.4852866700667161, "alpha": -109.95574287564317, "radius": 52.46263200671736}
736	16	\N	2026-09-18 21:34:53.509	camara_posicion	-24.47182	46.40536	9.893366e-12	{"beta": 0.4852866700667161, "alpha": -109.95574287564317, "radius": 52.46263200671736}
737	16	\N	2026-09-18 21:35:03.503	camara_posicion	-24.47182	46.40536	9.893366e-12	{"beta": 0.4852866700667161, "alpha": -109.95574287564317, "radius": 52.46263200671736}
738	16	\N	2026-09-18 21:35:13.505	camara_posicion	-24.47182	46.40536	9.893366e-12	{"beta": 0.4852866700667161, "alpha": -109.95574287564317, "radius": 52.46263200671736}
739	16	\N	2026-09-18 21:35:23.515	camara_posicion	-24.47182	46.40536	9.893366e-12	{"beta": 0.4852866700667161, "alpha": -109.95574287564317, "radius": 52.46263200671736}
740	16	\N	2026-09-18 21:35:56.512	camara_posicion	-24.47182	46.40536	9.893366e-12	{"beta": 0.4852866700667161, "alpha": -109.95574287564317, "radius": 52.46263200671736}
741	16	\N	2026-09-18 21:36:56.51	camara_posicion	-24.47182	46.40536	9.893366e-12	{"beta": 0.4852866700667161, "alpha": -109.95574287564317, "radius": 52.46263200671736}
742	16	\N	2026-09-18 21:37:56.508	camara_posicion	-24.47182	46.40536	9.893366e-12	{"beta": 0.4852866700667161, "alpha": -109.95574287564317, "radius": 52.46263200671736}
743	16	\N	2026-09-18 21:38:56.507	camara_posicion	-24.47182	46.40536	9.893366e-12	{"beta": 0.4852866700667161, "alpha": -109.95574287564317, "radius": 52.46263200671736}
744	17	\N	2026-09-21 14:21:37.122	camara_posicion	1.5880842e-15	18.5467	-25.935383	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 31.884543803316397}
745	17	\N	2026-09-21 14:21:47.188	camara_posicion	2.6901697e-15	31.417585	-43.933804	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 54.011515149131235}
746	17	\N	2026-09-21 14:21:57.138	camara_posicion	2.6901697e-15	31.417585	-43.933804	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 54.011515149131235}
747	17	\N	2026-09-21 14:22:07.192	camara_posicion	2.6901697e-15	31.417585	-43.933804	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 54.011515149131235}
748	17	\N	2026-09-21 14:22:17.165	camara_posicion	2.6901697e-15	31.417585	-43.933804	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 54.011515149131235}
749	17	\N	2026-09-21 14:22:27.126	camara_posicion	2.6901697e-15	31.417585	-43.933804	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 54.011515149131235}
750	17	\N	2026-09-21 14:22:37.191	camara_posicion	2.6901697e-15	31.417585	-43.933804	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 54.011515149131235}
751	17	\N	2026-09-21 14:22:47.187	camara_posicion	2.6901697e-15	31.417585	-43.933804	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 54.011515149131235}
752	17	\N	2026-09-21 14:22:57.283	camara_posicion	2.6901697e-15	31.417585	-43.933804	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 54.011515149131235}
753	17	\N	2026-09-21 14:23:07.277	camara_posicion	2.6901697e-15	31.417585	-43.933804	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 54.011515149131235}
754	17	\N	2026-09-21 14:23:17.284	camara_posicion	2.6901697e-15	31.417585	-43.933804	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 54.011515149131235}
755	17	\N	2026-09-21 14:23:27.273	camara_posicion	2.6901697e-15	31.417585	-43.933804	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 54.011515149131235}
756	17	\N	2026-09-21 14:23:37.272	camara_posicion	2.6901697e-15	31.417585	-43.933804	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 54.011515149131235}
757	17	\N	2026-09-21 14:23:47.278	camara_posicion	2.6901697e-15	31.417585	-43.933804	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 54.011515149131235}
758	17	\N	2026-09-21 14:24:08.272	camara_posicion	2.6901697e-15	31.417585	-43.933804	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 54.011515149131235}
759	17	\N	2026-09-21 14:25:08.281	camara_posicion	2.6901697e-15	31.417585	-43.933804	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 54.011515149131235}
760	17	\N	2026-09-21 14:26:08.271	camara_posicion	2.6901697e-15	31.417585	-43.933804	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 54.011515149131235}
761	17	\N	2026-09-21 14:27:08.281	camara_posicion	2.6901697e-15	31.417585	-43.933804	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 54.011515149131235}
762	17	\N	2026-09-21 14:28:00.383	camara_posicion	2.6901697e-15	31.417585	-43.933804	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 54.011515149131235}
763	18	\N	2026-09-21 14:32:04.928	modal_abierto	\N	\N	\N	{"modal": "confirm_reset"}
764	18	\N	2026-09-21 14:32:07.911	proyecto_reiniciado	\N	\N	\N	{}
765	19	\N	2026-09-21 14:32:13.878	modal_abierto	\N	\N	\N	{"modal": "matematicas"}
766	19	\N	2026-09-21 14:32:18.305	camara_posicion	2.7245444e-15	31.819036	-44.495186	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 54.701670938701355}
767	19	\N	2026-09-21 14:32:28.305	camara_posicion	2.7245444e-15	31.819036	-44.495186	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 54.701670938701355}
768	19	\N	2026-09-21 14:32:37.962	matematicas_intento	\N	\N	\N	{"area": 400, "volumen": 6000, "correcto": false, "perimetro": 80, "unidad_area": "", "unidad_volumen": "", "unidad_perimetro": ""}
769	19	\N	2026-09-21 14:32:37.962	modal_cerrado	\N	\N	\N	{"modal": "matematicas"}
770	19	\N	2026-09-21 14:32:38.301	camara_posicion	2.7245444e-15	31.819036	-44.495186	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 54.701670938701355}
771	19	\N	2026-09-21 14:32:39.236	modal_abierto	\N	\N	\N	{"modal": "matematicas"}
772	19	\N	2026-09-21 14:32:42.951	matematicas_intento	\N	\N	\N	{"area": 400, "volumen": 6000, "correcto": true, "perimetro": 80, "unidad_area": "m2", "unidad_volumen": "m3", "unidad_perimetro": "m"}
773	19	\N	2026-09-21 14:32:42.951	modal_cerrado	\N	\N	\N	{"modal": "matematicas"}
774	19	\N	2026-09-21 14:32:43.907	modal_abierto	\N	\N	\N	{"modal": "concreto"}
775	19	\N	2026-09-21 14:32:48.305	camara_posicion	2.7245444e-15	31.819036	-44.495186	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 54.701670938701355}
776	19	\N	2026-09-21 14:32:54.256	concreto_intento	\N	\N	\N	{"agua": 600, "arena": 2000, "grava": 3000, "cemento": 1000, "correcto": true}
777	19	\N	2026-09-21 14:32:54.258	modal_cerrado	\N	\N	\N	{"modal": "concreto"}
778	19	\N	2026-09-21 14:32:54.259	modal_cerrado	\N	\N	\N	{"modal": "concreto"}
779	19	\N	2026-09-21 14:32:58.31	camara_posicion	2.7245444e-15	31.819036	-44.495186	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 54.701670938701355}
780	19	\N	2026-09-21 14:32:59.428	pared_construida	0	0	0	{"alto": 5, "modo": "simple", "ancho": 15, "material": "block"}
781	19	\N	2026-09-21 14:33:08.303	camara_posicion	2.562275e-15	29.923948	-41.845127	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 51.44373106330689}
782	19	\N	2026-09-21 14:33:18.302	camara_posicion	5.807324e-16	6.7821784	-9.48408	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 11.659576378543846}
783	19	\N	2026-09-21 14:33:28.301	camara_posicion	3.5478904e-16	4.1434617	-5.7941446	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 7.123228886136294}
784	19	\N	2026-09-21 14:33:38.304	camara_posicion	1.4676711e-15	17.140436	-23.96889	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 29.466968158373795}
785	19	\N	2026-09-21 14:33:48.3	camara_posicion	7.003284	10.016263	-12.130044	{"beta": 0.95, "alpha": 5.235987755982988, "radius": 17.219450245022756}
786	19	\N	2026-09-21 14:33:51.276	modal_abierto	\N	\N	\N	{"modal": "confirm_reset"}
787	19	\N	2026-09-21 14:33:52.512	proyecto_reiniciado	\N	\N	\N	{}
788	20	\N	2026-09-21 14:34:02.879	camara_posicion	2.98844e-15	34.900986	-48.80493	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 60}
789	20	\N	2026-09-21 14:34:12.879	camara_posicion	2.98844e-15	34.900986	-48.80493	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 60}
790	20	\N	2026-09-21 14:34:22.879	camara_posicion	2.98844e-15	34.900986	-48.80493	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 60}
791	21	\N	2026-09-21 16:19:14.506	modal_abierto	\N	\N	\N	{"modal": "matematicas"}
792	21	\N	2026-09-21 16:19:21.729	camara_posicion	1.49422e-15	17.450493	-24.402466	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 30}
793	21	\N	2026-09-21 16:19:25.064	matematicas_intento	\N	\N	\N	{"area": 400, "volumen": 6000, "correcto": false, "perimetro": 80, "unidad_area": "", "unidad_volumen": "", "unidad_perimetro": ""}
794	21	\N	2026-09-21 16:19:25.064	modal_cerrado	\N	\N	\N	{"modal": "matematicas"}
795	21	\N	2026-09-21 16:19:26.221	modal_abierto	\N	\N	\N	{"modal": "matematicas"}
796	21	\N	2026-09-21 16:19:31.099	matematicas_intento	\N	\N	\N	{"area": 400, "volumen": 6000, "correcto": true, "perimetro": 80, "unidad_area": "m2", "unidad_volumen": "m3", "unidad_perimetro": "m"}
797	21	\N	2026-09-21 16:19:31.1	modal_cerrado	\N	\N	\N	{"modal": "matematicas"}
798	21	\N	2026-09-21 16:19:31.729	camara_posicion	1.49422e-15	17.450493	-24.402466	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 30}
799	21	\N	2026-09-21 16:19:32.19	modal_abierto	\N	\N	\N	{"modal": "concreto"}
800	21	\N	2026-09-21 16:19:41.729	camara_posicion	1.49422e-15	17.450493	-24.402466	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 30}
801	21	\N	2026-09-21 16:19:42.554	concreto_intento	\N	\N	\N	{"agua": 600, "arena": 2000, "grava": 3000, "cemento": 1000, "correcto": true}
802	21	\N	2026-09-21 16:19:42.558	modal_cerrado	\N	\N	\N	{"modal": "concreto"}
803	21	\N	2026-09-21 16:19:42.57	modal_cerrado	\N	\N	\N	{"modal": "concreto"}
804	21	\N	2026-09-21 16:19:50.747	pared_construida	0	0	0	{"alto": 10, "modo": "simple", "ancho": 18, "material": "block"}
805	21	\N	2026-09-21 16:19:51.74	camara_posicion	1.49422e-15	17.450493	-24.402466	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 30}
806	22	\N	2026-09-21 16:20:09.573	pared_construida	0	0	0	{"alto": 10, "modo": "simple", "ancho": 17, "material": "block"}
807	22	\N	2026-09-21 16:20:10.93	camara_posicion	1.9820554e-15	23.147757	-32.36942	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 39.79444679393838}
808	22	\N	2026-09-21 16:20:20.931	camara_posicion	1.5760472e-15	18.406124	-25.738804	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 31.64287340878839}
809	23	\N	2026-09-21 16:20:27.687	modal_abierto	\N	\N	\N	{"modal": "confirm_reset"}
810	23	\N	2026-09-21 16:20:31.125	proyecto_reiniciado	\N	\N	\N	{}
811	24	\N	2026-09-21 16:20:35.238	modal_abierto	\N	\N	\N	{"modal": "matematicas"}
812	24	\N	2026-09-21 16:20:36.819	modal_cerrado	\N	\N	\N	{"modal": "matematicas"}
813	24	\N	2026-09-21 16:20:36.819	modal_cerrado	\N	\N	\N	{"modal": "matematicas"}
814	24	\N	2026-09-21 16:20:39.379	objeto_colocado	-5.4404283	0	1.8430213	{"id": 1, "tipo": "block"}
815	24	\N	2026-09-21 16:20:41.515	camara_posicion	1.1266765e-15	13.158075	-18.400024	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 22.620694994680562}
816	24	\N	2026-09-21 16:20:51.517	camara_posicion	2.5730966e-16	3.0050328	-4.2021856	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 5.166099797375509}
817	24	\N	2026-09-21 16:21:01.516	camara_posicion	7.5522135e-16	8.819976	-12.3337	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 15.16285394800725}
818	24	\N	2026-09-21 16:21:11.515	camara_posicion	7.5522135e-16	8.819976	-12.3337	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 15.16285394800725}
819	24	\N	2026-09-21 16:21:16.197	objeto_eliminado	\N	\N	\N	{"id": 1, "tipo": "block"}
820	26	\N	2026-09-21 20:16:54.167	modal_abierto	\N	\N	\N	{"modal": "matematicas"}
821	26	\N	2026-09-21 20:17:02.029	camara_posicion	1.49422e-15	17.450493	-24.402466	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 30}
822	26	\N	2026-09-21 20:17:09.526	matematicas_intento	\N	\N	\N	{"area": 400, "volumen": 6000, "correcto": true, "perimetro": 80, "unidad_area": "m2", "unidad_volumen": "m3", "unidad_perimetro": "m"}
823	26	\N	2026-09-21 20:17:09.527	modal_cerrado	\N	\N	\N	{"modal": "matematicas"}
824	26	\N	2026-09-21 20:17:11.06	modal_abierto	\N	\N	\N	{"modal": "concreto"}
825	26	\N	2026-09-21 20:17:12.029	camara_posicion	1.49422e-15	17.450493	-24.402466	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 30}
826	26	\N	2026-09-21 20:17:22.028	camara_posicion	1.49422e-15	17.450493	-24.402466	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 30}
827	26	\N	2026-09-21 20:17:23.147	concreto_intento	\N	\N	\N	{"agua": 600, "arena": 2000, "grava": 3000, "cemento": 1000, "correcto": true}
828	26	\N	2026-09-21 20:17:23.151	modal_cerrado	\N	\N	\N	{"modal": "concreto"}
829	26	\N	2026-09-21 20:17:23.161	modal_cerrado	\N	\N	\N	{"modal": "concreto"}
830	26	\N	2026-09-21 20:17:32.026	camara_posicion	1.3848616e-15	16.173332	-22.616507	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 27.804370528989274}
831	26	\N	2026-09-21 20:17:40.43	pared_construida	0	0	0	{"alto": 10, "modo": "simple", "ancho": 16, "material": "block"}
832	26	\N	2026-09-21 20:17:42.027	camara_posicion	1.3848616e-15	16.173332	-22.616507	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 27.804370528989274}
833	26	\N	2026-09-21 20:17:52.026	camara_posicion	1.3848616e-15	16.173332	-22.616507	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 27.804370528989274}
834	26	\N	2026-09-21 20:18:03.292	camara_posicion	1.3848616e-15	16.173332	-22.616507	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 27.804370528989274}
835	26	\N	2026-09-21 20:18:11.8	pared_construida	0	0	0	{"alto": 10, "modo": "simple", "ancho": 16, "material": "block"}
836	26	\N	2026-09-21 20:18:12.042	camara_posicion	1.3848616e-15	16.173332	-22.616507	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 27.804370528989274}
837	26	\N	2026-09-21 20:18:22.04	camara_posicion	1.0185423e-15	11.895212	-16.634058	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 20.449644791026365}
838	26	\N	2026-09-21 20:18:32.039	camara_posicion	-12.072693	17.266653	20.910517	{"beta": 0.95, "alpha": -4.1887902047863905, "radius": 29.68395104555107}
839	26	\N	2026-09-21 20:18:42.274	camara_posicion	-12.072693	17.266653	20.910517	{"beta": 0.95, "alpha": -4.1887902047863905, "radius": 29.68395104555107}
840	26	\N	2026-09-21 20:18:52.272	camara_posicion	-12.072693	17.266653	20.910517	{"beta": 0.95, "alpha": -4.1887902047863905, "radius": 29.68395104555107}
841	26	\N	2026-09-21 20:19:02.276	camara_posicion	-12.072693	17.266653	20.910517	{"beta": 0.95, "alpha": -4.1887902047863905, "radius": 29.68395104555107}
842	26	\N	2026-09-21 20:19:12.28	camara_posicion	-12.072693	17.266653	20.910517	{"beta": 0.95, "alpha": -4.1887902047863905, "radius": 29.68395104555107}
843	26	\N	2026-09-21 20:19:22.276	camara_posicion	-12.072693	17.266653	20.910517	{"beta": 0.95, "alpha": -4.1887902047863905, "radius": 29.68395104555107}
844	26	\N	2026-09-21 20:19:32.273	camara_posicion	-12.072693	17.266653	20.910517	{"beta": 0.95, "alpha": -4.1887902047863905, "radius": 29.68395104555107}
845	26	\N	2026-09-21 20:20:08.282	camara_posicion	-12.072693	17.266653	20.910517	{"beta": 0.95, "alpha": -4.1887902047863905, "radius": 29.68395104555107}
846	26	\N	2026-09-21 20:21:08.283	camara_posicion	-12.072693	17.266653	20.910517	{"beta": 0.95, "alpha": -4.1887902047863905, "radius": 29.68395104555107}
847	26	\N	2026-09-21 20:22:08.269	camara_posicion	-12.072693	17.266653	20.910517	{"beta": 0.95, "alpha": -4.1887902047863905, "radius": 29.68395104555107}
848	26	\N	2026-09-21 20:22:35.981	camara_posicion	-12.072693	17.266653	20.910517	{"beta": 0.95, "alpha": -4.1887902047863905, "radius": 29.68395104555107}
849	26	\N	2026-09-21 20:22:42.049	camara_posicion	-12.072693	17.266653	20.910517	{"beta": 0.95, "alpha": -4.1887902047863905, "radius": 29.68395104555107}
850	26	\N	2026-09-21 20:22:48.64	pared_construida	0	0	0	{"alto": 10, "modo": "simple", "ancho": 16, "material": "block"}
851	26	\N	2026-09-21 20:22:52.04	camara_posicion	-12.072693	17.266653	20.910517	{"beta": 0.95, "alpha": -4.1887902047863905, "radius": 29.68395104555107}
852	26	\N	2026-09-21 20:23:02.054	camara_posicion	-12.072693	17.266653	20.910517	{"beta": 0.95, "alpha": -4.1887902047863905, "radius": 29.68395104555107}
853	26	\N	2026-09-21 20:23:12.278	camara_posicion	12.072693	17.266653	20.910517	{"beta": 0.9500000000000001, "alpha": -5.235987755982989, "radius": 29.68395104555107}
854	26	\N	2026-09-21 20:23:22.027	camara_posicion	13.178298	10.881848	7.608494	{"beta": 0.9500000000000001, "alpha": -5.759586531581288, "radius": 18.707520601816835}
855	26	\N	2026-09-21 20:23:32.049	camara_posicion	8.844491	12.649602	15.319108	{"beta": 0.9500000000000001, "alpha": -5.235987755982989, "radius": 21.746551869721415}
856	26	\N	2026-09-21 20:23:42.047	camara_posicion	-3.2494134e-15	12.649602	17.688982	{"beta": 0.9500000000000001, "alpha": -4.71238898038469, "radius": 21.746551869721415}
857	26	\N	2026-09-21 20:23:52.047	camara_posicion	-3.2494134e-15	12.649602	17.688982	{"beta": 0.9500000000000001, "alpha": -4.71238898038469, "radius": 21.746551869721415}
858	26	\N	2026-09-21 20:24:02.039	camara_posicion	-3.2494134e-15	12.649602	17.688982	{"beta": 0.9500000000000001, "alpha": -4.71238898038469, "radius": 21.746551869721415}
859	26	\N	2026-09-21 20:24:05.745	pared_construida	0	0	0	{"alto": 4, "modo": "ventana", "ancho": 16, "material": "block"}
860	26	\N	2026-09-21 20:24:12.057	camara_posicion	-3.2494134e-15	12.649602	17.688982	{"beta": 0.9500000000000001, "alpha": -4.71238898038469, "radius": 21.746551869721415}
861	26	\N	2026-09-21 20:24:22.054	camara_posicion	-3.2494134e-15	12.649602	17.688982	{"beta": 0.9500000000000001, "alpha": -4.71238898038469, "radius": 21.746551869721415}
862	26	\N	2026-09-21 20:24:24.186	pared_construida	0	0	0	{"alto": 4, "modo": "simple", "ancho": 16, "material": "block"}
863	26	\N	2026-09-21 20:24:32.048	camara_posicion	-3.2494134e-15	12.649602	17.688982	{"beta": 0.9500000000000001, "alpha": -4.71238898038469, "radius": 21.746551869721415}
864	26	\N	2026-09-21 20:24:42.05	camara_posicion	-1.0295283e-14	12.649602	-17.688982	{"beta": 0.9500000000000001, "alpha": -7.853981633974484, "radius": 21.746551869721415}
865	26	\N	2026-09-21 20:24:52.047	camara_posicion	-1.0295283e-14	12.649602	-17.688982	{"beta": 0.9500000000000001, "alpha": -7.853981633974484, "radius": 21.746551869721415}
866	26	\N	2026-09-21 20:25:02.049	camara_posicion	-1.2647569e-14	0.8329524	-21.730595	{"beta": 1.5324842212633139, "alpha": -7.853981633974484, "radius": 21.746551869721415}
867	26	\N	2026-09-21 20:25:12.054	camara_posicion	-1.2647569e-14	0.8329524	-21.730595	{"beta": 1.5324842212633139, "alpha": -7.853981633974484, "radius": 21.746551869721415}
868	26	\N	2026-09-21 20:25:22.047	camara_posicion	-1.071072e-14	11.586655	-18.402771	{"beta": 1.008885445665015, "alpha": -7.853981633974484, "radius": 21.746551869721415}
869	26	\N	2026-09-21 20:25:32.064	camara_posicion	-2.2135056e-14	12.755365	-38.03165	{"beta": 1.2471975511965976, "alpha": -7.853981633974484, "radius": 40.11366005394964}
870	26	\N	2026-09-21 20:25:42.053	camara_posicion	-2.2135056e-14	12.755365	-38.03165	{"beta": 1.2471975511965976, "alpha": -7.853981633974484, "radius": 40.11366005394964}
871	26	\N	2026-09-21 20:25:52.034	camara_posicion	-1.2498492e-14	7.2022786	-21.474455	{"beta": 1.2471975511965976, "alpha": -7.853981633974484, "radius": 22.650056391376864}
872	26	\N	2026-09-21 20:26:02.051	camara_posicion	-6.6701524e-15	12.972263	-11.460413	{"beta": 0.7235987755982988, "alpha": -7.853981633974484, "radius": 17.30955456159571}
873	26	\N	2026-09-21 20:26:12.035	camara_posicion	-8.525388e-15	9.222604	-14.648012	{"beta": 1.008885445665015, "alpha": -7.853981633974484, "radius": 17.30955456159571}
874	26	\N	2026-09-21 20:26:22.025	camara_posicion	34.194103	1.5134538	19.741976	{"beta": 1.5324842212633139, "alpha": -5.759586531581287, "radius": 39.51294562616704}
875	26	\N	2026-09-21 20:26:32.037	camara_posicion	32.523582	23.645178	18.777498	{"beta": 1.008885445665015, "alpha": -5.759586531581287, "radius": 44.37873630007764}
876	26	\N	2026-09-21 20:26:42.048	camara_posicion	32.523582	23.645178	18.777498	{"beta": 1.008885445665015, "alpha": -5.759586531581287, "radius": 44.37873630007764}
877	26	\N	2026-09-21 20:26:52.069	camara_posicion	32.523582	23.645178	18.777498	{"beta": 1.008885445665015, "alpha": -5.759586531581287, "radius": 44.37873630007764}
878	26	\N	2026-09-21 20:27:02.032	camara_posicion	32.523582	23.645178	18.777498	{"beta": 1.008885445665015, "alpha": -5.759586531581287, "radius": 44.37873630007764}
879	26	\N	2026-09-21 20:27:06.229	pared_construida	0	0	0	{"alto": 4, "modo": "ventana", "ancho": 16, "material": "block"}
880	26	\N	2026-09-21 20:27:12.055	camara_posicion	32.523582	23.645178	18.777498	{"beta": 1.008885445665015, "alpha": -5.759586531581287, "radius": 44.37873630007764}
881	26	\N	2026-09-21 20:27:22.054	camara_posicion	-10.350496	39.25482	-17.927586	{"beta": 0.4852866700667161, "alpha": -2.094395102393195, "radius": 44.37873630007764}
882	26	\N	2026-09-21 20:27:32.061	camara_posicion	-8.821455	11.108235	-15.279207	{"beta": 1.008885445665015, "alpha": -2.094395102393195, "radius": 20.84862428845496}
883	26	\N	2026-09-21 20:27:42.061	camara_posicion	-16.49377	20.76944	-28.568047	{"beta": 1.008885445665015, "alpha": -2.094395102393195, "radius": 38.981372693228145}
884	26	\N	2026-09-21 20:27:52.07	camara_posicion	-19.23622	12.111406	-1.9440953e-14	{"beta": 1.008885445665015, "alpha": -3.1415926535897922, "radius": 22.731438633605837}
885	26	\N	2026-09-21 20:28:02.059	camara_posicion	-19.671556	0.8706762	-11.357379	{"beta": 1.5324842212633136, "alpha": -2.6179938779914935, "radius": 22.731438633605837}
886	26	\N	2026-09-21 20:28:12.041	camara_posicion	-23.525978	17.103773	-13.58273	{"beta": 1.008885445665015, "alpha": -2.6179938779914935, "radius": 32.101422381885456}
887	26	\N	2026-09-21 20:28:18.746	objeto_eliminado	\N	\N	\N	{"id": 5, "tipo": "wall_block"}
888	26	\N	2026-09-21 20:28:22.038	camara_posicion	21.69846	13.661669	4.818026e-15	{"beta": 1.008885445665015, "alpha": 0.0000000000000002220446049250313, "radius": 25.64106702511172}
889	26	\N	2026-09-21 20:28:32.046	camara_posicion	21.69846	13.661669	4.818026e-15	{"beta": 1.008885445665015, "alpha": 0.0000000000000002220446049250313, "radius": 25.64106702511172}
890	26	\N	2026-09-21 20:28:38.005	pared_construida	0	0	0	{"alto": 10, "modo": "puerta", "ancho": 16, "material": "block"}
891	26	\N	2026-09-21 20:28:42.064	camara_posicion	21.69846	13.661669	4.818026e-15	{"beta": 1.008885445665015, "alpha": 0.0000000000000002220446049250313, "radius": 25.64106702511172}
892	26	\N	2026-09-21 20:28:52.077	camara_posicion	50.446243	31.761698	1.1201316e-14	{"beta": 1.008885445665015, "alpha": 0.0000000000000002220446049250313, "radius": 59.612323352430444}
893	26	\N	2026-09-21 20:28:57.298	objeto_eliminado	\N	\N	\N	{"id": 4, "tipo": "wall_block"}
894	26	\N	2026-09-21 20:29:02.034	camara_posicion	50.446243	31.761698	1.1201316e-14	{"beta": 1.008885445665015, "alpha": 0.0000000000000002220446049250313, "radius": 59.612323352430444}
895	26	\N	2026-09-21 20:29:09.968	pared_construida	0	0	0	{"alto": 10, "modo": "simple", "ancho": 16, "material": "block"}
896	26	\N	2026-09-21 20:29:12.074	camara_posicion	50.446243	31.761698	1.1201316e-14	{"beta": 1.008885445665015, "alpha": 0.0000000000000002220446049250313, "radius": 59.612323352430444}
897	26	\N	2026-09-21 20:29:22.067	camara_posicion	50.446243	31.761698	1.1201316e-14	{"beta": 1.008885445665015, "alpha": 0.0000000000000002220446049250313, "radius": 59.612323352430444}
898	26	\N	2026-09-21 20:29:23.544	objeto_eliminado	\N	\N	\N	{"id": 15, "tipo": "wall_block"}
899	26	\N	2026-09-21 20:29:26.729	pared_construida	0	0	0	{"alto": 10, "modo": "puerta", "ancho": 16, "material": "block"}
900	26	\N	2026-09-21 20:29:32.056	camara_posicion	50.446243	31.761698	1.1201316e-14	{"beta": 1.008885445665015, "alpha": 0.0000000000000002220446049250313, "radius": 59.612323352430444}
901	26	\N	2026-09-21 20:29:42.074	camara_posicion	-23.404716	17.015614	-13.512719	{"beta": 1.008885445665015, "alpha": -2.6179938779914935, "radius": 31.935958926496653}
902	26	\N	2026-09-21 20:29:52.079	camara_posicion	-23.673573	17.211077	-13.667944	{"beta": 1.008885445665015, "alpha": -2.6179938779914935, "radius": 32.30281631046071}
903	26	\N	2026-09-21 20:30:02.051	camara_posicion	-23.673573	17.211077	-13.667944	{"beta": 1.008885445665015, "alpha": -2.6179938779914935, "radius": 32.30281631046071}
904	26	\N	2026-09-21 20:30:12.1	camara_posicion	-13.667944	17.211077	23.673573	{"beta": 1.008885445665015, "alpha": 2.0943951023931953, "radius": 32.30281631046071}
905	27	\N	2026-09-21 21:00:34.826	camara_posicion	32.29433	23.094059	-7.170782e-15	{"beta": 0.95, "alpha": -0.0000000000000002220446049250313, "radius": 39.70213149749871}
906	27	\N	2026-09-21 21:00:44.828	camara_posicion	43.75094	31.286816	-9.71466e-15	{"beta": 0.95, "alpha": -0.0000000000000002220446049250313, "radius": 53.78670376819476}
907	27	\N	2026-09-21 21:00:54.818	camara_posicion	-21.537567	2.4248898	12.43472	{"beta": 1.4735987755982989, "alpha": 2.6179938779914935, "radius": 24.987380158527063}
908	27	\N	2026-09-21 21:01:05.269	camara_posicion	-21.537567	2.4248898	12.43472	{"beta": 1.4735987755982989, "alpha": 2.6179938779914935, "radius": 24.987380158527063}
909	27	\N	2026-09-21 21:01:15.271	camara_posicion	-21.537567	2.4248898	12.43472	{"beta": 1.4735987755982989, "alpha": 2.6179938779914935, "radius": 24.987380158527063}
910	27	\N	2026-09-21 21:01:25.282	camara_posicion	-21.537567	2.4248898	12.43472	{"beta": 1.4735987755982989, "alpha": 2.6179938779914935, "radius": 24.987380158527063}
911	27	\N	2026-09-21 21:01:35.286	camara_posicion	-21.537567	2.4248898	12.43472	{"beta": 1.4735987755982989, "alpha": 2.6179938779914935, "radius": 24.987380158527063}
912	27	\N	2026-09-21 21:01:45.284	camara_posicion	-21.537567	2.4248898	12.43472	{"beta": 1.4735987755982989, "alpha": 2.6179938779914935, "radius": 24.987380158527063}
913	27	\N	2026-09-21 21:02:02.464	camara_posicion	-21.537567	2.4248898	12.43472	{"beta": 1.4735987755982989, "alpha": 2.6179938779914935, "radius": 24.987380158527063}
914	27	\N	2026-09-21 21:02:04.801	camara_posicion	-24.376741	2.7445493	14.073918	{"beta": 1.4735987755982989, "alpha": 2.6179938779914935, "radius": 28.281323751494632}
915	27	\N	2026-09-21 21:02:14.84	camara_posicion	1.8173424e-14	25.71834	35.96408	{"beta": 0.9500000000000001, "alpha": 1.5707963267948961, "radius": 44.2136642786561}
916	27	\N	2026-09-21 21:02:24.816	camara_posicion	-9.000907	12.87331	15.590028	{"beta": 0.9500000000000001, "alpha": 2.094395102393195, "radius": 22.131140985281608}
917	27	\N	2026-09-21 21:02:34.818	camara_posicion	-15.590028	12.87331	9.000907	{"beta": 0.9500000000000001, "alpha": 2.6179938779914935, "radius": 22.131140985281608}
918	27	\N	2026-09-21 21:02:45.282	camara_posicion	-21.498602	15.629837	12.412224	{"beta": 1.008885445665015, "alpha": 2.6179938779914935, "radius": 29.33504671410475}
919	27	\N	2026-09-21 21:02:55.278	camara_posicion	-21.498602	15.629837	12.412224	{"beta": 1.008885445665015, "alpha": 2.6179938779914935, "radius": 29.33504671410475}
920	27	\N	2026-09-21 21:03:05.284	camara_posicion	-21.498602	15.629837	12.412224	{"beta": 1.008885445665015, "alpha": 2.6179938779914935, "radius": 29.33504671410475}
921	27	\N	2026-09-21 21:03:15.278	camara_posicion	-21.498602	15.629837	12.412224	{"beta": 1.008885445665015, "alpha": 2.6179938779914935, "radius": 29.33504671410475}
922	27	\N	2026-09-21 21:03:25.272	camara_posicion	-21.498602	15.629837	12.412224	{"beta": 1.008885445665015, "alpha": 2.6179938779914935, "radius": 29.33504671410475}
923	27	\N	2026-09-21 21:03:35.279	camara_posicion	-21.498602	15.629837	12.412224	{"beta": 1.008885445665015, "alpha": 2.6179938779914935, "radius": 29.33504671410475}
924	27	\N	2026-09-21 21:03:57.223	camara_posicion	-21.498602	15.629837	12.412224	{"beta": 1.008885445665015, "alpha": 2.6179938779914935, "radius": 29.33504671410475}
925	27	\N	2026-09-21 21:04:04.821	camara_posicion	-14.784146	1.1333781	-25.606892	{"beta": 1.5324842212633136, "alpha": 4.18879020478639, "radius": 29.5900055528819}
926	27	\N	2026-09-21 21:04:14.836	camara_posicion	-1.479468e-14	26.17358	-13.802611	{"beta": 0.4852866700667161, "alpha": 4.712388980384689, "radius": 29.5900055528819}
927	27	\N	2026-09-21 21:04:24.821	camara_posicion	-21.685452	15.76568	-12.520102	{"beta": 1.008885445665015, "alpha": 3.665191429188091, "radius": 29.5900055528819}
928	27	\N	2026-09-21 21:04:34.839	camara_posicion	-12.520102	15.76568	-21.685452	{"beta": 1.008885445665015, "alpha": 4.18879020478639, "radius": 29.5900055528819}
929	27	\N	2026-09-21 21:04:44.829	camara_posicion	-25.040203	15.76568	9.1996215e-15	{"beta": 1.008885445665015, "alpha": 9.42477796076938, "radius": 29.5900055528819}
930	27	\N	2026-09-21 21:04:54.824	camara_posicion	-21.685452	15.76568	-12.520102	{"beta": 1.008885445665015, "alpha": 9.948376736367678, "radius": 29.5900055528819}
931	27	\N	2026-09-21 21:05:04.829	camara_posicion	25.040203	15.76568	-1.01226834e-13	{"beta": 1.008885445665015, "alpha": 12.566370614359169, "radius": 29.5900055528819}
932	27	\N	2026-09-21 21:05:14.816	camara_posicion	-12.520102	15.76568	21.685452	{"beta": 1.008885445665015, "alpha": 14.660765716752362, "radius": 29.5900055528819}
933	27	\N	2026-09-21 21:05:24.799	camara_posicion	-12.520102	15.76568	21.685452	{"beta": 1.008885445665015, "alpha": 14.660765716752362, "radius": 29.5900055528819}
934	27	\N	2026-09-21 21:05:34.854	camara_posicion	-12.520102	15.76568	21.685452	{"beta": 1.008885445665015, "alpha": 14.660765716752362, "radius": 29.5900055528819}
935	27	\N	2026-09-21 21:05:44.801	camara_posicion	8.0776064e-14	8.649048	13.737048	{"beta": 1.008885445665015, "alpha": 14.137166941154064, "radius": 16.2330687390401}
936	27	\N	2026-09-21 21:05:54.81	camara_posicion	1.2148931e-13	13.008393	20.66088	{"beta": 1.008885445665015, "alpha": 14.137166941154064, "radius": 24.414959208806476}
937	27	\N	2026-09-21 21:06:04.817	camara_posicion	1.0754262e-13	0.7010354	18.289059	{"beta": 1.5324842212633136, "alpha": 14.137166941154064, "radius": 18.302489945931846}
938	27	\N	2026-09-21 21:06:14.8	camara_posicion	9.1073545e-14	9.751644	15.488273	{"beta": 1.008885445665015, "alpha": 14.137166941154064, "radius": 18.302489945931846}
939	27	\N	2026-09-21 21:06:24.834	camara_posicion	-21.360865	40.506126	1.6485783e-13	{"beta": 0.4852866700667161, "alpha": 15.707963267948958, "radius": 45.79337119139821}
940	27	\N	2026-09-21 21:06:34.83	camara_posicion	-18.252665	13.269987	10.538181	{"beta": 1.008885445665015, "alpha": 15.18436449235066, "radius": 24.90593493968889}
941	27	\N	2026-09-21 21:06:44.826	camara_posicion	-10.538181	13.269987	18.252665	{"beta": 1.008885445665015, "alpha": 14.660765716752362, "radius": 24.90593493968889}
942	27	\N	2026-09-21 21:06:54.83	camara_posicion	-12.283286	7.733738	9.4799345e-14	{"beta": 1.008885445665015, "alpha": 15.707963267948958, "radius": 14.515158269789993}
943	27	\N	2026-09-21 21:07:04.81	camara_posicion	-1.2764921e-13	8.410985	-13.35894	{"beta": 1.008885445665015, "alpha": 17.278759594743853, "radius": 15.786257910506693}
944	27	\N	2026-09-21 21:07:14.825	camara_posicion	-1.2764921e-13	8.410985	-13.35894	{"beta": 1.008885445665015, "alpha": 17.278759594743853, "radius": 15.786257910506693}
945	27	\N	2026-09-21 21:07:24.836	camara_posicion	-23.837227	17.330055	-13.762429	{"beta": 1.008885445665015, "alpha": 16.231562043547257, "radius": 32.52612194796391}
946	27	\N	2026-09-21 21:07:34.818	camara_posicion	-1.3454458e-13	8.865331	-14.0805645	{"beta": 1.008885445665015, "alpha": 17.278759594743853, "radius": 16.639002304162148}
947	27	\N	2026-09-21 21:07:44.799	camara_posicion	-13.8407135	17.428635	-23.97282	{"beta": 1.008885445665015, "alpha": 16.755160819145555, "radius": 32.711140818042416}
948	27	\N	2026-09-21 21:07:54.876	camara_posicion	-12.73833	16.04048	-22.063435	{"beta": 1.008885445665015, "alpha": 16.755160819145555, "radius": 30.105767312968222}
949	27	\N	2026-09-21 21:08:04.845	camara_posicion	-13.183931	16.601593	-22.835238	{"beta": 1.008885445665015, "alpha": 16.755160819145555, "radius": 31.15890015241084}
950	27	\N	2026-09-21 21:08:14.843	camara_posicion	26.367863	16.601593	-3.004072e-13	{"beta": 1.008885445665015, "alpha": 18.849555921538748, "radius": 31.15890015241084}
951	27	\N	2026-09-21 21:08:24.822	camara_posicion	26.367863	16.601593	-3.004072e-13	{"beta": 1.008885445665015, "alpha": 18.849555921538748, "radius": 31.15890015241084}
952	27	\N	2026-09-21 21:08:34.854	camara_posicion	22.835238	16.601593	13.183931	{"beta": 1.008885445665015, "alpha": 19.373154697137046, "radius": 31.15890015241084}
953	27	\N	2026-09-21 21:08:44.808	camara_posicion	14.47082	9.111041	-1.6486503e-13	{"beta": 1.008885445665015, "alpha": 18.849555921538748, "radius": 17.100166757809845}
954	27	\N	2026-09-21 21:08:54.802	camara_posicion	25.197472	18.318977	14.547768	{"beta": 1.008885445665015, "alpha": 19.373154697137046, "radius": 34.38219065766309}
955	27	\N	2026-09-21 21:09:04.833	camara_posicion	15.9958105	11.629218	9.235186	{"beta": 1.008885445665015, "alpha": 19.373154697137046, "radius": 21.82643634752269}
956	27	\N	2026-09-21 21:09:14.839	camara_posicion	35.469524	25.786926	20.478338	{"beta": 1.008885445665015, "alpha": 19.373154697137046, "radius": 48.39850266961798}
957	27	\N	2026-09-21 21:09:24.845	camara_posicion	49.45302	1.8955768	-5.6341477e-13	{"beta": 1.5324842212633136, "alpha": 18.849555921538748, "radius": 49.48933626991338}
958	27	\N	2026-09-21 21:09:34.844	camara_posicion	17.322977	32.84917	-1.9735946e-13	{"beta": 0.4852866700667161, "alpha": 18.849555921538748, "radius": 37.136958282626516}
959	27	\N	2026-09-21 21:09:43.794	pared_construida	0	0	0	{"alto": 4, "modo": "simple", "ancho": 4, "material": "block"}
960	27	\N	2026-09-21 21:09:44.816	camara_posicion	17.322977	32.84917	-1.9735946e-13	{"beta": 0.4852866700667161, "alpha": 18.849555921538748, "radius": 37.136958282626516}
961	27	\N	2026-09-21 21:09:54.827	camara_posicion	17.322977	32.84917	-1.9735946e-13	{"beta": 0.4852866700667161, "alpha": 18.849555921538748, "radius": 37.136958282626516}
962	27	\N	2026-09-21 21:10:05.271	camara_posicion	17.322977	32.84917	-1.9735946e-13	{"beta": 0.4852866700667161, "alpha": 18.849555921538748, "radius": 37.136958282626516}
963	27	\N	2026-09-21 21:10:15.28	camara_posicion	17.322977	32.84917	-1.9735946e-13	{"beta": 0.4852866700667161, "alpha": 18.849555921538748, "radius": 37.136958282626516}
964	27	\N	2026-09-21 21:10:25.277	camara_posicion	17.322977	32.84917	-1.9735946e-13	{"beta": 0.4852866700667161, "alpha": 18.849555921538748, "radius": 37.136958282626516}
965	27	\N	2026-09-21 21:10:35.281	camara_posicion	17.322977	32.84917	-1.9735946e-13	{"beta": 0.4852866700667161, "alpha": 18.849555921538748, "radius": 37.136958282626516}
966	27	\N	2026-09-21 21:10:45.276	camara_posicion	17.322977	32.84917	-1.9735946e-13	{"beta": 0.4852866700667161, "alpha": 18.849555921538748, "radius": 37.136958282626516}
967	27	\N	2026-09-21 21:10:55.279	camara_posicion	17.322977	32.84917	-1.9735946e-13	{"beta": 0.4852866700667161, "alpha": 18.849555921538748, "radius": 37.136958282626516}
968	27	\N	2026-09-21 21:11:08.283	camara_posicion	17.322977	32.84917	-1.9735946e-13	{"beta": 0.4852866700667161, "alpha": 18.849555921538748, "radius": 37.136958282626516}
969	27	\N	2026-09-21 21:11:25.194	camara_posicion	17.322977	32.84917	-1.9735946e-13	{"beta": 0.4852866700667161, "alpha": 18.849555921538748, "radius": 37.136958282626516}
970	27	\N	2026-09-21 21:11:34.841	camara_posicion	17.322977	32.84917	-1.9735946e-13	{"beta": 0.4852866700667161, "alpha": 18.849555921538748, "radius": 37.136958282626516}
971	27	\N	2026-09-21 21:11:44.829	camara_posicion	17.322977	32.84917	-1.9735946e-13	{"beta": 0.4852866700667161, "alpha": 18.849555921538748, "radius": 37.136958282626516}
972	27	\N	2026-09-21 21:11:54.825	camara_posicion	17.322977	32.84917	-1.9735946e-13	{"beta": 0.4852866700667161, "alpha": 18.849555921538748, "radius": 37.136958282626516}
973	27	\N	2026-09-21 21:12:04.864	camara_posicion	17.322977	32.84917	-1.9735946e-13	{"beta": 0.4852866700667161, "alpha": 18.849555921538748, "radius": 37.136958282626516}
974	27	\N	2026-09-21 21:12:14.838	camara_posicion	17.322977	32.84917	-1.9735946e-13	{"beta": 0.4852866700667161, "alpha": 18.849555921538748, "radius": 37.136958282626516}
975	27	\N	2026-09-21 21:12:24.833	camara_posicion	-12.263269	15.44227	-21.240606	{"beta": 1.008885445665015, "alpha": 16.755160819145555, "radius": 28.983009860424655}
976	27	\N	2026-09-21 21:12:35.275	camara_posicion	-27.449123	17.282372	2.1184549e-13	{"beta": 1.008885445665015, "alpha": 15.707963267948958, "radius": 32.43662677958365}
977	27	\N	2026-09-21 21:12:44.944	camara_posicion	-27.444096	17.279207	2.1180669e-13	{"beta": 1.008885445665015, "alpha": 15.707963267948958, "radius": 32.43068577031192}
978	27	\N	2026-09-21 21:12:54.851	camara_posicion	-23.741762	17.26065	-13.707313	{"beta": 1.008885445665015, "alpha": 16.231562043547257, "radius": 32.39586020347572}
979	27	\N	2026-09-21 21:13:04.869	camara_posicion	-23.741762	17.26065	-13.707313	{"beta": 1.008885445665015, "alpha": 16.231562043547257, "radius": 32.39586020347572}
980	27	\N	2026-09-21 21:13:14.855	camara_posicion	-17.354025	12.616662	-10.019351	{"beta": 1.008885445665015, "alpha": 16.231562043547257, "radius": 23.67973353032136}
981	27	\N	2026-09-21 21:13:24.839	camara_posicion	-17.354025	12.616662	-10.019351	{"beta": 1.008885445665015, "alpha": 16.231562043547257, "radius": 23.67973353032136}
982	27	\N	2026-09-21 21:13:34.865	camara_posicion	-10.019351	12.616662	-17.354025	{"beta": 1.008885445665015, "alpha": 16.755160819145555, "radius": 23.67973353032136}
983	27	\N	2026-09-21 21:13:44.823	camara_posicion	-5.449704	20.668303	-9.439164	{"beta": 0.4852866700667161, "alpha": 16.755160819145555, "radius": 23.366125078617245}
984	27	\N	2026-09-21 21:13:54.8	camara_posicion	-13.104205	16.5012	-22.697147	{"beta": 1.008885445665015, "alpha": 16.755160819145555, "radius": 30.970475125299885}
985	27	\N	2026-09-21 21:14:04.836	camara_posicion	-2.5043026e-13	16.5012	-26.20841	{"beta": 1.008885445665015, "alpha": 17.278759594743853, "radius": 30.970475125299885}
986	27	\N	2026-09-21 21:14:14.804	camara_posicion	-2.5043026e-13	16.5012	-26.20841	{"beta": 1.008885445665015, "alpha": 17.278759594743853, "radius": 30.970475125299885}
987	27	\N	2026-09-21 21:14:24.878	camara_posicion	-2.5043026e-13	16.5012	-26.20841	{"beta": 1.008885445665015, "alpha": 17.278759594743853, "radius": 30.970475125299885}
988	27	\N	2026-09-21 21:14:34.827	camara_posicion	-2.5043026e-13	16.5012	-26.20841	{"beta": 1.008885445665015, "alpha": 17.278759594743853, "radius": 30.970475125299885}
989	27	\N	2026-09-21 21:14:44.843	camara_posicion	-2.5043026e-13	16.5012	-26.20841	{"beta": 1.008885445665015, "alpha": 17.278759594743853, "radius": 30.970475125299885}
990	27	\N	2026-09-21 21:14:54.815	camara_posicion	13.104205	16.5012	-22.697147	{"beta": 1.008885445665015, "alpha": 17.80235837034215, "radius": 30.970475125299885}
991	27	\N	2026-09-21 21:15:04.839	camara_posicion	-2.5043026e-13	16.5012	-26.20841	{"beta": 1.008885445665015, "alpha": 17.278759594743853, "radius": 30.970475125299885}
992	27	\N	2026-09-21 21:15:14.857	camara_posicion	22.697147	16.5012	-13.104205	{"beta": 1.008885445665015, "alpha": 18.32595714594045, "radius": 30.970475125299885}
993	27	\N	2026-09-21 21:15:24.818	camara_posicion	12.858167	16.191381	-22.270998	{"beta": 1.008885445665015, "alpha": 17.80235837034215, "radius": 30.388989340576174}
994	27	\N	2026-09-21 21:15:34.858	camara_posicion	22.270998	16.191381	-12.858167	{"beta": 1.008885445665015, "alpha": 18.32595714594045, "radius": 30.388989340576174}
995	27	\N	2026-09-21 21:15:44.828	camara_posicion	22.270998	16.191381	-12.858167	{"beta": 1.008885445665015, "alpha": 18.32595714594045, "radius": 30.388989340576174}
996	27	\N	2026-09-21 21:15:54.831	camara_posicion	22.270998	16.191381	-12.858167	{"beta": 1.008885445665015, "alpha": 18.32595714594045, "radius": 30.388989340576174}
997	27	\N	2026-09-21 21:16:04.836	camara_posicion	-2.7530574e-13	9.663109	-28.811716	{"beta": 1.2471975511965976, "alpha": 17.278759594743853, "radius": 30.388989340576174}
998	27	\N	2026-09-21 21:16:14.829	camara_posicion	-2.7530574e-13	9.663109	-28.811716	{"beta": 1.2471975511965976, "alpha": 17.278759594743853, "radius": 30.388989340576174}
999	27	\N	2026-09-21 21:16:24.812	camara_posicion	-28.811716	9.663109	2.2236164e-13	{"beta": 1.2471975511965976, "alpha": 15.707963267948958, "radius": 30.388989340576174}
1000	27	\N	2026-09-21 21:16:34.823	camara_posicion	-12.249046	27.729864	-21.215971	{"beta": 0.7235987755982988, "alpha": 16.755160819145555, "radius": 37.00137805253624}
1001	27	\N	2026-09-21 21:16:44.843	camara_posicion	-17.918814	12.019516	-31.036295	{"beta": 1.2471975511965976, "alpha": 16.755160819145555, "radius": 37.79952694720826}
1002	27	\N	2026-09-21 21:16:54.804	camara_posicion	-3.424407e-13	12.019516	-35.837627	{"beta": 1.2471975511965976, "alpha": 17.278759594743853, "radius": 37.79952694720826}
1003	27	\N	2026-09-21 21:17:04.838	camara_posicion	-25.026537	28.32802	1.9314857e-13	{"beta": 0.7235987755982988, "alpha": 15.707963267948958, "radius": 37.79952694720826}
1004	27	\N	2026-09-21 21:17:14.809	camara_posicion	21.673616	28.32802	-12.513268	{"beta": 0.7235987755982988, "alpha": 18.32595714594045, "radius": 37.79952694720826}
1005	27	\N	2026-09-21 21:17:24.848	camara_posicion	-3.4093792e-13	1.3676587	-35.680355	{"beta": 1.5324842212633136, "alpha": 17.278759594743853, "radius": 35.70655809426063}
1006	27	\N	2026-09-21 21:17:34.861	camara_posicion	-3.4155513e-13	1.3701347	-35.74495	{"beta": 1.5324842212633136, "alpha": 17.278759594743853, "radius": 35.77119853038508}
1007	27	\N	2026-09-21 21:17:44.804	camara_posicion	-3.4155513e-13	1.3701347	-35.74495	{"beta": 1.5324842212633136, "alpha": 17.278759594743853, "radius": 35.77119853038508}
1008	27	\N	2026-09-21 21:17:54.849	camara_posicion	-3.4155513e-13	1.3701347	-35.74495	{"beta": 1.5324842212633136, "alpha": 17.278759594743853, "radius": 35.77119853038508}
1009	27	\N	2026-09-21 21:18:04.856	camara_posicion	-3.4155513e-13	1.3701347	-35.74495	{"beta": 1.5324842212633136, "alpha": 17.278759594743853, "radius": 35.77119853038508}
1010	27	\N	2026-09-21 21:18:14.791	camara_posicion	-3.4155513e-13	1.3701347	-35.74495	{"beta": 1.5324842212633136, "alpha": 17.278759594743853, "radius": 35.77119853038508}
1011	27	\N	2026-09-21 21:18:24.823	camara_posicion	-1.5943948e-13	31.641102	-16.685904	{"beta": 0.4852866700667161, "alpha": 17.278759594743853, "radius": 35.77119853038508}
1012	27	\N	2026-09-21 21:18:34.845	camara_posicion	-2.8924936e-13	19.059046	-30.270966	{"beta": 1.008885445665015, "alpha": 17.278759594743853, "radius": 35.77119853038508}
1013	27	\N	2026-09-21 21:18:44.876	camara_posicion	-8.342952	31.641102	-14.450416	{"beta": 0.4852866700667161, "alpha": 16.755160819145555, "radius": 35.77119853038508}
1014	27	\N	2026-09-21 21:18:54.796	camara_posicion	-1.5943948e-13	31.641102	-16.685904	{"beta": 0.4852866700667161, "alpha": 17.278759594743853, "radius": 35.77119853038508}
1015	27	\N	2026-09-21 21:19:04.837	camara_posicion	-1.5943948e-13	31.641102	-16.685904	{"beta": 0.4852866700667161, "alpha": 17.278759594743853, "radius": 35.77119853038508}
1016	27	\N	2026-09-21 21:19:14.843	camara_posicion	-3.9687427e-13	1.5920452	-41.53429	{"beta": 1.5324842212633136, "alpha": 17.278759594743853, "radius": 41.56479167236595}
1017	27	\N	2026-09-21 21:19:24.822	camara_posicion	-3.9687427e-13	1.5920452	-41.53429	{"beta": 1.5324842212633136, "alpha": 17.278759594743853, "radius": 41.56479167236595}
1018	27	\N	2026-09-21 21:19:35.131	camara_posicion	-4.1911803e-13	1.6812751	-43.86218	{"beta": 1.5324842212633136, "alpha": 17.278759594743853, "radius": 43.89438877058968}
1019	27	\N	2026-09-21 21:19:45.272	camara_posicion	-4.1911803e-13	1.6812751	-43.86218	{"beta": 1.5324842212633136, "alpha": 17.278759594743853, "radius": 43.89438877058968}
1020	27	\N	2026-09-21 21:19:55.146	camara_posicion	-4.1911803e-13	1.6812751	-43.86218	{"beta": 1.5324842212633136, "alpha": 17.278759594743853, "radius": 43.89438877058968}
1021	27	\N	2026-09-21 21:20:04.862	camara_posicion	-4.1911803e-13	1.6812751	-43.86218	{"beta": 1.5324842212633136, "alpha": 17.278759594743853, "radius": 43.89438877058968}
1022	27	\N	2026-09-21 21:20:14.802	camara_posicion	-4.1911803e-13	1.6812751	-43.86218	{"beta": 1.5324842212633136, "alpha": 17.278759594743853, "radius": 43.89438877058968}
1023	27	\N	2026-09-21 21:20:24.794	camara_posicion	-4.1911803e-13	1.6812751	-43.86218	{"beta": 1.5324842212633136, "alpha": 17.278759594743853, "radius": 43.89438877058968}
1024	27	\N	2026-09-21 21:20:34.817	camara_posicion	-4.1911803e-13	1.6812751	-43.86218	{"beta": 1.5324842212633136, "alpha": 17.278759594743853, "radius": 43.89438877058968}
1025	27	\N	2026-09-21 21:20:44.794	camara_posicion	-4.1911803e-13	1.6812751	-43.86218	{"beta": 1.5324842212633136, "alpha": 17.278759594743853, "radius": 43.89438877058968}
1026	27	\N	2026-09-21 21:20:54.793	camara_posicion	-4.1911803e-13	1.6812751	-43.86218	{"beta": 1.5324842212633136, "alpha": 17.278759594743853, "radius": 43.89438877058968}
1027	27	\N	2026-09-21 21:21:04.826	camara_posicion	-4.1911803e-13	1.6812751	-43.86218	{"beta": 1.5324842212633136, "alpha": 17.278759594743853, "radius": 43.89438877058968}
1028	27	\N	2026-09-21 21:21:14.803	camara_posicion	-4.1911803e-13	1.6812751	-43.86218	{"beta": 1.5324842212633136, "alpha": 17.278759594743853, "radius": 43.89438877058968}
1029	27	\N	2026-09-21 21:21:24.819	camara_posicion	-4.1911803e-13	1.6812751	-43.86218	{"beta": 1.5324842212633136, "alpha": 17.278759594743853, "radius": 43.89438877058968}
1030	27	\N	2026-09-21 21:21:34.794	camara_posicion	-4.1911803e-13	1.6812751	-43.86218	{"beta": 1.5324842212633136, "alpha": 17.278759594743853, "radius": 43.89438877058968}
1031	27	\N	2026-09-21 21:21:44.815	camara_posicion	-4.1911803e-13	1.6812751	-43.86218	{"beta": 1.5324842212633136, "alpha": 17.278759594743853, "radius": 43.89438877058968}
1032	27	\N	2026-09-21 21:21:54.813	camara_posicion	-4.1911803e-13	1.6812751	-43.86218	{"beta": 1.5324842212633136, "alpha": 17.278759594743853, "radius": 43.89438877058968}
1033	27	\N	2026-09-21 21:22:04.812	camara_posicion	-4.1911803e-13	1.6812751	-43.86218	{"beta": 1.5324842212633136, "alpha": 17.278759594743853, "radius": 43.89438877058968}
1034	27	\N	2026-09-21 21:22:14.791	camara_posicion	-4.1911803e-13	1.6812751	-43.86218	{"beta": 1.5324842212633136, "alpha": 17.278759594743853, "radius": 43.89438877058968}
1035	27	\N	2026-09-21 21:22:24.796	camara_posicion	-4.1911803e-13	1.6812751	-43.86218	{"beta": 1.5324842212633136, "alpha": 17.278759594743853, "radius": 43.89438877058968}
1036	27	\N	2026-09-21 21:22:34.808	camara_posicion	-4.1911803e-13	1.6812751	-43.86218	{"beta": 1.5324842212633136, "alpha": 17.278759594743853, "radius": 43.89438877058968}
1037	27	\N	2026-09-21 21:22:44.828	camara_posicion	-4.1911803e-13	1.6812751	-43.86218	{"beta": 1.5324842212633136, "alpha": 17.278759594743853, "radius": 43.89438877058968}
1038	27	\N	2026-09-21 21:22:54.801	camara_posicion	-4.1911803e-13	1.6812751	-43.86218	{"beta": 1.5324842212633136, "alpha": 17.278759594743853, "radius": 43.89438877058968}
1039	27	\N	2026-09-21 21:23:04.791	camara_posicion	-4.1911803e-13	1.6812751	-43.86218	{"beta": 1.5324842212633136, "alpha": 17.278759594743853, "radius": 43.89438877058968}
1040	27	\N	2026-09-21 21:23:14.819	camara_posicion	-4.1911803e-13	1.6812751	-43.86218	{"beta": 1.5324842212633136, "alpha": 17.278759594743853, "radius": 43.89438877058968}
1041	27	\N	2026-09-21 21:23:24.807	camara_posicion	-4.1911803e-13	1.6812751	-43.86218	{"beta": 1.5324842212633136, "alpha": 17.278759594743853, "radius": 43.89438877058968}
1042	27	\N	2026-09-21 21:23:34.821	camara_posicion	-4.1911803e-13	1.6812751	-43.86218	{"beta": 1.5324842212633136, "alpha": 17.278759594743853, "radius": 43.89438877058968}
1043	27	\N	2026-09-21 21:23:44.798	camara_posicion	-4.1911803e-13	1.6812751	-43.86218	{"beta": 1.5324842212633136, "alpha": 17.278759594743853, "radius": 43.89438877058968}
1044	27	\N	2026-09-21 21:23:54.819	camara_posicion	-4.1911803e-13	1.6812751	-43.86218	{"beta": 1.5324842212633136, "alpha": 17.278759594743853, "radius": 43.89438877058968}
1045	27	\N	2026-09-21 21:24:04.818	camara_posicion	-4.1911803e-13	1.6812751	-43.86218	{"beta": 1.5324842212633136, "alpha": 17.278759594743853, "radius": 43.89438877058968}
1046	27	\N	2026-09-21 21:24:14.816	camara_posicion	-4.1911803e-13	1.6812751	-43.86218	{"beta": 1.5324842212633136, "alpha": 17.278759594743853, "radius": 43.89438877058968}
1047	27	\N	2026-09-21 21:24:24.797	camara_posicion	-4.1911803e-13	1.6812751	-43.86218	{"beta": 1.5324842212633136, "alpha": 17.278759594743853, "radius": 43.89438877058968}
1048	27	\N	2026-09-21 21:24:34.807	camara_posicion	-4.1911803e-13	1.6812751	-43.86218	{"beta": 1.5324842212633136, "alpha": 17.278759594743853, "radius": 43.89438877058968}
1049	27	\N	2026-09-21 21:24:44.855	camara_posicion	-4.1911803e-13	1.6812751	-43.86218	{"beta": 1.5324842212633136, "alpha": 17.278759594743853, "radius": 43.89438877058968}
1050	27	\N	2026-09-21 21:24:54.858	camara_posicion	-4.1911803e-13	1.6812751	-43.86218	{"beta": 1.5324842212633136, "alpha": 17.278759594743853, "radius": 43.89438877058968}
1051	27	\N	2026-09-21 21:25:05.284	camara_posicion	-4.1911803e-13	1.6812751	-43.86218	{"beta": 1.5324842212633136, "alpha": 17.278759594743853, "radius": 43.89438877058968}
1052	27	\N	2026-09-21 21:25:15.274	camara_posicion	-4.1911803e-13	1.6812751	-43.86218	{"beta": 1.5324842212633136, "alpha": 17.278759594743853, "radius": 43.89438877058968}
1053	27	\N	2026-09-21 21:25:25.275	camara_posicion	-4.1911803e-13	1.6812751	-43.86218	{"beta": 1.5324842212633136, "alpha": 17.278759594743853, "radius": 43.89438877058968}
1054	27	\N	2026-09-21 21:25:35.282	camara_posicion	-4.1911803e-13	1.6812751	-43.86218	{"beta": 1.5324842212633136, "alpha": 17.278759594743853, "radius": 43.89438877058968}
1055	27	\N	2026-09-21 21:25:45.275	camara_posicion	-4.1911803e-13	1.6812751	-43.86218	{"beta": 1.5324842212633136, "alpha": 17.278759594743853, "radius": 43.89438877058968}
1056	27	\N	2026-09-21 21:25:55.285	camara_posicion	-4.1911803e-13	1.6812751	-43.86218	{"beta": 1.5324842212633136, "alpha": 17.278759594743853, "radius": 43.89438877058968}
1057	27	\N	2026-09-21 21:26:08.271	camara_posicion	-4.1911803e-13	1.6812751	-43.86218	{"beta": 1.5324842212633136, "alpha": 17.278759594743853, "radius": 43.89438877058968}
1058	27	\N	2026-09-21 21:27:08.27	camara_posicion	-4.1911803e-13	1.6812751	-43.86218	{"beta": 1.5324842212633136, "alpha": 17.278759594743853, "radius": 43.89438877058968}
1059	27	\N	2026-09-21 21:28:08.273	camara_posicion	-4.1911803e-13	1.6812751	-43.86218	{"beta": 1.5324842212633136, "alpha": 17.278759594743853, "radius": 43.89438877058968}
1060	27	\N	2026-09-21 21:28:33.064	camara_posicion	-4.1911803e-13	1.6812751	-43.86218	{"beta": 1.5324842212633136, "alpha": 17.278759594743853, "radius": 43.89438877058968}
1061	27	\N	2026-09-21 21:28:34.797	camara_posicion	-4.1911803e-13	1.6812751	-43.86218	{"beta": 1.5324842212633136, "alpha": 17.278759594743853, "radius": 43.89438877058968}
1062	27	\N	2026-09-21 21:28:44.8	camara_posicion	-4.1911803e-13	1.6812751	-43.86218	{"beta": 1.5324842212633136, "alpha": 17.278759594743853, "radius": 43.89438877058968}
1063	27	\N	2026-09-21 21:28:54.82	camara_posicion	-4.1911803e-13	1.6812751	-43.86218	{"beta": 1.5324842212633136, "alpha": 17.278759594743853, "radius": 43.89438877058968}
1064	27	\N	2026-09-21 21:29:04.838	camara_posicion	-4.1911803e-13	1.6812751	-43.86218	{"beta": 1.5324842212633136, "alpha": 17.278759594743853, "radius": 43.89438877058968}
1065	27	\N	2026-09-21 21:29:14.808	camara_posicion	-4.1911803e-13	1.6812751	-43.86218	{"beta": 1.5324842212633136, "alpha": 17.278759594743853, "radius": 43.89438877058968}
1066	27	\N	2026-09-21 21:29:24.818	camara_posicion	-4.1911803e-13	1.6812751	-43.86218	{"beta": 1.5324842212633136, "alpha": 17.278759594743853, "radius": 43.89438877058968}
1067	27	\N	2026-09-21 21:29:34.813	camara_posicion	-4.1911803e-13	1.6812751	-43.86218	{"beta": 1.5324842212633136, "alpha": 17.278759594743853, "radius": 43.89438877058968}
1068	27	\N	2026-09-21 21:29:44.831	camara_posicion	-4.1911803e-13	1.6812751	-43.86218	{"beta": 1.5324842212633136, "alpha": 17.278759594743853, "radius": 43.89438877058968}
1069	27	\N	2026-09-21 21:29:54.807	camara_posicion	-4.1911803e-13	1.6812751	-43.86218	{"beta": 1.5324842212633136, "alpha": 17.278759594743853, "radius": 43.89438877058968}
1070	27	\N	2026-09-21 21:30:04.833	camara_posicion	-4.1911803e-13	1.6812751	-43.86218	{"beta": 1.5324842212633136, "alpha": 17.278759594743853, "radius": 43.89438877058968}
1071	27	\N	2026-09-21 21:30:14.805	camara_posicion	-4.1911803e-13	1.6812751	-43.86218	{"beta": 1.5324842212633136, "alpha": 17.278759594743853, "radius": 43.89438877058968}
1072	27	\N	2026-09-21 21:30:24.807	camara_posicion	-4.1911803e-13	1.6812751	-43.86218	{"beta": 1.5324842212633136, "alpha": 17.278759594743853, "radius": 43.89438877058968}
1073	27	\N	2026-09-21 21:30:34.798	camara_posicion	-4.1911803e-13	1.6812751	-43.86218	{"beta": 1.5324842212633136, "alpha": 17.278759594743853, "radius": 43.89438877058968}
1074	27	\N	2026-09-21 21:30:44.793	camara_posicion	-4.1911803e-13	1.6812751	-43.86218	{"beta": 1.5324842212633136, "alpha": 17.278759594743853, "radius": 43.89438877058968}
1075	27	\N	2026-09-21 21:30:54.823	camara_posicion	-4.1911803e-13	1.6812751	-43.86218	{"beta": 1.5324842212633136, "alpha": 17.278759594743853, "radius": 43.89438877058968}
1076	27	\N	2026-09-21 21:31:04.821	camara_posicion	-4.1911803e-13	1.6812751	-43.86218	{"beta": 1.5324842212633136, "alpha": 17.278759594743853, "radius": 43.89438877058968}
1077	27	\N	2026-09-21 21:31:14.83	camara_posicion	-4.1911803e-13	1.6812751	-43.86218	{"beta": 1.5324842212633136, "alpha": 17.278759594743853, "radius": 43.89438877058968}
1078	27	\N	2026-09-21 21:31:24.813	camara_posicion	-4.1911803e-13	1.6812751	-43.86218	{"beta": 1.5324842212633136, "alpha": 17.278759594743853, "radius": 43.89438877058968}
1079	27	\N	2026-09-21 21:31:34.825	camara_posicion	-4.1911803e-13	1.6812751	-43.86218	{"beta": 1.5324842212633136, "alpha": 17.278759594743853, "radius": 43.89438877058968}
1080	27	\N	2026-09-21 21:31:44.797	camara_posicion	-4.1911803e-13	1.6812751	-43.86218	{"beta": 1.5324842212633136, "alpha": 17.278759594743853, "radius": 43.89438877058968}
1081	27	\N	2026-09-21 21:31:54.806	camara_posicion	-4.1911803e-13	1.6812751	-43.86218	{"beta": 1.5324842212633136, "alpha": 17.278759594743853, "radius": 43.89438877058968}
1082	27	\N	2026-09-21 21:32:04.807	camara_posicion	-4.1911803e-13	1.6812751	-43.86218	{"beta": 1.5324842212633136, "alpha": 17.278759594743853, "radius": 43.89438877058968}
1083	27	\N	2026-09-21 21:32:14.81	camara_posicion	-4.1911803e-13	1.6812751	-43.86218	{"beta": 1.5324842212633136, "alpha": 17.278759594743853, "radius": 43.89438877058968}
1084	27	\N	2026-09-21 21:32:24.794	camara_posicion	-4.1911803e-13	1.6812751	-43.86218	{"beta": 1.5324842212633136, "alpha": 17.278759594743853, "radius": 43.89438877058968}
1085	27	\N	2026-09-21 21:32:34.799	camara_posicion	-4.1911803e-13	1.6812751	-43.86218	{"beta": 1.5324842212633136, "alpha": 17.278759594743853, "radius": 43.89438877058968}
1086	27	\N	2026-09-21 21:32:44.798	camara_posicion	-4.1911803e-13	1.6812751	-43.86218	{"beta": 1.5324842212633136, "alpha": 17.278759594743853, "radius": 43.89438877058968}
1087	27	\N	2026-09-21 21:32:54.814	camara_posicion	-4.1911803e-13	1.6812751	-43.86218	{"beta": 1.5324842212633136, "alpha": 17.278759594743853, "radius": 43.89438877058968}
1088	27	\N	2026-09-21 21:33:04.79	camara_posicion	-4.1911803e-13	1.6812751	-43.86218	{"beta": 1.5324842212633136, "alpha": 17.278759594743853, "radius": 43.89438877058968}
1089	27	\N	2026-09-21 21:33:14.793	camara_posicion	-4.1911803e-13	1.6812751	-43.86218	{"beta": 1.5324842212633136, "alpha": 17.278759594743853, "radius": 43.89438877058968}
1090	27	\N	2026-09-21 21:33:24.847	camara_posicion	-4.1911803e-13	1.6812751	-43.86218	{"beta": 1.5324842212633136, "alpha": 17.278759594743853, "radius": 43.89438877058968}
1091	27	\N	2026-09-21 21:33:35.27	camara_posicion	-4.1911803e-13	1.6812751	-43.86218	{"beta": 1.5324842212633136, "alpha": 17.278759594743853, "radius": 43.89438877058968}
1092	27	\N	2026-09-21 21:33:45.285	camara_posicion	-4.1911803e-13	1.6812751	-43.86218	{"beta": 1.5324842212633136, "alpha": 17.278759594743853, "radius": 43.89438877058968}
1093	27	\N	2026-09-21 21:33:55.274	camara_posicion	-4.1911803e-13	1.6812751	-43.86218	{"beta": 1.5324842212633136, "alpha": 17.278759594743853, "radius": 43.89438877058968}
1094	27	\N	2026-09-21 21:34:05.284	camara_posicion	-4.1911803e-13	1.6812751	-43.86218	{"beta": 1.5324842212633136, "alpha": 17.278759594743853, "radius": 43.89438877058968}
1095	27	\N	2026-09-21 21:34:15.285	camara_posicion	-4.1911803e-13	1.6812751	-43.86218	{"beta": 1.5324842212633136, "alpha": 17.278759594743853, "radius": 43.89438877058968}
1096	27	\N	2026-09-21 21:34:25.27	camara_posicion	-4.1911803e-13	1.6812751	-43.86218	{"beta": 1.5324842212633136, "alpha": 17.278759594743853, "radius": 43.89438877058968}
1097	27	\N	2026-09-21 21:35:08.271	camara_posicion	-4.1911803e-13	1.6812751	-43.86218	{"beta": 1.5324842212633136, "alpha": 17.278759594743853, "radius": 43.89438877058968}
1098	27	\N	2026-09-21 21:36:08.28	camara_posicion	-4.1911803e-13	1.6812751	-43.86218	{"beta": 1.5324842212633136, "alpha": 17.278759594743853, "radius": 43.89438877058968}
1099	27	\N	2026-09-21 21:37:08.28	camara_posicion	-4.1911803e-13	1.6812751	-43.86218	{"beta": 1.5324842212633136, "alpha": 17.278759594743853, "radius": 43.89438877058968}
1100	27	\N	2026-09-21 21:38:08.285	camara_posicion	-4.1911803e-13	1.6812751	-43.86218	{"beta": 1.5324842212633136, "alpha": 17.278759594743853, "radius": 43.89438877058968}
1101	27	\N	2026-09-21 21:38:16.887	camara_posicion	-4.1911803e-13	1.6812751	-43.86218	{"beta": 1.5324842212633136, "alpha": 17.278759594743853, "radius": 43.89438877058968}
1102	27	\N	2026-09-21 21:38:24.864	camara_posicion	-4.1911803e-13	1.6812751	-43.86218	{"beta": 1.5324842212633136, "alpha": 17.278759594743853, "radius": 43.89438877058968}
1103	28	\N	2026-09-21 21:38:44.595	camara_posicion	1.49422e-15	17.450493	-24.402466	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 30}
1104	28	\N	2026-09-21 21:38:46.393	modal_abierto	\N	\N	\N	{"modal": "confirm_reset"}
1105	28	\N	2026-09-21 21:38:54.766	camara_posicion	-24.402466	34.900986	-42.266308	{"beta": 0.95, "alpha": -20.94395102393194, "radius": 60}
1106	28	\N	2026-09-21 21:39:04.635	camara_posicion	48.80493	34.900986	-2.7505732e-13	{"beta": 0.95, "alpha": -37.699111843077524, "radius": 60}
1107	29	\N	2026-09-22 14:04:16.09	camara_posicion	2.1583962e-15	25.207182	-35.249283	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 43.334905578173455}
1108	29	\N	2026-09-22 14:04:26.1	camara_posicion	2.1583962e-15	25.207182	-35.249283	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 43.334905578173455}
1109	29	\N	2026-09-22 14:04:36.276	camara_posicion	2.1583962e-15	25.207182	-35.249283	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 43.334905578173455}
1110	29	\N	2026-09-22 14:04:46.276	camara_posicion	2.1583962e-15	25.207182	-35.249283	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 43.334905578173455}
1111	29	\N	2026-09-22 14:04:56.273	camara_posicion	2.1583962e-15	25.207182	-35.249283	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 43.334905578173455}
1112	29	\N	2026-09-22 14:05:06.273	camara_posicion	2.1583962e-15	25.207182	-35.249283	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 43.334905578173455}
1113	29	\N	2026-09-22 14:05:16.276	camara_posicion	2.1583962e-15	25.207182	-35.249283	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 43.334905578173455}
1114	29	\N	2026-09-22 14:05:26.276	camara_posicion	2.1583962e-15	25.207182	-35.249283	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 43.334905578173455}
1115	29	\N	2026-09-22 14:06:04.278	camara_posicion	2.1583962e-15	25.207182	-35.249283	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 43.334905578173455}
1116	29	\N	2026-09-22 14:06:36.271	inactividad	\N	\N	\N	{"duracion_ms": 31993}
1117	29	\N	2026-09-22 14:07:04.274	camara_posicion	2.1583962e-15	25.207182	-35.249283	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 43.334905578173455}
1118	29	\N	2026-09-22 14:08:04.28	camara_posicion	2.1583962e-15	25.207182	-35.249283	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 43.334905578173455}
1119	29	\N	2026-09-22 14:09:04.28	camara_posicion	2.1583962e-15	25.207182	-35.249283	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 43.334905578173455}
1120	29	\N	2026-09-22 14:10:04.283	camara_posicion	2.1583962e-15	25.207182	-35.249283	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 43.334905578173455}
1121	29	\N	2026-09-22 14:11:04.268	camara_posicion	2.1583962e-15	25.207182	-35.249283	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 43.334905578173455}
1122	29	\N	2026-09-22 14:12:04.281	camara_posicion	2.1583962e-15	25.207182	-35.249283	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 43.334905578173455}
1123	29	\N	2026-09-22 14:13:04.273	camara_posicion	2.1583962e-15	25.207182	-35.249283	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 43.334905578173455}
1124	29	\N	2026-09-22 14:14:04.277	camara_posicion	2.1583962e-15	25.207182	-35.249283	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 43.334905578173455}
1125	29	\N	2026-09-22 14:15:04.269	camara_posicion	2.1583962e-15	25.207182	-35.249283	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 43.334905578173455}
1126	29	\N	2026-09-22 14:16:04.279	camara_posicion	2.1583962e-15	25.207182	-35.249283	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 43.334905578173455}
1127	29	\N	2026-09-22 14:17:04.271	camara_posicion	2.1583962e-15	25.207182	-35.249283	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 43.334905578173455}
1128	29	\N	2026-09-22 14:18:04.271	camara_posicion	2.1583962e-15	25.207182	-35.249283	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 43.334905578173455}
1129	29	\N	2026-09-22 14:18:24.179	camara_posicion	2.1583962e-15	25.207182	-35.249283	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 43.334905578173455}
1130	29	\N	2026-09-22 14:18:26.091	camara_posicion	2.1583962e-15	25.207182	-35.249283	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 43.334905578173455}
1131	29	\N	2026-09-22 14:18:36.125	camara_posicion	2.1583962e-15	25.207182	-35.249283	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 43.334905578173455}
1132	29	\N	2026-09-22 14:18:46.274	camara_posicion	2.1583962e-15	25.207182	-35.249283	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 43.334905578173455}
1133	29	\N	2026-09-22 14:18:53.782	cambio_noche	\N	\N	\N	{"es_noche": true}
1134	29	\N	2026-09-22 14:18:54.527	cambio_noche	\N	\N	\N	{"es_noche": false}
1135	29	\N	2026-09-22 14:18:56.114	camara_posicion	2.1583962e-15	25.207182	-35.249283	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 43.334905578173455}
1136	29	\N	2026-09-22 14:19:04.176	cambio_noche	\N	\N	\N	{"es_noche": true}
1137	29	\N	2026-09-22 14:19:05.161	cambio_noche	\N	\N	\N	{"es_noche": false}
1138	29	\N	2026-09-22 14:19:06.115	camara_posicion	2.98844e-15	34.900986	-48.80493	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 60}
1139	29	\N	2026-09-22 14:19:16.086	camara_posicion	59.7168	5.8226748	-1.3259793e-14	{"beta": 1.4735987755982989, "alpha": -0.0000000000000002220446049250313, "radius": 60}
1140	29	\N	2026-09-22 14:19:26.098	camara_posicion	17.63156	1.7191616	-3.9149926e-15	{"beta": 1.4735987755982989, "alpha": -0.0000000000000002220446049250313, "radius": 17.715174479072402}
1141	29	\N	2026-09-22 14:19:36.128	camara_posicion	33.16814	3.7343626	19.149635	{"beta": 1.4735987755982989, "alpha": 0.5235987755982986, "radius": 38.48089906747139}
1142	29	\N	2026-09-22 14:19:46.079	camara_posicion	10.570061	46.536217	18.307882	{"beta": 0.42640122440170125, "alpha": 1.0471975511965974, "radius": 51.11285734043253}
1143	29	\N	2026-09-22 14:19:56.135	camara_posicion	5.1313167e-15	50.094	10.154557	{"beta": 0.2, "alpha": 1.5707963267948961, "radius": 51.11285734043253}
1144	29	\N	2026-09-22 14:20:06.077	camara_posicion	41.967556	16.252897	24.229979	{"beta": 1.2471975511965976, "alpha": 0.5235987755982986, "radius": 51.11285734043253}
1145	29	\N	2026-09-22 14:20:16.078	camara_posicion	24.229979	16.252897	41.967556	{"beta": 1.2471975511965976, "alpha": 1.0471975511965974, "radius": 51.11285734043253}
1146	29	\N	2026-09-22 14:20:26.119	camara_posicion	-24.229979	16.252897	41.967556	{"beta": 1.2471975511965976, "alpha": 2.094395102393195, "radius": 51.11285734043253}
1147	29	\N	2026-09-22 14:20:36.145	camara_posicion	-41.967556	16.252897	-24.229979	{"beta": 1.2471975511965976, "alpha": 3.665191429188091, "radius": 51.11285734043253}
1148	29	\N	2026-09-22 14:20:46.074	camara_posicion	-10.154557	50.094	1.0262633e-14	{"beta": 0.2, "alpha": 3.1415926535897922, "radius": 51.11285734043253}
1149	29	\N	2026-09-22 14:20:56.099	camara_posicion	-10.154557	50.094	1.0262633e-14	{"beta": 0.2, "alpha": 3.1415926535897922, "radius": 51.11285734043253}
1150	29	\N	2026-09-22 14:21:06.119	camara_posicion	-29.307257	38.3054	16.920553	{"beta": 0.7235987755982988, "alpha": 2.6179938779914935, "radius": 51.11285734043253}
1151	29	\N	2026-09-22 14:21:16.097	camara_posicion	-16.920553	38.3054	-29.307257	{"beta": 0.7235987755982988, "alpha": 4.18879020478639, "radius": 51.11285734043253}
1152	29	\N	2026-09-22 14:21:26.082	camara_posicion	-10.816897	7.255719	-18.735416	{"beta": 1.2471975511965976, "alpha": 4.18879020478639, "radius": 22.818118601463027}
1153	29	\N	2026-09-22 14:21:36.097	camara_posicion	-10.816897	7.255719	18.735416	{"beta": 1.2471975511965976, "alpha": 2.094395102393195, "radius": 22.818118601463027}
1154	29	\N	2026-09-22 14:21:46.113	camara_posicion	-10.816897	7.255719	18.735416	{"beta": 1.2471975511965976, "alpha": 2.094395102393195, "radius": 22.818118601463027}
1155	29	\N	2026-09-22 14:21:56.111	camara_posicion	-18.735416	7.255719	10.816897	{"beta": 1.2471975511965976, "alpha": 2.6179938779914935, "radius": 22.818118601463027}
1156	29	\N	2026-09-22 14:22:06.121	camara_posicion	-18.735416	7.255719	-10.816897	{"beta": 1.2471975511965976, "alpha": 3.665191429188091, "radius": 22.818118601463027}
1157	29	\N	2026-09-22 14:22:16.106	camara_posicion	-18.735416	7.255719	-10.816897	{"beta": 1.2471975511965976, "alpha": 3.665191429188091, "radius": 22.818118601463027}
1158	29	\N	2026-09-22 14:22:26.122	camara_posicion	-2.3188733e-14	7.255719	-21.633795	{"beta": 1.2471975511965976, "alpha": 4.712388980384689, "radius": 22.818118601463027}
1159	29	\N	2026-09-22 14:22:36.103	camara_posicion	18.735416	7.255719	-10.816897	{"beta": 1.2471975511965976, "alpha": 5.759586531581287, "radius": 22.818118601463027}
1160	29	\N	2026-09-22 14:22:46.074	camara_posicion	18.735416	7.255719	-10.816897	{"beta": 1.2471975511965976, "alpha": 5.759586531581287, "radius": 22.818118601463027}
1161	29	\N	2026-09-22 14:22:56.075	camara_posicion	18.735416	7.255719	-10.816897	{"beta": 1.2471975511965976, "alpha": 5.759586531581287, "radius": 22.818118601463027}
1162	29	\N	2026-09-22 14:23:06.129	camara_posicion	18.735416	7.255719	-10.816897	{"beta": 1.2471975511965976, "alpha": 5.759586531581287, "radius": 22.818118601463027}
1163	29	\N	2026-09-22 14:23:16.115	camara_posicion	19.682587	13.202615	-34.09124	{"beta": 1.2471975511965976, "alpha": 5.235987755982988, "radius": 41.52018808117413}
1164	29	\N	2026-09-22 14:23:26.129	camara_posicion	1.9906169e-14	13.211971	39.393074	{"beta": 1.2471975511965976, "alpha": 1.5707963267948961, "radius": 41.549614415807234}
1165	29	\N	2026-09-22 14:23:36.28	camara_posicion	1.9906169e-14	13.211971	39.393074	{"beta": 1.2471975511965976, "alpha": 1.5707963267948961, "radius": 41.549614415807234}
1166	29	\N	2026-09-22 14:23:46.276	camara_posicion	1.9906169e-14	13.211971	39.393074	{"beta": 1.2471975511965976, "alpha": 1.5707963267948961, "radius": 41.549614415807234}
1167	29	\N	2026-09-22 14:23:56.28	camara_posicion	1.9906169e-14	13.211971	39.393074	{"beta": 1.2471975511965976, "alpha": 1.5707963267948961, "radius": 41.549614415807234}
1168	29	\N	2026-09-22 14:24:06.277	camara_posicion	1.9906169e-14	13.211971	39.393074	{"beta": 1.2471975511965976, "alpha": 1.5707963267948961, "radius": 41.549614415807234}
1169	29	\N	2026-09-22 14:24:16.279	camara_posicion	1.9906169e-14	13.211971	39.393074	{"beta": 1.2471975511965976, "alpha": 1.5707963267948961, "radius": 41.549614415807234}
1170	29	\N	2026-09-22 14:24:26.281	camara_posicion	1.9906169e-14	13.211971	39.393074	{"beta": 1.2471975511965976, "alpha": 1.5707963267948961, "radius": 41.549614415807234}
1171	29	\N	2026-09-22 14:25:04.278	camara_posicion	1.9906169e-14	13.211971	39.393074	{"beta": 1.2471975511965976, "alpha": 1.5707963267948961, "radius": 41.549614415807234}
1172	29	\N	2026-09-22 14:26:04.269	camara_posicion	1.9906169e-14	13.211971	39.393074	{"beta": 1.2471975511965976, "alpha": 1.5707963267948961, "radius": 41.549614415807234}
1173	29	\N	2026-09-22 14:26:45.083	camara_posicion	1.9906169e-14	13.211971	39.393074	{"beta": 1.2471975511965976, "alpha": 1.5707963267948961, "radius": 41.549614415807234}
1174	29	\N	2026-09-22 14:26:46.136	camara_posicion	1.9906169e-14	13.211971	39.393074	{"beta": 1.2471975511965976, "alpha": 1.5707963267948961, "radius": 41.549614415807234}
1175	29	\N	2026-09-22 14:26:56.272	camara_posicion	1.9906169e-14	13.211971	39.393074	{"beta": 1.2471975511965976, "alpha": 1.5707963267948961, "radius": 41.549614415807234}
1176	29	\N	2026-09-22 14:27:06.27	camara_posicion	1.9906169e-14	13.211971	39.393074	{"beta": 1.2471975511965976, "alpha": 1.5707963267948961, "radius": 41.549614415807234}
1177	29	\N	2026-09-22 14:27:16.274	camara_posicion	1.9906169e-14	13.211971	39.393074	{"beta": 1.2471975511965976, "alpha": 1.5707963267948961, "radius": 41.549614415807234}
1178	30	\N	2026-09-22 14:27:36.279	camara_posicion	1.49422e-15	17.450493	-24.402466	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 30}
1179	30	\N	2026-09-22 14:27:46.281	camara_posicion	1.49422e-15	17.450493	-24.402466	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 30}
1180	30	\N	2026-09-22 14:27:56.281	camara_posicion	1.49422e-15	17.450493	-24.402466	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 30}
1181	30	\N	2026-09-22 14:28:06.281	camara_posicion	1.49422e-15	17.450493	-24.402466	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 30}
1182	30	\N	2026-09-22 14:28:16.275	camara_posicion	1.49422e-15	17.450493	-24.402466	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 30}
1183	30	\N	2026-09-22 14:28:26.274	camara_posicion	1.49422e-15	17.450493	-24.402466	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 30}
1184	30	\N	2026-09-22 14:28:36.274	camara_posicion	1.49422e-15	17.450493	-24.402466	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 30}
1185	30	\N	2026-09-22 14:28:46.274	camara_posicion	1.49422e-15	17.450493	-24.402466	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 30}
1186	30	\N	2026-09-22 14:28:56.272	camara_posicion	1.49422e-15	17.450493	-24.402466	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 30}
1187	30	\N	2026-09-22 14:29:06.274	camara_posicion	1.49422e-15	17.450493	-24.402466	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 30}
1188	30	\N	2026-09-22 14:29:16.272	camara_posicion	1.49422e-15	17.450493	-24.402466	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 30}
1189	30	\N	2026-09-22 14:29:26.273	camara_posicion	1.49422e-15	17.450493	-24.402466	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 30}
1190	30	\N	2026-09-22 14:29:36.273	camara_posicion	1.49422e-15	17.450493	-24.402466	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 30}
1191	30	\N	2026-09-22 14:29:46.274	camara_posicion	1.49422e-15	17.450493	-24.402466	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 30}
1192	30	\N	2026-09-22 14:29:56.27	camara_posicion	1.49422e-15	17.450493	-24.402466	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 30}
1193	30	\N	2026-09-22 14:30:06.274	camara_posicion	1.49422e-15	17.450493	-24.402466	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 30}
1194	30	\N	2026-09-22 14:30:16.276	camara_posicion	1.49422e-15	17.450493	-24.402466	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 30}
1195	30	\N	2026-09-22 14:30:26.268	camara_posicion	1.49422e-15	17.450493	-24.402466	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 30}
1196	30	\N	2026-09-22 14:30:36.273	camara_posicion	1.49422e-15	17.450493	-24.402466	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 30}
1197	30	\N	2026-09-22 14:30:46.271	camara_posicion	1.49422e-15	17.450493	-24.402466	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 30}
1198	30	\N	2026-09-22 14:30:56.273	camara_posicion	1.49422e-15	17.450493	-24.402466	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 30}
1199	30	\N	2026-09-22 14:31:06.276	camara_posicion	1.49422e-15	17.450493	-24.402466	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 30}
1200	30	\N	2026-09-22 14:31:16.283	camara_posicion	1.49422e-15	17.450493	-24.402466	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 30}
1201	30	\N	2026-09-22 14:31:26.276	camara_posicion	1.49422e-15	17.450493	-24.402466	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 30}
1202	30	\N	2026-09-22 14:31:36.273	camara_posicion	1.49422e-15	17.450493	-24.402466	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 30}
1203	30	\N	2026-09-22 14:31:46.279	camara_posicion	1.49422e-15	17.450493	-24.402466	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 30}
1204	30	\N	2026-09-22 14:31:56.28	camara_posicion	1.49422e-15	17.450493	-24.402466	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 30}
1205	30	\N	2026-09-22 14:32:06.276	camara_posicion	1.49422e-15	17.450493	-24.402466	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 30}
1206	30	\N	2026-09-22 14:32:16.284	camara_posicion	1.49422e-15	17.450493	-24.402466	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 30}
1207	30	\N	2026-09-22 14:32:26.274	camara_posicion	1.49422e-15	17.450493	-24.402466	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 30}
1208	30	\N	2026-09-22 14:32:36.275	camara_posicion	1.49422e-15	17.450493	-24.402466	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 30}
1209	30	\N	2026-09-22 14:32:46.268	camara_posicion	1.49422e-15	17.450493	-24.402466	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 30}
1210	30	\N	2026-09-22 14:32:56.278	camara_posicion	1.49422e-15	17.450493	-24.402466	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 30}
1211	30	\N	2026-09-22 14:33:06.271	camara_posicion	1.49422e-15	17.450493	-24.402466	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 30}
1212	30	\N	2026-09-22 14:33:16.276	camara_posicion	1.49422e-15	17.450493	-24.402466	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 30}
1213	30	\N	2026-09-22 14:33:26.271	camara_posicion	1.49422e-15	17.450493	-24.402466	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 30}
1214	30	\N	2026-09-22 14:33:36.281	camara_posicion	1.49422e-15	17.450493	-24.402466	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 30}
1215	30	\N	2026-09-22 14:33:46.272	camara_posicion	1.49422e-15	17.450493	-24.402466	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 30}
1216	30	\N	2026-09-22 14:33:56.281	camara_posicion	1.49422e-15	17.450493	-24.402466	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 30}
1217	31	\N	2026-09-22 14:55:44.224	camara_posicion	1.49422e-15	17.450493	-24.402466	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 30}
1218	34	\N	2026-09-23 18:20:08.357	camara_posicion	-12.806675	0.56683195	7.393937	{"beta": 1.5324842212633139, "alpha": -3.6651914291880914, "radius": 14.798733800686382}
1219	34	\N	2026-09-23 18:20:18.351	camara_posicion	-11.768299	14.818989	20.383291	{"beta": 1.008885445665015, "alpha": -4.1887902047863905, "radius": 27.813196126112597}
1220	34	\N	2026-09-23 18:20:28.34	camara_posicion	18.648054	0.714796	-1.24221e-14	{"beta": 1.5324842212633136, "alpha": -0.0000000000000006661338147750939, "radius": 18.66174871136057}
1221	34	\N	2026-09-23 18:20:38.341	camara_posicion	33.44756	21.059074	-2.228055e-14	{"beta": 1.008885445665015, "alpha": -0.0000000000000006661338147750939, "radius": 39.52497713960881}
1222	35	\N	2026-09-23 18:23:37.056	camara_posicion	1.49422e-15	17.450493	-24.402466	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 30}
1223	35	\N	2026-09-23 18:23:47.073	camara_posicion	1.49422e-15	17.450493	-24.402466	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 30}
1224	35	\N	2026-09-23 18:23:57.037	camara_posicion	1.49422e-15	17.450493	-24.402466	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 30}
1225	35	\N	2026-09-23 18:24:07.035	camara_posicion	1.49422e-15	17.450493	-24.402466	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 30}
1226	35	\N	2026-09-23 18:24:17.025	camara_posicion	1.49422e-15	17.450493	-24.402466	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 30}
1227	35	\N	2026-09-23 18:24:27.035	camara_posicion	1.49422e-15	17.450493	-24.402466	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 30}
1228	35	\N	2026-09-23 18:24:37.074	camara_posicion	1.49422e-15	17.450493	-24.402466	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 30}
1229	35	\N	2026-09-23 18:24:47.029	camara_posicion	1.49422e-15	17.450493	-24.402466	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 30}
1230	35	\N	2026-09-23 18:24:57.042	camara_posicion	1.49422e-15	17.450493	-24.402466	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 30}
1231	35	\N	2026-09-23 18:25:07.064	camara_posicion	1.49422e-15	17.450493	-24.402466	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 30}
1232	35	\N	2026-09-23 18:25:17.025	camara_posicion	1.49422e-15	17.450493	-24.402466	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 30}
1233	35	\N	2026-09-23 18:25:27.024	camara_posicion	1.49422e-15	17.450493	-24.402466	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 30}
1234	35	\N	2026-09-23 18:25:37.043	camara_posicion	1.49422e-15	17.450493	-24.402466	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 30}
1235	35	\N	2026-09-23 18:25:47.064	camara_posicion	1.49422e-15	17.450493	-24.402466	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 30}
1236	35	\N	2026-09-23 18:25:57.027	camara_posicion	1.49422e-15	17.450493	-24.402466	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 30}
1237	35	\N	2026-09-23 18:26:07.023	camara_posicion	1.49422e-15	17.450493	-24.402466	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 30}
1238	35	\N	2026-09-23 18:26:17.024	camara_posicion	1.49422e-15	17.450493	-24.402466	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 30}
1239	35	\N	2026-09-23 18:26:27.027	camara_posicion	1.49422e-15	17.450493	-24.402466	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 30}
1240	35	\N	2026-09-23 18:26:37.029	camara_posicion	1.49422e-15	17.450493	-24.402466	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 30}
1241	35	\N	2026-09-23 18:26:47.028	camara_posicion	1.49422e-15	17.450493	-24.402466	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 30}
1242	35	\N	2026-09-23 18:26:57.023	camara_posicion	1.49422e-15	17.450493	-24.402466	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 30}
1243	35	\N	2026-09-23 18:27:07.045	camara_posicion	1.49422e-15	17.450493	-24.402466	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 30}
1244	35	\N	2026-09-23 18:27:17.028	camara_posicion	1.49422e-15	17.450493	-24.402466	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 30}
1245	35	\N	2026-09-23 18:27:27.024	camara_posicion	1.49422e-15	17.450493	-24.402466	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 30}
1246	35	\N	2026-09-23 18:27:37.034	camara_posicion	1.49422e-15	17.450493	-24.402466	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 30}
1247	35	\N	2026-09-23 18:27:47.05	camara_posicion	1.49422e-15	17.450493	-24.402466	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 30}
1248	35	\N	2026-09-23 18:27:57.036	camara_posicion	1.49422e-15	17.450493	-24.402466	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 30}
1249	35	\N	2026-09-23 18:28:07.041	camara_posicion	1.49422e-15	17.450493	-24.402466	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 30}
1250	35	\N	2026-09-23 18:28:17.039	camara_posicion	1.49422e-15	17.450493	-24.402466	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 30}
1251	35	\N	2026-09-23 18:28:27.074	camara_posicion	1.49422e-15	17.450493	-24.402466	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 30}
1252	35	\N	2026-09-23 18:28:37.065	camara_posicion	1.49422e-15	17.450493	-24.402466	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 30}
1253	35	\N	2026-09-23 18:28:47.038	camara_posicion	1.49422e-15	17.450493	-24.402466	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 30}
1254	35	\N	2026-09-23 18:28:57.043	camara_posicion	1.49422e-15	17.450493	-24.402466	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 30}
1255	35	\N	2026-09-23 18:29:07.025	camara_posicion	1.9275198e-15	22.510855	-31.478786	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 38.69951608660957}
1256	35	\N	2026-09-23 18:29:17.076	camara_posicion	1.816671e-15	21.216288	-29.668488	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 36.47396320052856}
1257	35	\N	2026-09-23 18:29:27.046	camara_posicion	1.816671e-15	21.216288	-29.668488	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 36.47396320052856}
1258	35	\N	2026-09-23 18:29:37.059	camara_posicion	1.816671e-15	21.216288	-29.668488	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 36.47396320052856}
1259	35	\N	2026-09-23 18:29:47.046	camara_posicion	1.816671e-15	21.216288	-29.668488	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 36.47396320052856}
1260	35	\N	2026-09-23 18:29:57.057	camara_posicion	1.816671e-15	21.216288	-29.668488	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 36.47396320052856}
1261	35	\N	2026-09-23 18:30:07.045	camara_posicion	1.816671e-15	21.216288	-29.668488	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 36.47396320052856}
1262	35	\N	2026-09-23 18:30:17.048	camara_posicion	1.816671e-15	21.216288	-29.668488	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 36.47396320052856}
1263	35	\N	2026-09-23 18:30:27.024	camara_posicion	1.816671e-15	21.216288	-29.668488	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 36.47396320052856}
1264	35	\N	2026-09-23 18:30:37.041	camara_posicion	1.816671e-15	21.216288	-29.668488	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 36.47396320052856}
1265	35	\N	2026-09-23 18:30:47.038	camara_posicion	1.816671e-15	21.216288	-29.668488	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 36.47396320052856}
1266	35	\N	2026-09-23 18:30:57.032	camara_posicion	1.816671e-15	21.216288	-29.668488	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 36.47396320052856}
1267	35	\N	2026-09-23 18:31:07.023	camara_posicion	1.816671e-15	21.216288	-29.668488	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 36.47396320052856}
1268	35	\N	2026-09-23 18:31:17.038	camara_posicion	1.816671e-15	21.216288	-29.668488	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 36.47396320052856}
1269	35	\N	2026-09-23 18:31:27.025	camara_posicion	1.816671e-15	21.216288	-29.668488	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 36.47396320052856}
1270	35	\N	2026-09-23 18:31:37.038	camara_posicion	1.816671e-15	21.216288	-29.668488	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 36.47396320052856}
1271	35	\N	2026-09-23 18:31:47.049	camara_posicion	2.259787e-15	26.39129	-36.90512	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 45.37056612402478}
1272	35	\N	2026-09-23 18:31:57.026	camara_posicion	2.259787e-15	26.39129	-36.90512	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 45.37056612402478}
1273	35	\N	2026-09-23 18:32:07.029	camara_posicion	2.259787e-15	26.39129	-36.90512	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 45.37056612402478}
1274	35	\N	2026-09-23 18:32:17.068	camara_posicion	-24.402466	34.900986	42.266308	{"beta": 0.95, "alpha": -4.1887902047863905, "radius": 60}
1275	35	\N	2026-09-23 18:32:27.041	camara_posicion	42.266308	34.900986	-24.402466	{"beta": 0.95, "alpha": -6.806784082777886, "radius": 60}
1276	35	\N	2026-09-23 18:32:37.043	camara_posicion	42.266308	34.900986	-24.402466	{"beta": 0.95, "alpha": -6.806784082777886, "radius": 60}
1277	35	\N	2026-09-23 18:32:47.07	camara_posicion	42.266308	34.900986	-24.402466	{"beta": 0.95, "alpha": -6.806784082777886, "radius": 60}
1278	35	\N	2026-09-23 18:32:57.075	camara_posicion	42.266308	34.900986	-24.402466	{"beta": 0.95, "alpha": -6.806784082777886, "radius": 60}
1279	35	\N	2026-09-23 18:33:07.048	camara_posicion	42.266308	34.900986	-24.402466	{"beta": 0.95, "alpha": -6.806784082777886, "radius": 60}
1280	35	\N	2026-09-23 18:33:17.024	camara_posicion	42.266308	34.900986	-24.402466	{"beta": 0.95, "alpha": -6.806784082777886, "radius": 60}
1281	35	\N	2026-09-23 18:33:27.046	camara_posicion	42.266308	34.900986	-24.402466	{"beta": 0.95, "alpha": -6.806784082777886, "radius": 60}
1282	35	\N	2026-09-23 18:33:37.054	camara_posicion	42.266308	34.900986	-24.402466	{"beta": 0.95, "alpha": -6.806784082777886, "radius": 60}
1283	35	\N	2026-09-23 18:33:47.075	camara_posicion	42.266308	34.900986	-24.402466	{"beta": 0.95, "alpha": -6.806784082777886, "radius": 60}
1284	35	\N	2026-09-23 18:33:57.035	camara_posicion	42.266308	34.900986	-24.402466	{"beta": 0.95, "alpha": -6.806784082777886, "radius": 60}
1285	35	\N	2026-09-23 18:34:07.066	camara_posicion	42.266308	34.900986	-24.402466	{"beta": 0.95, "alpha": -6.806784082777886, "radius": 60}
1286	35	\N	2026-09-23 18:34:17.073	camara_posicion	42.266308	34.900986	-24.402466	{"beta": 0.95, "alpha": -6.806784082777886, "radius": 60}
1287	35	\N	2026-09-23 18:34:27.051	camara_posicion	42.266308	34.900986	-24.402466	{"beta": 0.95, "alpha": -6.806784082777886, "radius": 60}
1288	35	\N	2026-09-23 18:34:37.049	camara_posicion	42.266308	34.900986	-24.402466	{"beta": 0.95, "alpha": -6.806784082777886, "radius": 60}
1289	35	\N	2026-09-23 18:34:47.028	camara_posicion	42.266308	34.900986	-24.402466	{"beta": 0.95, "alpha": -6.806784082777886, "radius": 60}
1290	35	\N	2026-09-23 18:34:57.026	camara_posicion	42.266308	34.900986	-24.402466	{"beta": 0.95, "alpha": -6.806784082777886, "radius": 60}
1291	35	\N	2026-09-23 18:35:07.035	camara_posicion	42.266308	34.900986	-24.402466	{"beta": 0.95, "alpha": -6.806784082777886, "radius": 60}
1292	35	\N	2026-09-23 18:35:17.05	camara_posicion	42.266308	34.900986	-24.402466	{"beta": 0.95, "alpha": -6.806784082777886, "radius": 60}
1293	35	\N	2026-09-23 18:35:27.055	camara_posicion	42.266308	34.900986	-24.402466	{"beta": 0.95, "alpha": -6.806784082777886, "radius": 60}
1294	35	\N	2026-09-23 18:35:37.072	camara_posicion	42.266308	34.900986	-24.402466	{"beta": 0.95, "alpha": -6.806784082777886, "radius": 60}
1295	35	\N	2026-09-23 18:35:47.048	camara_posicion	42.266308	34.900986	-24.402466	{"beta": 0.95, "alpha": -6.806784082777886, "radius": 60}
1296	35	\N	2026-09-23 18:35:57.047	camara_posicion	24.402466	34.900986	-42.266308	{"beta": 0.95, "alpha": -7.3303828583761845, "radius": 60}
1297	35	\N	2026-09-23 18:36:07.069	camara_posicion	-42.266308	34.900986	-24.402466	{"beta": 0.95, "alpha": -8.901179185171081, "radius": 60}
1298	35	\N	2026-09-23 18:36:17.043	camara_posicion	48.80493	34.900986	1.9729746e-13	{"beta": 0.95, "alpha": -12.566370614359169, "radius": 60}
1299	35	\N	2026-09-23 18:36:27.084	camara_posicion	48.80493	34.900986	1.9729746e-13	{"beta": 0.95, "alpha": -12.566370614359169, "radius": 60}
1300	35	\N	2026-09-23 18:36:37.062	camara_posicion	48.80493	34.900986	1.9729746e-13	{"beta": 0.95, "alpha": -12.566370614359169, "radius": 60}
1301	35	\N	2026-09-23 18:36:47.032	camara_posicion	-13.993858	53.072475	24.238073	{"beta": 0.4852866700667161, "alpha": -10.471975511965976, "radius": 60}
1302	35	\N	2026-09-23 18:36:57.086	camara_posicion	-22.30731	16.217781	12.879131	{"beta": 1.008885445665015, "alpha": -9.948376736367678, "radius": 30.438536693025185}
1303	35	\N	2026-09-23 18:37:07.024	camara_posicion	-22.30731	16.217781	12.879131	{"beta": 1.008885445665015, "alpha": -9.948376736367678, "radius": 30.438536693025185}
1304	35	\N	2026-09-23 18:37:17.072	camara_posicion	-22.30731	16.217781	12.879131	{"beta": 1.008885445665015, "alpha": -9.948376736367678, "radius": 30.438536693025185}
1305	35	\N	2026-09-23 18:37:27.043	camara_posicion	-22.30731	16.217781	12.879131	{"beta": 1.008885445665015, "alpha": -9.948376736367678, "radius": 30.438536693025185}
1306	35	\N	2026-09-23 18:37:37.027	camara_posicion	-22.30731	16.217781	12.879131	{"beta": 1.008885445665015, "alpha": -9.948376736367678, "radius": 30.438536693025185}
1307	35	\N	2026-09-23 18:37:47.096	camara_posicion	-22.30731	16.217781	12.879131	{"beta": 1.008885445665015, "alpha": -9.948376736367678, "radius": 30.438536693025185}
1308	35	\N	2026-09-23 18:37:57.072	camara_posicion	-22.30731	16.217781	12.879131	{"beta": 1.008885445665015, "alpha": -9.948376736367678, "radius": 30.438536693025185}
1309	35	\N	2026-09-23 18:38:07.094	camara_posicion	-22.30731	16.217781	12.879131	{"beta": 1.008885445665015, "alpha": -9.948376736367678, "radius": 30.438536693025185}
1310	35	\N	2026-09-23 18:38:17.044	camara_posicion	41.842	26.34434	1.0248335e-14	{"beta": 1.008885445665015, "alpha": -6.283185307179586, "radius": 49.444688444280445}
1311	35	\N	2026-09-23 18:38:27.045	camara_posicion	41.871296	26.362785	1.025551e-14	{"beta": 1.008885445665015, "alpha": -6.283185307179586, "radius": 49.47930818080593}
1312	35	\N	2026-09-23 18:38:37.034	camara_posicion	41.871296	26.362785	1.025551e-14	{"beta": 1.008885445665015, "alpha": -6.283185307179586, "radius": 49.47930818080593}
1313	35	\N	2026-09-23 18:38:47.055	camara_posicion	41.871296	26.362785	1.025551e-14	{"beta": 1.008885445665015, "alpha": -6.283185307179586, "radius": 49.47930818080593}
1314	35	\N	2026-09-23 18:38:57.038	camara_posicion	36.26161	26.362785	-20.935648	{"beta": 1.008885445665015, "alpha": -6.806784082777885, "radius": 49.47930818080593}
1315	35	\N	2026-09-23 18:39:07.024	camara_posicion	41.871296	26.362785	1.025551e-14	{"beta": 1.008885445665015, "alpha": -6.283185307179586, "radius": 49.47930818080593}
1316	35	\N	2026-09-23 18:39:17.042	camara_posicion	41.871296	26.362785	1.025551e-14	{"beta": 1.008885445665015, "alpha": -6.283185307179586, "radius": 49.47930818080593}
1317	35	\N	2026-09-23 18:39:27.045	camara_posicion	41.871296	26.362785	1.025551e-14	{"beta": 1.008885445665015, "alpha": -6.283185307179586, "radius": 49.47930818080593}
1318	35	\N	2026-09-23 18:39:37.069	camara_posicion	24.561356	15.4641905	6.015797e-15	{"beta": 1.008885445665015, "alpha": -6.283185307179586, "radius": 29.024151491123547}
1319	35	\N	2026-09-23 18:39:47.054	camara_posicion	24.561356	15.4641905	6.015797e-15	{"beta": 1.008885445665015, "alpha": -6.283185307179586, "radius": 29.024151491123547}
1320	35	\N	2026-09-23 18:39:57.048	camara_posicion	24.561356	15.4641905	6.015797e-15	{"beta": 1.008885445665015, "alpha": -6.283185307179586, "radius": 29.024151491123547}
1321	35	\N	2026-09-23 18:40:07.049	camara_posicion	24.561356	15.4641905	6.015797e-15	{"beta": 1.008885445665015, "alpha": -6.283185307179586, "radius": 29.024151491123547}
1322	35	\N	2026-09-23 18:40:17.06	camara_posicion	24.561356	15.4641905	6.015797e-15	{"beta": 1.008885445665015, "alpha": -6.283185307179586, "radius": 29.024151491123547}
1323	35	\N	2026-09-23 18:40:27.048	camara_posicion	24.561356	15.4641905	6.015797e-15	{"beta": 1.008885445665015, "alpha": -6.283185307179586, "radius": 29.024151491123547}
1324	35	\N	2026-09-23 18:40:37.025	camara_posicion	24.561356	15.4641905	6.015797e-15	{"beta": 1.008885445665015, "alpha": -6.283185307179586, "radius": 29.024151491123547}
1325	35	\N	2026-09-23 18:40:47.071	camara_posicion	24.561356	15.4641905	6.015797e-15	{"beta": 1.008885445665015, "alpha": -6.283185307179586, "radius": 29.024151491123547}
1326	35	\N	2026-09-23 18:40:57.058	camara_posicion	24.561356	15.4641905	6.015797e-15	{"beta": 1.008885445665015, "alpha": -6.283185307179586, "radius": 29.024151491123547}
1327	35	\N	2026-09-23 18:41:07.044	camara_posicion	24.561356	15.4641905	6.015797e-15	{"beta": 1.008885445665015, "alpha": -6.283185307179586, "radius": 29.024151491123547}
1328	35	\N	2026-09-23 18:41:17.032	camara_posicion	24.561356	15.4641905	6.015797e-15	{"beta": 1.008885445665015, "alpha": -6.283185307179586, "radius": 29.024151491123547}
1329	35	\N	2026-09-23 18:41:27.03	camara_posicion	24.561356	15.4641905	6.015797e-15	{"beta": 1.008885445665015, "alpha": -6.283185307179586, "radius": 29.024151491123547}
1330	35	\N	2026-09-23 18:41:37.076	camara_posicion	24.561356	15.4641905	6.015797e-15	{"beta": 1.008885445665015, "alpha": -6.283185307179586, "radius": 29.024151491123547}
1331	35	\N	2026-09-23 18:41:47.054	camara_posicion	30.144373	18.979342	7.383242e-15	{"beta": 1.008885445665015, "alpha": -6.283185307179586, "radius": 35.62160331104326}
1332	35	\N	2026-09-23 18:41:57.077	camara_posicion	30.161133	18.989893	7.387347e-15	{"beta": 1.008885445665015, "alpha": -6.283185307179586, "radius": 35.64140821854038}
1333	35	\N	2026-09-23 18:42:07.067	camara_posicion	30.161133	18.989893	7.387347e-15	{"beta": 1.008885445665015, "alpha": -6.283185307179586, "radius": 35.64140821854038}
1334	35	\N	2026-09-23 18:42:17.033	camara_posicion	30.161133	18.989893	7.387347e-15	{"beta": 1.008885445665015, "alpha": -6.283185307179586, "radius": 35.64140821854038}
1335	35	\N	2026-09-23 18:42:27.062	camara_posicion	30.161133	18.989893	7.387347e-15	{"beta": 1.008885445665015, "alpha": -6.283185307179586, "radius": 35.64140821854038}
1336	35	\N	2026-09-23 18:42:37.029	camara_posicion	30.161133	18.989893	7.387347e-15	{"beta": 1.008885445665015, "alpha": -6.283185307179586, "radius": 35.64140821854038}
1337	35	\N	2026-09-23 18:42:47.047	camara_posicion	30.161133	18.989893	7.387347e-15	{"beta": 1.008885445665015, "alpha": -6.283185307179586, "radius": 35.64140821854038}
1338	35	\N	2026-09-23 18:42:57.038	camara_posicion	30.161133	18.989893	7.387347e-15	{"beta": 1.008885445665015, "alpha": -6.283185307179586, "radius": 35.64140821854038}
1339	35	\N	2026-09-23 18:43:07.037	camara_posicion	30.161133	18.989893	7.387347e-15	{"beta": 1.008885445665015, "alpha": -6.283185307179586, "radius": 35.64140821854038}
1340	35	\N	2026-09-23 18:43:17.049	camara_posicion	30.161133	18.989893	7.387347e-15	{"beta": 1.008885445665015, "alpha": -6.283185307179586, "radius": 35.64140821854038}
1341	35	\N	2026-09-23 18:43:27.067	camara_posicion	30.161133	18.989893	7.387347e-15	{"beta": 1.008885445665015, "alpha": -6.283185307179586, "radius": 35.64140821854038}
1342	35	\N	2026-09-23 18:43:37.051	camara_posicion	30.161133	18.989893	7.387347e-15	{"beta": 1.008885445665015, "alpha": -6.283185307179586, "radius": 35.64140821854038}
1343	35	\N	2026-09-23 18:43:47.057	camara_posicion	30.161133	18.989893	7.387347e-15	{"beta": 1.008885445665015, "alpha": -6.283185307179586, "radius": 35.64140821854038}
1344	35	\N	2026-09-23 18:43:57.032	camara_posicion	30.161133	18.989893	7.387347e-15	{"beta": 1.008885445665015, "alpha": -6.283185307179586, "radius": 35.64140821854038}
1345	35	\N	2026-09-23 18:44:07.425	camara_posicion	37.496082	23.608086	9.183891e-15	{"beta": 1.008885445665015, "alpha": -6.283185307179586, "radius": 44.309116624313276}
1346	35	\N	2026-09-23 18:44:17.425	camara_posicion	37.496082	23.608086	9.183891e-15	{"beta": 1.008885445665015, "alpha": -6.283185307179586, "radius": 44.309116624313276}
1347	35	\N	2026-09-23 18:44:27.42	camara_posicion	37.496082	23.608086	9.183891e-15	{"beta": 1.008885445665015, "alpha": -6.283185307179586, "radius": 44.309116624313276}
1348	35	\N	2026-09-23 18:44:37.426	camara_posicion	37.496082	23.608086	9.183891e-15	{"beta": 1.008885445665015, "alpha": -6.283185307179586, "radius": 44.309116624313276}
1349	37	\N	2026-09-28 21:57:09.544	camara_posicion	-35.997345	25.742128	-4.4084033e-15	{"beta": 0.95, "alpha": -3.141592653589793, "radius": 44.254559359858966}
1350	37	\N	2026-09-28 21:57:19.535	camara_posicion	-35.997345	25.742128	-4.4084033e-15	{"beta": 0.95, "alpha": -3.141592653589793, "radius": 44.254559359858966}
1351	37	\N	2026-09-28 21:57:29.545	camara_posicion	-35.997345	25.742128	-4.4084033e-15	{"beta": 0.95, "alpha": -3.141592653589793, "radius": 44.254559359858966}
1352	38	\N	2026-09-29 19:26:23.321	modal_abierto	\N	\N	\N	{"modal": "matematicas"}
1353	38	\N	2026-09-29 19:26:26.865	camara_posicion	1.49422e-15	17.450493	-24.402466	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 30}
1354	38	\N	2026-09-29 19:26:36.865	camara_posicion	1.49422e-15	17.450493	-24.402466	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 30}
1355	38	\N	2026-09-29 19:26:46.862	camara_posicion	1.49422e-15	17.450493	-24.402466	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 30}
1356	38	\N	2026-09-29 19:26:56.866	camara_posicion	1.49422e-15	17.450493	-24.402466	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 30}
1357	38	\N	2026-09-29 19:27:06.865	camara_posicion	1.49422e-15	17.450493	-24.402466	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 30}
1358	38	\N	2026-09-29 19:27:16.865	camara_posicion	1.49422e-15	17.450493	-24.402466	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 30}
1359	38	1	2026-09-29 19:27:26.022	matematicas_intento	\N	\N	\N	{"area": 400, "volumen": 6000, "correcto": true, "perimetro": 80, "unidad_area": "m2", "unidad_volumen": "m3", "unidad_perimetro": "m"}
1360	38	\N	2026-09-29 19:27:26.023	modal_cerrado	\N	\N	\N	{"modal": "matematicas"}
1361	38	\N	2026-09-29 19:27:26.861	camara_posicion	1.49422e-15	17.450493	-24.402466	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 30}
1362	38	\N	2026-09-29 19:27:27.795	modal_abierto	\N	\N	\N	{"modal": "concreto"}
1363	38	\N	2026-09-29 19:27:36.862	camara_posicion	1.49422e-15	17.450493	-24.402466	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 30}
1364	38	\N	2026-09-29 19:27:46.866	camara_posicion	1.49422e-15	17.450493	-24.402466	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 30}
1365	38	2	2026-09-29 19:27:56.326	concreto_intento	\N	\N	\N	{"agua": 600, "arena": 2000, "grava": 3000, "cemento": 1000, "correcto": true}
1366	38	\N	2026-09-29 19:27:56.328	modal_cerrado	\N	\N	\N	{"modal": "concreto"}
1367	38	\N	2026-09-29 19:27:56.328	modal_cerrado	\N	\N	\N	{"modal": "concreto"}
1368	38	\N	2026-09-29 19:27:56.868	camara_posicion	1.49422e-15	17.450493	-24.402466	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 30}
1369	38	\N	2026-09-29 19:28:06.867	camara_posicion	1.49422e-15	17.450493	-24.402466	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 30}
1370	38	\N	2026-09-29 19:28:16.867	camara_posicion	1.49422e-15	17.450493	-24.402466	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 30}
1371	38	\N	2026-09-29 19:28:18.532	pared_construida	0	0	0	{"alto": 15, "modo": "simple", "ancho": 10, "material": "block"}
1372	38	\N	2026-09-29 19:28:26.871	camara_posicion	35.54871	28.788738	18.893627	{"beta": 0.95, "alpha": 0.48851765763223753, "radius": 49.492134142916235}
1373	38	\N	2026-09-29 19:28:36.87	camara_posicion	-2.0395608	28.788738	-40.20597	{"beta": 0.95, "alpha": 4.661704618904433, "radius": 49.492134142916235}
1374	38	\N	2026-09-29 19:28:46.872	camara_posicion	-2.0395608	28.788738	-40.20597	{"beta": 0.95, "alpha": 4.661704618904433, "radius": 49.492134142916235}
1375	38	\N	2026-09-29 19:28:56.863	camara_posicion	-2.0395608	28.788738	-40.20597	{"beta": 0.95, "alpha": 4.661704618904433, "radius": 49.492134142916235}
1376	38	\N	2026-09-29 19:29:03.193	pared_construida	0	0	0	{"alto": 15, "modo": "simple", "ancho": 10, "material": "block"}
1377	38	\N	2026-09-29 19:29:06.872	camara_posicion	-2.0395608	28.788738	-40.20597	{"beta": 0.95, "alpha": 4.661704618904433, "radius": 49.492134142916235}
1378	38	\N	2026-09-29 19:29:16.862	camara_posicion	-1.2249781	17.290768	-24.14806	{"beta": 0.95, "alpha": 4.661704618904433, "radius": 29.725410012499342}
1379	38	\N	2026-09-29 19:29:26.871	camara_posicion	-0.2500483	0.8001917	-4.929216	{"beta": 1.4100668275280415, "alpha": 4.661704618904433, "radius": 5}
1380	38	\N	2026-09-29 19:29:36.872	camara_posicion	4.029296	3.46157	20.967192	{"beta": 1.4100668275280415, "alpha": 1.3809394107602277, "radius": 21.62962919845771}
1381	38	\N	2026-09-29 19:29:46.872	camara_posicion	0.21910992	3.46157	21.349716	{"beta": 1.4100668275280415, "alpha": 1.5605337907904444, "radius": 21.62962919845771}
1382	38	\N	2026-09-29 19:29:56.873	camara_posicion	0.21910992	3.46157	21.349716	{"beta": 1.4100668275280415, "alpha": 1.5605337907904444, "radius": 21.62962919845771}
1383	38	\N	2026-09-29 19:30:06.865	camara_posicion	-13.840742	3.46157	16.257067	{"beta": 1.4100668275280415, "alpha": 2.276083877522885, "radius": 21.62962919845771}
1384	38	\N	2026-09-29 19:30:16.872	camara_posicion	15.2344265	11.206386	-10.49619	{"beta": 1.026164205259759, "alpha": 5.679894797932691, "radius": 21.62962919845771}
1385	38	\N	2026-09-29 19:30:24.836	pared_construida	0	0	0	{"alto": 15, "modo": "simple", "ancho": 10, "material": "block"}
1386	38	\N	2026-09-29 19:30:26.863	camara_posicion	18.463825	11.206386	-1.1597043	{"beta": 1.026164205259759, "alpha": 6.220458173860568, "radius": 21.62962919845771}
1387	38	\N	2026-09-29 19:30:36.877	camara_posicion	-1.4206059	11.206386	18.445587	{"beta": 1.026164205259759, "alpha": 7.930845934230747, "radius": 21.62962919845771}
1388	38	\N	2026-09-29 19:30:46.861	camara_posicion	-21.623367	16.023697	3.2555592	{"beta": 0.9384090504696789, "alpha": 9.275342870212448, "radius": 27.109547259939706}
1389	38	\N	2026-09-29 19:30:56.875	camara_posicion	-17.3511	16.023697	13.308194	{"beta": 0.9384090504696789, "alpha": 8.77048893078096, "radius": 27.109547259939706}
1390	38	\N	2026-09-29 19:31:06.861	camara_posicion	-20.049458	16.023697	8.728573	{"beta": 0.9384090504696789, "alpha": 9.014171800943625, "radius": 27.109547259939706}
1391	38	\N	2026-09-29 19:31:16.875	camara_posicion	35.53613	6.4283442	2.1647673	{"beta": 1.3921597494029703, "alpha": 12.62721279208133, "radius": 36.17770307556234}
1392	38	\N	2026-09-29 19:31:19.341	pared_construida	0	0	0	{"alto": 15, "modo": "simple", "ancho": 10, "material": "block"}
1393	38	\N	2026-09-29 19:31:26.882	camara_posicion	-29.000732	6.4283442	-20.650911	{"beta": 1.3921597494029703, "alpha": 10.043566993768895, "radius": 36.17770307556234}
1394	38	\N	2026-09-29 19:31:36.864	camara_posicion	-12.975008	33.6509	2.8446698	{"beta": 0.3759592457223776, "alpha": 9.20895054546521, "radius": 36.17770307556234}
1395	38	\N	2026-09-29 19:31:46.864	camara_posicion	27.115332	16.63278	17.231821	{"beta": 1.0930801287825875, "alpha": 6.84930030335314, "radius": 36.17770307556234}
1396	38	\N	2026-09-29 19:31:56.861	camara_posicion	31.380693	16.63278	6.8868623	{"beta": 1.0930801287825875, "alpha": 6.499222161988313, "radius": 36.17770307556234}
1397	38	\N	2026-09-29 19:32:06.863	camara_posicion	31.118164	16.63278	7.9897866	{"beta": 1.0930801287825875, "alpha": 6.534512719464808, "radius": 36.17770307556234}
1398	38	\N	2026-09-29 19:32:16.866	camara_posicion	31.880043	16.63278	3.9799104	{"beta": 1.0930801287825875, "alpha": 6.407382936749153, "radius": 36.17770307556234}
1399	38	\N	2026-09-29 19:32:26.862	camara_posicion	29.547611	16.63278	12.614098	{"beta": 1.0930801287825875, "alpha": 6.686670523653479, "radius": 36.17770307556234}
1400	38	\N	2026-09-29 19:32:36.885	camara_posicion	17.18031	10.475589	10.689641	{"beta": 1.0930801287825875, "alpha": 6.839770805637642, "radius": 22.785289961334925}
1401	38	\N	2026-09-29 19:32:46.864	camara_posicion	20.162622	4.1073613	9.786096	{"beta": 1.3895417555269298, "alpha": 6.735051050517982, "radius": 22.785289961334925}
1402	38	\N	2026-09-29 19:32:56.862	camara_posicion	4.0724077	22.3311	1.9765767	{"beta": 0.2, "alpha": 6.735051050517982, "radius": 22.785289961334925}
1403	38	\N	2026-09-29 19:33:06.868	camara_posicion	33.73888	12.647803	-27.461893	{"beta": 1.2878588733032037, "alpha": 5.599993624776573, "radius": 45.30380364094847}
1404	38	\N	2026-09-29 19:33:07.524	pared_construida	0	0	0	{"alto": 15, "modo": "simple", "ancho": 5, "material": "block"}
1405	38	\N	2026-09-29 19:33:16.882	camara_posicion	32.391293	31.673178	-0.22048393	{"beta": 0.7966185020362943, "alpha": 6.2763785230948415, "radius": 45.30380364094847}
1406	38	\N	2026-09-29 19:33:26.864	camara_posicion	-15.4407425	9.055762	-0.9763193	{"beta": 1.0412438499954295, "alpha": 3.204738665924798, "radius": 17.926978051141656}
1407	38	\N	2026-09-29 19:33:36.867	camara_posicion	-17.368093	4.4398065	0.11822269	{"beta": 1.3205314368987817, "alpha": 3.1347858695050603, "radius": 17.926978051141656}
1408	38	\N	2026-09-29 19:33:46.866	camara_posicion	25.593231	23.011652	-3.4376006	{"beta": 0.8429046337984036, "alpha": 6.149667619400058, "radius": 34.58853384993073}
1409	38	\N	2026-09-29 19:33:56.868	camara_posicion	29.693872	26.698662	-3.9883857	{"beta": 0.8429046337984036, "alpha": 6.149667619400058, "radius": 40.13043461320181}
1410	38	\N	2026-09-29 19:33:59.756	pared_construida	0	0	0	{"alto": 15, "modo": "ventana", "ancho": 5, "material": "block"}
1411	38	\N	2026-09-29 19:34:06.9	camara_posicion	29.587234	26.698662	-4.7147465	{"beta": 0.8429046337984036, "alpha": 6.125163196702643, "radius": 40.13043461320181}
1412	38	\N	2026-09-29 19:34:16.868	camara_posicion	-8.868575	9.834952	-6.5691094	{"beta": 0.8429046337984036, "alpha": 3.779126522756118, "radius": 14.782797524817617}
1413	38	\N	2026-09-29 19:34:26.868	camara_posicion	18.91287	5.407034	-2.4113882	{"beta": 1.2944562178735963, "alpha": 6.156369683728094, "radius": 19.81785837125502}
1414	38	\N	2026-09-29 19:34:36.9	camara_posicion	2.2883554	13.118998	-30.548244	{"beta": 1.1661745178549388, "alpha": 4.787158885538545, "radius": 33.32476483990314}
1415	38	\N	2026-09-29 19:34:46.895	camara_posicion	2.2883554	13.118998	-30.548244	{"beta": 1.1661745178549388, "alpha": 4.787158885538545, "radius": 33.32476483990314}
1416	38	\N	2026-09-29 19:34:51.678	pared_construida	0	0	0	{"alto": 15, "modo": "ventana", "ancho": 5, "material": "block"}
1417	38	\N	2026-09-29 19:34:56.882	camara_posicion	0.8596225	13.118998	-30.62177	{"beta": 1.1661745178549388, "alpha": 4.74045387475557, "radius": 33.32476483990314}
1418	38	\N	2026-09-29 19:35:06.897	camara_posicion	0.8596225	13.118998	-30.62177	{"beta": 1.1661745178549388, "alpha": 4.74045387475557, "radius": 33.32476483990314}
1419	38	\N	2026-09-29 19:35:16.893	camara_posicion	-27.274529	13.118998	-13.947472	{"beta": 1.1661745178549388, "alpha": 3.6142976281973818, "radius": 33.32476483990314}
1420	38	\N	2026-09-29 19:35:26.903	camara_posicion	-16.432314	2.814767	-9.827526	{"beta": 1.4248323129995228, "alpha": 3.680585233187932, "radius": 19.352625229747222}
1421	38	\N	2026-09-29 19:35:36.889	camara_posicion	-18.221457	2.814767	-5.8804536	{"beta": 1.4248323129995228, "alpha": 3.4537622435981636, "radius": 19.352625229747222}
1422	38	\N	2026-09-29 19:35:46.869	camara_posicion	-8.439282	5.6714	-37.644062	{"beta": 1.4248323129995228, "alpha": 4.491849176099156, "radius": 38.99309654947422}
1423	38	\N	2026-09-29 19:35:56.171	pared_construida	0	0	0	{"alto": 15, "modo": "puerta", "ancho": 10, "material": "block"}
1424	38	\N	2026-09-29 19:35:56.897	camara_posicion	0.06217293	5.818716	-39.580486	{"beta": 1.4248323129995228, "alpha": 4.713959776708539, "radius": 40.00595078979279}
1425	38	\N	2026-09-29 19:36:06.904	camara_posicion	0.06217293	5.818716	-39.580486	{"beta": 1.4248323129995228, "alpha": 4.713959776708539, "radius": 40.00595078979279}
1426	38	\N	2026-09-29 19:36:12.661	objeto_eliminado	\N	\N	\N	{"id": 12, "tipo": "wall_block"}
1427	38	\N	2026-09-29 19:36:16.896	camara_posicion	0.06217293	5.818716	-39.580486	{"beta": 1.4248323129995228, "alpha": 4.713959776708539, "radius": 40.00595078979279}
1428	38	\N	2026-09-29 19:36:22.669	pared_construida	0	0	0	{"alto": 15, "modo": "puerta", "ancho": 10, "material": "block"}
1429	38	\N	2026-09-29 19:36:26.889	camara_posicion	0.06217293	5.818716	-39.580486	{"beta": 1.4248323129995228, "alpha": 4.713959776708539, "radius": 40.00595078979279}
1430	38	\N	2026-09-29 19:36:36.865	camara_posicion	0.023208015	11.314549	-14.774669	{"beta": 0.9172556599353123, "alpha": 4.713959776708539, "radius": 18.60941693459801}
1431	38	\N	2026-09-29 19:36:46.899	camara_posicion	-11.862977	6.610496	-12.723267	{"beta": 1.207643540882909, "alpha": 3.9619672151936776, "radius": 18.60941693459801}
1432	38	\N	2026-09-29 19:36:56.9	camara_posicion	-3.32582	6.610496	-17.074854	{"beta": 1.207643540882909, "alpha": 4.520018790225758, "radius": 18.60941693459801}
1433	38	\N	2026-09-29 19:37:06.901	camara_posicion	17.06951	15.200747	-23.650053	{"beta": 1.0903574151488904, "alpha": 5.337565918445133, "radius": 32.890057483495745}
1434	38	\N	2026-09-29 19:37:10.222	pared_construida	0	0	0	{"alto": 15, "modo": "simple", "ancho": 5, "material": "block"}
1435	38	\N	2026-09-29 19:37:16.884	camara_posicion	17.06951	15.200747	-23.650053	{"beta": 1.0903574151488904, "alpha": 5.337565918445133, "radius": 32.890057483495745}
1436	38	\N	2026-09-29 19:37:26.912	camara_posicion	28.641607	15.088516	-4.223295	{"beta": 1.0903574151488904, "alpha": 6.136787089517597, "radius": 32.64722343841721}
1437	38	\N	2026-09-29 19:37:36.887	camara_posicion	16.725657	2.5196328	-5.562588	{"beta": 1.428811663695826, "alpha": 5.962114537977223, "radius": 17.805574795128987}
1438	38	\N	2026-09-29 19:37:46.9	camara_posicion	4.522811	2.5196328	-17.036259	{"beta": 1.428811663695826, "alpha": 4.971884533566111, "radius": 17.805574795128987}
1439	38	\N	2026-09-29 19:37:56.889	camara_posicion	-6.40787	29.295124	-34.675087	{"beta": 0.8775668727455471, "alpha": 4.529653007696963, "radius": 45.84350122186333}
1440	38	\N	2026-09-29 19:38:06.895	camara_posicion	-0.8260974	31.06265	-33.70543	{"beta": 0.8263288553712702, "alpha": 4.687884557682378, "radius": 45.84350122186333}
1441	38	\N	2026-09-29 19:38:08.197	pared_construida	0	0	0	{"alto": 15, "modo": "simple", "ancho": 20, "material": "block"}
1442	38	\N	2026-09-29 19:38:16.965	camara_posicion	-0.8260974	31.06265	-33.70543	{"beta": 0.8263288553712702, "alpha": 4.687884557682378, "radius": 45.84350122186333}
1443	38	\N	2026-09-29 19:38:26.916	camara_posicion	-0.8260974	31.06265	-33.70543	{"beta": 0.8263288553712702, "alpha": 4.687884557682378, "radius": 45.84350122186333}
1444	38	\N	2026-09-29 19:38:36.926	camara_posicion	-1.0811968	40.654816	-44.11368	{"beta": 0.8263288553712702, "alpha": 4.687884557682378, "radius": 60}
1445	38	\N	2026-09-29 19:38:46.878	camara_posicion	-1.0811968	40.654816	-44.11368	{"beta": 0.8263288553712702, "alpha": 4.687884557682378, "radius": 60}
1446	38	\N	2026-09-29 19:38:56.998	camara_posicion	-7.6320624	24.404089	25.364983	{"beta": 0.8263288553712702, "alpha": 8.146254470509142, "radius": 36.0165275738372}
1447	38	\N	2026-09-29 19:39:06.907	camara_posicion	-3.3853636	52.1061	11.251178	{"beta": 0.22178170906566924, "alpha": 8.146254470509142, "radius": 53.41437137113553}
1448	38	\N	2026-09-29 19:39:16.909	camara_posicion	-3.3853636	52.1061	11.251178	{"beta": 0.22178170906566924, "alpha": 8.146254470509142, "radius": 53.41437137113553}
1449	38	\N	2026-09-29 19:39:24.138	pared_construida	0	0	0	{"alto": 3, "modo": "simple", "ancho": 20, "material": "block"}
1450	38	\N	2026-09-29 19:39:26.899	camara_posicion	-3.3853636	52.1061	11.251178	{"beta": 0.22178170906566924, "alpha": 8.146254470509142, "radius": 53.41437137113553}
1451	38	\N	2026-09-29 19:39:36.88	camara_posicion	-3.3853636	52.1061	11.251178	{"beta": 0.22178170906566924, "alpha": 8.146254470509142, "radius": 53.41437137113553}
1452	38	\N	2026-09-29 19:39:42.478	objeto_eliminado	\N	\N	\N	{"id": 18, "tipo": "wall_block"}
1453	38	\N	2026-09-29 19:39:46.91	camara_posicion	-3.3853636	52.1061	11.251178	{"beta": 0.22178170906566924, "alpha": 8.146254470509142, "radius": 53.41437137113553}
1454	38	\N	2026-09-29 19:39:47.546	pared_construida	0	0	0	{"alto": 6, "modo": "simple", "ancho": 20, "material": "block"}
1455	38	\N	2026-09-29 19:39:56.891	camara_posicion	-2.9075482	44.751762	9.66317	{"beta": 0.22178170906566924, "alpha": 8.146254470509142, "radius": 45.87538634716194}
1456	38	\N	2026-09-29 19:40:06.915	camara_posicion	34.37816	15.665549	-24.064693	{"beta": 1.2135078471692196, "alpha": 5.672459695318592, "radius": 44.79259583525396}
1457	38	\N	2026-09-29 19:40:16.919	camara_posicion	34.37816	15.665549	-24.064693	{"beta": 1.2135078471692196, "alpha": 5.672459695318592, "radius": 44.79259583525396}
1458	38	\N	2026-09-29 19:40:26.922	camara_posicion	14.184689	22.82036	-9.929275	{"beta": 0.6490683670752289, "alpha": 5.672459695318592, "radius": 28.64550021060201}
1459	38	\N	2026-09-29 19:40:36.934	camara_posicion	14.184689	22.82036	-9.929275	{"beta": 0.6490683670752289, "alpha": 5.672459695318592, "radius": 28.64550021060201}
1460	38	\N	2026-09-29 19:40:37.582	pared_construida	0	0	0	{"alto": 2, "modo": "simple", "ancho": 20, "material": "block"}
1461	38	\N	2026-09-29 19:40:46.935	camara_posicion	27.585426	44.379498	-19.309784	{"beta": 0.6490683670752289, "alpha": 5.672459695318592, "radius": 55.70783944187643}
1462	38	\N	2026-09-29 19:40:56.918	camara_posicion	25.434227	16.14737	-17.803946	{"beta": 1.0911951731906273, "alpha": 5.672459695318592, "radius": 34.99454118233003}
1463	38	\N	2026-09-29 19:41:06.907	camara_posicion	25.434227	16.14737	-17.803946	{"beta": 1.0911951731906273, "alpha": 5.672459695318592, "radius": 34.99454118233003}
1464	38	\N	2026-09-29 19:41:16.908	camara_posicion	1.5744016	17.67423	-30.162241	{"beta": 1.0413485697511344, "alpha": 4.764539418432114, "radius": 34.99454118233003}
1465	38	\N	2026-09-29 19:41:26.903	camara_posicion	1.5744016	17.67423	-30.162241	{"beta": 1.0413485697511344, "alpha": 4.764539418432114, "radius": 34.99454118233003}
1466	38	\N	2026-09-29 19:41:36.907	camara_posicion	1.5744016	17.67423	-30.162241	{"beta": 1.0413485697511344, "alpha": 4.764539418432114, "radius": 34.99454118233003}
1467	38	7	2026-09-29 19:41:42.144	programa_ejecutado	\N	\N	\N	{"bloques": ["if", "es_noche", "enciende_foco", "else", "es_dia"], "resultado": "no_ejecutado"}
1468	38	7	2026-09-29 19:41:43.274	programa_ejecutado	\N	\N	\N	{"bloques": ["if", "es_noche", "enciende_foco", "else", "es_dia"], "resultado": "no_ejecutado"}
1469	38	7	2026-09-29 19:41:44.359	programa_ejecutado	\N	\N	\N	{"bloques": ["if", "es_noche", "enciende_foco", "else", "es_dia"], "resultado": "no_ejecutado"}
1470	38	7	2026-09-29 19:41:44.596	programa_ejecutado	\N	\N	\N	{"bloques": ["if", "es_noche", "enciende_foco", "else", "es_dia"], "resultado": "no_ejecutado"}
1471	38	7	2026-09-29 19:41:44.781	programa_ejecutado	\N	\N	\N	{"bloques": ["if", "es_noche", "enciende_foco", "else", "es_dia"], "resultado": "no_ejecutado"}
1472	38	7	2026-09-29 19:41:44.959	programa_ejecutado	\N	\N	\N	{"bloques": ["if", "es_noche", "enciende_foco", "else", "es_dia"], "resultado": "no_ejecutado"}
1473	38	7	2026-09-29 19:41:45.143	programa_ejecutado	\N	\N	\N	{"bloques": ["if", "es_noche", "enciende_foco", "else", "es_dia"], "resultado": "no_ejecutado"}
1474	38	7	2026-09-29 19:41:45.562	programa_ejecutado	\N	\N	\N	{"bloques": ["if", "es_noche", "enciende_foco", "else", "es_dia"], "resultado": "no_ejecutado"}
1475	38	7	2026-09-29 19:41:45.832	programa_ejecutado	\N	\N	\N	{"bloques": ["if", "es_noche", "enciende_foco", "else", "es_dia"], "resultado": "no_ejecutado"}
1476	38	\N	2026-09-29 19:41:46.914	camara_posicion	1.5744016	17.67423	-30.162241	{"beta": 1.0413485697511344, "alpha": 4.764539418432114, "radius": 34.99454118233003}
1477	38	7	2026-09-29 19:41:53.752	programa_ejecutado	\N	\N	\N	{"bloques": ["if", "es_noche"], "resultado": "no_ejecutado"}
1478	38	7	2026-09-29 19:41:54.282	programa_ejecutado	\N	\N	\N	{"bloques": ["if", "es_noche"], "resultado": "no_ejecutado"}
1479	38	\N	2026-09-29 19:41:56.91	camara_posicion	1.5744016	17.67423	-30.162241	{"beta": 1.0413485697511344, "alpha": 4.764539418432114, "radius": 34.99454118233003}
1480	38	\N	2026-09-29 19:42:06.909	camara_posicion	1.5744016	17.67423	-30.162241	{"beta": 1.0413485697511344, "alpha": 4.764539418432114, "radius": 34.99454118233003}
1481	38	7	2026-09-29 19:42:11.082	programa_ejecutado	\N	\N	\N	{"bloques": ["es_dia", "if", "apaga_foco", "es_noche", "else", "enciende_foco"], "resultado": "invalido"}
1482	38	7	2026-09-29 19:42:12.143	programa_ejecutado	\N	\N	\N	{"bloques": ["es_dia", "if", "apaga_foco", "es_noche", "else", "enciende_foco"], "resultado": "invalido"}
1483	38	7	2026-09-29 19:42:12.341	programa_ejecutado	\N	\N	\N	{"bloques": ["es_dia", "if", "apaga_foco", "es_noche", "else", "enciende_foco"], "resultado": "invalido"}
1484	38	\N	2026-09-29 19:42:16.869	camara_posicion	1.5744016	17.67423	-30.162241	{"beta": 1.0413485697511344, "alpha": 4.764539418432114, "radius": 34.99454118233003}
1485	38	7	2026-09-29 19:42:21.312	programa_ejecutado	\N	\N	\N	{"bloques": ["es_dia", "else", "apaga_foco", "es_noche", "if"], "resultado": "invalido"}
1486	38	7	2026-09-29 19:42:25.205	programa_ejecutado	\N	\N	\N	{"bloques": ["es_dia", "else", "apaga_foco", "es_noche", "if"], "resultado": "invalido"}
1487	38	\N	2026-09-29 19:42:26.894	camara_posicion	1.5744016	17.67423	-30.162241	{"beta": 1.0413485697511344, "alpha": 4.764539418432114, "radius": 34.99454118233003}
1488	38	7	2026-09-29 19:42:34.905	programa_ejecutado	\N	\N	\N	{"bloques": ["es_dia", "if", "enciende_foco", "es_noche", "else"], "resultado": "invalido"}
1489	38	\N	2026-09-29 19:42:36.898	camara_posicion	1.5744016	17.67423	-30.162241	{"beta": 1.0413485697511344, "alpha": 4.764539418432114, "radius": 34.99454118233003}
1490	38	\N	2026-09-29 19:42:46.916	camara_posicion	1.5744016	17.67423	-30.162241	{"beta": 1.0413485697511344, "alpha": 4.764539418432114, "radius": 34.99454118233003}
1491	38	7	2026-09-29 19:42:52.042	programa_ejecutado	\N	\N	\N	{"bloques": ["if", "es_dia", "apaga_foco", "es_noche", "else", "enciende_foco"], "resultado": "ejecutado"}
1492	38	\N	2026-09-29 19:42:56.864	camara_posicion	1.5744016	17.67423	-30.162241	{"beta": 1.0413485697511344, "alpha": 4.764539418432114, "radius": 34.99454118233003}
1493	38	\N	2026-09-29 19:43:03.193	cambio_noche	\N	\N	\N	{"es_noche": true}
1494	38	\N	2026-09-29 19:43:03.839	cambio_noche	\N	\N	\N	{"es_noche": false}
1495	38	\N	2026-09-29 19:43:05.442	objeto_colocado	6.1783233	0	4.217764	{"id": 21, "tipo": "lampara"}
1496	38	\N	2026-09-29 19:43:06.92	camara_posicion	1.5744016	17.67423	-30.162241	{"beta": 1.0413485697511344, "alpha": 4.764539418432114, "radius": 34.99454118233003}
1497	38	\N	2026-09-29 19:43:16.911	camara_posicion	1.5744016	17.67423	-30.162241	{"beta": 1.0413485697511344, "alpha": 4.764539418432114, "radius": 34.99454118233003}
1498	38	\N	2026-09-29 19:43:26.913	camara_posicion	1.5744016	17.67423	-30.162241	{"beta": 1.0413485697511344, "alpha": 4.764539418432114, "radius": 34.99454118233003}
1499	40	\N	2026-09-29 19:45:33.089	camara_posicion	1.49422e-15	17.450493	-24.402466	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 30}
1500	40	\N	2026-09-29 19:45:43.089	camara_posicion	1.4563234e-15	17.007912	-23.783567	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 29.239136836706788}
1501	40	\N	2026-09-29 19:45:53.09	camara_posicion	1.4563234e-15	17.007912	-23.783567	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 29.239136836706788}
1502	40	\N	2026-09-29 19:46:03.096	camara_posicion	1.4563234e-15	17.007912	-23.783567	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 29.239136836706788}
1503	40	\N	2026-09-29 19:46:13.09	camara_posicion	1.4563234e-15	17.007912	-23.783567	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 29.239136836706788}
1504	40	\N	2026-09-29 19:46:23.09	camara_posicion	1.4563234e-15	17.007912	-23.783567	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 29.239136836706788}
1505	40	\N	2026-09-29 19:46:33.092	camara_posicion	1.4563234e-15	17.007912	-23.783567	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 29.239136836706788}
1506	40	\N	2026-09-29 19:46:43.09	camara_posicion	1.4563234e-15	17.007912	-23.783567	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 29.239136836706788}
1507	40	\N	2026-09-29 19:46:53.084	camara_posicion	1.4563234e-15	17.007912	-23.783567	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 29.239136836706788}
1508	40	\N	2026-09-29 19:47:03.091	camara_posicion	1.4563234e-15	17.007912	-23.783567	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 29.239136836706788}
1509	40	\N	2026-09-29 19:47:13.09	camara_posicion	1.4563234e-15	17.007912	-23.783567	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 29.239136836706788}
1510	40	\N	2026-09-29 19:47:23.09	camara_posicion	1.4563234e-15	17.007912	-23.783567	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 29.239136836706788}
1511	40	\N	2026-09-29 19:47:33.091	camara_posicion	1.4563234e-15	17.007912	-23.783567	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 29.239136836706788}
1512	40	\N	2026-09-29 19:47:43.092	camara_posicion	1.4563234e-15	17.007912	-23.783567	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 29.239136836706788}
1513	40	\N	2026-09-29 19:47:53.093	camara_posicion	1.4563234e-15	17.007912	-23.783567	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 29.239136836706788}
1514	40	\N	2026-09-29 19:48:03.084	camara_posicion	1.4563234e-15	17.007912	-23.783567	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 29.239136836706788}
1515	40	\N	2026-09-29 19:48:13.091	camara_posicion	1.4563234e-15	17.007912	-23.783567	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 29.239136836706788}
1516	40	\N	2026-09-29 19:48:23.092	camara_posicion	1.4563234e-15	17.007912	-23.783567	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 29.239136836706788}
1517	40	\N	2026-09-29 19:48:33.092	camara_posicion	1.4563234e-15	17.007912	-23.783567	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 29.239136836706788}
1518	40	\N	2026-09-29 19:48:43.091	camara_posicion	1.4563234e-15	17.007912	-23.783567	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 29.239136836706788}
1519	40	\N	2026-09-29 19:48:53.089	camara_posicion	1.4563234e-15	17.007912	-23.783567	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 29.239136836706788}
1520	40	\N	2026-09-29 19:48:57.1	modal_abierto	\N	\N	\N	{"modal": "matematicas"}
1521	40	\N	2026-09-29 19:49:03.091	camara_posicion	1.4563234e-15	17.007912	-23.783567	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 29.239136836706788}
1522	40	\N	2026-09-29 19:49:13.085	camara_posicion	1.4563234e-15	17.007912	-23.783567	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 29.239136836706788}
1523	40	1	2026-09-29 19:49:15.506	matematicas_intento	\N	\N	\N	{"area": 400, "volumen": 6000, "correcto": true, "perimetro": 80, "unidad_area": "m2", "unidad_volumen": "m3", "unidad_perimetro": "m"}
1524	40	\N	2026-09-29 19:49:15.507	modal_cerrado	\N	\N	\N	{"modal": "matematicas"}
1525	40	\N	2026-09-29 19:49:17.11	modal_abierto	\N	\N	\N	{"modal": "concreto"}
1526	40	\N	2026-09-29 19:49:23.084	camara_posicion	1.4563234e-15	17.007912	-23.783567	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 29.239136836706788}
1527	40	2	2026-09-29 19:49:29.657	concreto_intento	\N	\N	\N	{"agua": 600, "arena": 2000, "grava": 3000, "cemento": 1000, "correcto": true}
1528	40	\N	2026-09-29 19:49:29.659	modal_cerrado	\N	\N	\N	{"modal": "concreto"}
1529	40	\N	2026-09-29 19:49:29.659	modal_cerrado	\N	\N	\N	{"modal": "concreto"}
1530	40	\N	2026-09-29 19:49:33.084	camara_posicion	1.4563234e-15	17.007912	-23.783567	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 29.239136836706788}
1531	40	\N	2026-09-29 19:49:43.084	camara_posicion	1.4563234e-15	17.007912	-23.783567	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 29.239136836706788}
1532	40	\N	2026-09-29 19:49:47.857	pared_construida	0	0	0	{"alto": 10, "modo": "puerta", "ancho": 20, "material": "block"}
1533	40	\N	2026-09-29 19:49:53.09	camara_posicion	1.4563234e-15	17.007912	-23.783567	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 29.239136836706788}
1534	40	\N	2026-09-29 19:50:03.091	camara_posicion	1.4563234e-15	17.007912	-23.783567	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 29.239136836706788}
1535	40	\N	2026-09-29 19:50:08.6	pared_construida	0	0	0	{"alto": 10, "modo": "puerta", "ancho": 20, "material": "block"}
1536	40	\N	2026-09-29 19:50:13.095	camara_posicion	1.4563234e-15	17.007912	-23.783567	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 29.239136836706788}
1537	40	\N	2026-09-29 19:50:23.094	camara_posicion	-23.783566	17.007912	0.007471828	{"beta": 0.95, "alpha": -3.141906812854956, "radius": 29.239136836706788}
1538	40	\N	2026-09-29 19:50:33.094	camara_posicion	-23.783566	17.007912	0.007471828	{"beta": 0.95, "alpha": -3.141906812854956, "radius": 29.239136836706788}
1539	40	\N	2026-09-29 19:50:38.258	pared_construida	0	0	0	{"alto": 10, "modo": "simple", "ancho": 10, "material": "block"}
1540	40	\N	2026-09-29 19:50:43.094	camara_posicion	-23.783566	17.007912	0.007471828	{"beta": 0.95, "alpha": -3.141906812854956, "radius": 29.239136836706788}
1541	40	\N	2026-09-29 19:50:48.457	pared_construida	0	0	0	{"alto": 10, "modo": "simple", "ancho": 10, "material": "block"}
1542	40	\N	2026-09-29 19:50:53.102	camara_posicion	-23.783566	17.007912	0.007471828	{"beta": 0.95, "alpha": -3.141906812854956, "radius": 29.239136836706788}
1543	40	\N	2026-09-29 19:51:03.125	camara_posicion	23.68651	17.007912	2.1464713	{"beta": 0.95, "alpha": -6.192812158510534, "radius": 29.239136836706788}
1544	40	\N	2026-09-29 19:51:03.585	pared_construida	0	0	0	{"alto": 10, "modo": "simple", "ancho": 5, "material": "block"}
1545	40	\N	2026-09-29 19:51:13.083	camara_posicion	-23.774342	17.007912	-0.6624164	{"beta": 0.95, "alpha": -3.113737198727375, "radius": 29.239136836706788}
1546	40	\N	2026-09-29 19:51:23.11	camara_posicion	-23.774342	17.007912	-0.6624164	{"beta": 0.95, "alpha": -3.113737198727375, "radius": 29.239136836706788}
1547	40	\N	2026-09-29 19:51:33.09	camara_posicion	22.255232	17.007912	8.388251	{"beta": 0.95, "alpha": -5.922739910057518, "radius": 29.239136836706788}
1548	40	\N	2026-09-29 19:51:43.083	camara_posicion	21.518955	17.007912	-10.128804	{"beta": 0.95, "alpha": -6.723112998435907, "radius": 29.239136836706788}
1549	40	\N	2026-09-29 19:51:53.1	camara_posicion	21.518955	17.007912	-10.128804	{"beta": 0.95, "alpha": -6.723112998435907, "radius": 29.239136836706788}
1550	40	\N	2026-09-29 19:52:03.098	camara_posicion	14.996335	24.858463	-3.4776187	{"beta": 0.5544734849118746, "alpha": -6.511055494317627, "radius": 29.239136836706788}
1551	40	\N	2026-09-29 19:52:04.773	pared_construida	0	0	0	{"alto": 10, "modo": "simple", "ancho": 5, "material": "block"}
1552	40	\N	2026-09-29 19:52:13.129	camara_posicion	14.996335	24.858463	-3.4776187	{"beta": 0.5544734849118746, "alpha": -6.511055494317627, "radius": 29.239136836706788}
1553	40	\N	2026-09-29 19:52:23.13	camara_posicion	7.9654756	6.5788713	-27.353186	{"beta": 1.343850999003675, "alpha": -7.57060997661815, "radius": 29.239136836706788}
1554	40	\N	2026-09-29 19:52:33.128	camara_posicion	0.76855546	16.604525	-24.05465	{"beta": 0.9668598805729003, "alpha": -7.8220421086620116, "radius": 29.239136836706788}
1555	42	\N	2026-09-30 14:29:47.109	camara_posicion	1.7683174e-15	20.651585	-28.878817	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 35.50315403702347}
1556	43	\N	2026-09-30 14:30:06.513	camara_posicion	1.49422e-15	17.450493	-24.402466	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 30}
1557	44	\N	2026-09-30 18:25:26.067	camara_posicion	2.98844e-15	34.900986	-48.80493	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 60}
1558	44	\N	2026-09-30 18:25:36.023	camara_posicion	2.98844e-15	34.900986	-48.80493	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 60}
1559	44	\N	2026-09-30 18:25:46.055	camara_posicion	2.98844e-15	34.900986	-48.80493	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 60}
1560	44	\N	2026-09-30 18:25:56.03	camara_posicion	2.98844e-15	34.900986	-48.80493	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 60}
1561	44	\N	2026-09-30 18:26:06.042	camara_posicion	2.98844e-15	34.900986	-48.80493	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 60}
1562	44	\N	2026-09-30 18:26:16.044	camara_posicion	2.98844e-15	34.900986	-48.80493	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 60}
1563	44	\N	2026-09-30 18:26:26.024	camara_posicion	2.98844e-15	34.900986	-48.80493	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 60}
1564	44	\N	2026-09-30 18:26:36.059	camara_posicion	2.98844e-15	34.900986	-48.80493	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 60}
1565	44	\N	2026-09-30 18:26:46.056	camara_posicion	2.98844e-15	34.900986	-48.80493	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 60}
1566	44	\N	2026-09-30 18:26:56.086	camara_posicion	2.98844e-15	34.900986	-48.80493	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 60}
1567	44	\N	2026-09-30 18:27:06.052	camara_posicion	2.98844e-15	34.900986	-48.80493	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 60}
1568	44	\N	2026-09-30 18:27:16.042	camara_posicion	2.98844e-15	34.900986	-48.80493	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 60}
1569	45	\N	2026-09-30 19:41:50.029	camara_posicion	48.13081	34.900986	8.0837	{"beta": 0.95, "alpha": 0.1663996908855293, "radius": 60}
1570	45	\N	2026-09-30 19:41:53.126	objeto_eliminado	\N	\N	\N	{"id": 7, "tipo": "wall_block"}
1571	46	\N	2026-09-30 19:42:06.958	camara_posicion	28.380955	9.637734	-1.2788446	{"beta": 1.2437389131106462, "alpha": -0.0450294947004784, "radius": 30}
1572	46	\N	2026-09-30 19:42:17.04	camara_posicion	-14.103135	15.45287	44.303062	{"beta": 1.2499173786630964, "alpha": 1.878986566112836, "radius": 48.994395586908524}
1573	46	\N	2026-09-30 19:42:27.005	camara_posicion	46.010406	15.45287	-6.6859508	{"beta": 1.2499173786630964, "alpha": 6.138881484625866, "radius": 48.994395586908524}
1574	46	\N	2026-09-30 19:42:36.963	camara_posicion	46.010406	15.45287	-6.6859508	{"beta": 1.2499173786630964, "alpha": 6.138881484625866, "radius": 48.994395586908524}
1575	46	\N	2026-09-30 19:42:41.634	pared_construida	0	0	0	{"alto": 15, "modo": "ventana", "ancho": 5, "material": "block"}
1576	46	\N	2026-09-30 19:42:46.933	camara_posicion	46.010406	15.45287	-6.6859508	{"beta": 1.2499173786630964, "alpha": 6.138881484625866, "radius": 48.994395586908524}
1577	46	\N	2026-09-30 19:42:56.979	camara_posicion	46.010406	15.45287	-6.6859508	{"beta": 1.2499173786630964, "alpha": 6.138881484625866, "radius": 48.994395586908524}
1578	46	\N	2026-09-30 19:43:06.953	camara_posicion	46.010406	15.45287	-6.6859508	{"beta": 1.2499173786630964, "alpha": 6.138881484625866, "radius": 48.994395586908524}
1579	46	\N	2026-09-30 19:43:16.966	camara_posicion	17.186222	5.772095	-2.4973965	{"beta": 1.2499173786630964, "alpha": 6.138881484625866, "radius": 18.300827672140425}
1580	46	\N	2026-09-30 19:43:27.084	camara_posicion	-46.835964	17.122215	21.455046	{"beta": 1.2499173786630964, "alpha": 2.712032218089731, "radius": 54.287169907274404}
1581	46	\N	2026-09-30 19:43:36.979	camara_posicion	15.395171	17.122215	-49.162132	{"beta": 1.2499173786630964, "alpha": -1.2673184764573402, "radius": 54.287169907274404}
1582	47	\N	2026-10-01 02:02:58.224	camara_posicion	13.344608	28.965244	38.24311	{"beta": 0.95, "alpha": -5.048120515292076, "radius": 49.79557534242973}
1583	48	\N	2026-10-01 15:54:17.17	camara_posicion	2.5289581e-15	29.53485	-41.301018	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 50.7748111191888}
1584	48	\N	2026-10-01 15:54:27.179	camara_posicion	2.336454e-15	27.286661	-38.157192	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 46.90983923642094}
1585	48	\N	2026-10-01 15:54:37.176	camara_posicion	2.336454e-15	27.286661	-38.157192	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 46.90983923642094}
1586	49	\N	2026-10-01 16:28:15.875	camara_posicion	-53.861084	26.431149	-0.61482155	{"beta": 1.114619455051226, "alpha": -3.1301782002911125, "radius": 60}
1587	49	\N	2026-10-01 16:28:25.864	camara_posicion	-53.861084	26.431149	-0.61482155	{"beta": 1.114619455051226, "alpha": -3.1301782002911125, "radius": 60}
1588	49	\N	2026-10-01 16:28:35.873	camara_posicion	-37.90341	18.600271	-0.43266553	{"beta": 1.114619455051226, "alpha": -3.1301782002911125, "radius": 42.223524470933185}
1589	49	\N	2026-10-01 16:28:45.879	camara_posicion	-37.90341	18.600271	-0.43266553	{"beta": 1.114619455051226, "alpha": -3.1301782002911125, "radius": 42.223524470933185}
1590	49	\N	2026-10-01 16:28:55.837	camara_posicion	3.907459	17.173264	-38.37495	{"beta": 1.151932631167833, "alpha": -1.4693228840776995, "radius": 42.223524470933185}
1591	49	\N	2026-10-01 16:29:05.872	camara_posicion	-34.462536	20.01952	13.941963	{"beta": 1.0768185096137903, "alpha": 9.040351739731353, "radius": 42.223524470933185}
1592	49	\N	2026-10-01 16:29:15.824	camara_posicion	33.616405	12.46128	22.304255	{"beta": 1.2712084322397628, "alpha": 19.435358231684383, "radius": 42.223524470933185}
1593	49	\N	2026-10-01 16:29:25.915	camara_posicion	5.870579	18.960537	-37.267418	{"beta": 1.105092843511703, "alpha": 30.001372083760298, "radius": 42.223524470933185}
1594	49	\N	2026-10-01 16:29:35.883	camara_posicion	-37.376842	1.6172764	19.57504	{"beta": 1.5324842212633139, "alpha": 40.35826058484349, "radius": 42.223524470933185}
1595	49	\N	2026-10-01 16:29:45.858	camara_posicion	37.11811	20.107887	0.86306936	{"beta": 1.0744400123636806, "alpha": 44.0055449359124, "radius": 42.223524470933185}
1596	49	\N	2026-10-01 16:29:55.856	camara_posicion	37.110905	20.107887	1.1312474	{"beta": 1.0744400123636806, "alpha": 44.0127705990219, "radius": 42.223524470933185}
1597	49	\N	2026-10-01 16:30:05.862	camara_posicion	37.110905	20.107887	1.1312474	{"beta": 1.0744400123636806, "alpha": 44.0127705990219, "radius": 42.223524470933185}
1598	49	\N	2026-10-01 16:30:15.846	camara_posicion	37.110905	20.107887	1.1312474	{"beta": 1.0744400123636806, "alpha": 44.0127705990219, "radius": 42.223524470933185}
1599	49	\N	2026-10-01 16:30:25.848	camara_posicion	37.110905	20.107887	1.1312474	{"beta": 1.0744400123636806, "alpha": 44.0127705990219, "radius": 42.223524470933185}
1600	49	\N	2026-10-01 16:30:35.844	camara_posicion	37.110905	20.107887	1.1312474	{"beta": 1.0744400123636806, "alpha": 44.0127705990219, "radius": 42.223524470933185}
1601	49	\N	2026-10-01 16:30:45.851	camara_posicion	37.110905	20.107887	1.1312474	{"beta": 1.0744400123636806, "alpha": 44.0127705990219, "radius": 42.223524470933185}
1602	49	\N	2026-10-01 16:30:55.842	camara_posicion	37.110905	20.107887	1.1312474	{"beta": 1.0744400123636806, "alpha": 44.0127705990219, "radius": 42.223524470933185}
1603	49	\N	2026-10-01 16:31:05.864	camara_posicion	37.110905	20.107887	1.1312474	{"beta": 1.0744400123636806, "alpha": 44.0127705990219, "radius": 42.223524470933185}
1604	49	\N	2026-10-01 16:31:15.876	camara_posicion	37.110905	20.107887	1.1312474	{"beta": 1.0744400123636806, "alpha": 44.0127705990219, "radius": 42.223524470933185}
1605	49	\N	2026-10-01 16:31:25.842	camara_posicion	37.110905	20.107887	1.1312474	{"beta": 1.0744400123636806, "alpha": 44.0127705990219, "radius": 42.223524470933185}
1606	49	\N	2026-10-01 16:31:35.837	camara_posicion	37.110905	20.107887	1.1312474	{"beta": 1.0744400123636806, "alpha": 44.0127705990219, "radius": 42.223524470933185}
1607	49	\N	2026-10-01 16:31:45.852	camara_posicion	37.110905	20.107887	1.1312474	{"beta": 1.0744400123636806, "alpha": 44.0127705990219, "radius": 42.223524470933185}
1608	49	\N	2026-10-01 16:31:55.872	camara_posicion	37.110905	20.107887	1.1312474	{"beta": 1.0744400123636806, "alpha": 44.0127705990219, "radius": 42.223524470933185}
1609	49	\N	2026-10-01 16:32:05.831	camara_posicion	37.110905	20.107887	1.1312474	{"beta": 1.0744400123636806, "alpha": 44.0127705990219, "radius": 42.223524470933185}
1610	49	\N	2026-10-01 16:32:15.86	camara_posicion	37.110905	20.107887	1.1312474	{"beta": 1.0744400123636806, "alpha": 44.0127705990219, "radius": 42.223524470933185}
1611	49	\N	2026-10-01 16:32:25.853	camara_posicion	37.110905	20.107887	1.1312474	{"beta": 1.0744400123636806, "alpha": 44.0127705990219, "radius": 42.223524470933185}
1612	49	\N	2026-10-01 16:32:35.87	camara_posicion	37.110905	20.107887	1.1312474	{"beta": 1.0744400123636806, "alpha": 44.0127705990219, "radius": 42.223524470933185}
1613	49	\N	2026-10-01 16:32:45.86	camara_posicion	37.110905	20.107887	1.1312474	{"beta": 1.0744400123636806, "alpha": 44.0127705990219, "radius": 42.223524470933185}
1614	49	\N	2026-10-01 16:32:55.837	camara_posicion	37.110905	20.107887	1.1312474	{"beta": 1.0744400123636806, "alpha": 44.0127705990219, "radius": 42.223524470933185}
1615	49	\N	2026-10-01 16:33:05.855	camara_posicion	37.110905	20.107887	1.1312474	{"beta": 1.0744400123636806, "alpha": 44.0127705990219, "radius": 42.223524470933185}
1616	49	\N	2026-10-01 16:33:15.828	camara_posicion	37.110905	20.107887	1.1312474	{"beta": 1.0744400123636806, "alpha": 44.0127705990219, "radius": 42.223524470933185}
1617	49	\N	2026-10-01 16:33:25.836	camara_posicion	37.110905	20.107887	1.1312474	{"beta": 1.0744400123636806, "alpha": 44.0127705990219, "radius": 42.223524470933185}
1618	49	\N	2026-10-01 16:33:35.867	camara_posicion	37.110905	20.107887	1.1312474	{"beta": 1.0744400123636806, "alpha": 44.0127705990219, "radius": 42.223524470933185}
1619	49	\N	2026-10-01 16:33:45.842	camara_posicion	37.110905	20.107887	1.1312474	{"beta": 1.0744400123636806, "alpha": 44.0127705990219, "radius": 42.223524470933185}
1620	49	\N	2026-10-01 16:33:55.831	camara_posicion	37.110905	20.107887	1.1312474	{"beta": 1.0744400123636806, "alpha": 44.0127705990219, "radius": 42.223524470933185}
1621	49	\N	2026-10-01 16:34:05.851	camara_posicion	37.110905	20.107887	1.1312474	{"beta": 1.0744400123636806, "alpha": 44.0127705990219, "radius": 42.223524470933185}
1622	49	\N	2026-10-01 16:34:15.825	camara_posicion	37.110905	20.107887	1.1312474	{"beta": 1.0744400123636806, "alpha": 44.0127705990219, "radius": 42.223524470933185}
1623	49	\N	2026-10-01 16:34:25.85	camara_posicion	37.110905	20.107887	1.1312474	{"beta": 1.0744400123636806, "alpha": 44.0127705990219, "radius": 42.223524470933185}
1624	49	\N	2026-10-01 16:34:35.869	camara_posicion	37.110905	20.107887	1.1312474	{"beta": 1.0744400123636806, "alpha": 44.0127705990219, "radius": 42.223524470933185}
1625	49	\N	2026-10-01 16:34:45.84	camara_posicion	37.110905	20.107887	1.1312474	{"beta": 1.0744400123636806, "alpha": 44.0127705990219, "radius": 42.223524470933185}
1626	49	\N	2026-10-01 16:34:55.983	camara_posicion	37.110905	20.107887	1.1312474	{"beta": 1.0744400123636806, "alpha": 44.0127705990219, "radius": 42.223524470933185}
1627	49	\N	2026-10-01 16:35:05.849	camara_posicion	37.110905	20.107887	1.1312474	{"beta": 1.0744400123636806, "alpha": 44.0127705990219, "radius": 42.223524470933185}
1628	49	\N	2026-10-01 16:35:15.851	camara_posicion	37.110905	20.107887	1.1312474	{"beta": 1.0744400123636806, "alpha": 44.0127705990219, "radius": 42.223524470933185}
1629	49	\N	2026-10-01 16:35:25.838	camara_posicion	37.110905	20.107887	1.1312474	{"beta": 1.0744400123636806, "alpha": 44.0127705990219, "radius": 42.223524470933185}
1630	49	\N	2026-10-01 16:35:35.841	camara_posicion	37.110905	20.107887	1.1312474	{"beta": 1.0744400123636806, "alpha": 44.0127705990219, "radius": 42.223524470933185}
1631	49	\N	2026-10-01 16:35:45.858	camara_posicion	37.110905	20.107887	1.1312474	{"beta": 1.0744400123636806, "alpha": 44.0127705990219, "radius": 42.223524470933185}
1632	49	\N	2026-10-01 16:35:55.852	camara_posicion	37.110905	20.107887	1.1312474	{"beta": 1.0744400123636806, "alpha": 44.0127705990219, "radius": 42.223524470933185}
1633	49	\N	2026-10-01 16:36:05.823	camara_posicion	37.110905	20.107887	1.1312474	{"beta": 1.0744400123636806, "alpha": 44.0127705990219, "radius": 42.223524470933185}
1634	49	\N	2026-10-01 16:36:15.861	camara_posicion	37.110905	20.107887	1.1312474	{"beta": 1.0744400123636806, "alpha": 44.0127705990219, "radius": 42.223524470933185}
1635	49	\N	2026-10-01 16:36:25.856	camara_posicion	37.110905	20.107887	1.1312474	{"beta": 1.0744400123636806, "alpha": 44.0127705990219, "radius": 42.223524470933185}
1636	49	\N	2026-10-01 16:36:35.885	camara_posicion	37.110905	20.107887	1.1312474	{"beta": 1.0744400123636806, "alpha": 44.0127705990219, "radius": 42.223524470933185}
1637	49	\N	2026-10-01 16:36:45.869	camara_posicion	37.110905	20.107887	1.1312474	{"beta": 1.0744400123636806, "alpha": 44.0127705990219, "radius": 42.223524470933185}
1638	49	\N	2026-10-01 16:36:55.849	camara_posicion	37.110905	20.107887	1.1312474	{"beta": 1.0744400123636806, "alpha": 44.0127705990219, "radius": 42.223524470933185}
1639	49	\N	2026-10-01 16:37:05.847	camara_posicion	37.110905	20.107887	1.1312474	{"beta": 1.0744400123636806, "alpha": 44.0127705990219, "radius": 42.223524470933185}
1640	49	\N	2026-10-01 16:37:15.859	camara_posicion	37.110905	20.107887	1.1312474	{"beta": 1.0744400123636806, "alpha": 44.0127705990219, "radius": 42.223524470933185}
1641	49	\N	2026-10-01 16:37:25.838	camara_posicion	37.110905	20.107887	1.1312474	{"beta": 1.0744400123636806, "alpha": 44.0127705990219, "radius": 42.223524470933185}
1642	49	\N	2026-10-01 16:37:35.847	camara_posicion	37.110905	20.107887	1.1312474	{"beta": 1.0744400123636806, "alpha": 44.0127705990219, "radius": 42.223524470933185}
1643	49	\N	2026-10-01 16:37:45.856	camara_posicion	37.110905	20.107887	1.1312474	{"beta": 1.0744400123636806, "alpha": 44.0127705990219, "radius": 42.223524470933185}
1644	49	\N	2026-10-01 16:37:55.827	camara_posicion	37.110905	20.107887	1.1312474	{"beta": 1.0744400123636806, "alpha": 44.0127705990219, "radius": 42.223524470933185}
1645	49	\N	2026-10-01 16:38:05.885	camara_posicion	37.110905	20.107887	1.1312474	{"beta": 1.0744400123636806, "alpha": 44.0127705990219, "radius": 42.223524470933185}
1646	49	\N	2026-10-01 16:38:15.843	camara_posicion	37.110905	20.107887	1.1312474	{"beta": 1.0744400123636806, "alpha": 44.0127705990219, "radius": 42.223524470933185}
1647	49	\N	2026-10-01 16:38:25.842	camara_posicion	37.110905	20.107887	1.1312474	{"beta": 1.0744400123636806, "alpha": 44.0127705990219, "radius": 42.223524470933185}
1648	49	\N	2026-10-01 16:38:35.874	camara_posicion	37.110905	20.107887	1.1312474	{"beta": 1.0744400123636806, "alpha": 44.0127705990219, "radius": 42.223524470933185}
1649	49	\N	2026-10-01 16:38:45.839	camara_posicion	37.110905	20.107887	1.1312474	{"beta": 1.0744400123636806, "alpha": 44.0127705990219, "radius": 42.223524470933185}
1650	49	\N	2026-10-01 16:38:55.827	camara_posicion	37.110905	20.107887	1.1312474	{"beta": 1.0744400123636806, "alpha": 44.0127705990219, "radius": 42.223524470933185}
1651	49	\N	2026-10-01 16:39:05.833	camara_posicion	37.110905	20.107887	1.1312474	{"beta": 1.0744400123636806, "alpha": 44.0127705990219, "radius": 42.223524470933185}
1652	49	\N	2026-10-01 16:39:15.87	camara_posicion	37.110905	20.107887	1.1312474	{"beta": 1.0744400123636806, "alpha": 44.0127705990219, "radius": 42.223524470933185}
1653	49	\N	2026-10-01 16:39:25.861	camara_posicion	37.110905	20.107887	1.1312474	{"beta": 1.0744400123636806, "alpha": 44.0127705990219, "radius": 42.223524470933185}
1654	49	\N	2026-10-01 16:39:35.849	camara_posicion	37.110905	20.107887	1.1312474	{"beta": 1.0744400123636806, "alpha": 44.0127705990219, "radius": 42.223524470933185}
1655	49	\N	2026-10-01 16:39:45.84	camara_posicion	37.110905	20.107887	1.1312474	{"beta": 1.0744400123636806, "alpha": 44.0127705990219, "radius": 42.223524470933185}
1656	49	\N	2026-10-01 16:39:55.868	camara_posicion	37.110905	20.107887	1.1312474	{"beta": 1.0744400123636806, "alpha": 44.0127705990219, "radius": 42.223524470933185}
1657	49	\N	2026-10-01 16:40:05.99	camara_posicion	37.110905	20.107887	1.1312474	{"beta": 1.0744400123636806, "alpha": 44.0127705990219, "radius": 42.223524470933185}
1658	49	\N	2026-10-01 16:40:15.986	camara_posicion	37.110905	20.107887	1.1312474	{"beta": 1.0744400123636806, "alpha": 44.0127705990219, "radius": 42.223524470933185}
1659	49	\N	2026-10-01 16:40:25.99	camara_posicion	37.110905	20.107887	1.1312474	{"beta": 1.0744400123636806, "alpha": 44.0127705990219, "radius": 42.223524470933185}
1660	49	\N	2026-10-01 16:40:35.98	camara_posicion	37.110905	20.107887	1.1312474	{"beta": 1.0744400123636806, "alpha": 44.0127705990219, "radius": 42.223524470933185}
1661	49	\N	2026-10-01 16:40:45.989	camara_posicion	37.110905	20.107887	1.1312474	{"beta": 1.0744400123636806, "alpha": 44.0127705990219, "radius": 42.223524470933185}
1662	49	\N	2026-10-01 16:40:55.995	camara_posicion	37.110905	20.107887	1.1312474	{"beta": 1.0744400123636806, "alpha": 44.0127705990219, "radius": 42.223524470933185}
1663	49	\N	2026-10-01 16:42:01.989	camara_posicion	37.110905	20.107887	1.1312474	{"beta": 1.0744400123636806, "alpha": 44.0127705990219, "radius": 42.223524470933185}
1664	49	\N	2026-10-01 16:43:01.994	camara_posicion	37.110905	20.107887	1.1312474	{"beta": 1.0744400123636806, "alpha": 44.0127705990219, "radius": 42.223524470933185}
1665	49	\N	2026-10-01 16:44:02.006	camara_posicion	37.110905	20.107887	1.1312474	{"beta": 1.0744400123636806, "alpha": 44.0127705990219, "radius": 42.223524470933185}
1666	49	\N	2026-10-01 16:45:01.985	camara_posicion	37.110905	20.107887	1.1312474	{"beta": 1.0744400123636806, "alpha": 44.0127705990219, "radius": 42.223524470933185}
1667	49	\N	2026-10-01 16:46:01.983	camara_posicion	37.110905	20.107887	1.1312474	{"beta": 1.0744400123636806, "alpha": 44.0127705990219, "radius": 42.223524470933185}
1668	49	\N	2026-10-01 16:47:01.991	camara_posicion	37.110905	20.107887	1.1312474	{"beta": 1.0744400123636806, "alpha": 44.0127705990219, "radius": 42.223524470933185}
1669	49	\N	2026-10-01 16:48:01.98	camara_posicion	37.110905	20.107887	1.1312474	{"beta": 1.0744400123636806, "alpha": 44.0127705990219, "radius": 42.223524470933185}
1670	49	\N	2026-10-01 16:49:02.002	camara_posicion	37.110905	20.107887	1.1312474	{"beta": 1.0744400123636806, "alpha": 44.0127705990219, "radius": 42.223524470933185}
1671	49	\N	2026-10-01 16:50:01.991	camara_posicion	37.110905	20.107887	1.1312474	{"beta": 1.0744400123636806, "alpha": 44.0127705990219, "radius": 42.223524470933185}
1672	49	\N	2026-10-01 16:51:01.994	camara_posicion	37.110905	20.107887	1.1312474	{"beta": 1.0744400123636806, "alpha": 44.0127705990219, "radius": 42.223524470933185}
1673	49	\N	2026-10-01 16:52:01.99	camara_posicion	37.110905	20.107887	1.1312474	{"beta": 1.0744400123636806, "alpha": 44.0127705990219, "radius": 42.223524470933185}
1674	49	\N	2026-10-01 16:53:01.984	camara_posicion	37.110905	20.107887	1.1312474	{"beta": 1.0744400123636806, "alpha": 44.0127705990219, "radius": 42.223524470933185}
1675	49	\N	2026-10-01 16:54:01.995	camara_posicion	37.110905	20.107887	1.1312474	{"beta": 1.0744400123636806, "alpha": 44.0127705990219, "radius": 42.223524470933185}
1676	49	\N	2026-10-01 16:55:02.043	camara_posicion	37.110905	20.107887	1.1312474	{"beta": 1.0744400123636806, "alpha": 44.0127705990219, "radius": 42.223524470933185}
1677	49	\N	2026-10-01 16:56:01.986	camara_posicion	37.110905	20.107887	1.1312474	{"beta": 1.0744400123636806, "alpha": 44.0127705990219, "radius": 42.223524470933185}
1678	49	\N	2026-10-01 16:57:01.983	camara_posicion	37.110905	20.107887	1.1312474	{"beta": 1.0744400123636806, "alpha": 44.0127705990219, "radius": 42.223524470933185}
1679	49	\N	2026-10-01 16:58:01.987	camara_posicion	37.110905	20.107887	1.1312474	{"beta": 1.0744400123636806, "alpha": 44.0127705990219, "radius": 42.223524470933185}
1680	49	\N	2026-10-01 16:59:01.986	camara_posicion	37.110905	20.107887	1.1312474	{"beta": 1.0744400123636806, "alpha": 44.0127705990219, "radius": 42.223524470933185}
1681	49	\N	2026-10-01 17:00:01.982	camara_posicion	37.110905	20.107887	1.1312474	{"beta": 1.0744400123636806, "alpha": 44.0127705990219, "radius": 42.223524470933185}
1682	49	\N	2026-10-01 17:01:01.984	camara_posicion	37.110905	20.107887	1.1312474	{"beta": 1.0744400123636806, "alpha": 44.0127705990219, "radius": 42.223524470933185}
1683	49	\N	2026-10-01 17:02:01.99	camara_posicion	37.110905	20.107887	1.1312474	{"beta": 1.0744400123636806, "alpha": 44.0127705990219, "radius": 42.223524470933185}
1684	49	\N	2026-10-01 17:03:01.981	camara_posicion	37.110905	20.107887	1.1312474	{"beta": 1.0744400123636806, "alpha": 44.0127705990219, "radius": 42.223524470933185}
1685	49	\N	2026-10-01 17:04:01.989	camara_posicion	37.110905	20.107887	1.1312474	{"beta": 1.0744400123636806, "alpha": 44.0127705990219, "radius": 42.223524470933185}
1686	49	\N	2026-10-01 17:05:01.984	camara_posicion	37.110905	20.107887	1.1312474	{"beta": 1.0744400123636806, "alpha": 44.0127705990219, "radius": 42.223524470933185}
1687	49	\N	2026-10-01 17:06:01.984	camara_posicion	37.110905	20.107887	1.1312474	{"beta": 1.0744400123636806, "alpha": 44.0127705990219, "radius": 42.223524470933185}
1688	49	\N	2026-10-01 17:07:01.988	camara_posicion	37.110905	20.107887	1.1312474	{"beta": 1.0744400123636806, "alpha": 44.0127705990219, "radius": 42.223524470933185}
1689	49	\N	2026-10-01 17:08:01.981	camara_posicion	37.110905	20.107887	1.1312474	{"beta": 1.0744400123636806, "alpha": 44.0127705990219, "radius": 42.223524470933185}
1690	49	\N	2026-10-01 17:09:01.98	camara_posicion	37.110905	20.107887	1.1312474	{"beta": 1.0744400123636806, "alpha": 44.0127705990219, "radius": 42.223524470933185}
1691	49	\N	2026-10-01 17:10:01.982	camara_posicion	37.110905	20.107887	1.1312474	{"beta": 1.0744400123636806, "alpha": 44.0127705990219, "radius": 42.223524470933185}
1692	49	\N	2026-10-01 17:11:01.994	camara_posicion	37.110905	20.107887	1.1312474	{"beta": 1.0744400123636806, "alpha": 44.0127705990219, "radius": 42.223524470933185}
1693	49	\N	2026-10-01 17:12:01.985	camara_posicion	37.110905	20.107887	1.1312474	{"beta": 1.0744400123636806, "alpha": 44.0127705990219, "radius": 42.223524470933185}
1694	49	\N	2026-10-01 17:13:01.995	camara_posicion	37.110905	20.107887	1.1312474	{"beta": 1.0744400123636806, "alpha": 44.0127705990219, "radius": 42.223524470933185}
1695	49	\N	2026-10-01 17:14:01.989	camara_posicion	37.110905	20.107887	1.1312474	{"beta": 1.0744400123636806, "alpha": 44.0127705990219, "radius": 42.223524470933185}
1696	49	\N	2026-10-01 17:15:01.984	camara_posicion	37.110905	20.107887	1.1312474	{"beta": 1.0744400123636806, "alpha": 44.0127705990219, "radius": 42.223524470933185}
1697	49	\N	2026-10-01 17:16:01.993	camara_posicion	37.110905	20.107887	1.1312474	{"beta": 1.0744400123636806, "alpha": 44.0127705990219, "radius": 42.223524470933185}
1698	49	\N	2026-10-01 17:17:01.983	camara_posicion	37.110905	20.107887	1.1312474	{"beta": 1.0744400123636806, "alpha": 44.0127705990219, "radius": 42.223524470933185}
1699	49	\N	2026-10-01 17:18:01.989	camara_posicion	37.110905	20.107887	1.1312474	{"beta": 1.0744400123636806, "alpha": 44.0127705990219, "radius": 42.223524470933185}
1700	49	\N	2026-10-01 17:19:01.98	camara_posicion	37.110905	20.107887	1.1312474	{"beta": 1.0744400123636806, "alpha": 44.0127705990219, "radius": 42.223524470933185}
1701	49	\N	2026-10-01 17:20:01.987	camara_posicion	37.110905	20.107887	1.1312474	{"beta": 1.0744400123636806, "alpha": 44.0127705990219, "radius": 42.223524470933185}
1702	49	\N	2026-10-01 17:21:01.988	camara_posicion	37.110905	20.107887	1.1312474	{"beta": 1.0744400123636806, "alpha": 44.0127705990219, "radius": 42.223524470933185}
1703	49	\N	2026-10-01 17:22:01.985	camara_posicion	37.110905	20.107887	1.1312474	{"beta": 1.0744400123636806, "alpha": 44.0127705990219, "radius": 42.223524470933185}
1704	49	\N	2026-10-01 17:23:01.996	camara_posicion	37.110905	20.107887	1.1312474	{"beta": 1.0744400123636806, "alpha": 44.0127705990219, "radius": 42.223524470933185}
1705	49	\N	2026-10-01 17:24:01.995	camara_posicion	37.110905	20.107887	1.1312474	{"beta": 1.0744400123636806, "alpha": 44.0127705990219, "radius": 42.223524470933185}
1706	49	\N	2026-10-01 17:25:01.992	camara_posicion	37.110905	20.107887	1.1312474	{"beta": 1.0744400123636806, "alpha": 44.0127705990219, "radius": 42.223524470933185}
1707	49	\N	2026-10-01 17:26:01.986	camara_posicion	37.110905	20.107887	1.1312474	{"beta": 1.0744400123636806, "alpha": 44.0127705990219, "radius": 42.223524470933185}
1708	49	\N	2026-10-01 17:27:01.989	camara_posicion	37.110905	20.107887	1.1312474	{"beta": 1.0744400123636806, "alpha": 44.0127705990219, "radius": 42.223524470933185}
1709	49	\N	2026-10-01 17:28:01.991	camara_posicion	37.110905	20.107887	1.1312474	{"beta": 1.0744400123636806, "alpha": 44.0127705990219, "radius": 42.223524470933185}
1710	49	\N	2026-10-01 17:28:05.868	camara_posicion	37.110905	20.107887	1.1312474	{"beta": 1.0744400123636806, "alpha": 44.0127705990219, "radius": 42.223524470933185}
1711	49	\N	2026-10-01 17:28:15.882	camara_posicion	37.110905	20.107887	1.1312474	{"beta": 1.0744400123636806, "alpha": 44.0127705990219, "radius": 42.223524470933185}
1712	49	\N	2026-10-01 17:28:25.854	camara_posicion	37.110905	20.107887	1.1312474	{"beta": 1.0744400123636806, "alpha": 44.0127705990219, "radius": 42.223524470933185}
1713	49	\N	2026-10-01 17:28:35.823	camara_posicion	37.110905	20.107887	1.1312474	{"beta": 1.0744400123636806, "alpha": 44.0127705990219, "radius": 42.223524470933185}
1714	49	\N	2026-10-01 17:28:45.831	camara_posicion	37.110905	20.107887	1.1312474	{"beta": 1.0744400123636806, "alpha": 44.0127705990219, "radius": 42.223524470933185}
1715	49	\N	2026-10-01 17:28:55.858	camara_posicion	37.110905	20.107887	1.1312474	{"beta": 1.0744400123636806, "alpha": 44.0127705990219, "radius": 42.223524470933185}
1716	49	\N	2026-10-01 17:29:05.863	camara_posicion	37.110905	20.107887	1.1312474	{"beta": 1.0744400123636806, "alpha": 44.0127705990219, "radius": 42.223524470933185}
1717	49	\N	2026-10-01 17:29:15.847	camara_posicion	37.110905	20.107887	1.1312474	{"beta": 1.0744400123636806, "alpha": 44.0127705990219, "radius": 42.223524470933185}
1718	49	\N	2026-10-01 17:29:25.852	camara_posicion	37.110905	20.107887	1.1312474	{"beta": 1.0744400123636806, "alpha": 44.0127705990219, "radius": 42.223524470933185}
1719	49	\N	2026-10-01 17:29:35.848	camara_posicion	37.110905	20.107887	1.1312474	{"beta": 1.0744400123636806, "alpha": 44.0127705990219, "radius": 42.223524470933185}
1720	49	\N	2026-10-01 17:29:45.868	camara_posicion	37.110905	20.107887	1.1312474	{"beta": 1.0744400123636806, "alpha": 44.0127705990219, "radius": 42.223524470933185}
1721	49	\N	2026-10-01 17:29:55.866	camara_posicion	37.110905	20.107887	1.1312474	{"beta": 1.0744400123636806, "alpha": 44.0127705990219, "radius": 42.223524470933185}
1722	49	\N	2026-10-01 17:30:05.838	camara_posicion	37.110905	20.107887	1.1312474	{"beta": 1.0744400123636806, "alpha": 44.0127705990219, "radius": 42.223524470933185}
1723	51	\N	2026-10-01 19:28:22.661	camara_posicion	2.5861229e-15	30.202457	-42.23459	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 51.92252947561804}
1724	51	\N	2026-10-01 19:28:32.955	camara_posicion	-42.97951	7.726707	-41.146805	{"beta": 1.4416592502868026, "alpha": -2.377976199254113, "radius": 60}
1725	51	\N	2026-10-01 19:28:42.681	camara_posicion	57.467827	17.246656	-0.042126127	{"beta": 1.2792389101024522, "alpha": -0.0007330383045629531, "radius": 60}
1726	52	\N	2026-10-02 18:58:52.858	camara_posicion	2.039054e-15	23.813425	-33.300278	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 40.938830026556886}
1727	52	\N	2026-10-02 18:58:53.094	modal_abierto	\N	\N	\N	{"modal": "confirm_reset"}
1728	52	\N	2026-10-02 18:59:02.856	camara_posicion	2.039054e-15	23.813425	-33.300278	{"beta": 0.95, "alpha": -1.5707963267948966, "radius": 40.938830026556886}
1729	52	\N	2026-10-02 18:59:03.279	proyecto_reiniciado	\N	\N	\N	{}
\.


--
-- TOC entry 5241 (class 0 OID 16452)
-- Dependencies: 223
-- Data for Name: usuarios; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.usuarios (id, nombre_completo, email, password_hash, rol_id, creado_en) FROM stdin;
1	Administrador	admin@casasteam.com	$2b$10$cn3WigzIPHCl9uo94iTlfesuWMZVYX3KsLglejG4FOnghZuaS11fi	3	2026-07-06 10:13:47.184315
2	pepe	pepe@gmail.com	$2b$10$JpC8Pisg6tOywCCEpZWNo.67e5QhiGjY7f2I6j83DVI97P9PccFyG	1	2026-07-10 09:50:04.905513
3	Jose	jose@gmail.com	$2b$10$cXDxyKKmSpGJVAgTAk8n5OuRkJH89en7Yw09stGqUdplNwXnXgrN.	3	2026-07-10 10:23:48.596815
6	Alumno	alumno@casasteam.com	$2b$10$55BPnBD56abqujVJS0FCw.GSpNmNAqG0wObc2PIW3Z0/BY4qHz3o2	1	2026-09-23 14:34:22.464538
7	Alumno2	alumno2@upv.edu.mx	$2b$10$OLZnjBmIkonMR7wMv3d2HedlHomi1CvFf4eSoB3UMZLZNwdT1eCh.	1	2026-09-29 13:24:21.10972
5	Profe	profe@casasteam.com	$2b$10$2KqWytyLNHYwlF3bOQjH.OPHwmk/4WabuIOBWm7C6gF0xCd0mq0Wy	2	2026-09-23 14:33:34.13026
\.


--
-- TOC entry 5291 (class 0 OID 0)
-- Dependencies: 229
-- Name: actividades_criticas_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.actividades_criticas_id_seq', 8, true);


--
-- TOC entry 5292 (class 0 OID 0)
-- Dependencies: 252
-- Name: avance_rutas_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.avance_rutas_id_seq', 1, false);


--
-- TOC entry 5293 (class 0 OID 0)
-- Dependencies: 254
-- Name: calificaciones_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.calificaciones_id_seq', 2, true);


--
-- TOC entry 5294 (class 0 OID 0)
-- Dependencies: 244
-- Name: casa_preguntas_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.casa_preguntas_id_seq', 1, false);


--
-- TOC entry 5295 (class 0 OID 0)
-- Dependencies: 246
-- Name: casa_respuestas_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.casa_respuestas_id_seq', 1, false);


--
-- TOC entry 5296 (class 0 OID 0)
-- Dependencies: 225
-- Name: dimensiones_steam_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.dimensiones_steam_id_seq', 5, true);


--
-- TOC entry 5297 (class 0 OID 0)
-- Dependencies: 236
-- Name: evaluaciones_habilidad_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.evaluaciones_habilidad_id_seq', 1, false);


--
-- TOC entry 5298 (class 0 OID 0)
-- Dependencies: 227
-- Name: habilidades_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.habilidades_id_seq', 20, true);


--
-- TOC entry 5299 (class 0 OID 0)
-- Dependencies: 220
-- Name: practicas_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.practicas_id_seq', 1, true);


--
-- TOC entry 5300 (class 0 OID 0)
-- Dependencies: 242
-- Name: proyecto_guardados_hist_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.proyecto_guardados_hist_id_seq', 4, true);


--
-- TOC entry 5301 (class 0 OID 0)
-- Dependencies: 240
-- Name: proyecto_guardados_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.proyecto_guardados_id_seq', 295, true);


--
-- TOC entry 5302 (class 0 OID 0)
-- Dependencies: 238
-- Name: proyectos_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.proyectos_id_seq', 1, true);


--
-- TOC entry 5303 (class 0 OID 0)
-- Dependencies: 248
-- Name: registro_actividad_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.registro_actividad_id_seq', 58, true);


--
-- TOC entry 5304 (class 0 OID 0)
-- Dependencies: 222
-- Name: roles_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.roles_id_seq', 3, true);


--
-- TOC entry 5305 (class 0 OID 0)
-- Dependencies: 250
-- Name: rutas_aprendizaje_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.rutas_aprendizaje_id_seq', 2, true);


--
-- TOC entry 5306 (class 0 OID 0)
-- Dependencies: 232
-- Name: sesiones_simulacion_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.sesiones_simulacion_id_seq', 53, true);


--
-- TOC entry 5307 (class 0 OID 0)
-- Dependencies: 234
-- Name: telemetria_3d_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.telemetria_3d_id_seq', 1729, true);


--
-- TOC entry 5308 (class 0 OID 0)
-- Dependencies: 224
-- Name: usuarios_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.usuarios_id_seq', 7, true);


--
-- TOC entry 5015 (class 2606 OID 16583)
-- Name: actividades_criticas actividades_criticas_nombre_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.actividades_criticas
    ADD CONSTRAINT actividades_criticas_nombre_key UNIQUE (nombre);


--
-- TOC entry 5017 (class 2606 OID 16581)
-- Name: actividades_criticas actividades_criticas_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.actividades_criticas
    ADD CONSTRAINT actividades_criticas_pkey PRIMARY KEY (id);


--
-- TOC entry 5019 (class 2606 OID 16591)
-- Name: actividades_habilidades actividades_habilidades_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.actividades_habilidades
    ADD CONSTRAINT actividades_habilidades_pkey PRIMARY KEY (actividad_id, habilidad_id);


--
-- TOC entry 5062 (class 2606 OID 24815)
-- Name: avance_rutas avance_rutas_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.avance_rutas
    ADD CONSTRAINT avance_rutas_pkey PRIMARY KEY (id);


--
-- TOC entry 5066 (class 2606 OID 24835)
-- Name: calificaciones calificaciones_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.calificaciones
    ADD CONSTRAINT calificaciones_pkey PRIMARY KEY (id);


--
-- TOC entry 5049 (class 2606 OID 24717)
-- Name: casa_preguntas casa_preguntas_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.casa_preguntas
    ADD CONSTRAINT casa_preguntas_pkey PRIMARY KEY (id);


--
-- TOC entry 5052 (class 2606 OID 24743)
-- Name: casa_respuestas casa_respuestas_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.casa_respuestas
    ADD CONSTRAINT casa_respuestas_pkey PRIMARY KEY (id);


--
-- TOC entry 5007 (class 2606 OID 16551)
-- Name: dimensiones_steam dimensiones_steam_nombre_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.dimensiones_steam
    ADD CONSTRAINT dimensiones_steam_nombre_key UNIQUE (nombre);


--
-- TOC entry 5009 (class 2606 OID 16549)
-- Name: dimensiones_steam dimensiones_steam_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.dimensiones_steam
    ADD CONSTRAINT dimensiones_steam_pkey PRIMARY KEY (id);


--
-- TOC entry 5030 (class 2606 OID 16660)
-- Name: evaluaciones_habilidad evaluaciones_habilidad_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.evaluaciones_habilidad
    ADD CONSTRAINT evaluaciones_habilidad_pkey PRIMARY KEY (id);


--
-- TOC entry 5011 (class 2606 OID 16565)
-- Name: habilidades habilidades_nombre_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.habilidades
    ADD CONSTRAINT habilidades_nombre_key UNIQUE (nombre);


--
-- TOC entry 5013 (class 2606 OID 16563)
-- Name: habilidades habilidades_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.habilidades
    ADD CONSTRAINT habilidades_pkey PRIMARY KEY (id);


--
-- TOC entry 4997 (class 2606 OID 16469)
-- Name: practicas practicas_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.practicas
    ADD CONSTRAINT practicas_pkey PRIMARY KEY (id);


--
-- TOC entry 5047 (class 2606 OID 16756)
-- Name: proyecto_guardados_hist proyecto_guardados_hist_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.proyecto_guardados_hist
    ADD CONSTRAINT proyecto_guardados_hist_pkey PRIMARY KEY (id);


--
-- TOC entry 5041 (class 2606 OID 16724)
-- Name: proyecto_guardados proyecto_guardados_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.proyecto_guardados
    ADD CONSTRAINT proyecto_guardados_pkey PRIMARY KEY (id);


--
-- TOC entry 5034 (class 2606 OID 16688)
-- Name: proyectos proyectos_nombre_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.proyectos
    ADD CONSTRAINT proyectos_nombre_key UNIQUE (nombre);


--
-- TOC entry 5036 (class 2606 OID 16686)
-- Name: proyectos proyectos_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.proyectos
    ADD CONSTRAINT proyectos_pkey PRIMARY KEY (id);


--
-- TOC entry 5058 (class 2606 OID 24773)
-- Name: registro_actividad registro_actividad_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.registro_actividad
    ADD CONSTRAINT registro_actividad_pkey PRIMARY KEY (id);


--
-- TOC entry 4999 (class 2606 OID 16471)
-- Name: roles roles_nombre_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_nombre_key UNIQUE (nombre);


--
-- TOC entry 5001 (class 2606 OID 16473)
-- Name: roles roles_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_pkey PRIMARY KEY (id);


--
-- TOC entry 5060 (class 2606 OID 24800)
-- Name: rutas_aprendizaje rutas_aprendizaje_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.rutas_aprendizaje
    ADD CONSTRAINT rutas_aprendizaje_pkey PRIMARY KEY (id);


--
-- TOC entry 5022 (class 2606 OID 16615)
-- Name: sesiones_simulacion sesiones_simulacion_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sesiones_simulacion
    ADD CONSTRAINT sesiones_simulacion_pkey PRIMARY KEY (id);


--
-- TOC entry 5028 (class 2606 OID 16635)
-- Name: telemetria_3d telemetria_3d_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.telemetria_3d
    ADD CONSTRAINT telemetria_3d_pkey PRIMARY KEY (id);


--
-- TOC entry 5064 (class 2606 OID 41097)
-- Name: avance_rutas uq_avance_alumno_ruta; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.avance_rutas
    ADD CONSTRAINT uq_avance_alumno_ruta UNIQUE (alumno_id, ruta_id);


--
-- TOC entry 5068 (class 2606 OID 24843)
-- Name: calificaciones uq_calificacion_alumno_practica; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.calificaciones
    ADD CONSTRAINT uq_calificacion_alumno_practica UNIQUE (alumno_id, practica_id);


--
-- TOC entry 5043 (class 2606 OID 16726)
-- Name: proyecto_guardados uq_guardado; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.proyecto_guardados
    ADD CONSTRAINT uq_guardado UNIQUE (usuario_id, proyecto_id, slot);


--
-- TOC entry 5003 (class 2606 OID 16479)
-- Name: usuarios usuarios_email_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.usuarios
    ADD CONSTRAINT usuarios_email_key UNIQUE (email);


--
-- TOC entry 5005 (class 2606 OID 16481)
-- Name: usuarios usuarios_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.usuarios
    ADD CONSTRAINT usuarios_pkey PRIMARY KEY (id);


--
-- TOC entry 5054 (class 1259 OID 24779)
-- Name: idx_actividad_fecha; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_actividad_fecha ON public.registro_actividad USING btree (creado_en DESC);


--
-- TOC entry 5055 (class 1259 OID 24781)
-- Name: idx_actividad_tipo; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_actividad_tipo ON public.registro_actividad USING btree (tipo_accion);


--
-- TOC entry 5056 (class 1259 OID 24780)
-- Name: idx_actividad_usuario; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_actividad_usuario ON public.registro_actividad USING btree (usuario_id, creado_en DESC);


--
-- TOC entry 5031 (class 1259 OID 16674)
-- Name: idx_evaluaciones_habilidad_habilidad_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_evaluaciones_habilidad_habilidad_id ON public.evaluaciones_habilidad USING btree (habilidad_id);


--
-- TOC entry 5032 (class 1259 OID 16673)
-- Name: idx_evaluaciones_habilidad_sesion_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_evaluaciones_habilidad_sesion_id ON public.evaluaciones_habilidad USING btree (sesion_id);


--
-- TOC entry 4995 (class 1259 OID 16483)
-- Name: idx_gin_config_preguntas; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_gin_config_preguntas ON public.practicas USING gin (configuracion_preguntas);


--
-- TOC entry 5037 (class 1259 OID 16739)
-- Name: idx_guardados_estado_gin; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_guardados_estado_gin ON public.proyecto_guardados USING gin (estado jsonb_path_ops);


--
-- TOC entry 5044 (class 1259 OID 16762)
-- Name: idx_guardados_hist; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_guardados_hist ON public.proyecto_guardados_hist USING btree (guardado_id, archivado_en DESC);


--
-- TOC entry 5045 (class 1259 OID 24757)
-- Name: idx_guardados_hist_usuario; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_guardados_hist_usuario ON public.proyecto_guardados_hist USING btree (usuario_id, proyecto_id, slot);


--
-- TOC entry 5038 (class 1259 OID 16737)
-- Name: idx_guardados_usuario; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_guardados_usuario ON public.proyecto_guardados USING btree (usuario_id, proyecto_id);


--
-- TOC entry 5039 (class 1259 OID 16738)
-- Name: idx_guardados_version; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_guardados_version ON public.proyecto_guardados USING btree (schema_version);


--
-- TOC entry 5050 (class 1259 OID 24728)
-- Name: idx_preguntas_proyecto; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_preguntas_proyecto ON public.casa_preguntas USING btree (proyecto_id, creado_en DESC);


--
-- TOC entry 5053 (class 1259 OID 24754)
-- Name: idx_respuestas_pregunta; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_respuestas_pregunta ON public.casa_respuestas USING btree (pregunta_id, creado_en);


--
-- TOC entry 5020 (class 1259 OID 16675)
-- Name: idx_sesiones_simulacion_usuario_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_sesiones_simulacion_usuario_id ON public.sesiones_simulacion USING btree (usuario_id);


--
-- TOC entry 5023 (class 1259 OID 16671)
-- Name: idx_telemetria_3d_sesion_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_telemetria_3d_sesion_id ON public.telemetria_3d USING btree (sesion_id);


--
-- TOC entry 5024 (class 1259 OID 16672)
-- Name: idx_telemetria_3d_tipo_evento; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_telemetria_3d_tipo_evento ON public.telemetria_3d USING btree (tipo_evento);


--
-- TOC entry 5025 (class 1259 OID 16764)
-- Name: idx_telemetria_contexto_gin; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_telemetria_contexto_gin ON public.telemetria_3d USING gin (contexto jsonb_path_ops);


--
-- TOC entry 5026 (class 1259 OID 16763)
-- Name: idx_telemetria_sesion_tiempo; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_telemetria_sesion_tiempo ON public.telemetria_3d USING btree (sesion_id, marca_tiempo);


--
-- TOC entry 5089 (class 2620 OID 41121)
-- Name: proyecto_guardados trg_guardados_touch; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_guardados_touch BEFORE UPDATE ON public.proyecto_guardados FOR EACH ROW EXECUTE FUNCTION public.touch_actualizado_en();


--
-- TOC entry 5071 (class 2606 OID 16689)
-- Name: actividades_criticas actividades_criticas_proyecto_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.actividades_criticas
    ADD CONSTRAINT actividades_criticas_proyecto_id_fkey FOREIGN KEY (proyecto_id) REFERENCES public.proyectos(id) ON DELETE CASCADE;


--
-- TOC entry 5072 (class 2606 OID 16592)
-- Name: actividades_habilidades actividades_habilidades_actividad_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.actividades_habilidades
    ADD CONSTRAINT actividades_habilidades_actividad_id_fkey FOREIGN KEY (actividad_id) REFERENCES public.actividades_criticas(id) ON DELETE CASCADE;


--
-- TOC entry 5073 (class 2606 OID 16597)
-- Name: actividades_habilidades actividades_habilidades_habilidad_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.actividades_habilidades
    ADD CONSTRAINT actividades_habilidades_habilidad_id_fkey FOREIGN KEY (habilidad_id) REFERENCES public.habilidades(id) ON DELETE CASCADE;


--
-- TOC entry 5087 (class 2606 OID 24816)
-- Name: avance_rutas avance_rutas_ruta_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.avance_rutas
    ADD CONSTRAINT avance_rutas_ruta_id_fkey FOREIGN KEY (ruta_id) REFERENCES public.rutas_aprendizaje(id) ON DELETE CASCADE;


--
-- TOC entry 5088 (class 2606 OID 24836)
-- Name: calificaciones calificaciones_practica_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.calificaciones
    ADD CONSTRAINT calificaciones_practica_id_fkey FOREIGN KEY (practica_id) REFERENCES public.practicas(id) ON DELETE CASCADE;


--
-- TOC entry 5082 (class 2606 OID 24723)
-- Name: casa_preguntas casa_preguntas_autor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.casa_preguntas
    ADD CONSTRAINT casa_preguntas_autor_id_fkey FOREIGN KEY (autor_id) REFERENCES public.usuarios(id) ON DELETE CASCADE;


--
-- TOC entry 5083 (class 2606 OID 24718)
-- Name: casa_preguntas casa_preguntas_proyecto_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.casa_preguntas
    ADD CONSTRAINT casa_preguntas_proyecto_id_fkey FOREIGN KEY (proyecto_id) REFERENCES public.proyectos(id) ON DELETE CASCADE;


--
-- TOC entry 5084 (class 2606 OID 24749)
-- Name: casa_respuestas casa_respuestas_autor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.casa_respuestas
    ADD CONSTRAINT casa_respuestas_autor_id_fkey FOREIGN KEY (autor_id) REFERENCES public.usuarios(id) ON DELETE CASCADE;


--
-- TOC entry 5085 (class 2606 OID 24744)
-- Name: casa_respuestas casa_respuestas_pregunta_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.casa_respuestas
    ADD CONSTRAINT casa_respuestas_pregunta_id_fkey FOREIGN KEY (pregunta_id) REFERENCES public.casa_preguntas(id) ON DELETE CASCADE;


--
-- TOC entry 5078 (class 2606 OID 16666)
-- Name: evaluaciones_habilidad evaluaciones_habilidad_habilidad_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.evaluaciones_habilidad
    ADD CONSTRAINT evaluaciones_habilidad_habilidad_id_fkey FOREIGN KEY (habilidad_id) REFERENCES public.habilidades(id) ON DELETE CASCADE;


--
-- TOC entry 5079 (class 2606 OID 16661)
-- Name: evaluaciones_habilidad evaluaciones_habilidad_sesion_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.evaluaciones_habilidad
    ADD CONSTRAINT evaluaciones_habilidad_sesion_id_fkey FOREIGN KEY (sesion_id) REFERENCES public.sesiones_simulacion(id) ON DELETE CASCADE;


--
-- TOC entry 5069 (class 2606 OID 16491)
-- Name: usuarios fk_rol; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.usuarios
    ADD CONSTRAINT fk_rol FOREIGN KEY (rol_id) REFERENCES public.roles(id) ON DELETE RESTRICT;


--
-- TOC entry 5070 (class 2606 OID 16566)
-- Name: habilidades habilidades_dimension_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.habilidades
    ADD CONSTRAINT habilidades_dimension_id_fkey FOREIGN KEY (dimension_id) REFERENCES public.dimensiones_steam(id) ON DELETE CASCADE;


--
-- TOC entry 5080 (class 2606 OID 16732)
-- Name: proyecto_guardados proyecto_guardados_proyecto_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.proyecto_guardados
    ADD CONSTRAINT proyecto_guardados_proyecto_id_fkey FOREIGN KEY (proyecto_id) REFERENCES public.proyectos(id) ON DELETE CASCADE;


--
-- TOC entry 5081 (class 2606 OID 16727)
-- Name: proyecto_guardados proyecto_guardados_usuario_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.proyecto_guardados
    ADD CONSTRAINT proyecto_guardados_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES public.usuarios(id) ON DELETE CASCADE;


--
-- TOC entry 5086 (class 2606 OID 24774)
-- Name: registro_actividad registro_actividad_usuario_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.registro_actividad
    ADD CONSTRAINT registro_actividad_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES public.usuarios(id) ON DELETE SET NULL;


--
-- TOC entry 5074 (class 2606 OID 16694)
-- Name: sesiones_simulacion sesiones_simulacion_proyecto_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sesiones_simulacion
    ADD CONSTRAINT sesiones_simulacion_proyecto_id_fkey FOREIGN KEY (proyecto_id) REFERENCES public.proyectos(id) ON DELETE CASCADE;


--
-- TOC entry 5075 (class 2606 OID 16616)
-- Name: sesiones_simulacion sesiones_simulacion_usuario_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sesiones_simulacion
    ADD CONSTRAINT sesiones_simulacion_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES public.usuarios(id) ON DELETE CASCADE;


--
-- TOC entry 5076 (class 2606 OID 16641)
-- Name: telemetria_3d telemetria_3d_actividad_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.telemetria_3d
    ADD CONSTRAINT telemetria_3d_actividad_id_fkey FOREIGN KEY (actividad_id) REFERENCES public.actividades_criticas(id);


--
-- TOC entry 5077 (class 2606 OID 16636)
-- Name: telemetria_3d telemetria_3d_sesion_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.telemetria_3d
    ADD CONSTRAINT telemetria_3d_sesion_id_fkey FOREIGN KEY (sesion_id) REFERENCES public.sesiones_simulacion(id) ON DELETE CASCADE;


-- Completed on 2026-10-02 13:16:35

--
-- PostgreSQL database dump complete
--

\unrestrict 8cJFdqV9eHaQncfYGUdafqxipNaRvpPDAfTSLFv9nHVYpuvFJxUAwPfmuycE0Cf

