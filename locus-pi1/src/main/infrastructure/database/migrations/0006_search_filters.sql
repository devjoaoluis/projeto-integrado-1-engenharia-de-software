ALTER TABLE `properties` ADD `neighborhood` text;
ALTER TABLE `properties` ADD `bedrooms` integer;
ALTER TABLE `properties` ADD `search_normalized` text;

CREATE INDEX `idx_status_neighborhood` ON `properties` (`status`, `neighborhood`);
CREATE INDEX `idx_price` ON `properties` (`price`);
CREATE INDEX `idx_bedrooms` ON `properties` (`bedrooms`);
