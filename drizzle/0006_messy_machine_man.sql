CREATE TABLE `maintenance_runs` (
	`id` text PRIMARY KEY NOT NULL,
	`state` text NOT NULL,
	`backup_id` text,
	`result_json` text,
	`started_at` integer NOT NULL,
	`finished_at` integer
);
