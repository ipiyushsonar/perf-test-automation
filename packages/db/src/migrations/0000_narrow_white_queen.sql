CREATE TABLE `baselines` (
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
	`created_at` integer DEFAULT (unixepoch())
);
--> statement-breakpoint
CREATE TABLE `grafana_snapshots` (
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
	`created_at` integer DEFAULT (unixepoch())
);
--> statement-breakpoint
CREATE TABLE `jmx_scripts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`file_path` text NOT NULL,
	`file_size` integer,
	`checksum` text,
	`is_default` integer DEFAULT false,
	`scenario_id` integer,
	`uploaded_by` text,
	`uploaded_at` integer DEFAULT (unixepoch())
);
--> statement-breakpoint
CREATE TABLE `reports` (
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
	`created_at` integer DEFAULT (unixepoch())
);
--> statement-breakpoint
CREATE TABLE `scenarios` (
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
	`created_at` integer DEFAULT (unixepoch())
);
--> statement-breakpoint
CREATE UNIQUE INDEX `scenarios_name_unique` ON `scenarios` (`name`);--> statement-breakpoint
CREATE TABLE `schedules` (
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
	`created_at` integer DEFAULT (unixepoch())
);
--> statement-breakpoint
CREATE TABLE `settings` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`category` text NOT NULL,
	`key` text NOT NULL,
	`value` text,
	`description` text,
	`updated_at` integer DEFAULT (unixepoch())
);
--> statement-breakpoint
CREATE TABLE `test_runs` (
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
	`created_by` text
);
--> statement-breakpoint
CREATE TABLE `test_statistics` (
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
	`created_at` integer DEFAULT (unixepoch())
);
--> statement-breakpoint
CREATE TABLE `test_types` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`display_name` text NOT NULL,
	`description` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `test_types_name_unique` ON `test_types` (`name`);--> statement-breakpoint
CREATE TABLE `versions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`version` text NOT NULL,
	`display_name` text,
	`release_date` integer,
	`description` text,
	`is_active` integer DEFAULT true,
	`created_at` integer DEFAULT (unixepoch())
);
--> statement-breakpoint
CREATE UNIQUE INDEX `versions_version_unique` ON `versions` (`version`);