CREATE TABLE `userNotificationPreferences` (
	`id` bigint AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`betaUpdates` int NOT NULL DEFAULT 1,
	`productUpdates` int NOT NULL DEFAULT 1,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `userNotificationPreferences_id` PRIMARY KEY(`id`),
	CONSTRAINT `user_notification_preferences_user_unique` UNIQUE(`userId`)
);
--> statement-breakpoint
ALTER TABLE `userNotificationPreferences` ADD CONSTRAINT `userNotificationPreferences_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;