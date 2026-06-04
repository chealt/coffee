CREATE VIEW countries_all_with_coffees AS
SELECT
  ca.*,
  count(1) AS coffee_count
FROM
  countries_all ca
  JOIN roasters r ON r.country_id = ca.country_id
  JOIN coffees c ON c.roaster_id = r.id
WHERE
  NOT c.is_removed
GROUP BY
  1,
  2,
  3
ORDER BY
  name COLLATE nocase ASC;
