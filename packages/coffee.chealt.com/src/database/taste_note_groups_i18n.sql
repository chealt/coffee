CREATE TABLE `taste_note_groups_i18n` (
  `id` integer PRIMARY KEY AUTOINCREMENT,
  `taste_note_group_id` integer NOT NULL,
  `language_id` integer NOT NULL,
  `name` text NOT NULL,
  FOREIGN KEY (`taste_note_group_id`) REFERENCES `taste_note_groups` (`id`) ON UPDATE CASCADE ON DELETE CASCADE,
  FOREIGN KEY (`language_id`) REFERENCES `languages` (`id`) ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT constraint_3 UNIQUE (`taste_note_group_id`, `language_id`)
);
