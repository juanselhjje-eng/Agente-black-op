# Respaldos y recuperación de PostgreSQL

## Backup manual en Windows PowerShell
Desde la carpeta del proyecto:
```powershell
.\scripts\backup-postgres.ps1
```
Crea un dump PostgreSQL en formato custom y un archivo SHA-256 dentro de `backups\`. El contenedor por defecto se llama `agente-black-op-db-1`; si Compose genera otro nombre, pásalo con `-ContainerName`.

## Restaurar
```powershell
.\scripts\restore-postgres.ps1 -BackupFile .\backups\blackops-AAAAMMDD-HHMMSS.dump
```
El script exige escribir `RESTAURAR`, porque reemplaza los datos. Ejecutar en ventana de mantenimiento, detener el tráfico entrante, conservar un backup del estado actual y verificar `/health` y los registros antes de reabrir.

## Reglas operativas
- Programar backups frecuentes fuera del horario pico.
- Copiar los respaldos a almacenamiento separado y cifrado; no dejar la única copia en el mismo servidor.
- Restringir permisos NTFS al usuario de servicio y administradores autorizados.
- Probar restauración periódicamente en un entorno aislado.
- Definir retención y RPO/RTO con el dueño.
- El checksum detecta corrupción accidental, pero no cifra el archivo.
- No se ha configurado todavía una tarea programada: debe instalarse en el servidor una vez confirmado su Windows y política de backups.
