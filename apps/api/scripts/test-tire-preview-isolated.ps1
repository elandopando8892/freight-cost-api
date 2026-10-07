param([switch]$FullSuite, [switch]$Plan)
$ErrorActionPreference = 'Stop'
$testRunner = 'node-vitest'
$testArguments = @('run', 'tests/tire-calibration-rls-postgres.test.ts', 'tests/tire-calibration-multitenant-contract.test.ts', 'tests/tire-cohort-v2-rls-postgres.test.ts')
if ($FullSuite) { $testRunner = 'npm'; $testArguments = @('test') }
if ($Plan) {
  [ordered]@{ mode=$(if ($FullSuite) { 'FULL_API' } else { 'RLS_FOCUSED' }); runner=$testRunner; arguments=$testArguments; cwd='apps/api'; database='fcm_tire_s8'; localOnly=$true } | ConvertTo-Json -Depth 4
  return
}
$repo = (Resolve-Path (Join-Path $PSScriptRoot '../../..')).Path
$nodeExe = (Get-Command node).Source
if ([int](& $nodeExe -p 'process.versions.node.split(".")[0]') -lt 22) { throw 'Node >=22 required' }
if ($env:DOCKER_HOST -or $env:DOCKER_CONTEXT) { throw 'Docker endpoint overrides are not allowed' }
$endpoint = docker context inspect --format '{{.Endpoints.docker.Host}}'
if ($LASTEXITCODE -ne 0 -or $endpoint -notin @('npipe:////./pipe/dockerDesktopLinuxEngine', 'npipe:////./pipe/docker_engine')) { throw 'Local Docker named pipe required' }
$container = 'fcm-tire-s15-' + [guid]::NewGuid().ToString('N').Substring(0,12)
$saved = @{}
foreach ($key in @('DATABASE_URL','DIRECT_URL','FCM_TEST_ADMIN_DATABASE_URL','FCM_TEST_DATABASE_URL','FCM_TIRE_TEST_ADMIN_URL','FCM_TIRE_TEST_APP_URL','STAGING_DATABASE_URL','VERCEL_ENV')) { $saved[$key] = [Environment]::GetEnvironmentVariable($key, 'Process') }
$created = $false
function Invoke-Sql([string]$database, [string]$sql) {
  $result = $sql | docker exec -i $container psql -X -At -v ON_ERROR_STOP=1 -U postgres -d $database
  if ($LASTEXITCODE -ne 0) { throw 'Disposable SQL failed' }
  return $result
}
Push-Location $repo
try {
  docker run --detach --rm --name $container --label 'fcm.disposable=tire-sprint15' --tmpfs /var/lib/postgresql/data -e POSTGRES_PASSWORD=local-fixture-only -e POSTGRES_DB=fcm_tire_s8 -p '127.0.0.1::5432' postgres:17-alpine | Out-Null
  if ($LASTEXITCODE -ne 0) { throw 'Disposable container failed to start' }
  $created = $true
  $mapping = docker port $container 5432/tcp
  if ($LASTEXITCODE -ne 0 -or $mapping -notmatch '^127\.0\.0\.1:(\d+)$') { throw 'Loopback port required' }
  $port = $Matches[1]
  $adminUrl = "postgresql://postgres:local-fixture-only@127.0.0.1:$port/fcm_tire_s8"
  $appUrl = "postgresql://fcm_tire_app:local-app-only@127.0.0.1:$port/fcm_tire_s8"
  $env:DATABASE_URL = $adminUrl
  $env:DIRECT_URL = $adminUrl
  $env:STAGING_DATABASE_URL = ''
  $env:VERCEL_ENV = ''
  $ready = $false
  for ($attempt=0; $attempt -lt 30; $attempt++) {
    docker exec $container pg_isready -U postgres -d fcm_tire_s8 | Out-Null
    if ($LASTEXITCODE -eq 0) { $ready=$true; break }
    Start-Sleep -Milliseconds 500
  }
  if (-not $ready) { throw 'Postgres did not become ready' }
  & $nodeExe node_modules/prisma/build/index.js migrate deploy --schema apps/api/prisma/schema.prisma
  if ($LASTEXITCODE -ne 0) { throw 'Migration failed' }
  & $nodeExe node_modules/prisma/build/index.js migrate deploy --schema apps/api/prisma/schema.prisma
  if ($LASTEXITCODE -ne 0) { throw 'Migration replay failed' }
  & $nodeExe node_modules/prisma/build/index.js migrate status --schema apps/api/prisma/schema.prisma
  if ($LASTEXITCODE -ne 0) { throw 'Migration status failed' }
  Invoke-Sql fcm_tire_s8 @'
CREATE ROLE fcm_tire_app LOGIN PASSWORD 'local-app-only' NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS;
GRANT CONNECT ON DATABASE fcm_tire_s8 TO fcm_tire_app;
GRANT USAGE ON SCHEMA public TO fcm_tire_app;
GRANT SELECT, UPDATE ON TABLE "Organization" TO fcm_tire_app;
GRANT SELECT ON TABLE "User" TO fcm_tire_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "TireCohortSourceSnapshot", "TireCohortSourceHead", "TireCalibrationDossier", "TireCalibrationReviewEvent", "TireCalibrationApprovalPackage" TO fcm_tire_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "TireCohortV2ResearchSnapshot", "TireCohortV2ResearchHead" TO fcm_tire_app;
'@ | Out-Null
  $role = Invoke-Sql fcm_tire_s8 "SELECT rolsuper::text || '|' || rolbypassrls::text FROM pg_roles WHERE rolname='fcm_tire_app'"
  if ($role -ne 'false|false') { throw 'Application role can bypass RLS' }
  $env:FCM_TIRE_TEST_ADMIN_URL = $adminUrl
  $env:FCM_TIRE_TEST_APP_URL = $appUrl
  if ($FullSuite) {
    # Generic URLs opt partner suites into their own fixture. Do not hand them
    # the tire database: those integrations remain explicitly unprovisioned.
    $env:FCM_TEST_ADMIN_DATABASE_URL = ''
    $env:FCM_TEST_DATABASE_URL = ''
  } else {
    $env:FCM_TEST_ADMIN_DATABASE_URL = $adminUrl
    $env:FCM_TEST_DATABASE_URL = $appUrl
  }
  Push-Location apps/api
  try {
    if ($FullSuite) { & (Get-Command npm.cmd).Source @testArguments }
    else { & $nodeExe ../../node_modules/vitest/vitest.mjs @testArguments }
    if ($LASTEXITCODE -ne 0) { throw 'Tests failed with the isolated PostgreSQL fixture' }
  } finally { Pop-Location }
  docker exec $container pg_dump -U postgres -d fcm_tire_s8 -Fc -f /tmp/tire-s15.dump
  if ($LASTEXITCODE -ne 0) { throw 'Backup failed' }
  Invoke-Sql postgres 'CREATE DATABASE fcm_tire_restore' | Out-Null
  docker exec $container pg_restore --exit-on-error -U postgres -d fcm_tire_restore /tmp/tire-s15.dump
  if ($LASTEXITCODE -ne 0) { throw 'Restore failed' }
  $evidenceSql = @'
SELECT 'dossiers|' || count(*) FROM "TireCalibrationDossier"
UNION ALL SELECT 'events|' || count(*) FROM "TireCalibrationReviewEvent"
UNION ALL SELECT 'packages|' || count(*) FROM "TireCalibrationApprovalPackage"
UNION ALL SELECT 'package-hashes|' || string_agg("packageFingerprint", ',' ORDER BY id) FROM "TireCalibrationApprovalPackage"
UNION ALL SELECT 'v2-snapshots|' || count(*) FROM "TireCohortV2ResearchSnapshot"
UNION ALL SELECT 'v2-heads|' || count(*) FROM "TireCohortV2ResearchHead"
UNION ALL SELECT 'forced-rls|' || count(*) FROM pg_class WHERE relname IN ('TireCohortSourceSnapshot','TireCohortSourceHead','TireCalibrationDossier','TireCalibrationReviewEvent','TireCalibrationApprovalPackage','TireCohortV2ResearchSnapshot','TireCohortV2ResearchHead') AND relrowsecurity AND relforcerowsecurity;
'@
  $original = @(Invoke-Sql fcm_tire_s8 $evidenceSql)
  $restored = @(Invoke-Sql fcm_tire_restore $evidenceSql)
  if (Compare-Object $original $restored) { throw 'Restore evidence mismatch' }
  if ($original -notcontains 'forced-rls|7') { throw 'Missing forced RLS' }
  [ordered]@{ schemaVersion='fcm.tire-isolated-validation.v1'; commit=(& git rev-parse HEAD); testScope=$(if ($FullSuite) { 'FULL_API' } else { 'RLS_FOCUSED' }); localOnly=$true; syntheticIdentities=$true; postgresRls='PASS'; backup='PASS'; restore='PASS'; applicationSuperuser=$false; applicationBypassRls=$false; evidence=$restored; cloudPreviewValidated=$false; authenticatedBrowserValidated=$false } | ConvertTo-Json -Depth 5
} finally {
  foreach ($key in $saved.Keys) { [Environment]::SetEnvironmentVariable($key, $saved[$key], 'Process') }
  if ($created) {
    docker stop $container | Out-Null
    if ($LASTEXITCODE -ne 0) { Write-Warning "Dispose container manually: $container" }
  }
  Pop-Location
}
