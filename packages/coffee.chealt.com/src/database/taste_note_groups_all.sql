CREATE VIEW taste_note_groups_all AS
SELECT
  tng.id AS taste_note_group_id,
  l.code AS language_code,
  tngi.name
FROM
  taste_note_groups_i18n tngi
  JOIN taste_note_groups tng ON tng.id = tngi.taste_note_group_id
  JOIN languages l ON l.id = tngi.language_id;
