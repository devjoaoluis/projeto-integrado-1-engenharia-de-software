import { after, before, beforeEach } from "node:test";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { initializeDatabase } from "../../database/initializeDatabase";
import { IFileStorage } from "../../../domain/repositories/IFileStorage";
const sqlite = createClient({ url: "file::memory:" });
const dbModule = require.resolve("../../database/db");
const previousDb = require.cache[dbModule];
require.cache[dbModule] = { exports: { db: drizzle(sqlite) } } as NodeModule;
// eslint-disable-next-line @typescript-eslint/no-var-requires -- repositories use an isolated SQLite database
const { DrizzleInspectionRepository } = require("../DrizzleInspectionRepository") as typeof import("../DrizzleInspectionRepository");
// eslint-disable-next-line @typescript-eslint/no-var-requires -- repositories use an isolated SQLite database
const { DrizzlePropertyRepository } = require("../DrizzlePropertyRepository") as typeof import("../DrizzlePropertyRepository");
// eslint-disable-next-line @typescript-eslint/no-var-requires -- repositories use an isolated SQLite database
const { DrizzlePropertyHistoryRepository } = require("../DrizzlePropertyHistoryRepository") as typeof import("../DrizzlePropertyHistoryRepository");
// eslint-disable-next-line @typescript-eslint/no-var-requires -- repositories use an isolated SQLite database
const { DrizzlePropertyMediaRepository } = require("../DrizzlePropertyMediaRepository") as typeof import("../DrizzlePropertyMediaRepository");
const inspections = new DrizzleInspectionRepository();
const properties = new DrizzlePropertyRepository();
const history = new DrizzlePropertyHistoryRepository();
let temp: string;
let storageDir: string;
let photo: string;
let video: string;
const storage: IFileStorage = {
  getPath: (directory, name) => path.join(storageDir, directory, name),
  save: async (source, directory, name) => {
    const destination = path.join(storageDir, directory, name);
    await fs.mkdir(path.dirname(destination), { recursive: true });
    await fs.copyFile(source, destination);
    return destination;
  },
  delete: async filename => { await fs.rm(filename, { force: true }); },
  exists: async filename => { try { await fs.access(filename); return true; } catch { return false; } },
};
const input = () => ({ propertyId: "property", contractId: "contract", inspectedAt: Date.now() - 1000,
  description: "Pintura íntegra; torneira com vazamento.", sourceFilePaths: [photo, video] });
const migrations = path.join(process.cwd(), "src/main/infrastructure/database/migrations");

before(async () => {
  await initializeDatabase(sqlite);
  temp = await fs.mkdtemp(path.join(os.tmpdir(), "locus-inspections-test-"));
  storageDir = path.join(temp, "saved");
  photo = path.join(temp, "entrada.JPG");
  video = path.join(temp, "entrada.webm");
  await fs.writeFile(photo, Buffer.from([0xff, 0xd8, 0xff, 0xd9]));
  await fs.writeFile(video, Buffer.from([0x1a, 0x45, 0xdf, 0xa3]));
});
beforeEach(async () => {
  await fs.rm(storageDir, { recursive: true, force: true });
  await fs.mkdir(storageDir);
  await sqlite.executeMultiple(`DELETE FROM inspection_media; DELETE FROM property_inspections;
    DELETE FROM property_payments; DELETE FROM property_contracts; DELETE FROM rentals; DELETE FROM property_media;
    DELETE FROM properties; DELETE FROM clients;
    INSERT INTO properties(id,title,address,price,status,created_at,updated_at) VALUES ('property','Casa','Rua',1000,'ALUGADO',1,1),('other','Outra','Rua B',500,'DISPONIVEL',1,1);
    INSERT INTO clients(id,name,cpf_cnpj,phone,created_at,updated_at) VALUES ('tenant','Cliente','123','999',1,1);
    INSERT INTO property_contracts(id,property_id,tenant_id,reference,monthly_rent,start_date,status,created_at)
    VALUES ('contract','property','tenant','CTR-1',1000,1,'ACTIVE',1),('other-contract','other','tenant','CTR-2',500,1,'ACTIVE',1);
  `);
});
after(async () => {
  sqlite.close();
  if (previousDb) require.cache[dbModule] = previousDb; else delete require.cache[dbModule];
  if (temp) await fs.rm(temp, { recursive: true, force: true });
});

async function copiedFiles() {
  return (await fs.readdir(storageDir, { recursive: true })).filter(name => /\.(jpg|webm)$/i.test(name));
}


export { sqlite, inspections, properties, history, storage, input, storageDir, photo, video, temp, migrations, copiedFiles, DrizzleInspectionRepository, DrizzlePropertyMediaRepository };
