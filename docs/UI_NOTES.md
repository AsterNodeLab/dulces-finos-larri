# Notas de la UI

- Código de UI: `src/components/app/` (shell, dashboard, biblioteca, calendario, recursos, ajustes, cliente `api-client.ts`) y `src/components/editor/` (workspace del proyecto y sus pestañas).
- Marca activa: `brand-store.ts` (localStorage `vq.brand`, `data-brand` en `<html>`; el script de arranque evita el parpadeo).
- Workspace: `editor/workspace.tsx` carga `GET /api/projects/:id` y reparte un `TabCtx`; el Player usa `preview-spec` y se refresca tras cada guardado.
- Formulario de escenas: se genera a partir de los esquemas Zod (`scene-fields.tsx`, `scene-defaults.ts`).
- Verificación: usar `next dev --webpack` o `next build --webpack && next start`; ver "Problemas conocidos" del reporte (Turbopack rompe `node:sqlite`).
