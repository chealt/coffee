CREATE VIEW recommended_roaster_ids AS
SELECT
  CAST(
    json_extract (fd_details.value, '$.roaster') AS decimal
  ) AS roaster_id
FROM
  collection_item_links cil
  JOIN form_data fd_details ON fd_details.key = concat (cil.collection_item_id, ".details")
  LEFT JOIN form_data fd_review ON fd_review.key = concat (cil.collection_item_id, ".review")
WHERE
  json_extract (fd_details.value, '$.roaster') != ""
  AND (
    cil.collection_id = "favorites"
    OR json_extract (fd_review.value, "$.like") = "like"
  )
GROUP BY
  1
ORDER BY
  1;
