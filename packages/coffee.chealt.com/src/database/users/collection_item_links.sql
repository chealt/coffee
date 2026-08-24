CREATE TABLE `collection_item_links` (
  `id` integer PRIMARY KEY AUTOINCREMENT,
  `collection_item_id` text NOT NULL UNIQUE,
  `collection_id` text NOT NULL UNIQUE,
  `deleted_at` text,
  `created_at` text,
  CONSTRAINT `fk_collection_item_links_collection_item_id_collection_items__fk` FOREIGN KEY (`collection_item_id`) REFERENCES `collection_items`(`null`) ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT `fk_collection_item_links_collection_id_collections_id_fk` FOREIGN KEY (`collection_id`) REFERENCES `collections`(`id`) ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT `constraint_1` UNIQUE(`collection_item_id`,`collection_id`)
);
