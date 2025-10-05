CREATE TABLE `taste_note_sub_groups` (
  `id` integer PRIMARY KEY AUTOINCREMENT,
  `name` text NOT NULL UNIQUE,
  `taste_note_group_id` integer NOT NULL,
  FOREIGN KEY (`taste_note_group_id`) REFERENCES `taste_note_groups` (`id`) ON UPDATE CASCADE ON DELETE CASCADE
);
