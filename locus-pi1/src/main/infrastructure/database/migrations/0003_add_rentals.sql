CREATE TABLE `rentals` (
	`id` text PRIMARY KEY NOT NULL,
	`property_id` text NOT NULL,
	`tenant_id` text NOT NULL,
	`monthly_rent` real NOT NULL,
	`start_date` integer NOT NULL,
	`due_day` integer NOT NULL,
	`parent_rental_id` text,
	`formal_consent` text,
	`contract_signed` integer DEFAULT false NOT NULL,
	`signatures_notarized` integer DEFAULT false NOT NULL,
	`initial_payments_paid` integer DEFAULT false NOT NULL,
	`keys_released_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`property_id`) REFERENCES `properties`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`tenant_id`) REFERENCES `clients`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`parent_rental_id`) REFERENCES `rentals`(`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "rentals_contract_boolean" CHECK("rentals"."contract_signed" IN (0, 1)),
	CONSTRAINT "rentals_signatures_boolean" CHECK("rentals"."signatures_notarized" IN (0, 1)),
	CONSTRAINT "rentals_payments_boolean" CHECK("rentals"."initial_payments_paid" IN (0, 1)),
	CONSTRAINT "rentals_positive_rent" CHECK("rentals"."monthly_rent" > 0),
	CONSTRAINT "rentals_due_day" CHECK("rentals"."due_day" BETWEEN 1 AND 31),
	CONSTRAINT "rentals_formal_consent" CHECK("rentals"."parent_rental_id" IS NULL OR ("rentals"."formal_consent" IS NOT NULL AND length(trim("rentals"."formal_consent")) > 0)),
	CONSTRAINT "rentals_keys_prerequisites" CHECK("rentals"."keys_released_at" IS NULL OR ("rentals"."contract_signed" = 1 AND "rentals"."signatures_notarized" = 1 AND "rentals"."initial_payments_paid" = 1))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `rentals_property_primary_unique` ON `rentals` (`property_id`) WHERE "rentals"."parent_rental_id" IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX `rentals_property_tenant_unique` ON `rentals` (`property_id`,`tenant_id`);