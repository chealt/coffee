CREATE TABLE `webauthn_challenges` (
  `challenge` text PRIMARY KEY NOT NULL,
  `user_id` integer NOT NULL,
  `type` text NOT NULL,
  `options` text NOT NULL,
  `created_at` text NOT NULL,
  `expires_at` text NOT NULL,
  `consumed_at` text,
  CONSTRAINT `user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT "type" CHECK (type IN ('registration', 'authentication'))
);
CREATE INDEX `webauthn_challenges_user_type` ON `webauthn_challenges` (`user_id`, `type`);
CREATE INDEX `webauthn_challenges_expires_at` ON `webauthn_challenges` (`expires_at`);
