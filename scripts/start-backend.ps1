param(
  [string]$EnvFile = ".env"
)

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$root = Resolve-Path (Join-Path $scriptDir "..")

& (Join-Path $scriptDir "load-env.ps1") -EnvFile (Join-Path $root $EnvFile)

Push-Location (Join-Path $root "backend_bpm")
try {
  if ($env:GOOGLE_APPLICATION_CREDENTIALS) {
    if (Test-Path $env:GOOGLE_APPLICATION_CREDENTIALS) {
      $env:GOOGLE_APPLICATION_CREDENTIALS = (Resolve-Path $env:GOOGLE_APPLICATION_CREDENTIALS).Path
      Write-Host "[OK] Cargando credenciales configuradas en .env: $env:GOOGLE_APPLICATION_CREDENTIALS" -ForegroundColor Green
    } else {
      $localCreds = Join-Path (Get-Location) $env:GOOGLE_APPLICATION_CREDENTIALS
      $rootCreds = Join-Path $root $env:GOOGLE_APPLICATION_CREDENTIALS
      if (Test-Path $localCreds) {
        $env:GOOGLE_APPLICATION_CREDENTIALS = (Resolve-Path $localCreds).Path
        Write-Host "[OK] Cargando credenciales de .env (ruta local): $env:GOOGLE_APPLICATION_CREDENTIALS" -ForegroundColor Green
      } elseif (Test-Path $rootCreds) {
        $env:GOOGLE_APPLICATION_CREDENTIALS = (Resolve-Path $rootCreds).Path
        Write-Host "[OK] Cargando credenciales de .env (ruta raiz): $env:GOOGLE_APPLICATION_CREDENTIALS" -ForegroundColor Green
      } else {
        Write-Host "[ERROR] Archivo de credenciales en .env no encontrado: $env:GOOGLE_APPLICATION_CREDENTIALS" -ForegroundColor Red
      }
    }
  } else {
    Write-Host "[INFO] GOOGLE_APPLICATION_CREDENTIALS no esta configurado en .env. Se usaran las credenciales por defecto de Google (ADC) del usuario." -ForegroundColor Cyan
  }

  .\mvnw.cmd spring-boot:run
} finally {
  Pop-Location
}
