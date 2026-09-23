$ErrorActionPreference = 'Stop'
# Run from repository root with Node >=22 on PATH. Docker is local disposable
# infrastructure only: explicit loopback URL overrides dotenv; no remote DB or
# host-mounted volumes. This runner never starts/repairs the Docker service.
$repo = (Resolve-Path (Join-Path $PSScriptRoot '../../..')).Path
$container = 'fcm-partner-test-' + [guid]::NewGuid().ToString('N').Substring(0, 12)
$previousUrl = $env:DATABASE_URL
$previousTestUrl = $env:FCM_TEST_DATABASE_URL
$previousDirect = $env:DIRECT_URL
$created = $false
Push-Location $repo
try {
  if ($env:DOCKER_HOST -or $env:DOCKER_CONTEXT) { throw 'Remove Docker endpoint overrides before running this local-only test.' }
  $engineEndpoint = docker context inspect --format '{{.Endpoints.docker.Host}}'
  if ($LASTEXITCODE -ne 0 -or $engineEndpoint -notin @('npipe:////./pipe/dockerDesktopLinuxEngine', 'npipe:////./pipe/docker_engine')) {
    throw 'This Windows test runner requires a local Docker named-pipe endpoint.'
  }
  & node -e 'if (Number(process.versions.node.split(".")[0]) < 22) process.exit(1)'
  if ($LASTEXITCODE -ne 0) { throw 'Node >=22 is required. No container has been created.' }
  docker info --format '{{.ServerVersion}}'
  if ($LASTEXITCODE -ne 0) { throw 'Docker local no disponible. No se ejecutaron migraciones ni pruebas PostgreSQL.' }
  docker run --detach --rm --name $container --label 'fcm.disposable=partner-cost-test' -e POSTGRES_PASSWORD=local-fixture-only -e POSTGRES_DB=fcm_partner_disposable -p '127.0.0.1::5432' postgres:16-alpine
  if ($LASTEXITCODE -ne 0) { throw 'Could not start disposable PostgreSQL' }
  $created = $true
  $mapping = docker port $container 5432/tcp
  if ($LASTEXITCODE -ne 0 -or $mapping -notmatch '^127\.0\.0\.1:(\d+)$') { throw 'Unexpected port mapping' }
  $port = $Matches[1]
  $env:DATABASE_URL = "postgresql://postgres:local-fixture-only@127.0.0.1:$port/fcm_partner_disposable"
  $env:DIRECT_URL = $env:DATABASE_URL
  $env:FCM_TEST_DATABASE_URL = $env:DATABASE_URL
  $ready = $false
  for ($i = 0; $i -lt 30; $i++) {
    docker exec $container pg_isready -U postgres -d fcm_partner_disposable
    if ($LASTEXITCODE -eq 0) { $ready = $true; break }
    Start-Sleep -Seconds 1
  }
  if (!$ready) { throw 'Disposable PostgreSQL did not become ready' }
  & node node_modules/prisma/build/index.js migrate deploy --schema apps/api/prisma/schema.prisma
  if ($LASTEXITCODE -ne 0) { throw 'Migration execution failed' }
  & node node_modules/prisma/build/index.js migrate status --schema apps/api/prisma/schema.prisma
  if ($LASTEXITCODE -ne 0) { throw 'Migration status failed' }
  # A second deploy on the same schema must be a no-op, not recreate evidence.
  & node node_modules/prisma/build/index.js migrate deploy --schema apps/api/prisma/schema.prisma
  if ($LASTEXITCODE -ne 0) { throw 'Migration replay failed' }
  Push-Location apps/api
  try { & node ../../node_modules/vitest/vitest.mjs run tests/partner-cost-postgres.test.ts; if ($LASTEXITCODE -ne 0) { throw 'PostgreSQL checks failed' } }
  finally { Pop-Location }
} finally {
  $env:DATABASE_URL = $previousUrl
  $env:FCM_TEST_DATABASE_URL = $previousTestUrl
  $env:DIRECT_URL = $previousDirect
  if ($created) { docker stop $container }
  Pop-Location
}
