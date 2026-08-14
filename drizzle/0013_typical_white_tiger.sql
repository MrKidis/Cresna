CREATE TABLE `merchantWriteApprovals` (
	`id` bigint AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`draftId` bigint NOT NULL,
	`operation` enum('product_content_publish','positioning_publish') NOT NULL,
	`status` enum('not_configured','approved','executed','rejected') NOT NULL DEFAULT 'not_configured',
	`approvalNote` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `merchantWriteApprovals_id` PRIMARY KEY(`id`),
	CONSTRAINT `merchant_write_approval_draft_operation_unique` UNIQUE(`draftId`,`operation`)
);
--> statement-breakpoint
ALTER TABLE `merchantWriteApprovals` ADD CONSTRAINT `merchantWriteApprovals_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `merchantWriteApprovals` ADD CONSTRAINT `merchantWriteApprovals_draftId_aiActionDrafts_id_fk` FOREIGN KEY (`draftId`) REFERENCES `aiActionDrafts`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `merchant_write_approval_user_status_idx` ON `merchantWriteApprovals` (`userId`,`status`);