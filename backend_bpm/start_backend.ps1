$envFile = "..\.env"
if (Test-Path $envFile) {
    Get-Content $envFile | ForEach-Object {
        if ($_ -match '^\s*([^#\s][^=]+)=(.*)$') {
            $name = $matches[1].Trim()
            $val = $matches[2].Trim()
            if ($name -eq "GOOGLE_APPLICATION_CREDENTIALS" -and -not [System.IO.Path]::IsPathRooted($val)) {
                $val = Join-Path $PSScriptRoot "..\$val"
                $val = [System.IO.Path]::GetFullPath($val)
            }
            [Environment]::SetEnvironmentVariable($name, $val, "Process")
        }
    }
}
.\mvnw.cmd spring-boot:run
