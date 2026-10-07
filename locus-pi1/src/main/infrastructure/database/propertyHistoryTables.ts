export const propertyHistoryTables = `
CREATE TABLE IF NOT EXISTS "property_contracts" (
	"id" text PRIMARY KEY NOT NULL,
	"property_id" text NOT NULL,
	"tenant_id" text NOT NULL,
	"rental_id" text,
	"reference" text NOT NULL,
	"monthly_rent" real NOT NULL,
	"start_date" integer NOT NULL,
	"end_date" integer,
	"status" text NOT NULL,
	"created_at" integer NOT NULL,
	FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY ("tenant_id") REFERENCES "clients"("id") ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY ("rental_id") REFERENCES "rentals"("id") ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "property_contracts_amount_check" CHECK("property_contracts"."monthly_rent" > 0),
	CONSTRAINT "property_contracts_dates_check" CHECK("property_contracts"."start_date" >= 0 AND ("property_contracts"."end_date" IS NULL OR "property_contracts"."end_date" > "property_contracts"."start_date")),
	CONSTRAINT "property_contracts_status_check" CHECK("property_contracts"."status" IN ('ACTIVE', 'ENDED', 'CANCELLED')),
	CONSTRAINT "property_contracts_ended_check" CHECK("property_contracts"."status" != 'ENDED' OR "property_contracts"."end_date" IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS "property_contracts_property_date_idx" ON "property_contracts" ("property_id","start_date");
CREATE UNIQUE INDEX IF NOT EXISTS "property_contracts_id_property_unique" ON "property_contracts" ("id","property_id");
CREATE TABLE IF NOT EXISTS "property_inspections" (
	"id" text PRIMARY KEY NOT NULL,
	"property_id" text NOT NULL,
	"inspected_at" integer NOT NULL,
	"description" text NOT NULL,
	"report_reference" text,
	"created_at" integer NOT NULL,
	FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "property_inspections_date_check" CHECK("property_inspections"."inspected_at" >= 0)
);

CREATE INDEX IF NOT EXISTS "property_inspections_property_date_idx" ON "property_inspections" ("property_id","inspected_at");
CREATE TABLE IF NOT EXISTS "property_maintenances" (
	"id" text PRIMARY KEY NOT NULL,
	"property_id" text NOT NULL,
	"performed_at" integer NOT NULL,
	"description" text NOT NULL,
	"cost" real,
	"status" text NOT NULL,
	"created_at" integer NOT NULL,
	FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "property_maintenances_cost_check" CHECK("property_maintenances"."cost" IS NULL OR "property_maintenances"."cost" >= 0),
	CONSTRAINT "property_maintenances_date_check" CHECK("property_maintenances"."performed_at" >= 0),
	CONSTRAINT "property_maintenances_status_check" CHECK("property_maintenances"."status" IN ('PENDING', 'IN_PROGRESS', 'COMPLETED'))
);

CREATE INDEX IF NOT EXISTS "property_maintenances_property_date_idx" ON "property_maintenances" ("property_id","performed_at");
CREATE TABLE IF NOT EXISTS "property_payments" (
	"id" text PRIMARY KEY NOT NULL,
	"property_id" text NOT NULL,
	"contract_id" text NOT NULL,
	"amount" real NOT NULL,
	"paid_at" integer NOT NULL,
	"description" text NOT NULL,
	"created_at" integer NOT NULL,
	FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY ("contract_id","property_id") REFERENCES "property_contracts"("id","property_id") ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "property_payments_amount_check" CHECK("property_payments"."amount" > 0),
	CONSTRAINT "property_payments_date_check" CHECK("property_payments"."paid_at" >= 0)
);

CREATE INDEX IF NOT EXISTS "property_payments_property_date_idx" ON "property_payments" ("property_id","paid_at");
`;
