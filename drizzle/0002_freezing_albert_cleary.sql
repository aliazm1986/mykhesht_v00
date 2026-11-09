CREATE TABLE `document_extractions` (
	`id` text PRIMARY KEY NOT NULL,
	`document_id` text NOT NULL,
	`state` text NOT NULL,
	`source_kind` text NOT NULL,
	`text_content` text,
	`character_count` integer NOT NULL,
	`page_count` integer,
	`failure_reason` text,
	`created_by` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `document_extractions_document_unique` ON `document_extractions` (`document_id`);--> statement-breakpoint
CREATE INDEX `document_extractions_state_idx` ON `document_extractions` (`state`,`updated_at`);--> statement-breakpoint
CREATE TABLE `sample_reports` (
	`id` text PRIMARY KEY NOT NULL,
	`case_id` text NOT NULL,
	`project_slug` text NOT NULL,
	`title` text NOT NULL,
	`status` text NOT NULL,
	`scope_note` text NOT NULL,
	`source_document_ids_json` text NOT NULL,
	`content_json` text NOT NULL,
	`generated_by` text NOT NULL,
	`generated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `sample_reports_case_idx` ON `sample_reports` (`case_id`,`generated_at`);--> statement-breakpoint
CREATE INDEX `sample_reports_project_idx` ON `sample_reports` (`project_slug`,`generated_at`);