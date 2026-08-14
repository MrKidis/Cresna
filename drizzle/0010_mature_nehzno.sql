CREATE TABLE `betaAccessRequests` (
	`id` bigint AUTO_INCREMENT NOT NULL,
	`email` varchar(320) NOT NULL,
	`storeUrl` varchar(255),
	`note` text,
	`status` enum('requested','invited','declined') NOT NULL DEFAULT 'requested',
	`invitedByUserId` int,
	`invitedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `betaAccessRequests_id` PRIMARY KEY(`id`),
	CONSTRAINT `betaAccessRequests_email_unique` UNIQUE(`email`)
);
--> statement-breakpoint
ALTER TABLE `betaAccessRequests` ADD CONSTRAINT `betaAccessRequests_invitedByUserId_users_id_fk` FOREIGN KEY (`invitedByUserId`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `beta_access_requests_status_idx` ON `betaAccessRequests` (`status`);