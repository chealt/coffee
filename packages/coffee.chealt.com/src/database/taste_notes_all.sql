CREATE VIEW "taste_notes_all" AS
SELECT
  tn.id AS taste_note_id,
  l.code AS language_code,
  tni."name"
FROM
  "taste_notes_i18n" tni
  JOIN "taste_notes" tn ON tn.id = tni.taste_note_id
  JOIN languages l ON l.id = tni.language_id;
