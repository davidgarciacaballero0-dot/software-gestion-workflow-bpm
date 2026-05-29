param(
  [string]$EnvFile = ".env"
)

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$root = Resolve-Path (Join-Path $scriptDir "..")

& (Join-Path $scriptDir "load-env.ps1") -EnvFile (Join-Path $root $EnvFile)

Push-Location (Join-Path $root "backend_bpm")
try {
  .\mvnw.cmd spring-boot:run
} finally {
  Pop-Location
}
