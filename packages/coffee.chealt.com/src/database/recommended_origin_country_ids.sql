CREATE VIEW recommended_origin_country_ids AS
SELECT
  CAST(
    json_extract (fd_details.value, '$.originCountry') AS decimal
  ) AS origin_country_id,
  COUNT(*)
FROM
  collection_item_links cil
  JOIN form_data fd_details ON fd_details.key = concat (cil.collection_item_id, ".details")
  LEFT JOIN form_data fd_review ON fd_review.key = concat (cil.collection_item_id, ".review")
WHERE
  json_extract (fd_details.value, '$.originCountry') != ""
  AND (
    cil.collection_id = "favorites"
    OR json_extract (fd_review.value, "$.like") = "like"
  )
GROUP BY
  1
ORDER BY
  2 DESC;
