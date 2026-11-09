import { drizzle as drizzlePg } from "drizzle-orm/node-postgres";
import { drizzle as drizzlePglite } from "drizzle-orm/pglite";
import { PGlite } from "@electric-sql/pglite";
import { Pool } from "pg";
import path from "node:path";
import * as schema from "./schema";

type Database = ReturnType<typeof drizzlePglite> | ReturnType<typeof drizzlePg>;
let instance: Database | undefined;

function initialize(): Database {
  if (instance) return instance;
  const url = process.env.DATABASE_URL;
  if (url?.startsWith("postgres://")) {
    instance = drizzlePg(new Pool({ connectionString: url }), { schema });
  } else {
    instance = drizzlePglite(new PGlite(path.resolve(process.cwd(), ".data/pglite")), { schema });
  }
  return instance;
}

export const db = new Proxy({} as Database, {
  get(_target, property, receiver) {
    const target = initialize();
    const value = Reflect.get(target as object, property, receiver);
    return typeof value === "function" ? value.bind(target) : value;
  },
});

export * from "./schema";
