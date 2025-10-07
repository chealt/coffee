CREATE VIEW taste_note_sub_groups_all AS
SELECT
  tnsg.id AS taste_note_sub_group_id,
  l.code AS language_code,
  tnsgi.name,
  tnsg.taste_note_sub_group_id
FROM
  taste_note_sub_groups_i18n tnsgi
  JOIN taste_note_sub_groups tnsg ON tnsg.id = tnsgi.taste_note_sub_group_id
  JOIN languages l ON l.id = tnsgi.language_id;
