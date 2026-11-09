import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

export const projectDefinitions = sqliteTable("project_definitions", {
  slug: text("slug").primaryKey(),
  definitionJson: text("definition_json").notNull(),
  revision: integer("revision").notNull(),
  archived: integer("archived").notNull(),
  updatedBy: text("updated_by").notNull(),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
});

export const financialRuns = sqliteTable("financial_runs", {
  id: text("id").primaryKey(), ownerId: text("owner_id").notNull(),
  projectSlug: text("project_slug").notNull(), name: text("name").notNull(),
  inputJson: text("input_json").notNull(), resultJson: text("result_json").notNull(),
  createdAt: integer("created_at").notNull(),
}, (t) => [index("financial_runs_owner_project_idx").on(t.ownerId, t.projectSlug, t.createdAt)]);

export const memberDetails = sqliteTable("member_details", {
  userId: text("user_id").primaryKey(), firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(), mobile: text("mobile").notNull(),
  updatedAt: integer("updated_at").notNull(),
});

export const supportTickets = sqliteTable("support_tickets", {
  id: text("id").primaryKey(), ownerId: text("owner_id").notNull(),
  subject: text("subject").notNull(), category: text("category").notNull(),
  message: text("message").notNull(), status: text("status").notNull(),
  createdAt: integer("created_at").notNull(), updatedAt: integer("updated_at").notNull(),
}, (t) => [index("support_tickets_owner_idx").on(t.ownerId, t.updatedAt)]);

export const ticketReplies = sqliteTable("ticket_replies", {
  id: text("id").primaryKey(), ticketId: text("ticket_id").notNull(),
  authorId: text("author_id").notNull(), authorName: text("author_name").notNull(),
  message: text("message").notNull(), createdAt: integer("created_at").notNull(),
}, (t) => [index("ticket_replies_ticket_idx").on(t.ticketId, t.createdAt)]);

export const notifications = sqliteTable("notifications", {
  id: text("id").primaryKey(), ownerId: text("owner_id").notNull(),
  title: text("title").notNull(), body: text("body").notNull(), href: text("href").notNull(),
  readAt: integer("read_at"), createdAt: integer("created_at").notNull(),
}, (t) => [index("notifications_owner_idx").on(t.ownerId, t.createdAt)]);

export const backupSnapshots = sqliteTable("backup_snapshots", {
  id: text("id").primaryKey(), storageKey: text("storage_key").notNull(),
  checksum: text("checksum").notNull(), sizeBytes: integer("size_bytes").notNull(),
  createdBy: text("created_by").notNull(), createdAt: integer("created_at").notNull(),
});

export const requestLimits = sqliteTable("request_limits", {
  key: text("key").primaryKey(), windowStart: integer("window_start").notNull(), count: integer("count").notNull(),
});

export const maintenanceRuns = sqliteTable("maintenance_runs", {
  id: text("id").primaryKey(), state: text("state").notNull(),
  backupId: text("backup_id"), resultJson: text("result_json"),
  startedAt: integer("started_at").notNull(), finishedAt: integer("finished_at"),
});

// These are private pilot review records only. No monetary or allocation fields.
export const pilotRecords = sqliteTable("pilot_records", {
  id: text("id").primaryKey(),
  ownerId: text("owner_id").notNull(),
  projectSlug: text("project_slug").notNull(),
  kind: text("kind").notNull(),
  note: text("note").notNull(),
  createdAt: integer("created_at").notNull(),
}, (table) => [index("pilot_records_owner_project_idx").on(table.ownerId, table.projectSlug)]);

// The private pilot is a controlled dossier workflow. It intentionally has no
// payment, order, allocation, wallet, or token-issuance tables.
export const userProfiles = sqliteTable("user_profiles", {
  userId: text("user_id").primaryKey(),
  email: text("email").notNull(),
  displayName: text("display_name").notNull(),
  role: text("role").notNull(),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
}, (table) => [index("user_profiles_role_idx").on(table.role)]);

export const projectCases = sqliteTable("project_cases", {
  id: text("id").primaryKey(),
  projectSlug: text("project_slug").notNull(),
  title: text("title").notNull(),
  status: text("status").notNull(),
  revision: integer("revision").notNull().default(0),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
}, (table) => [
  uniqueIndex("project_cases_slug_unique").on(table.projectSlug),
  index("project_cases_status_idx").on(table.status),
]);

export const projectMemberships = sqliteTable("project_memberships", {
  id:text("id").primaryKey(), projectSlug:text("project_slug").notNull(), userId:text("user_id").notNull(),
  role:text("role").notNull(), active:integer("active").notNull().default(1), updatedBy:text("updated_by").notNull(),
  createdAt:integer("created_at").notNull(), updatedAt:integer("updated_at").notNull(),
},t=>[uniqueIndex("project_memberships_user_project_unique").on(t.projectSlug,t.userId),index("project_memberships_user_idx").on(t.userId,t.active)]);

export const caseArtifacts = sqliteTable("case_artifacts", {
  id:text("id").primaryKey(), caseId:text("case_id").notNull(), projectSlug:text("project_slug").notNull(),
  kind:text("kind").notNull(), contentJson:text("content_json").notNull(), revision:integer("revision").notNull(),
  createdBy:text("created_by").notNull(),updatedBy:text("updated_by").notNull(),createdAt:integer("created_at").notNull(),updatedAt:integer("updated_at").notNull(),
},t=>[uniqueIndex("case_artifacts_kind_unique").on(t.caseId,t.kind)]);

export const caseStageDecisions = sqliteTable("case_stage_decisions", {
  id: text("id").primaryKey(),
  caseId: text("case_id").notNull(),
  stageKey: text("stage_key").notNull(),
  state: text("state").notNull(),
  responsibleRole: text("responsible_role").notNull(),
  decisionReason: text("decision_reason").notNull(),
  updatedBy: text("updated_by").notNull(),
  updatedAt: integer("updated_at").notNull(),
}, (table) => [
  uniqueIndex("case_stage_decisions_case_stage_unique").on(table.caseId, table.stageKey),
  uniqueIndex("case_stage_decisions_one_active_unique").on(table.caseId).where(sql`${table.state} = 'active'`),
  index("case_stage_decisions_case_idx").on(table.caseId, table.updatedAt),
]);

export const dataRoomDocuments = sqliteTable("data_room_documents", {
  id: text("id").primaryKey(),
  caseId: text("case_id").notNull(),
  projectSlug: text("project_slug").notNull(),
  title: text("title").notNull(),
  category: text("category").notNull(),
  originalFilename: text("original_filename").notNull(),
  storageKey: text("storage_key").notNull(),
  mimeType: text("mime_type").notNull(),
  sizeBytes: integer("size_bytes").notNull(),
  checksumSha256: text("checksum_sha256").notNull(),
  accessLevel: text("access_level").notNull(),
  extractionStatus: text("extraction_status").notNull(),
  revision: integer("revision").notNull().default(1),
  reviewStatus: text("review_status").notNull(),
  uploadedBy: text("uploaded_by").notNull(),
  uploadedAt: integer("uploaded_at").notNull(),
  reviewedBy: text("reviewed_by"),
  reviewedAt: integer("reviewed_at"),
}, (table) => [
  index("data_room_documents_case_idx").on(table.caseId, table.uploadedAt),
  index("data_room_documents_project_idx").on(table.projectSlug, table.reviewStatus),
]);

export const documentReviews = sqliteTable("document_reviews", {
  id: text("id").primaryKey(),
  documentId: text("document_id").notNull(),
  reviewerId: text("reviewer_id").notNull(),
  outcome: text("outcome").notNull(),
  note: text("note").notNull(),
  createdAt: integer("created_at").notNull(),
}, (table) => [index("document_reviews_document_idx").on(table.documentId, table.createdAt)]);

// The file itself stays in private R2. Readable text is deliberately stored as a
// separate, auditable record so an unread PDF can never be treated as a source.
export const documentExtractions = sqliteTable("document_extractions", {
  id: text("id").primaryKey(),
  documentId: text("document_id").notNull(),
  state: text("state").notNull(),
  sourceKind: text("source_kind").notNull(),
  metadataJson: text("metadata_json"),
  textContent: text("text_content"),
  characterCount: integer("character_count").notNull(),
  pageCount: integer("page_count"),
  failureReason: text("failure_reason"),
  createdBy: text("created_by").notNull(),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
}, (table) => [
  uniqueIndex("document_extractions_document_unique").on(table.documentId),
  index("document_extractions_state_idx").on(table.state, table.updatedAt),
]);

// Draft-only pilot outputs. There is intentionally no approved value, price,
// payment, allocation, transfer, wallet, or token field in this schema.
export const sampleReports = sqliteTable("sample_reports", {
  id: text("id").primaryKey(),
  caseId: text("case_id").notNull(),
  projectSlug: text("project_slug").notNull(),
  title: text("title").notNull(),
  status: text("status").notNull(),
  scopeNote: text("scope_note").notNull(),
  sourceDocumentIdsJson: text("source_document_ids_json").notNull(),
  contentJson: text("content_json").notNull(),
  generatedBy: text("generated_by").notNull(),
  generatedAt: integer("generated_at").notNull(),
}, (table) => [
  index("sample_reports_case_idx").on(table.caseId, table.generatedAt),
  index("sample_reports_project_idx").on(table.projectSlug, table.generatedAt),
]);

export const wealthScenarios = sqliteTable("wealth_scenarios", {
  id: text("id").primaryKey(),
  ownerId: text("owner_id").notNull(),
  name: text("name").notNull(),
  selectedProjectSlugs: text("selected_project_slugs").notNull(),
  virtualBudget: integer("virtual_budget").notNull(),
  horizonMonths: integer("horizon_months").notNull(),
  analysisStyle: text("analysis_style").notNull(),
  snapshotJson: text("snapshot_json").notNull(),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
}, (table) => [index("wealth_scenarios_owner_idx").on(table.ownerId, table.updatedAt)]);

export const auditEvents = sqliteTable("audit_events", {
  id: text("id").primaryKey(),
  actorId: text("actor_id").notNull(),
  caseId: text("case_id"),
  action: text("action").notNull(),
  targetType: text("target_type").notNull(),
  targetId: text("target_id").notNull(),
  payloadJson: text("payload_json").notNull(),
  createdAt: integer("created_at").notNull(),
}, (table) => [
  index("audit_events_case_idx").on(table.caseId, table.createdAt),
  index("audit_events_actor_idx").on(table.actorId, table.createdAt),
]);

// Append-only snapshots; database triggers write these in the same transaction.
export const recordVersions = sqliteTable("record_versions", {
  id:text("id").primaryKey(), projectSlug:text("project_slug").notNull(),
  entityType:text("entity_type").notNull(), entityId:text("entity_id").notNull(),
  actorId:text("actor_id").notNull(), snapshotJson:text("snapshot_json").notNull(),
  createdAt:integer("created_at").notNull(),
},t=>[index("record_versions_project_idx").on(t.projectSlug,t.createdAt)]);
export const reviewRules = sqliteTable("review_rules", {
  ownerId:text("owner_id").primaryKey(), enabled:integer("enabled").notNull(),
  trigger:text("trigger").notNull(), tracksJson:text("tracks_json").notNull(), updatedAt:integer("updated_at").notNull(),
});
export const localAccounts = sqliteTable("local_accounts", {
  userId:text("user_id").primaryKey(), email:text("email").notNull(), passwordHash:text("password_hash").notNull(),
  active:integer("active").notNull().default(1),createdAt:integer("created_at").notNull(),
},t=>[uniqueIndex("local_accounts_email_unique").on(t.email)]);
export const localSessions = sqliteTable("local_sessions", {
  tokenHash:text("token_hash").primaryKey(),userId:text("user_id").notNull(),expiresAt:integer("expires_at").notNull(),
});
export const operationalEvidence = sqliteTable('operational_evidence', {
  id: text('id').primaryKey(), checkKey: text('check_key').notNull(), status: text('status').notNull(),
  evidenceRef: text('evidence_ref').notNull(), note: text('note').notNull(), actorId: text('actor_id').notNull(), createdAt: integer('created_at').notNull(),
}, table => [index('operational_evidence_key_time').on(table.checkKey, table.createdAt)]);
// Ephemeral authorization state is deliberately excluded from business backups.
export const maintenanceNonces = sqliteTable('maintenance_nonces', {
  nonce: text('nonce').primaryKey(), expiresAt: integer('expires_at').notNull(),
});
export const localRecoveryTokens = sqliteTable('local_recovery_tokens', {
  tokenHash: text('token_hash').primaryKey(), userId: text('user_id').notNull(), expiresAt: integer('expires_at').notNull(),
}, table => [uniqueIndex('local_recovery_tokens_user_unique').on(table.userId)]);


export const userWallets = sqliteTable("user_wallets", {
  userId: text("user_id").primaryKey(),
  balanceToman: integer("balance_toman").notNull().default(500_000_000),
  updatedAt: integer("updated_at").notNull(),
});

export const shareHoldings = sqliteTable("share_holdings", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  projectSlug: text("project_slug").notNull(),
  shares: integer("shares").notNull().default(0),
  lockedShares: integer("locked_shares").notNull().default(0),
  avgPriceToman: integer("avg_price_toman").notNull().default(500_000),
  updatedAt: integer("updated_at").notNull(),
}, (t) => [
  uniqueIndex("share_holdings_user_project_unique").on(t.userId, t.projectSlug),
  index("share_holdings_user_idx").on(t.userId),
]);

export const marketOrders = sqliteTable("market_orders", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  userDisplayName: text("user_display_name").notNull(),
  projectSlug: text("project_slug").notNull(),
  side: text("side").notNull(), // "buy" | "sell"
  priceToman: integer("price_toman").notNull(),
  initialShares: integer("initial_shares").notNull(),
  remainingShares: integer("remaining_shares").notNull(),
  status: text("status").notNull(), // "open" | "filled" | "cancelled"
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
}, (t) => [
  index("market_orders_project_status_idx").on(t.projectSlug, t.status, t.priceToman),
  index("market_orders_user_idx").on(t.userId, t.createdAt),
]);

export const marketTrades = sqliteTable("market_trades", {
  id: text("id").primaryKey(),
  projectSlug: text("project_slug").notNull(),
  buyOrderId: text("buy_order_id"),
  sellOrderId: text("sell_order_id"),
  buyerId: text("buyer_id").notNull(),
  sellerId: text("seller_id").notNull(),
  shares: integer("shares").notNull(),
  priceToman: integer("price_toman").notNull(),
  totalToman: integer("total_toman").notNull(),
  kind: text("kind").notNull(), // "primary" | "secondary"
  createdAt: integer("created_at").notNull(),
}, (t) => [
  index("market_trades_project_idx").on(t.projectSlug, t.createdAt),
  index("market_trades_buyer_idx").on(t.buyerId, t.createdAt),
  index("market_trades_seller_idx").on(t.sellerId, t.createdAt),
]);
