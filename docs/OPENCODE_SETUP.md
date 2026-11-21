# Trabajar el proyecto con OpenCode (Windows)

> Nota de verificación: la documentación oficial de OpenCode (opencode.ai) estaba bloqueada por la red del entorno
> cloud donde se construyó el proyecto. Esta guía se basa en conocimiento previo del formato; confirma con
> `opencode --help` y https://opencode.ai/docs si algo difiere.

## Instalar

```powershell
npm i -g opencode-ai        # alternativa: scoop install opencode  /  choco install opencode
opencode --version
```

## Conectar Anthropic

```powershell
opencode auth login          # elige Anthropic e ingresa tu API key (se guarda en tu perfil, no en el repo)
```

## Abrir el proyecto

```powershell
cd visionquant-studio
opencode
```

OpenCode lee automáticamente:
- `AGENTS.md` — reglas del proyecto (comandos, mapa del código, reglas de seguridad y portabilidad).
- `opencode.json` — modelo por defecto `anthropic/claude-sonnet-5-5`, modelo pequeño Haiku 5.5 e instrucciones extra (`docs/API.md`, `docs/REMOTION_ARCHITECTURE.md`).
- `.opencode/agent/*.md` — los mismos 5 subagentes que `.claude/agents/` (Creative Director, Educational Director, Remotion Motion Architect, QA & Security, Research Assistant). Invócalos con `@nombre`, p. ej. `@remotion-motion-architect agrega una escena de gráfico de barras`.

## Flujo recomendado con OpenCode

1. `npm run dev` en una terminal; OpenCode en otra.
2. Pide cambios acotados ("agrega la escena X", "ajusta los subtítulos"), y que el agente cierre con `npm run typecheck && npm test`.
3. Para escenas: `npm run remotion:studio` permite verlas en vivo; luego `npm run render:demo -- --preview`.
4. Commits pequeños y claros.

## Claude Code local (alternativa)

`CLAUDE.md` importa `AGENTS.md`, y `.claude/agents/` define los subagentes con `model`/`effort`.
