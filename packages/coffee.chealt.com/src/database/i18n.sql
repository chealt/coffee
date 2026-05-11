CREATE TABLE `i18n` (
  `id` integer PRIMARY KEY AUTOINCREMENT,
  `namespace` text NOT NULL,
  `key` text NOT NULL,
  `locale` text NOT NULL,
  `value` text NOT NULL,
  CONSTRAINT `constraint_2` FOREIGN KEY (`locale`) REFERENCES `languages` (`code`),
  CONSTRAINT `constraint_1` UNIQUE (`namespace`, `key`, `locale`)
);
