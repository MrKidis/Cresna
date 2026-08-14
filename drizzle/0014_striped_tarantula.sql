ALTER TABLE `billingAccounts` ADD `revenueCatAppUserId` varchar(255);--> statement-breakpoint
ALTER TABLE `billingAccounts` ADD `revenueCatEntitlement` varchar(120);--> statement-breakpoint
ALTER TABLE `billingAccounts` ADD `revenueCatExpiresAt` timestamp;--> statement-breakpoint
ALTER TABLE `billingAccounts` ADD `revenueCatUpdatedAt` timestamp;--> statement-breakpoint
ALTER TABLE `billingAccounts` ADD CONSTRAINT `billingAccounts_revenueCatAppUserId_unique` UNIQUE(`revenueCatAppUserId`);