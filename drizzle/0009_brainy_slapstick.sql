CREATE TABLE `local_accounts` (
	`user_id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`password_hash` text NOT NULL,
	`active` integer DEFAULT 1 NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `local_accounts_email_unique` ON `local_accounts` (`email`);--> statement-breakpoint
CREATE TABLE `local_sessions` (
	`token_hash` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`expires_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TRIGGER notify_stage_change AFTER UPDATE ON case_stage_decisions
WHEN OLD.state <> NEW.state
BEGIN
 INSERT INTO notifications(id,owner_id,title,body,href,read_at,created_at)
 SELECT lower(hex(randomblob(16))),r.owner_id,'تغییر مرحلهٔ پرونده',
 'پرونده: '||c.title||' · مرحله: '||NEW.stage_key||' · وضعیت: '||NEW.state||' · برچسب‌ها: '||r.tracks_json,
 '/projects/'||c.project_slug||'/documents',NULL,CAST(unixepoch('subsec')*1000 AS INTEGER)
 FROM review_rules r JOIN project_cases c ON c.id=NEW.case_id
 WHERE r.enabled=1 AND (r.trigger='all' OR r.trigger=NEW.stage_key)
 AND (EXISTS(SELECT 1 FROM project_memberships m WHERE m.project_slug=c.project_slug AND m.user_id=r.owner_id AND m.active=1) OR EXISTS(SELECT 1 FROM user_profiles u WHERE u.user_id=r.owner_id AND u.role='admin'));
END;

--> statement-breakpoint
CREATE TRIGGER document_case_limit BEFORE INSERT ON data_room_documents WHEN (SELECT COUNT(*) FROM data_room_documents WHERE case_id=NEW.case_id)>=200 BEGIN SELECT RAISE(ABORT,'Dossier document limit reached'); END;
