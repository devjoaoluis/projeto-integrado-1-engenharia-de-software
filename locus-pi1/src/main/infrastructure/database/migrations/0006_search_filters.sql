ALTER TABLE `properties` ADD `neighborhood` text;
ALTER TABLE `properties` ADD `bedrooms` integer;
ALTER TABLE `properties` ADD `search_normalized` text;
ALTER TABLE `properties` ADD `iptu` real;
ALTER TABLE `properties` ADD `type` text;
ALTER TABLE `properties` ADD `fiscal_status` text;
ALTER TABLE `properties` ADD `sanitation_status` text;
ALTER TABLE `properties` ADD `registration_date` text;
ALTER TABLE `properties` ADD `owner_id` text;

CREATE INDEX `idx_status_neighborhood` ON `properties` (`status`, `neighborhood`);
CREATE INDEX `idx_price` ON `properties` (`price`);
CREATE INDEX `idx_bedrooms` ON `properties` (`bedrooms`);
