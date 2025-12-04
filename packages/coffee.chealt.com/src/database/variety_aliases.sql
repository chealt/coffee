CREATE TABLE `variety_aliases` (
  `id` integer PRIMARY KEY AUTOINCREMENT,
  `name` text NOT NULL UNIQUE,
  `variety_id` integer NOT NULL,
  FOREIGN KEY (`variety_id`) REFERENCES `varieties` (`id`) ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT constraint_2 UNIQUE (`name`, `variety_id`)
);
