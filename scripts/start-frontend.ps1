param(
  [string]$ProxyConfig = "proxy.conf.json"
)

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$root = Resolve-Path (Join-Path $scriptDir "..")

Push-Location (Join-Path $root "frontend-bpm")
try {
  npm start -- --proxy-config $ProxyConfig
} finally {
  Pop-Location
}
