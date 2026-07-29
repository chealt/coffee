CREATE TABLE "roasters" (
	`id` integer PRIMARY KEY AUTOINCREMENT,
	`name` text NOT NULL,
	`website` text,
	`country_id` integer,
	`instagram` text UNIQUE,
	`logo` text, `is_best` boolean DEFAULT FALSE, `webshop` text, `is_client_side_rendered` boolean DEFAULT FALSE, `has_flag_removed_logic` boolean DEFAULT FALSE NOT NULL,
	FOREIGN KEY (`country_id`) REFERENCES `countries`(`id`) ON UPDATE NO ACTION ON DELETE NO ACTION
);
