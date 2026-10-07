$ErrorActionPreference='Stop'
$repo=(Resolve-Path (Join-Path $PSScriptRoot '../../..')).Path
$nodeExe=(Get-Command node).Source
if($env:DOCKER_HOST -or $env:DOCKER_CONTEXT){throw 'Docker endpoint overrides forbidden'}
$endpoint=docker context inspect --format '{{.Endpoints.docker.Host}}'
if($LASTEXITCODE -ne 0 -or $endpoint -notin @('npipe:////./pipe/dockerDesktopLinuxEngine','npipe:////./pipe/docker_engine')){throw 'Local Docker named pipe required'}
$container='fcm-family-s2-'+[guid]::NewGuid().ToString('N').Substring(0,12)
$saved=@{}
foreach($key in @('DATABASE_URL','DIRECT_URL','FCM_FAMILY_TEST_ADMIN_URL','FCM_FAMILY_TEST_APP_URL')){$saved[$key]=[Environment]::GetEnvironmentVariable($key,'Process')}
$created=$false
Push-Location $repo
try{
  docker run --detach --rm --name $container --label 'fcm.disposable=family-base-s2' --tmpfs /var/lib/postgresql/data -e POSTGRES_PASSWORD=local-fixture-only -e POSTGRES_DB=fcm_family_s2 -p '127.0.0.1::5432' postgres:17-alpine | Out-Null
  if($LASTEXITCODE -ne 0){throw 'Disposable PostgreSQL start failed'}
  $created=$true
  $mapping=docker port $container 5432/tcp
  if($LASTEXITCODE -ne 0 -or $mapping -notmatch '^127\.0\.0\.1:(\d+)$'){throw 'Loopback mapping required'}
  $port=$Matches[1]
  $env:DATABASE_URL="postgresql://postgres:local-fixture-only@127.0.0.1:$port/fcm_family_s2"
  $env:DIRECT_URL=$env:DATABASE_URL
  $env:FCM_FAMILY_TEST_ADMIN_URL=$env:DATABASE_URL
  $env:FCM_FAMILY_TEST_APP_URL="postgresql://fcm_family_app:local-app-only@127.0.0.1:$port/fcm_family_s2"
  $ready=$false
  for($attempt=0;$attempt -lt 30;$attempt++){
    docker exec $container pg_isready -U postgres -d fcm_family_s2 | Out-Null
    if($LASTEXITCODE -eq 0){$ready=$true;break};Start-Sleep -Milliseconds 500
  }
  if(-not $ready){throw 'Postgres readiness failed'}
  & $nodeExe node_modules/prisma/build/index.js migrate deploy --schema apps/api/prisma/schema.prisma
  if($LASTEXITCODE -ne 0){throw 'Local migration deploy failed'}
  @'
CREATE ROLE fcm_family_app LOGIN PASSWORD 'local-app-only' NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS;
GRANT CONNECT ON DATABASE fcm_family_s2 TO fcm_family_app;
GRANT USAGE ON SCHEMA public TO fcm_family_app;
GRANT SELECT ON TABLE "Organization", "User", "CostBase", "AssumptionSet", "AssumptionParam", "CostBaseAuditEvent" TO fcm_family_app;
GRANT UPDATE (id) ON TABLE "Organization", "AssumptionSet" TO fcm_family_app;
GRANT INSERT (id,"orgId","costBaseId",action,"actorId",note,payload,"createdAt") ON TABLE "CostBaseAuditEvent" TO fcm_family_app;
'@ | docker exec -i $container psql -X -v ON_ERROR_STOP=1 -U postgres -d fcm_family_s2 | Out-Null
  if($LASTEXITCODE -ne 0){throw 'Local limited role failed'}
  Push-Location apps/api
  try{
    & $nodeExe ../../node_modules/vitest/vitest.mjs run tests/family-base-postgres.test.ts
    if($LASTEXITCODE -ne 0){throw 'Family PostgreSQL checks failed'}
  }finally{Pop-Location}
  [ordered]@{localOnly=$true;syntheticIdentity=$true;actualB3Reader=$true;losslessJsonbReadback=$true;limitedRole=$true;productionValidated=$false}|ConvertTo-Json
}finally{
  foreach($key in $saved.Keys){[Environment]::SetEnvironmentVariable($key,$saved[$key],'Process')}
  if($created){docker stop $container | Out-Null;if($LASTEXITCODE -ne 0){Write-Warning "Own disposable container needs cleanup: $container"}}
  Pop-Location
}
