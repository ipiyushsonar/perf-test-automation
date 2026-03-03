PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_baselines` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`scenario_id` integer,
	`test_type_id` integer,
	`version_id` integer,
	`source_test_run_id` integer,
	`metrics` text,
	`is_default` integer DEFAULT false,
	`is_active` integer DEFAULT true,
	`created_at` integer DEFAULT (unixepoch()),
	`updated_at` integer DEFAULT (unixepoch()),
	FOREIGN KEY (`scenario_id`) REFERENCES `scenarios`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`test_type_id`) REFERENCES `test_types`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`version_id`) REFERENCES `versions`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`source_test_run_id`) REFERENCES `test_runs`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_baselines`("id", "name", "description", "scenario_id", "test_type_id", "version_id", "source_test_run_id", "metrics", "is_default", "is_active", "created_at", "updated_at") SELECT "id", "name", "description", "scenario_id", "test_type_id", "version_id", "source_test_run_id", "metrics", "is_default", "is_active", "created_at", unixepoch() FROM `baselines`;--> statement-breakpoint
DROP TABLE `baselines`;--> statement-breakpoint
ALTER TABLE `__new_baselines` RENAME TO `baselines`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE TABLE `__new_scenarios` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`display_name` text NOT NULL,
	`description` text,
	`test_type` text NOT NULL,
	`load_user_count` integer,
	`stress_user_count` integer,
	`duration_minutes` integer DEFAULT 60,
	`ramp_up_seconds` integer DEFAULT 60,
	`cooldown_seconds` integer DEFAULT 900,
	`default_jmx_script_id` integer,
	`config` text,
	`is_active` integer DEFAULT true,
	`created_at` integer DEFAULT (unixepoch()),
	`updated_at` integer DEFAULT (unixepoch()),
	FOREIGN KEY (`default_jmx_script_id`) REFERENCES `jmx_scripts`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_scenarios`("id", "name", "display_name", "description", "test_type", "load_user_count", "stress_user_count", "duration_minutes", "ramp_up_seconds", "cooldown_seconds", "default_jmx_script_id", "config", "is_active", "created_at", "updated_at") SELECT "id", "name", "display_name", "description", "test_type", "load_user_count", "stress_user_count", "duration_minutes", "ramp_up_seconds", "cooldown_seconds", "default_jmx_script_id", "config", "is_active", "created_at", unixepoch() FROM `scenarios`;--> statement-breakpoint
DROP TABLE `scenarios`;--> statement-breakpoint
ALTER TABLE `__new_scenarios` RENAME TO `scenarios`;--> statement-breakpoint
CREATE UNIQUE INDEX `scenarios_name_unique` ON `scenarios` (`name`);--> statement-breakpoint
CREATE TABLE `__new_schedules` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`cron_expression` text,
	`next_run_at` integer,
	`last_run_at` integer,
	`scenario_id` integer,
	`test_type_id` integer,
	`version_id` integer,
	`jmx_script_id` integer,
	`is_active` integer DEFAULT true,
	`created_at` integer DEFAULT (unixepoch()),
	`updated_at` integer DEFAULT (unixepoch()),
	FOREIGN KEY (`scenario_id`) REFERENCES `scenarios`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`test_type_id`) REFERENCES `test_types`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`version_id`) REFERENCES `versions`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`jmx_script_id`) REFERENCES `jmx_scripts`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_schedules`("id", "name", "description", "cron_expression", "next_run_at", "last_run_at", "scenario_id", "test_type_id", "version_id", "jmx_script_id", "is_active", "created_at", "updated_at") SELECT "id", "name", "description", "cron_expression", "next_run_at", "last_run_at", "scenario_id", "test_type_id", "version_id", "jmx_script_id", "is_active", "created_at", unixepoch() FROM `schedules`;--> statement-breakpoint
DROP TABLE `schedules`;--> statement-breakpoint
ALTER TABLE `__new_schedules` RENAME TO `schedules`;--> statement-breakpoint
ALTER TABLE `versions` ADD `updated_at` integer DEFAULT (unixepoch());--> statement-breakpoint
CREATE UNIQUE INDEX `settings_category_key_idx` ON `settings` (`category`,`key`);--> statement-breakpoint
CREATE TABLE `__new_grafana_snapshots` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`report_id` integer,
	`test_run_id` integer,
	`dashboard_uid` text,
	`dashboard_name` text,
	`panel_id` integer,
	`panel_title` text,
	`time_from` integer,
	`time_to` integer,
	`image_path` text,
	`image_size` integer,
	`created_at` integer DEFAULT (unixepoch()),
	FOREIGN KEY (`report_id`) REFERENCES `reports`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`test_run_id`) REFERENCES `test_runs`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_grafana_snapshots`("id", "report_id", "test_run_id", "dashboard_uid", "dashboard_name", "panel_id", "panel_title", "time_from", "time_to", "image_path", "image_size", "created_at") SELECT "id", "report_id", "test_run_id", "dashboard_uid", "dashboard_name", "panel_id", "panel_title", "time_from", "time_to", "image_path", "image_size", "created_at" FROM `grafana_snapshots`;--> statement-breakpoint
DROP TABLE `grafana_snapshots`;--> statement-breakpoint
ALTER TABLE `__new_grafana_snapshots` RENAME TO `grafana_snapshots`;--> statement-breakpoint
CREATE TABLE `__new_jmx_scripts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`file_path` text NOT NULL,
	`file_size` integer,
	`checksum` text,
	`is_default` integer DEFAULT false,
	`scenario_id` integer,
	`uploaded_by` text,
	`uploaded_at` integer DEFAULT (unixepoch()),
	FOREIGN KEY (`scenario_id`) REFERENCES `scenarios`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_jmx_scripts`("id", "name", "description", "file_path", "file_size", "checksum", "is_default", "scenario_id", "uploaded_by", "uploaded_at") SELECT "id", "name", "description", "file_path", "file_size", "checksum", "is_default", "scenario_id", "uploaded_by", "uploaded_at" FROM `jmx_scripts`;--> statement-breakpoint
DROP TABLE `jmx_scripts`;--> statement-breakpoint
ALTER TABLE `__new_jmx_scripts` RENAME TO `jmx_scripts`;--> statement-breakpoint
CREATE TABLE `__new_reports` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`type` text NOT NULL,
	`test_run_ids` text,
	`current_version_id` integer,
	`previous_version_id` integer,
	`baseline_id` integer,
	`excel_file_path` text,
	`html_file_path` text,
	`html_hosted_url` text,
	`total_transactions` integer,
	`improved_count` integer,
	`degraded_count` integer,
	`critical_count` integer,
	`overall_status` text,
	`confluence_published` integer DEFAULT false,
	`confluence_page_id` text,
	`confluence_url` text,
	`auto_publish_confluence` integer DEFAULT false,
	`status` text DEFAULT 'pending',
	`created_at` integer DEFAULT (unixepoch()),
	FOREIGN KEY (`current_version_id`) REFERENCES `versions`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`previous_version_id`) REFERENCES `versions`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`baseline_id`) REFERENCES `baselines`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_reports`("id", "name", "type", "test_run_ids", "current_version_id", "previous_version_id", "baseline_id", "excel_file_path", "html_file_path", "html_hosted_url", "total_transactions", "improved_count", "degraded_count", "critical_count", "overall_status", "confluence_published", "confluence_page_id", "confluence_url", "auto_publish_confluence", "status", "created_at") SELECT "id", "name", "type", "test_run_ids", "current_version_id", "previous_version_id", "baseline_id", "excel_file_path", "html_file_path", "html_hosted_url", "total_transactions", "improved_count", "degraded_count", "critical_count", "overall_status", "confluence_published", "confluence_page_id", "confluence_url", "auto_publish_confluence", "status", "created_at" FROM `reports`;--> statement-breakpoint
DROP TABLE `reports`;--> statement-breakpoint
ALTER TABLE `__new_reports` RENAME TO `reports`;--> statement-breakpoint
CREATE TABLE `__new_test_runs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text,
	`scenario_id` integer NOT NULL,
	`test_type_id` integer NOT NULL,
	`version_id` integer NOT NULL,
	`jmx_script_id` integer NOT NULL,
	`baseline_id` integer,
	`runner_type` text NOT NULL,
	`runner_config` text,
	`user_count` integer NOT NULL,
	`duration_minutes` integer NOT NULL,
	`ramp_up_seconds` integer,
	`status` text DEFAULT 'pending' NOT NULL,
	`progress` integer DEFAULT 0,
	`current_phase` text,
	`queued_at` integer,
	`started_at` integer,
	`completed_at` integer,
	`result_file` text,
	`jmeter_log` text,
	`error_log` text,
	`exit_code` integer,
	`total_samples` integer,
	`error_count` integer,
	`error_percent` real,
	`average_response_time` real,
	`p90_response_time` real,
	`p95_response_time` real,
	`throughput` real,
	`created_at` integer DEFAULT (unixepoch()),
	`created_by` text,
	FOREIGN KEY (`scenario_id`) REFERENCES `scenarios`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`test_type_id`) REFERENCES `test_types`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`version_id`) REFERENCES `versions`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`jmx_script_id`) REFERENCES `jmx_scripts`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`baseline_id`) REFERENCES `baselines`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_test_runs`("id", "name", "scenario_id", "test_type_id", "version_id", "jmx_script_id", "baseline_id", "runner_type", "runner_config", "user_count", "duration_minutes", "ramp_up_seconds", "status", "progress", "current_phase", "queued_at", "started_at", "completed_at", "result_file", "jmeter_log", "error_log", "exit_code", "total_samples", "error_count", "error_percent", "average_response_time", "p90_response_time", "p95_response_time", "throughput", "created_at", "created_by") SELECT "id", "name", "scenario_id", "test_type_id", "version_id", "jmx_script_id", "baseline_id", "runner_type", "runner_config", "user_count", "duration_minutes", "ramp_up_seconds", "status", "progress", "current_phase", "queued_at", "started_at", "completed_at", "result_file", "jmeter_log", "error_log", "exit_code", "total_samples", "error_count", "error_percent", "average_response_time", "p90_response_time", "p95_response_time", "throughput", "created_at", "created_by" FROM `test_runs`;--> statement-breakpoint
DROP TABLE `test_runs`;--> statement-breakpoint
ALTER TABLE `__new_test_runs` RENAME TO `test_runs`;--> statement-breakpoint
CREATE TABLE `__new_test_statistics` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`test_run_id` integer NOT NULL,
	`transaction_name` text NOT NULL,
	`transaction_label` text,
	`sample_count` integer NOT NULL,
	`error_count` integer NOT NULL,
	`error_percent` real,
	`min` integer,
	`max` integer,
	`mean` integer,
	`median` integer,
	`std_dev` real,
	`p90` integer,
	`p95` integer,
	`p99` integer,
	`throughput` real,
	`received_kb_per_sec` real,
	`sent_kb_per_sec` real,
	`status` text,
	`regression_severity` text,
	`baseline_p90` integer,
	`p90_change_percent` real,
	`created_at` integer DEFAULT (unixepoch()),
	FOREIGN KEY (`test_run_id`) REFERENCES `test_runs`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_test_statistics`("id", "test_run_id", "transaction_name", "transaction_label", "sample_count", "error_count", "error_percent", "min", "max", "mean", "median", "std_dev", "p90", "p95", "p99", "throughput", "received_kb_per_sec", "sent_kb_per_sec", "status", "regression_severity", "baseline_p90", "p90_change_percent", "created_at") SELECT "id", "test_run_id", "transaction_name", "transaction_label", "sample_count", "error_count", "error_percent", "min", "max", "mean", "median", "std_dev", "p90", "p95", "p99", "throughput", "received_kb_per_sec", "sent_kb_per_sec", "status", "regression_severity", "baseline_p90", "p90_change_percent", "created_at" FROM `test_statistics`;--> statement-breakpoint
DROP TABLE `test_statistics`;--> statement-breakpoint
ALTER TABLE `__new_test_statistics` RENAME TO `test_statistics`;