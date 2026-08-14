CREATE TABLE `products` (
	`id` bigint AUTO_INCREMENT NOT NULL,
	`storeId` bigint NOT NULL,
	`shopifyProductId` varchar(64) NOT NULL,
	`title` varchar(512) NOT NULL,
	`handle` varchar(255),
	`vendor` varchar(255),
	`productType` varchar(255),
	`status` varchar(64) NOT NULL,
	`totalInventory` int,
	`updatedAtSource` timestamp NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `products_id` PRIMARY KEY(`id`),
	CONSTRAINT `products_store_shopify_product_unique` UNIQUE(`storeId`,`shopifyProductId`)
);
--> statement-breakpoint
ALTER TABLE `productDailyMetrics` ADD `productId` bigint;--> statement-breakpoint
ALTER TABLE `products` ADD CONSTRAINT `products_storeId_stores_id_fk` FOREIGN KEY (`storeId`) REFERENCES `stores`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `products_store_idx` ON `products` (`storeId`);--> statement-breakpoint
ALTER TABLE `productDailyMetrics` ADD CONSTRAINT `productDailyMetrics_productId_products_id_fk` FOREIGN KEY (`productId`) REFERENCES `products`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `product_daily_metrics_product_idx` ON `productDailyMetrics` (`productId`);