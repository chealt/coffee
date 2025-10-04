CREATE VIEW origin_regions_all AS
SELECT
  ors.id AS origin_region_id,
  oc.id AS origin_country_id,
  l.code AS language_code,
  ori.name
FROM
  origin_regions_i18n ori
  JOIN origin_regions ors ON ors.id = ori.origin_region_id
  JOIN origin_countries oc ON oc.id = ors.origin_country_id
  JOIN languages l ON l.id = ori.language_id;
