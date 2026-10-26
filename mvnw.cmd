@REM ----------------------------------------------------------------------------
@REM Maven Wrapper for Windows (LegalMetriScan)
@REM Automatically downloads Apache Maven 3.9.9 if not present
@REM ----------------------------------------------------------------------------
@echo off
setlocal

set "MAVEN_VERSION=3.9.9"
set "MAVEN_DIR=%USERPROFILE%\.m2\wrapper\dists\apache-maven-%MAVEN_VERSION%-bin\apache-maven-%MAVEN_VERSION%"
set "MVN_CMD=%MAVEN_DIR%\bin\mvn.cmd"

if exist "%MVN_CMD%" goto run

echo [mvnw] Apache Maven %MAVEN_VERSION% not found in wrapper cache.
echo [mvnw] Downloading Apache Maven %MAVEN_VERSION%...

powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$dist = '%USERPROFILE%\.m2\wrapper\dists\apache-maven-%MAVEN_VERSION%-bin';" ^
  "if (!(Test-Path $dist)) { New-Item -ItemType Directory -Force -Path $dist | Out-Null };" ^
  "$zip = Join-Path $dist 'apache-maven-%MAVEN_VERSION%-bin.zip';" ^
  "[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12;" ^
  "Write-Host '[mvnw] Fetching archive...';" ^
  "Invoke-WebRequest -Uri 'https://archive.apache.org/dist/maven/maven-3/%MAVEN_VERSION%/binaries/apache-maven-%MAVEN_VERSION%-bin.zip' -OutFile $zip;" ^
  "Write-Host '[mvnw] Extracting Maven...';" ^
  "Expand-Archive -Path $zip -DestinationPath $dist -Force;" ^
  "Remove-Item -Force $zip;" ^
  "Write-Host '[mvnw] Maven download completed successfully.'"

if not exist "%MVN_CMD%" (
  echo [mvnw] ERROR: Failed to set up Maven %MAVEN_VERSION%.
  exit /b 1
)

:run
"%MVN_CMD%" %*
exit /b %ERRORLEVEL%
