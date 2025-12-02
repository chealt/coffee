CREATE TABLE `notifications` (
  `id` integer PRIMARY KEY AUTOINCREMENT,
  `username` text NOT NULL,
  `email` text NOT NULL,
  `type` text NOT NULL,
  `data_hash` text NOT NULL,
  FOREIGN KEY (`username`) REFERENCES `users` (`username`) ON UPDATE CASCADE ON DELETE CASCADE,
  FOREIGN KEY (`email`) REFERENCES `users` (`email`) ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT constraint_3 UNIQUE (`username`, `email`, `type`, `data_hash`)
);
