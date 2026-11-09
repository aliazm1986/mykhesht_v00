CREATE TABLE IF NOT EXISTS `user_wallets` (
	`user_id` text PRIMARY KEY NOT NULL,
	`balance_toman` integer DEFAULT 500000000 NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `share_holdings` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`project_slug` text NOT NULL,
	`shares` integer DEFAULT 0 NOT NULL,
	`locked_shares` integer DEFAULT 0 NOT NULL,
	`avg_price_toman` integer DEFAULT 500000 NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `share_holdings_user_project_unique` ON `share_holdings` (`user_id`,`project_slug`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `share_holdings_user_idx` ON `share_holdings` (`user_id`);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `market_orders` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`user_display_name` text NOT NULL,
	`project_slug` text NOT NULL,
	`side` text NOT NULL,
	`price_toman` integer NOT NULL,
	`initial_shares` integer NOT NULL,
	`remaining_shares` integer NOT NULL,
	`status` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `market_orders_project_status_idx` ON `market_orders` (`project_slug`,`status`,`price_toman`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `market_orders_user_idx` ON `market_orders` (`user_id`,`created_at`);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `market_trades` (
	`id` text PRIMARY KEY NOT NULL,
	`project_slug` text NOT NULL,
	`buy_order_id` text,
	`sell_order_id` text,
	`buyer_id` text NOT NULL,
	`seller_id` text NOT NULL,
	`shares` integer NOT NULL,
	`price_toman` integer NOT NULL,
	`total_toman` integer NOT NULL,
	`kind` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `market_trades_project_idx` ON `market_trades` (`project_slug`,`created_at`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `market_trades_buyer_idx` ON `market_trades` (`buyer_id`,`created_at`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `market_trades_seller_idx` ON `market_trades` (`seller_id`,`created_at`);
