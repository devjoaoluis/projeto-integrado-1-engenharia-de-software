CREATE TABLE `guarantors` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`cpf_cnpj` text NOT NULL,
	`phone` text NOT NULL,
	`email` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `guarantors_cpf_cnpj_unique` ON `guarantors` (`cpf_cnpj`);--> statement-breakpoint
CREATE TABLE `owners` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`cpf_cnpj` text NOT NULL,
	`phone` text NOT NULL,
	`email` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `owners_cpf_cnpj_unique` ON `owners` (`cpf_cnpj`);--> statement-breakpoint
ALTER TABLE `clients` ADD `type` text DEFAULT 'INTERESTED' NOT NULL;--> statement-breakpoint
ALTER TABLE `clients` ADD `guarantor_id` text REFERENCES guarantors(id) ON DELETE RESTRICT;
--> statement-breakpoint
UPDATE clients SET cpf_cnpj = replace(replace(replace(replace(trim(cpf_cnpj), '.', ''), '-', ''), '/', ''), ' ', '');
