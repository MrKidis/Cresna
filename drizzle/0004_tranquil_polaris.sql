CREATE TABLE `merchantGrowthProfiles` (
	`id` bigint AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`goalsJson` text NOT NULL,
	`brandSummary` text,
	`targetCustomer` text,
	`brandVoice` varchar(120),
	`scanStatus` enum('not_started','ready','needs_more_data') NOT NULL DEFAULT 'not_started',
	`lastScannedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `merchantGrowthProfiles_id` PRIMARY KEY(`id`),
	CONSTRAINT `merchant_growth_profiles_user_unique` UNIQUE(`userId`)
);
--> statement-breakpoint
ALTER TABLE `recommendations` MODIFY COLUMN `status` enum('open','approved','in_progress','completed','dismissed') NOT NULL DEFAULT 'open';--> statement-breakpoint
ALTER TABLE `recommendations` ADD `effortLevel` enum('low','medium','high') DEFAULT 'medium' NOT NULL;--> statement-breakpoint
ALTER TABLE `merchantGrowthProfiles` ADD CONSTRAINT `merchantGrowthProfiles_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;