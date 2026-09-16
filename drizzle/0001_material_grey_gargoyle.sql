CREATE TABLE `addresses` (
	`id` int AUTO_INCREMENT NOT NULL,
	`streetId` int NOT NULL,
	`postalCode` varchar(12),
	`number` varchar(24) NOT NULL,
	`complement` varchar(160),
	`referencePoint` varchar(240),
	`latitude` decimal(9,6),
	`longitude` decimal(9,6),
	`locationSource` enum('gps','manual','geocoded','imported'),
	`status` enum('active','inactive','archived') NOT NULL DEFAULT 'active',
	`createdBy` int,
	`updatedBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`deletedAt` timestamp,
	CONSTRAINT `addresses_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `address_audit_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`entityType` varchar(48) NOT NULL,
	`entityId` int NOT NULL,
	`action` enum('create','update','delete','restore') NOT NULL,
	`actorUserId` int,
	`beforeData` text,
	`afterData` text,
	`reason` varchar(240),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `address_audit_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `cities` (
	`id` int AUTO_INCREMENT NOT NULL,
	`countryId` int NOT NULL,
	`subdivisionId` int NOT NULL,
	`officialCode` varchar(24),
	`name` varchar(160) NOT NULL,
	`normalizedName` varchar(160) NOT NULL,
	`latitude` decimal(9,6),
	`longitude` decimal(9,6),
	`status` enum('active','inactive','archived') NOT NULL DEFAULT 'active',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`deletedAt` timestamp,
	CONSTRAINT `cities_id` PRIMARY KEY(`id`),
	CONSTRAINT `cities_official_code_uq` UNIQUE(`countryId`,`officialCode`),
	CONSTRAINT `cities_subdivision_name_uq` UNIQUE(`subdivisionId`,`normalizedName`)
);
--> statement-breakpoint
CREATE TABLE `countries` (
	`id` int AUTO_INCREMENT NOT NULL,
	`isoAlpha2` varchar(2) NOT NULL,
	`isoAlpha3` varchar(3) NOT NULL,
	`name` varchar(120) NOT NULL,
	`nativeName` varchar(160),
	`status` enum('active','inactive','archived') NOT NULL DEFAULT 'active',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`deletedAt` timestamp,
	CONSTRAINT `countries_id` PRIMARY KEY(`id`),
	CONSTRAINT `countries_iso_alpha2_uq` UNIQUE(`isoAlpha2`),
	CONSTRAINT `countries_iso_alpha3_uq` UNIQUE(`isoAlpha3`)
);
--> statement-breakpoint
CREATE TABLE `neighborhoods` (
	`id` int AUTO_INCREMENT NOT NULL,
	`cityId` int NOT NULL,
	`name` varchar(160) NOT NULL,
	`normalizedName` varchar(160) NOT NULL,
	`status` enum('active','inactive','archived') NOT NULL DEFAULT 'active',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`deletedAt` timestamp,
	CONSTRAINT `neighborhoods_id` PRIMARY KEY(`id`),
	CONSTRAINT `neighborhoods_city_name_uq` UNIQUE(`cityId`,`normalizedName`)
);
--> statement-breakpoint
CREATE TABLE `street_types` (
	`id` int AUTO_INCREMENT NOT NULL,
	`code` varchar(24) NOT NULL,
	`name` varchar(64) NOT NULL,
	`abbreviation` varchar(16),
	`status` enum('active','inactive','archived') NOT NULL DEFAULT 'active',
	CONSTRAINT `street_types_id` PRIMARY KEY(`id`),
	CONSTRAINT `street_types_code_unique` UNIQUE(`code`)
);
--> statement-breakpoint
CREATE TABLE `streets` (
	`id` int AUTO_INCREMENT NOT NULL,
	`cityId` int NOT NULL,
	`neighborhoodId` int,
	`streetTypeId` int NOT NULL,
	`name` varchar(180) NOT NULL,
	`normalizedName` varchar(180) NOT NULL,
	`postalCode` varchar(12),
	`latitude` decimal(9,6),
	`longitude` decimal(9,6),
	`status` enum('active','inactive','archived') NOT NULL DEFAULT 'active',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`deletedAt` timestamp,
	CONSTRAINT `streets_id` PRIMARY KEY(`id`),
	CONSTRAINT `streets_city_type_name_neighborhood_uq` UNIQUE(`cityId`,`streetTypeId`,`normalizedName`,`neighborhoodId`)
);
--> statement-breakpoint
CREATE TABLE `subdivisions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`countryId` int NOT NULL,
	`code` varchar(12) NOT NULL,
	`name` varchar(120) NOT NULL,
	`shortName` varchar(12),
	`subdivisionType` varchar(40) NOT NULL DEFAULT 'state',
	`status` enum('active','inactive','archived') NOT NULL DEFAULT 'active',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`deletedAt` timestamp,
	CONSTRAINT `subdivisions_id` PRIMARY KEY(`id`),
	CONSTRAINT `subdivisions_country_code_uq` UNIQUE(`countryId`,`code`)
);
--> statement-breakpoint
ALTER TABLE `addresses` ADD CONSTRAINT `addresses_streetId_streets_id_fk` FOREIGN KEY (`streetId`) REFERENCES `streets`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `addresses` ADD CONSTRAINT `addresses_createdBy_users_id_fk` FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `addresses` ADD CONSTRAINT `addresses_updatedBy_users_id_fk` FOREIGN KEY (`updatedBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `address_audit_logs` ADD CONSTRAINT `address_audit_logs_actorUserId_users_id_fk` FOREIGN KEY (`actorUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `cities` ADD CONSTRAINT `cities_countryId_countries_id_fk` FOREIGN KEY (`countryId`) REFERENCES `countries`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `cities` ADD CONSTRAINT `cities_subdivisionId_subdivisions_id_fk` FOREIGN KEY (`subdivisionId`) REFERENCES `subdivisions`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `neighborhoods` ADD CONSTRAINT `neighborhoods_cityId_cities_id_fk` FOREIGN KEY (`cityId`) REFERENCES `cities`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `streets` ADD CONSTRAINT `streets_cityId_cities_id_fk` FOREIGN KEY (`cityId`) REFERENCES `cities`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `streets` ADD CONSTRAINT `streets_neighborhoodId_neighborhoods_id_fk` FOREIGN KEY (`neighborhoodId`) REFERENCES `neighborhoods`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `streets` ADD CONSTRAINT `streets_streetTypeId_street_types_id_fk` FOREIGN KEY (`streetTypeId`) REFERENCES `street_types`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `subdivisions` ADD CONSTRAINT `subdivisions_countryId_countries_id_fk` FOREIGN KEY (`countryId`) REFERENCES `countries`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `addresses_street_number_idx` ON `addresses` (`streetId`,`number`);--> statement-breakpoint
CREATE INDEX `addresses_postal_code_idx` ON `addresses` (`postalCode`);--> statement-breakpoint
CREATE INDEX `addresses_coordinates_idx` ON `addresses` (`latitude`,`longitude`);--> statement-breakpoint
CREATE INDEX `addresses_status_deleted_idx` ON `addresses` (`status`,`deletedAt`);--> statement-breakpoint
CREATE INDEX `address_audit_entity_idx` ON `address_audit_logs` (`entityType`,`entityId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `address_audit_actor_idx` ON `address_audit_logs` (`actorUserId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `cities_search_idx` ON `cities` (`subdivisionId`,`normalizedName`);--> statement-breakpoint
CREATE INDEX `countries_status_idx` ON `countries` (`status`);--> statement-breakpoint
CREATE INDEX `neighborhoods_search_idx` ON `neighborhoods` (`cityId`,`normalizedName`);--> statement-breakpoint
CREATE INDEX `streets_city_search_idx` ON `streets` (`cityId`,`normalizedName`);--> statement-breakpoint
CREATE INDEX `streets_postal_code_idx` ON `streets` (`postalCode`);--> statement-breakpoint
CREATE INDEX `subdivisions_country_name_idx` ON `subdivisions` (`countryId`,`name`);