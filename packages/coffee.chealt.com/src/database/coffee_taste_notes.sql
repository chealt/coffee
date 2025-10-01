CREATE TABLE `coffee_taste_notes` (
  `id` integer PRIMARY KEY AUTOINCREMENT,
  `coffee_id` integer NOT NULL,
  `taste_note_id` integer NOT NULL,
  FOREIGN KEY (`coffee_id`) REFERENCES `coffees` (`id`) ON UPDATE CASCADE ON DELETE CASCADE,
  FOREIGN KEY (`taste_note_id`) REFERENCES `taste_notes` (`id`) ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT constraint_3 UNIQUE (`coffee_id`, `taste_note_id`)
);
