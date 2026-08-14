CREATE TABLE `userOnboarding` (
	`id` bigint AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`status` enum('not_started','completed','dismissed') NOT NULL DEFAULT 'not_started',
	`completedAt` timestamp,
	`dismissedAt` timestamp,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `userOnboarding_id` PRIMARY KEY(`id`),
	CONSTRAINT `user_onboarding_user_unique` UNIQUE(`userId`)
);
--> statement-breakpoint
ALTER TABLE `userOnboarding` ADD CONSTRAINT `userOnboarding_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;