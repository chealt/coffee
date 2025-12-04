CREATE VIEW varieties_all AS
SELECT
  v.id,
  v.name,
  va.name AS alias
FROM
  varieties v
  LEFT JOIN variety_aliases va ON va.variety_id = v.id
ORDER BY
  v.name
