/** Aplica migraciones pendientes. Uso: npm run db:migrate */
import "./env-bootstrap";
import { db, migrate } from "../src/lib/db";
import { paths } from "../src/lib/paths";

const applied = migrate(db());
console.log(applied.length ? `Migraciones aplicadas: ${applied.join(", ")}` : "Base de datos al día.");
console.log(`BD: ${paths.db}`);
