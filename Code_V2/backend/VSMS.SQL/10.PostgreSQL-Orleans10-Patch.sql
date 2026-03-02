-- Patch for Orleans 10.x compatibility
-- This query is required by the .NET 10 version of Orleans.Clustering.AdoNet but might be missing in older scripts.

INSERT INTO OrleansQuery(QueryKey, QueryText)
VALUES
(
    'CleanupDefunctSiloEntriesKey','
    DELETE FROM OrleansMembershipTable
    WHERE
        DeploymentId = @DeploymentId AND @DeploymentId IS NOT NULL
        AND IAmAliveTime < @IAmAliveTime
        AND Status != @Status;
')
ON CONFLICT (QueryKey) DO NOTHING;
