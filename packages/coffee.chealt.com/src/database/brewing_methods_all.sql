CREATE VIEW brewing_methods_all AS
SELECT
  bm.id AS brewing_method_id,
  bmi.name AS name,
  l.code AS language_code
FROM
  brewing_methods_i18n bmi
  JOIN brewing_methods bm ON bm.id = bmi.brewing_method_id
  JOIN languages l ON l.id = bmi.language_id;
