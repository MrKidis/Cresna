CREATE TABLE `betaFeatureOverrides` (
	`id` bigint AUTO_INCREMENT NOT NULL,
	`betaInviteId` bigint NOT NULL,
	`featureKey` varchar(80) NOT NULL,
	`enabled` int NOT NULL DEFAULT 0,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `betaFeatureOverrides_id` PRIMARY KEY(`id`),
	CONSTRAINT `beta_feature_override_unique` UNIQUE(`betaInviteId`,`featureKey`)
);
--> statement-breakpoint
CREATE TABLE `betaFeedback` (
	`id` bigint AUTO_INCREMENT NOT NULL,
	`betaInviteId` bigint NOT NULL,
	`checkpoint` enum('day_1','day_3','day_7') NOT NULL,
	`growthProfileRating` int,
	`mostUsefulRecommendation` text,
	`willingnessToPay` enum('definitely','probably','maybe','no'),
	`feedbackText` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `betaFeedback_id` PRIMARY KEY(`id`),
	CONSTRAINT `beta_feedback_invite_checkpoint_unique` UNIQUE(`betaInviteId`,`checkpoint`)
);
--> statement-breakpoint
CREATE TABLE `foundingBetaInvites` (
	`id` bigint AUTO_INCREMENT NOT NULL,
	`email` varchar(320) NOT NULL,
	`invitedByUserId` int NOT NULL,
	`status` enum('invited','active','expired','revoked') NOT NULL DEFAULT 'invited',
	`activatedUserId` int,
	`activatedAt` timestamp,
	`expiresAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `foundingBetaInvites_id` PRIMARY KEY(`id`),
	CONSTRAINT `foundingBetaInvites_email_unique` UNIQUE(`email`)
);
--> statement-breakpoint
ALTER TABLE `betaFeatureOverrides` ADD CONSTRAINT `betaFeatureOverrides_betaInviteId_foundingBetaInvites_id_fk` FOREIGN KEY (`betaInviteId`) REFERENCES `foundingBetaInvites`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `betaFeedback` ADD CONSTRAINT `betaFeedback_betaInviteId_foundingBetaInvites_id_fk` FOREIGN KEY (`betaInviteId`) REFERENCES `foundingBetaInvites`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `foundingBetaInvites` ADD CONSTRAINT `foundingBetaInvites_invitedByUserId_users_id_fk` FOREIGN KEY (`invitedByUserId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `foundingBetaInvites` ADD CONSTRAINT `foundingBetaInvites_activatedUserId_users_id_fk` FOREIGN KEY (`activatedUserId`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `founding_beta_invites_status_idx` ON `foundingBetaInvites` (`status`);