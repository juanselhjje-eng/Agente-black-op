param(
  [string]$OutputDirectory = ".\backups",
  [string]$ContainerName = "agente-black-op-db-1"
)
$ErrorActionPreference = "Stop"
$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
New-Item -ItemType Directory -Force -Path $OutputDirectory | Out-Null
$container = docker ps --filter "name=$ContainerName" --format "{{.Names}}"
if (-not $container) { throw "No está activo el contenedor PostgreSQL '$ContainerName'." }
$tempFile = "/tmp/blackops-$timestamp.dump"
$localFile = Join-Path $OutputDirectory "blackops-$timestamp.dump"
docker exec $ContainerName pg_dump -U blackops -Fc -f $tempFile blackops
if ($LASTEXITCODE -ne 0) { throw "pg_dump falló." }
try {
  docker cp "$($ContainerName):$tempFile" $localFile
  if ($LASTEXITCODE -ne 0) { throw "No se pudo copiar el backup al servidor." }
  $hash = Get-FileHash -Algorithm SHA256 $localFile
  "$($hash.Hash)  $(Split-Path $localFile -Leaf)" | Set-Content -Encoding ASCII "$localFile.sha256"
  Write-Host "Backup creado: $localFile"
  Write-Host "SHA256: $($hash.Hash)"
}
finally {
  docker exec $ContainerName rm -f $tempFile | Out-Null
}
