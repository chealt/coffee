CREATE TABLE `taste_note_groups` (
  `id` integer PRIMARY KEY AUTOINCREMENT,
  `name` text NOT NULL UNIQUE,
  `color` text
);
