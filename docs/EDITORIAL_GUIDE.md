# Guía editorial de VisionQuant Studio

Esta guía rige todo guion, storyboard y prompt de IA del estudio. Aplica igual a contenido escrito por humanos y por modelos. Fuente de verdad del contrato de datos: `src/shared/schema.ts`. Tono de marca: `src/shared/brands.ts`.

## 1. Dos marcas, dos perfiles (nunca se mezclan)

Cada proyecto pertenece a **una** marca. No se reutilizan hooks, CTA, handles ni recursos visuales de una marca en la otra.

### Vision One (`vision-one`) — docente tecnológico

- **Voz:** maestro que domina el tema y habla claro. Español de México natural ("¿qué onda con…?" no; "vamos a ver cómo funciona" sí).
- **Temas:** IA aplicada, agentes, automatización, herramientas de desarrollo, tutoriales y comparativas.
- **Hace:** explica el término técnico en vez de evitarlo; abre con un problema concreto; muestra un ejemplo aplicable; cierra con algo útil.
- **Evita:** hype ("esto lo cambia todo", "increíble", "revolucionario"), jerga sin traducir, datos sin fuente, CTA agresivos.
- **Firma/handle:** Vision One · `@visionone`.

### VisionQuant (`visionquant`) — analista sobrio

- **Voz:** analista profesional, probabilístico. Distingue explícitamente **hecho**, **estimación**, **inferencia** y **opinión**.
- **Temas:** economía, mercados, IA y empresas, bitcoin, geopolítica, tendencias estructurales.
- **Hace:** cita la fuente primaria del dato; habla en escenarios y rangos; señala riesgos y efectos de segundo orden.
- **Evita:** predicciones con certeza, recomendaciones de compra/venta (nunca), gráficos sin escala o sin fuente, sensacionalismo.
- **Aviso obligatorio** cuando se hable de activos: "Esto no es recomendación de inversión."
- **Firma/handle:** VisionQuant · `@visionquant`.

## 2. Método de enseñanza

Todo video sigue, en versión comprimida, esta progresión:

1. **Problema interesante** — algo que el público ya vive o nota.
2. **Por qué importa** — consecuencia práctica (tiempo, dinero, decisiones).
3. **Traducción simple** — el término técnico dicho en una frase llana.
4. **Cómo funciona (visual)** — diagrama o flujo; la imagen explica, no decora.
5. **Aplicación práctica** — un caso concreto y creíble.
6. **Cómo usarlo** — el primer paso que el espectador puede dar.
7. **Conexión con productividad / negocio / economía**.
8. **Conclusión útil** — una idea que el espectador se lleva.

En 15–30 s se fusionan pasos (p. ej. 2+3, 5+6+7); nunca se omite el 3 ni el 8.

### Capas de contenido

Cada guion separa: **HECHOS → EXPLICACIÓN → EJEMPLO → APLICACIÓN → CONCLUSIÓN**.

- **Hechos:** solo de claims registrados en la investigación (con `claimIds`).
- **Explicación:** interpretación didáctica; no introduce datos nuevos.
- **Ejemplo:** ilustrativo; si es hipotético, se dice ("imagina que…").
- **Aplicación:** qué se puede hacer con esto.
- **Conclusión:** síntesis útil, sin exagerar.

## 3. Formatos y presupuestos de palabras

Presupuesto = duración × **2.5 palabras/s** (`SPANISH_WPS`). Las proporciones son guía; la narración natural manda (±15 %).

| Duración | 15 s | 30 s | 45 s | 60 s | 90 s |
|---|---|---|---|---|---|
| Palabras | 38 | 75 | 113 | 150 | 225 |

Las proporciones exactas viven en `src/content/script-templates.ts` (`SCRIPT_TEMPLATES`).

### Lanzamiento (`launch`) — qué salió y qué cambia
hook 12 % · context 18 % · explanation 25 % · demo 20 % · application 15 % · conclusion 10 %.
Ej. 45 s: 14 / 20 / 28 / 23 / 17 / 11 palabras. Todo dato (fecha, precio, disponibilidad) debe ser claim verificado.

### Tutorial (`tutorial`) — cómo hacer algo
hook 10 % · context 10 % · demo 45 % (pasos) · application 20 % · conclusion 8 % · cta 7 %.
Ej. 60 s: 15 / 15 / 68 / 30 / 12 / 10. Máximo 5 pasos; cada paso = verbo + objeto.

### Concepto (`concept`) — qué es y por qué importa
hook 12 % · explanation 30 % · demo 25 % · application 23 % · conclusion 10 %.
Ej. 45 s: 14 / 34 / 28 / 26 / 11.

### Comparativa (`comparison`) — A vs B con criterio
hook 10 % · context 12 % · explanation 18 % · demo 30 % (tabla) · application 18 % · conclusion 12 %.
Ej. 60 s: 15 / 18 / 27 / 45 / 27 / 18. Criterios declarados antes de comparar; sin "ganador absoluto".

## 4. Hooks honestos

El hook promete exactamente lo que el video entrega, en ≤ 2 s de lectura (≤ 90 caracteres en pantalla).

Reglas: sin cifras no verificadas; sin urgencia falsa; sin "nadie te dice esto"; pregunta o problema real; el video debe responderlo.

| Mal | Bien |
|---|---|
| "Esta IA va a reemplazar tu trabajo mañana" | "¿Qué hace un agente de IA que un chatbot no?" |
| "El 90 % de las empresas ya usa agentes" (sin fuente) | "Un agente no solo responde: decide qué paso dar después." |
| "El secreto que OpenAI no quiere que sepas" | "Tres pasos para automatizar tu bandeja de correo." |
| "Bitcoin a 1 millón, confirmado" | "¿Qué tendría que pasar para que bitcoin rompa su máximo? Escenarios." |

## 5. Verificación de claims

- **Fuente primaria:** documento del autor del hecho (blog/docs oficiales, paper, comunicado, informe de banco central, filing regulatorio).
- **Fuente secundaria:** medios, agregadores, blogs de terceros, redes sociales.
- **`verified`:** solo si una fuente primaria registrada lo afirma de forma explícita (en su extracto).
- **`unverified`:** viene de fuente secundaria, del modelo, o no se pudo contrastar. En pantalla o narración se marca ("según X", "reportado por…") o se elimina.
- **`disputed`:** fuentes en conflicto. No se presenta como hecho; si se usa, se explica la discrepancia.
- **Nunca inventar** fechas, precios, benchmarks, cifras de adopción ni funciones de modelos. Si falta el dato: placeholder `[Completa: …]` o se omite.
- `MetricCounter` solo con números de claims y con `source` lleno.
- Contenido de demostración se marca como DEMO (watermark y `isDemo`).

## 6. Subtítulos y palabras clave

- 4–10 keywords por video: el término central, sus componentes y el verbo de aplicación (ej. "agente", "herramientas", "objetivo", "automatizar").
- Sin artículos ni palabras vacías; sin nombres de marca de terceros salvo que sean el tema.
- Máximo 26 caracteres por línea, 2 líneas.

## 7. CTA

- Uno por video, al final, conectado con el tema ("Sígueme para aprender a construir tu primer agente").
- Vision One: invitación a aprender. VisionQuant: invitación a analizar ("Sígueme para más análisis con fuentes").
- Prohibido: "¡CORRE!", promesas de ganancias, "comenta YA", pedir datos personales.

## 8. Rúbrica pedagógica (revisión humana)

Escala 1–5 por criterio (1 = deficiente, 3 = aceptable, 5 = ejemplar).

| # | Criterio | 5 significa |
|---|---|---|
| 1 | Exactitud factual | Todo hecho tiene claim y fuente; nada inventado |
| 2 | Honestidad del hook | Promete lo que el video cumple |
| 3 | Claridad | Término técnico explicado en lenguaje llano |
| 4 | Estructura | Hechos → explicación → ejemplo → aplicación → conclusión, sin saltos |
| 5 | Ejemplo concreto | Caso específico y creíble, no genérico |
| 6 | Visual explica | Cada escena ilustra lo que se narra |
| 7 | Utilidad | El espectador sabe qué hacer o pensar después |
| 8 | Tono de marca | Fiel al perfil; sin mezcla de marcas; sin hype |
| 9 | Ritmo | Dentro de ±15 % del presupuesto de palabras |

**Aprobación:** promedio ≥ 3.8 **y** ningún criterio < 3 **y** criterios 1 y 8 ≥ 4. Un criterio 1 con valor ≤ 2 bloquea la publicación aunque el resto sea alto.
