CREATE VIEW countries_all AS
SELECT
  c.id AS country_id,
  l.code AS language_code,
  ci."name"
FROM
  "countries_i18n" ci
  JOIN "countries" c ON c.id = ci.country_id
  JOIN languages l ON l.id = ci.language_id;
