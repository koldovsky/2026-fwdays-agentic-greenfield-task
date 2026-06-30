CREATE TABLE `plants` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`species` text DEFAULT 'Грошове дерево (Crassula ovata)' NOT NULL,
	`acquired_date` text,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL
);
