CREATE TABLE `billingAccounts` (
	`id` bigint AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`stripeSubscriptionId` varchar(255),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `billingAccounts_id` PRIMARY KEY(`id`),
	CONSTRAINT `billingAccounts_stripeSubscriptionId_unique` UNIQUE(`stripeSubscriptionId`),
	CONSTRAINT `billing_accounts_user_unique` UNIQUE(`userId`)
);
--> statement-breakpoint
CREATE TABLE `productDailyMetrics` (
	`id` bigint AUTO_INCREMENT NOT NULL,
	`storeId` bigint NOT NULL,
	`shopifyProductId` varchar(64) NOT NULL,
	`metricDate` timestamp NOT NULL,
	`title` varchar(512) NOT NULL,
	`sku` varchar(255),
	`unitsSold` int NOT NULL,
	`orderCount` int NOT NULL,
	`refundCount` int NOT NULL,
	`grossRevenue` decimal(14,2) NOT NULL,
	`discountAmount` decimal(14,2) NOT NULL,
	`refundAmount` decimal(14,2) NOT NULL,
	`costEstimate` decimal(14,2),
	`sourceUpdatedAt` timestamp NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `productDailyMetrics_id` PRIMARY KEY(`id`),
	CONSTRAINT `product_daily_metrics_product_date_unique` UNIQUE(`storeId`,`shopifyProductId`,`metricDate`)
);
--> statement-breakpoint
CREATE TABLE `recommendationActions` (
	`id` bigint AUTO_INCREMENT NOT NULL,
	`recommendationId` bigint NOT NULL,
	`actedAt` timestamp NOT NULL,
	`baselineStart` timestamp NOT NULL,
	`baselineEnd` timestamp NOT NULL,
	`baselineRevenue` decimal(14,2) NOT NULL,
	`comparisonStart` timestamp NOT NULL,
	`comparisonEnd` timestamp NOT NULL,
	`comparisonRevenue` decimal(14,2),
	`revenueChange` decimal(14,2),
	`measurementStatus` enum('waiting','measured','insufficient_data') NOT NULL DEFAULT 'waiting',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `recommendationActions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `recommendations` (
	`id` bigint AUTO_INCREMENT NOT NULL,
	`storeId` bigint NOT NULL,
	`category` enum('underperforming_sku','high_refunds','abandoned_cart','margin_erosion','restock','product_copy') NOT NULL,
	`title` varchar(255) NOT NULL,
	`rationale` text NOT NULL,
	`recommendedAction` text NOT NULL,
	`evidence` text NOT NULL,
	`estimatedImpactLow` decimal(14,2) NOT NULL,
	`estimatedImpactHigh` decimal(14,2) NOT NULL,
	`confidencePercent` int NOT NULL,
	`priorityRank` int NOT NULL,
	`status` enum('open','in_progress','completed','dismissed') NOT NULL DEFAULT 'open',
	`generatedAt` timestamp NOT NULL DEFAULT (now()),
	`expiresAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `recommendations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `shopifyOauthStates` (
	`id` bigint AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`shopDomain` varchar(255) NOT NULL,
	`stateHash` varchar(128) NOT NULL,
	`expiresAt` timestamp NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `shopifyOauthStates_id` PRIMARY KEY(`id`),
	CONSTRAINT `shopifyOauthStates_stateHash_unique` UNIQUE(`stateHash`)
);
--> statement-breakpoint
CREATE TABLE `storeDailyMetrics` (
	`id` bigint AUTO_INCREMENT NOT NULL,
	`storeId` bigint NOT NULL,
	`metricDate` timestamp NOT NULL,
	`grossRevenue` decimal(14,2) NOT NULL,
	`netRevenue` decimal(14,2) NOT NULL,
	`orderCount` int NOT NULL,
	`customerCount` int NOT NULL,
	`checkoutCount` int NOT NULL,
	`abandonedCheckoutCount` int NOT NULL,
	`refundCount` int NOT NULL,
	`refundAmount` decimal(14,2) NOT NULL,
	`sourceUpdatedAt` timestamp NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `storeDailyMetrics_id` PRIMARY KEY(`id`),
	CONSTRAINT `store_daily_metrics_store_date_unique` UNIQUE(`storeId`,`metricDate`)
);
--> statement-breakpoint
CREATE TABLE `stores` (
	`id` bigint AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`shopifyShopId` varchar(64) NOT NULL,
	`myshopifyDomain` varchar(255) NOT NULL,
	`displayName` varchar(255) NOT NULL,
	`currency` varchar(3) NOT NULL,
	`accessTokenCiphertext` text NOT NULL,
	`grantedScopes` text NOT NULL,
	`connectionStatus` enum('connected','disconnected','error') NOT NULL DEFAULT 'connected',
	`installedAt` timestamp NOT NULL DEFAULT (now()),
	`lastSyncedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `stores_id` PRIMARY KEY(`id`),
	CONSTRAINT `stores_shopifyShopId_unique` UNIQUE(`shopifyShopId`),
	CONSTRAINT `stores_myshopifyDomain_unique` UNIQUE(`myshopifyDomain`)
);
--> statement-breakpoint
ALTER TABLE `users` ADD `stripeCustomerId` varchar(255);--> statement-breakpoint
ALTER TABLE `users` ADD CONSTRAINT `users_stripeCustomerId_unique` UNIQUE(`stripeCustomerId`);--> statement-breakpoint
ALTER TABLE `billingAccounts` ADD CONSTRAINT `billingAccounts_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `productDailyMetrics` ADD CONSTRAINT `productDailyMetrics_storeId_stores_id_fk` FOREIGN KEY (`storeId`) REFERENCES `stores`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `recommendationActions` ADD CONSTRAINT `recommendationActions_recommendationId_recommendations_id_fk` FOREIGN KEY (`recommendationId`) REFERENCES `recommendations`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `recommendations` ADD CONSTRAINT `recommendations_storeId_stores_id_fk` FOREIGN KEY (`storeId`) REFERENCES `stores`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `shopifyOauthStates` ADD CONSTRAINT `shopifyOauthStates_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `storeDailyMetrics` ADD CONSTRAINT `storeDailyMetrics_storeId_stores_id_fk` FOREIGN KEY (`storeId`) REFERENCES `stores`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `stores` ADD CONSTRAINT `stores_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `product_daily_metrics_store_idx` ON `productDailyMetrics` (`storeId`);--> statement-breakpoint
CREATE INDEX `recommendation_actions_recommendation_idx` ON `recommendationActions` (`recommendationId`);--> statement-breakpoint
CREATE INDEX `recommendations_store_status_idx` ON `recommendations` (`storeId`,`status`);--> statement-breakpoint
CREATE INDEX `recommendations_store_priority_idx` ON `recommendations` (`storeId`,`priorityRank`);--> statement-breakpoint
CREATE INDEX `shopify_oauth_states_user_idx` ON `shopifyOauthStates` (`userId`);--> statement-breakpoint
CREATE INDEX `store_daily_metrics_store_idx` ON `storeDailyMetrics` (`storeId`);--> statement-breakpoint
CREATE INDEX `stores_user_idx` ON `stores` (`userId`);