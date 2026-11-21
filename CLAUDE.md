# CLAUDE.md

Las instrucciones del proyecto viven en AGENTS.md (compartidas con OpenCode y otros agentes):

@AGENTS.md

## Específico de Claude Code

- Subagentes del proyecto en `.claude/agents/`: `creative-director`, `educational-director`, `remotion-motion-architect`, `qa-security-reviewer` (Opus, esfuerzo low) y `research-assistant` (Haiku, esfuerzo low). Úsalos para tareas acotadas a su carpeta; no los lances para tareas triviales.
- En la nube de Claude Code, el render usa el Chromium preinstalado: `REMOTION_BROWSER_EXECUTABLE` en `.env.local`.
