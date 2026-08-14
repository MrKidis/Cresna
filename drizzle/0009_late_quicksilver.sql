ALTER TABLE `foundingBetaInvites` ADD `deliveryStatus` enum('pending','sent','failed','unconfigured') DEFAULT 'pending' NOT NULL;--> statement-breakpoint
ALTER TABLE `foundingBetaInvites` ADD `deliveryMessageId` varchar(255);--> statement-breakpoint
ALTER TABLE `foundingBetaInvites` ADD `deliveryError` text;--> statement-breakpoint
ALTER TABLE `foundingBetaInvites` ADD `deliveredAt` timestamp;