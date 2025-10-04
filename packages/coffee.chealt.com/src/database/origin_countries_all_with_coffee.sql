CREATE VIEW origin_countries_all_with_coffees AS
SELECT
  oci.origin_country_id AS origin_country_id,
  l.code AS language_code,
  oci.name
FROM
  origin_countries_i18n oci
  JOIN origin_countries oc ON oc.id = oci.origin_country_id
  JOIN languages l ON l.id = oci.language_id
  join coffees c on c.origin_country_id = oc.id
group by
  1,
  2,
  3;
