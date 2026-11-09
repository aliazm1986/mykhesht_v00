CREATE TABLE `audit_events` (
	`id` text PRIMARY KEY NOT NULL,
	`actor_id` text NOT NULL,
	`case_id` text,
	`action` text NOT NULL,
	`target_type` text NOT NULL,
	`target_id` text NOT NULL,
	`payload_json` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `audit_events_case_idx` ON `audit_events` (`case_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `audit_events_actor_idx` ON `audit_events` (`actor_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `case_stage_decisions` (
	`id` text PRIMARY KEY NOT NULL,
	`case_id` text NOT NULL,
	`stage_key` text NOT NULL,
	`state` text NOT NULL,
	`responsible_role` text NOT NULL,
	`decision_reason` text NOT NULL,
	`updated_by` text NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `case_stage_decisions_case_stage_unique` ON `case_stage_decisions` (`case_id`,`stage_key`);--> statement-breakpoint
CREATE INDEX `case_stage_decisions_case_idx` ON `case_stage_decisions` (`case_id`,`updated_at`);--> statement-breakpoint
CREATE TABLE `data_room_documents` (
	`id` text PRIMARY KEY NOT NULL,
	`case_id` text NOT NULL,
	`project_slug` text NOT NULL,
	`title` text NOT NULL,
	`category` text NOT NULL,
	`original_filename` text NOT NULL,
	`storage_key` text NOT NULL,
	`mime_type` text NOT NULL,
	`size_bytes` integer NOT NULL,
	`checksum_sha256` text NOT NULL,
	`access_level` text NOT NULL,
	`extraction_status` text NOT NULL,
	`review_status` text NOT NULL,
	`uploaded_by` text NOT NULL,
	`uploaded_at` integer NOT NULL,
	`reviewed_by` text,
	`reviewed_at` integer
);
--> statement-breakpoint
CREATE INDEX `data_room_documents_case_idx` ON `data_room_documents` (`case_id`,`uploaded_at`);--> statement-breakpoint
CREATE INDEX `data_room_documents_project_idx` ON `data_room_documents` (`project_slug`,`review_status`);--> statement-breakpoint
CREATE TABLE `document_reviews` (
	`id` text PRIMARY KEY NOT NULL,
	`document_id` text NOT NULL,
	`reviewer_id` text NOT NULL,
	`outcome` text NOT NULL,
	`note` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `document_reviews_document_idx` ON `document_reviews` (`document_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `project_cases` (
	`id` text PRIMARY KEY NOT NULL,
	`project_slug` text NOT NULL,
	`title` text NOT NULL,
	`status` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `project_cases_slug_unique` ON `project_cases` (`project_slug`);--> statement-breakpoint
CREATE INDEX `project_cases_status_idx` ON `project_cases` (`status`);--> statement-breakpoint
CREATE TABLE `user_profiles` (
	`user_id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`display_name` text NOT NULL,
	`role` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `user_profiles_role_idx` ON `user_profiles` (`role`);--> statement-breakpoint
CREATE TABLE `wealth_scenarios` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`name` text NOT NULL,
	`selected_project_slugs` text NOT NULL,
	`virtual_budget` integer NOT NULL,
	`horizon_months` integer NOT NULL,
	`analysis_style` text NOT NULL,
	`snapshot_json` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `wealth_scenarios_owner_idx` ON `wealth_scenarios` (`owner_id`,`updated_at`);