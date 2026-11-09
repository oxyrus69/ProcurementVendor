import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import fs from "node:fs";

const isPostgres = process.env.DATABASE_URL?.startsWith("postgres://");
if (isPostgres) {
  const { drizzle: drizzlePg } = await import("drizzle-orm/node-postgres");
  const { migrate: migratePg } = await import("drizzle-orm/node-postgres/migrator");
  const { Pool } = await import("pg");
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzlePg(pool);
  await migratePg(db, { migrationsFolder: "drizzle" });
  await pool.end();
  console.log("PostgreSQL migrations applied");
} else {
  const dir = ".data/pglite";
  fs.mkdirSync(dir, { recursive: true });
  const client = new PGlite(dir);
  const db = drizzle(client);
  await migrate(db, { migrationsFolder: "drizzle" });
  await client.close();
  console.log("PGlite migrations applied at", dir);
}
process.exit(0);
