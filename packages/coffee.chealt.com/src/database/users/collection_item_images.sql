CREATE TABLE `collection_item_images` (
  `filename` text NOT NULL UNIQUE,
  `collection_item_id` text NOT NULL UNIQUE,
  `deleted_at` text,
  CONSTRAINT `fk_collection_item_images_collection_item_id_collection_items_id_fk` FOREIGN KEY (`collection_item_id`) REFERENCES `collection_items`(`id`) ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT `constraint_2` UNIQUE(`filename`,`collection_item_id`)
);
