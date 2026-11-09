CREATE TABLE `case_artifacts` (
	`id` text PRIMARY KEY NOT NULL,
	`case_id` text NOT NULL,
	`project_slug` text NOT NULL,
	`kind` text NOT NULL,
	`content_json` text NOT NULL,
	`revision` integer NOT NULL,
	`created_by` text NOT NULL,
	`updated_by` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `case_artifacts_kind_unique` ON `case_artifacts` (`case_id`,`kind`);--> statement-breakpoint
CREATE TABLE `project_memberships` (
	`id` text PRIMARY KEY NOT NULL,
	`project_slug` text NOT NULL,
	`user_id` text NOT NULL,
	`role` text NOT NULL,
	`active` integer DEFAULT 1 NOT NULL,
	`updated_by` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `project_memberships_user_project_unique` ON `project_memberships` (`project_slug`,`user_id`);--> statement-breakpoint
CREATE INDEX `project_memberships_user_idx` ON `project_memberships` (`user_id`,`active`);--> statement-breakpoint
ALTER TABLE `data_room_documents` ADD `revision` integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `project_cases` ADD `revision` integer DEFAULT 0 NOT NULL;