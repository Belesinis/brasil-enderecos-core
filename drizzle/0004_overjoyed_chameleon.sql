ALTER TABLE `addresses` ADD `propertyType` enum('house','store','apartment','other') DEFAULT 'house' NOT NULL;--> statement-breakpoint
ALTER TABLE `addresses` ADD `apartmentNumber` varchar(24);