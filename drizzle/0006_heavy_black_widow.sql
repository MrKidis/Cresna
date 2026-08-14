CREATE TABLE `aiActionDrafts` (
	`id` bigint AUTO_INCREMENT NOT NULL,
	`storeId` bigint NOT NULL,
	`recommendationId` bigint,
	`productId` bigint,
	`actionType` enum('product_description','positioning') NOT NULL,
	`originalContent` text NOT NULL,
	`generatedContent` text NOT NULL,
	`inputEvidenceJson` text NOT NULL,
	`status` enum('generated','approved','rejected') NOT NULL DEFAULT 'generated',
	`approvedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `aiActionDrafts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `businessBrainEvents` (
	`id` bigint AUTO_INCREMENT NOT NULL,
	`storeId` bigint NOT NULL,
	`eventType` enum('scan_completed','recommendation_approved','recommendation_dismissed','draft_generated','draft_approved','draft_rejected','action_completed','outcome_measured') NOT NULL,
	`entityType` varchar(80) NOT NULL,
	`entityId` bigint,
	`payloadJson` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `businessBrainEvents_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `collections` (
	`id` bigint AUTO_INCREMENT NOT NULL,
	`storeId` bigint NOT NULL,
	`shopifyCollectionId` varchar(64) NOT NULL,
	`title` varchar(512) NOT NULL,
	`handle` varchar(255),
	`descriptionHtml` text,
	`seoTitle` varchar(255),
	`seoDescription` text,
	`productCount` int NOT NULL DEFAULT 0,
	`updatedAtSource` timestamp NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `collections_id` PRIMARY KEY(`id`),
	CONSTRAINT `collections_store_shopify_collection_unique` UNIQUE(`storeId`,`shopifyCollectionId`)
);
--> statement-breakpoint
CREATE TABLE `growthScoreSnapshots` (
	`id` bigint AUTO_INCREMENT NOT NULL,
	`storeId` bigint NOT NULL,
	`overallScore` int,
	`coveragePercent` int NOT NULL,
	`status` enum('ready','partial','needs_more_data') NOT NULL,
	`componentsJson` text NOT NULL,
	`calculationVersion` varchar(32) NOT NULL,
	`calculatedAt` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `growthScoreSnapshots_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `storeScanSnapshots` (
	`id` bigint AUTO_INCREMENT NOT NULL,
	`storeId` bigint NOT NULL,
	`status` enum('ready','needs_more_data','failed') NOT NULL,
	`coveragePercent` int NOT NULL,
	`sourceCoverageJson` text NOT NULL,
	`summary` text NOT NULL,
	`scannedAt` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `storeScanSnapshots_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `merchantGrowthProfiles` ADD `brandValues` text;--> statement-breakpoint
ALTER TABLE `merchantGrowthProfiles` ADD `positioning` text;--> statement-breakpoint
ALTER TABLE `merchantGrowthProfiles` ADD `differentiators` text;--> statement-breakpoint
ALTER TABLE `products` ADD `descriptionHtml` text;--> statement-breakpoint
ALTER TABLE `products` ADD `seoTitle` varchar(255);--> statement-breakpoint
ALTER TABLE `products` ADD `seoDescription` text;--> statement-breakpoint
ALTER TABLE `products` ADD `mediaCount` int;--> statement-breakpoint
ALTER TABLE `aiActionDrafts` ADD CONSTRAINT `aiActionDrafts_storeId_stores_id_fk` FOREIGN KEY (`storeId`) REFERENCES `stores`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `aiActionDrafts` ADD CONSTRAINT `aiActionDrafts_recommendationId_recommendations_id_fk` FOREIGN KEY (`recommendationId`) REFERENCES `recommendations`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `aiActionDrafts` ADD CONSTRAINT `aiActionDrafts_productId_products_id_fk` FOREIGN KEY (`productId`) REFERENCES `products`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `businessBrainEvents` ADD CONSTRAINT `businessBrainEvents_storeId_stores_id_fk` FOREIGN KEY (`storeId`) REFERENCES `stores`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `collections` ADD CONSTRAINT `collections_storeId_stores_id_fk` FOREIGN KEY (`storeId`) REFERENCES `stores`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `growthScoreSnapshots` ADD CONSTRAINT `growthScoreSnapshots_storeId_stores_id_fk` FOREIGN KEY (`storeId`) REFERENCES `stores`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `storeScanSnapshots` ADD CONSTRAINT `storeScanSnapshots_storeId_stores_id_fk` FOREIGN KEY (`storeId`) REFERENCES `stores`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `ai_action_drafts_store_status_idx` ON `aiActionDrafts` (`storeId`,`status`);--> statement-breakpoint
CREATE INDEX `business_brain_events_store_idx` ON `businessBrainEvents` (`storeId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `collections_store_idx` ON `collections` (`storeId`);--> statement-breakpoint
CREATE INDEX `growth_score_snapshots_store_idx` ON `growthScoreSnapshots` (`storeId`,`calculatedAt`);--> statement-breakpoint
CREATE INDEX `store_scan_snapshots_store_idx` ON `storeScanSnapshots` (`storeId`,`scannedAt`);