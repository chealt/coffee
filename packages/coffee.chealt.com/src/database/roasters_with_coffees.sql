CREATE VIEW roasters_with_coffees AS
SELECT
  r.id,
  r.name,
  r.website,
  r.instagram,
  r.logo
FROM
  roasters r
  JOIN coffees c ON c.roaster_id = r.id
WHERE
  NOT c.is_removed
GROUP BY
  1,
  2,
  3;
