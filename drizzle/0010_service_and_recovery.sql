CREATE TABLE `local_recovery_tokens` (
	`token_hash` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`expires_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `local_recovery_tokens_user_unique` ON `local_recovery_tokens` (`user_id`);--> statement-breakpoint
CREATE TABLE `maintenance_nonces` (
	`nonce` text PRIMARY KEY NOT NULL,
	`expires_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `operational_evidence` (
	`id` text PRIMARY KEY NOT NULL,
	`check_key` text NOT NULL,
	`status` text NOT NULL,
	`evidence_ref` text NOT NULL,
	`note` text NOT NULL,
	`actor_id` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `operational_evidence_key_time` ON `operational_evidence` (`check_key`,`created_at`);--> statement-breakpoint
CREATE TRIGGER operational_evidence_immutable_update BEFORE UPDATE ON operational_evidence BEGIN SELECT RAISE(ABORT,'operational_evidence_is_append_only'); END;
--> statement-breakpoint
CREATE TRIGGER operational_evidence_immutable_delete BEFORE DELETE ON operational_evidence BEGIN SELECT RAISE(ABORT,'operational_evidence_is_append_only'); END;
