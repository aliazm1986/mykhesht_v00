CREATE TABLE `record_versions` (
	`id` text PRIMARY KEY NOT NULL,
	`project_slug` text NOT NULL,
	`entity_type` text NOT NULL,
	`entity_id` text NOT NULL,
	`actor_id` text NOT NULL,
	`snapshot_json` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `record_versions_project_idx` ON `record_versions` (`project_slug`,`created_at`);--> statement-breakpoint
CREATE TABLE `review_rules` (
	`owner_id` text PRIMARY KEY NOT NULL,
	`enabled` integer NOT NULL,
	`trigger` text NOT NULL,
	`tracks_json` text NOT NULL,
	`updated_at` integer NOT NULL
);

--> statement-breakpoint
CREATE TRIGGER history_project_definitions_insert AFTER INSERT ON project_definitions BEGIN
 INSERT INTO record_versions(id,project_slug,entity_type,entity_id,actor_id,snapshot_json,created_at) VALUES(lower(hex(randomblob(16))),NEW.slug,'projectDefinitions',NEW.slug,NEW.updated_by,json_object('slug',NEW.slug,'definitionJson',NEW.definition_json,'revision',NEW.revision,'archived',NEW.archived,'updatedBy',NEW.updated_by,'createdAt',NEW.created_at,'updatedAt',NEW.updated_at),CAST(unixepoch('subsec')*1000 AS INTEGER));
 INSERT INTO audit_events(id,actor_id,case_id,action,target_type,target_id,payload_json,created_at) VALUES(lower(hex(randomblob(16))),NEW.updated_by,(SELECT id FROM project_cases WHERE project_slug=NEW.slug),'project.saved','project',NEW.slug,json_object('snapshot',1),CAST(unixepoch('subsec')*1000 AS INTEGER));
END;
--> statement-breakpoint
CREATE TRIGGER history_project_definitions_update AFTER UPDATE ON project_definitions BEGIN
 INSERT INTO record_versions(id,project_slug,entity_type,entity_id,actor_id,snapshot_json,created_at) VALUES(lower(hex(randomblob(16))),NEW.slug,'projectDefinitions',NEW.slug,NEW.updated_by,json_object('slug',NEW.slug,'definitionJson',NEW.definition_json,'revision',NEW.revision,'archived',NEW.archived,'updatedBy',NEW.updated_by,'createdAt',NEW.created_at,'updatedAt',NEW.updated_at),CAST(unixepoch('subsec')*1000 AS INTEGER));
 INSERT INTO audit_events(id,actor_id,case_id,action,target_type,target_id,payload_json,created_at) VALUES(lower(hex(randomblob(16))),NEW.updated_by,(SELECT id FROM project_cases WHERE project_slug=NEW.slug),'project.saved','project',NEW.slug,json_object('snapshot',1),CAST(unixepoch('subsec')*1000 AS INTEGER));
END;
--> statement-breakpoint
INSERT INTO record_versions(id,project_slug,entity_type,entity_id,actor_id,snapshot_json,created_at) SELECT lower(hex(randomblob(16))),NEW.slug,'projectDefinitions',NEW.slug,NEW.updated_by,json_object('slug',NEW.slug,'definitionJson',NEW.definition_json,'revision',NEW.revision,'archived',NEW.archived,'updatedBy',NEW.updated_by,'createdAt',NEW.created_at,'updatedAt',NEW.updated_at),CAST(unixepoch('subsec')*1000 AS INTEGER) FROM project_definitions AS NEW;
--> statement-breakpoint
CREATE TRIGGER history_case_artifacts_insert AFTER INSERT ON case_artifacts BEGIN
 INSERT INTO record_versions(id,project_slug,entity_type,entity_id,actor_id,snapshot_json,created_at) VALUES(lower(hex(randomblob(16))),NEW.project_slug,'caseArtifacts',NEW.id,NEW.updated_by,json_object('id',NEW.id,'caseId',NEW.case_id,'projectSlug',NEW.project_slug,'kind',NEW.kind,'contentJson',NEW.content_json,'revision',NEW.revision,'createdBy',NEW.created_by,'updatedBy',NEW.updated_by,'createdAt',NEW.created_at,'updatedAt',NEW.updated_at),CAST(unixepoch('subsec')*1000 AS INTEGER));
 INSERT INTO audit_events(id,actor_id,case_id,action,target_type,target_id,payload_json,created_at) VALUES(lower(hex(randomblob(16))),NEW.updated_by,(SELECT id FROM project_cases WHERE project_slug=NEW.project_slug),'record.snapshot','caseArtifacts',NEW.id,json_object('snapshot',1),CAST(unixepoch('subsec')*1000 AS INTEGER));
END;
--> statement-breakpoint
CREATE TRIGGER history_case_artifacts_update AFTER UPDATE ON case_artifacts BEGIN
 INSERT INTO record_versions(id,project_slug,entity_type,entity_id,actor_id,snapshot_json,created_at) VALUES(lower(hex(randomblob(16))),NEW.project_slug,'caseArtifacts',NEW.id,NEW.updated_by,json_object('id',NEW.id,'caseId',NEW.case_id,'projectSlug',NEW.project_slug,'kind',NEW.kind,'contentJson',NEW.content_json,'revision',NEW.revision,'createdBy',NEW.created_by,'updatedBy',NEW.updated_by,'createdAt',NEW.created_at,'updatedAt',NEW.updated_at),CAST(unixepoch('subsec')*1000 AS INTEGER));
 INSERT INTO audit_events(id,actor_id,case_id,action,target_type,target_id,payload_json,created_at) VALUES(lower(hex(randomblob(16))),NEW.updated_by,(SELECT id FROM project_cases WHERE project_slug=NEW.project_slug),'record.snapshot','caseArtifacts',NEW.id,json_object('snapshot',1),CAST(unixepoch('subsec')*1000 AS INTEGER));
END;
--> statement-breakpoint
INSERT INTO record_versions(id,project_slug,entity_type,entity_id,actor_id,snapshot_json,created_at) SELECT lower(hex(randomblob(16))),NEW.project_slug,'caseArtifacts',NEW.id,NEW.updated_by,json_object('id',NEW.id,'caseId',NEW.case_id,'projectSlug',NEW.project_slug,'kind',NEW.kind,'contentJson',NEW.content_json,'revision',NEW.revision,'createdBy',NEW.created_by,'updatedBy',NEW.updated_by,'createdAt',NEW.created_at,'updatedAt',NEW.updated_at),CAST(unixepoch('subsec')*1000 AS INTEGER) FROM case_artifacts AS NEW;
--> statement-breakpoint
CREATE TRIGGER history_document_extractions_insert AFTER INSERT ON document_extractions BEGIN
 INSERT INTO record_versions(id,project_slug,entity_type,entity_id,actor_id,snapshot_json,created_at) VALUES(lower(hex(randomblob(16))),(SELECT project_slug FROM data_room_documents WHERE id=NEW.document_id),'documentExtractions',NEW.document_id,NEW.created_by,json_object('id',NEW.id,'documentId',NEW.document_id,'state',NEW.state,'sourceKind',NEW.source_kind,'metadataJson',NEW.metadata_json,'textContent',NEW.text_content,'characterCount',NEW.character_count,'pageCount',NEW.page_count,'failureReason',NEW.failure_reason,'createdBy',NEW.created_by,'createdAt',NEW.created_at,'updatedAt',NEW.updated_at),CAST(unixepoch('subsec')*1000 AS INTEGER));
 INSERT INTO audit_events(id,actor_id,case_id,action,target_type,target_id,payload_json,created_at) VALUES(lower(hex(randomblob(16))),NEW.created_by,(SELECT id FROM project_cases WHERE project_slug=(SELECT project_slug FROM data_room_documents WHERE id=NEW.document_id)),'record.snapshot','documentExtractions',NEW.document_id,json_object('snapshot',1),CAST(unixepoch('subsec')*1000 AS INTEGER));
END;
--> statement-breakpoint
CREATE TRIGGER history_document_extractions_update AFTER UPDATE ON document_extractions BEGIN
 INSERT INTO record_versions(id,project_slug,entity_type,entity_id,actor_id,snapshot_json,created_at) VALUES(lower(hex(randomblob(16))),(SELECT project_slug FROM data_room_documents WHERE id=NEW.document_id),'documentExtractions',NEW.document_id,NEW.created_by,json_object('id',NEW.id,'documentId',NEW.document_id,'state',NEW.state,'sourceKind',NEW.source_kind,'metadataJson',NEW.metadata_json,'textContent',NEW.text_content,'characterCount',NEW.character_count,'pageCount',NEW.page_count,'failureReason',NEW.failure_reason,'createdBy',NEW.created_by,'createdAt',NEW.created_at,'updatedAt',NEW.updated_at),CAST(unixepoch('subsec')*1000 AS INTEGER));
 INSERT INTO audit_events(id,actor_id,case_id,action,target_type,target_id,payload_json,created_at) VALUES(lower(hex(randomblob(16))),NEW.created_by,(SELECT id FROM project_cases WHERE project_slug=(SELECT project_slug FROM data_room_documents WHERE id=NEW.document_id)),'record.snapshot','documentExtractions',NEW.document_id,json_object('snapshot',1),CAST(unixepoch('subsec')*1000 AS INTEGER));
END;
--> statement-breakpoint
INSERT INTO record_versions(id,project_slug,entity_type,entity_id,actor_id,snapshot_json,created_at) SELECT lower(hex(randomblob(16))),(SELECT project_slug FROM data_room_documents WHERE id=NEW.document_id),'documentExtractions',NEW.document_id,NEW.created_by,json_object('id',NEW.id,'documentId',NEW.document_id,'state',NEW.state,'sourceKind',NEW.source_kind,'metadataJson',NEW.metadata_json,'textContent',NEW.text_content,'characterCount',NEW.character_count,'pageCount',NEW.page_count,'failureReason',NEW.failure_reason,'createdBy',NEW.created_by,'createdAt',NEW.created_at,'updatedAt',NEW.updated_at),CAST(unixepoch('subsec')*1000 AS INTEGER) FROM document_extractions AS NEW;
--> statement-breakpoint
CREATE TRIGGER history_case_stage_decisions_insert AFTER INSERT ON case_stage_decisions BEGIN
 INSERT INTO record_versions(id,project_slug,entity_type,entity_id,actor_id,snapshot_json,created_at) VALUES(lower(hex(randomblob(16))),(SELECT project_slug FROM project_cases WHERE id=NEW.case_id),'caseStageDecisions',NEW.id,NEW.updated_by,json_object('id',NEW.id,'caseId',NEW.case_id,'stageKey',NEW.stage_key,'state',NEW.state,'responsibleRole',NEW.responsible_role,'decisionReason',NEW.decision_reason,'updatedBy',NEW.updated_by,'updatedAt',NEW.updated_at),CAST(unixepoch('subsec')*1000 AS INTEGER));
 INSERT INTO audit_events(id,actor_id,case_id,action,target_type,target_id,payload_json,created_at) VALUES(lower(hex(randomblob(16))),NEW.updated_by,(SELECT id FROM project_cases WHERE project_slug=(SELECT project_slug FROM project_cases WHERE id=NEW.case_id)),'record.snapshot','caseStageDecisions',NEW.id,json_object('snapshot',1),CAST(unixepoch('subsec')*1000 AS INTEGER));
END;
--> statement-breakpoint
CREATE TRIGGER history_case_stage_decisions_update AFTER UPDATE ON case_stage_decisions BEGIN
 INSERT INTO record_versions(id,project_slug,entity_type,entity_id,actor_id,snapshot_json,created_at) VALUES(lower(hex(randomblob(16))),(SELECT project_slug FROM project_cases WHERE id=NEW.case_id),'caseStageDecisions',NEW.id,NEW.updated_by,json_object('id',NEW.id,'caseId',NEW.case_id,'stageKey',NEW.stage_key,'state',NEW.state,'responsibleRole',NEW.responsible_role,'decisionReason',NEW.decision_reason,'updatedBy',NEW.updated_by,'updatedAt',NEW.updated_at),CAST(unixepoch('subsec')*1000 AS INTEGER));
 INSERT INTO audit_events(id,actor_id,case_id,action,target_type,target_id,payload_json,created_at) VALUES(lower(hex(randomblob(16))),NEW.updated_by,(SELECT id FROM project_cases WHERE project_slug=(SELECT project_slug FROM project_cases WHERE id=NEW.case_id)),'record.snapshot','caseStageDecisions',NEW.id,json_object('snapshot',1),CAST(unixepoch('subsec')*1000 AS INTEGER));
END;
--> statement-breakpoint
INSERT INTO record_versions(id,project_slug,entity_type,entity_id,actor_id,snapshot_json,created_at) SELECT lower(hex(randomblob(16))),(SELECT project_slug FROM project_cases WHERE id=NEW.case_id),'caseStageDecisions',NEW.id,NEW.updated_by,json_object('id',NEW.id,'caseId',NEW.case_id,'stageKey',NEW.stage_key,'state',NEW.state,'responsibleRole',NEW.responsible_role,'decisionReason',NEW.decision_reason,'updatedBy',NEW.updated_by,'updatedAt',NEW.updated_at),CAST(unixepoch('subsec')*1000 AS INTEGER) FROM case_stage_decisions AS NEW;
--> statement-breakpoint
CREATE TRIGGER history_data_room_documents_insert AFTER INSERT ON data_room_documents BEGIN
 INSERT INTO record_versions(id,project_slug,entity_type,entity_id,actor_id,snapshot_json,created_at) VALUES(lower(hex(randomblob(16))),NEW.project_slug,'dataRoomDocuments',NEW.id,COALESCE(NEW.reviewed_by,NEW.uploaded_by),json_object('id',NEW.id,'caseId',NEW.case_id,'projectSlug',NEW.project_slug,'title',NEW.title,'category',NEW.category,'originalFilename',NEW.original_filename,'storageKey',NEW.storage_key,'mimeType',NEW.mime_type,'sizeBytes',NEW.size_bytes,'checksumSha256',NEW.checksum_sha256,'accessLevel',NEW.access_level,'extractionStatus',NEW.extraction_status,'revision',NEW.revision,'reviewStatus',NEW.review_status,'uploadedBy',NEW.uploaded_by,'uploadedAt',NEW.uploaded_at,'reviewedBy',NEW.reviewed_by,'reviewedAt',NEW.reviewed_at),CAST(unixepoch('subsec')*1000 AS INTEGER));
 INSERT INTO audit_events(id,actor_id,case_id,action,target_type,target_id,payload_json,created_at) VALUES(lower(hex(randomblob(16))),COALESCE(NEW.reviewed_by,NEW.uploaded_by),(SELECT id FROM project_cases WHERE project_slug=NEW.project_slug),'record.snapshot','dataRoomDocuments',NEW.id,json_object('snapshot',1),CAST(unixepoch('subsec')*1000 AS INTEGER));
END;
--> statement-breakpoint
CREATE TRIGGER history_data_room_documents_update AFTER UPDATE ON data_room_documents BEGIN
 INSERT INTO record_versions(id,project_slug,entity_type,entity_id,actor_id,snapshot_json,created_at) VALUES(lower(hex(randomblob(16))),NEW.project_slug,'dataRoomDocuments',NEW.id,COALESCE(NEW.reviewed_by,NEW.uploaded_by),json_object('id',NEW.id,'caseId',NEW.case_id,'projectSlug',NEW.project_slug,'title',NEW.title,'category',NEW.category,'originalFilename',NEW.original_filename,'storageKey',NEW.storage_key,'mimeType',NEW.mime_type,'sizeBytes',NEW.size_bytes,'checksumSha256',NEW.checksum_sha256,'accessLevel',NEW.access_level,'extractionStatus',NEW.extraction_status,'revision',NEW.revision,'reviewStatus',NEW.review_status,'uploadedBy',NEW.uploaded_by,'uploadedAt',NEW.uploaded_at,'reviewedBy',NEW.reviewed_by,'reviewedAt',NEW.reviewed_at),CAST(unixepoch('subsec')*1000 AS INTEGER));
 INSERT INTO audit_events(id,actor_id,case_id,action,target_type,target_id,payload_json,created_at) VALUES(lower(hex(randomblob(16))),COALESCE(NEW.reviewed_by,NEW.uploaded_by),(SELECT id FROM project_cases WHERE project_slug=NEW.project_slug),'record.snapshot','dataRoomDocuments',NEW.id,json_object('snapshot',1),CAST(unixepoch('subsec')*1000 AS INTEGER));
END;
--> statement-breakpoint
INSERT INTO record_versions(id,project_slug,entity_type,entity_id,actor_id,snapshot_json,created_at) SELECT lower(hex(randomblob(16))),NEW.project_slug,'dataRoomDocuments',NEW.id,COALESCE(NEW.reviewed_by,NEW.uploaded_by),json_object('id',NEW.id,'caseId',NEW.case_id,'projectSlug',NEW.project_slug,'title',NEW.title,'category',NEW.category,'originalFilename',NEW.original_filename,'storageKey',NEW.storage_key,'mimeType',NEW.mime_type,'sizeBytes',NEW.size_bytes,'checksumSha256',NEW.checksum_sha256,'accessLevel',NEW.access_level,'extractionStatus',NEW.extraction_status,'revision',NEW.revision,'reviewStatus',NEW.review_status,'uploadedBy',NEW.uploaded_by,'uploadedAt',NEW.uploaded_at,'reviewedBy',NEW.reviewed_by,'reviewedAt',NEW.reviewed_at),CAST(unixepoch('subsec')*1000 AS INTEGER) FROM data_room_documents AS NEW;
--> statement-breakpoint
CREATE TRIGGER history_project_memberships_insert AFTER INSERT ON project_memberships BEGIN
 INSERT INTO record_versions(id,project_slug,entity_type,entity_id,actor_id,snapshot_json,created_at) VALUES(lower(hex(randomblob(16))),NEW.project_slug,'projectMemberships',NEW.id,NEW.updated_by,json_object('id',NEW.id,'projectSlug',NEW.project_slug,'userId',NEW.user_id,'role',NEW.role,'active',NEW.active,'updatedBy',NEW.updated_by,'createdAt',NEW.created_at,'updatedAt',NEW.updated_at),CAST(unixepoch('subsec')*1000 AS INTEGER));
 INSERT INTO audit_events(id,actor_id,case_id,action,target_type,target_id,payload_json,created_at) VALUES(lower(hex(randomblob(16))),NEW.updated_by,(SELECT id FROM project_cases WHERE project_slug=NEW.project_slug),'record.snapshot','projectMemberships',NEW.id,json_object('snapshot',1),CAST(unixepoch('subsec')*1000 AS INTEGER));
END;
--> statement-breakpoint
CREATE TRIGGER history_project_memberships_update AFTER UPDATE ON project_memberships BEGIN
 INSERT INTO record_versions(id,project_slug,entity_type,entity_id,actor_id,snapshot_json,created_at) VALUES(lower(hex(randomblob(16))),NEW.project_slug,'projectMemberships',NEW.id,NEW.updated_by,json_object('id',NEW.id,'projectSlug',NEW.project_slug,'userId',NEW.user_id,'role',NEW.role,'active',NEW.active,'updatedBy',NEW.updated_by,'createdAt',NEW.created_at,'updatedAt',NEW.updated_at),CAST(unixepoch('subsec')*1000 AS INTEGER));
 INSERT INTO audit_events(id,actor_id,case_id,action,target_type,target_id,payload_json,created_at) VALUES(lower(hex(randomblob(16))),NEW.updated_by,(SELECT id FROM project_cases WHERE project_slug=NEW.project_slug),'record.snapshot','projectMemberships',NEW.id,json_object('snapshot',1),CAST(unixepoch('subsec')*1000 AS INTEGER));
END;
--> statement-breakpoint
INSERT INTO record_versions(id,project_slug,entity_type,entity_id,actor_id,snapshot_json,created_at) SELECT lower(hex(randomblob(16))),NEW.project_slug,'projectMemberships',NEW.id,NEW.updated_by,json_object('id',NEW.id,'projectSlug',NEW.project_slug,'userId',NEW.user_id,'role',NEW.role,'active',NEW.active,'updatedBy',NEW.updated_by,'createdAt',NEW.created_at,'updatedAt',NEW.updated_at),CAST(unixepoch('subsec')*1000 AS INTEGER) FROM project_memberships AS NEW;
--> statement-breakpoint
CREATE TRIGGER record_versions_no_update BEFORE UPDATE ON record_versions BEGIN SELECT RAISE(ABORT,'History is append-only'); END;
--> statement-breakpoint
CREATE TRIGGER record_versions_no_delete BEFORE DELETE ON record_versions BEGIN SELECT RAISE(ABORT,'History is append-only'); END;
