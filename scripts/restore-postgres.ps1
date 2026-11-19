param(
  [Parameter(Mandatory=$true)][string]$BackupFile,
  [string]$ContainerName = "agente-black-op-db-1"
)
$ErrorActionPreference = "Stop"
if (-not (Test-Path $BackupFile -PathType Leaf)) { throw "No existe el archivo de backup." }
$container = docker ps --filter "name=$ContainerName" --format "{{.Names}}"
if (-not $container) { throw "No está activo el contenedor PostgreSQL '$ContainerName'." }
$confirmation = Read-Host "Esto reemplazará los datos de Black Ops. Escribe RESTAURAR para continuar"
if ($confirmation -cne "RESTAURAR") { throw "Restauración cancelada." }
$remoteFile = "/tmp/blackops-restore.dump"
docker cp (Resolve-Path $BackupFile).Path "$($ContainerName):$remoteFile"
if ($LASTEXITCODE -ne 0) { throw "No se pudo copiar el backup al contenedor." }
try {
  docker exec $ContainerName pg_restore -U blackops --clean --if-exists --no-owner --dbname=blackops $remoteFile
  if ($LASTEXITCODE -ne 0) { throw "pg_restore falló. Revisar el log antes de reabrir el servicio." }
  Write-Host "Restauración completada. Verifica /health y los datos antes de recibir tráfico."
}
finally {
  docker exec $ContainerName rm -f $remoteFile | Out-Null
}
