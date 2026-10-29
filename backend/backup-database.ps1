param(
    [string]$Database = 'tienda_reparacion',
    [string]$HostName = 'localhost',
    [ValidateRange(1, 65535)]
    [int]$Port = 3306,
    [string]$Username = $env:DB_USERNAME
)

$ErrorActionPreference = 'Stop'

if ([string]::IsNullOrWhiteSpace($Username)) {
    $Username = Read-Host 'Usuario de MariaDB'
}
if ([string]::IsNullOrWhiteSpace($Username)) {
    throw 'Se requiere el usuario de MariaDB.'
}
if ($Database -notmatch '^[A-Za-z0-9_]+$') {
    throw 'El nombre de la base solo puede contener letras, numeros y guion bajo.'
}

$dumpCommand = Get-Command 'mariadb-dump.exe' -ErrorAction SilentlyContinue
if (-not $dumpCommand) {
    $dumpCommand = Get-Command 'mysqldump.exe' -ErrorAction SilentlyContinue
}
if (-not $dumpCommand) {
    $xamppDump = 'C:\xampp\mysql\bin\mysqldump.exe'
    if (Test-Path $xamppDump) {
        $dumpPath = $xamppDump
    } else {
        throw 'No se encontro mariadb-dump.exe ni mysqldump.exe. Instala MariaDB/MySQL o agrega su carpeta bin al PATH.'
    }
} else {
    $dumpPath = $dumpCommand.Source
}

$backupDirectory = Join-Path $PSScriptRoot 'backups'
New-Item -ItemType Directory -Path $backupDirectory -Force | Out-Null
$timestamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$backupPath = Join-Path $backupDirectory "tecrob-$Database-$timestamp.sql"

Write-Output "Creando copia de seguridad de '$Database' en:"
Write-Output $backupPath
Write-Output 'MariaDB solicitara la contrasena de forma interactiva.'

& $dumpPath "--host=$HostName" "--port=$Port" "--user=$Username" '--password' `
    '--single-transaction' '--routines' '--triggers' '--events' `
    $Database "--result-file=$backupPath"

if ($LASTEXITCODE -ne 0) {
    if (Test-Path $backupPath) {
        Remove-Item -LiteralPath $backupPath -Force
    }
    throw "La copia de seguridad fallo (codigo $LASTEXITCODE). No se conservaron archivos incompletos."
}

$backup = Get-Item -LiteralPath $backupPath
if ($backup.Length -eq 0) {
    Remove-Item -LiteralPath $backupPath -Force
    throw 'MariaDB genero una copia vacia; se elimino el archivo incompleto.'
}

Write-Output ("Copia completada: {0:N2} MB" -f ($backup.Length / 1MB))
