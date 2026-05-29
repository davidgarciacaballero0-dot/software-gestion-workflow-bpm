param(
  [string]$EnvFile = ".env"
)

$resolvedEnv = Resolve-Path -Path $EnvFile -ErrorAction SilentlyContinue
if (-not $resolvedEnv) {
  Write-Error "Env file not found: $EnvFile"
  exit 1
}

Get-Content $resolvedEnv | ForEach-Object {
  $line = $_.Trim()
  if ($line -eq "" -or $line.StartsWith("#")) { return }
  $idx = $line.IndexOf("=")
  if ($idx -lt 1) { return }

  $name = $line.Substring(0, $idx).Trim()
  $value = $line.Substring($idx + 1).Trim()

  if ($value.StartsWith('"') -and $value.EndsWith('"')) {
    $value = $value.Trim('"')
  }

  [System.Environment]::SetEnvironmentVariable($name, $value, "Process")
}

if (-not $env:MONGO_URI -and $env:SPRING_DATA_MONGODB_URI) {
  $env:MONGO_URI = $env:SPRING_DATA_MONGODB_URI
}
