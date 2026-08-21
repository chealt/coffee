CREATE TABLE `collections` (
  `id` text PRIMARY KEY NOT NULL,
  `name` text NOT NULL,
  `is_built_in` numeric DEFAULT FALSE NOT NULL,
  `rank` integer,
  `deleted_at` text
);
