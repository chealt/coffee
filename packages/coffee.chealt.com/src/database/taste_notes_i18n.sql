CREATE TABLE taste_notes_i18n (
  `id` integer PRIMARY KEY AUTOINCREMENT,
  `taste_note_id` integer NOT NULL,
  `language_id` integer NOT NULL,
  `name` text NOT NULL,
  FOREIGN KEY (`taste_note_id`) REFERENCES `taste_notes` (`id`) ON UPDATE NO ACTION ON DELETE NO ACTION,
  FOREIGN KEY (`language_id`) REFERENCES `languages` (`id`) ON UPDATE NO ACTION ON DELETE NO ACTION,
  CONSTRAINT constraint_1 UNIQUE (`taste_note_id`, `language_id`, `name`)
);
