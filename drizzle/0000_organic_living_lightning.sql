CREATE TABLE `pilot_records` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`project_slug` text NOT NULL,
	`kind` text NOT NULL,
	`note` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `pilot_records_owner_project_idx` ON `pilot_records` (`owner_id`,`project_slug`);