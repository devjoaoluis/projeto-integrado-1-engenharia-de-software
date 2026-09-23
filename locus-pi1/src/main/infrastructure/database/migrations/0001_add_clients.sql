CREATE TABLE `clients` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`cpf_cnpj` text NOT NULL,
	`phone` text NOT NULL,
	`email` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `clients_cpf_cnpj_unique` ON `clients` (`cpf_cnpj`);
