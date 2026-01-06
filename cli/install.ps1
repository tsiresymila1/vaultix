# Vaultix CLI Installer for Windows
# Usage: iwr -useb https://raw.githubusercontent.com/tsiresymila1/vaultix/main/cli/install.ps1 | iex

$ErrorActionPreference = 'Stop'

# Configuration
$Repo = "tsiresymila1/vaultix"
$BinaryName = "vaultix"
$InstallDir = "$HOME\.vaultix\bin"

# Create install directory if it doesn't exist
if (!(Test-Path $InstallDir)) {
    New-Item -ItemType Directory -Path $InstallDir | Out-Null
}

# Detect Architecture
$Arch = if ([IntPtr]::Size -eq 8) { "x64" } else { "x86" }
$RemoteBinary = "${BinaryName}-win-${Arch}.exe"

Write-Host "Detecting latest release..." -ForegroundColor Cyan

# Get latest release from GitHub API
$ReleaseUrl = "https://api.github.com/repos/${Repo}/releases/latest"
$ReleaseData = Invoke-RestMethod -Uri $ReleaseUrl
$Asset = $ReleaseData.assets | Where-Object { $_.name -eq $RemoteBinary }

if ($null -eq $Asset) {
    Write-Error "Could not find binary for Windows ($Arch) in the latest release."
    exit 1
}

$DownloadUrl = $Asset.browser_download_url
$DestPath = Join-Path $InstallDir "${BinaryName}.exe"

Write-Host "Downloading Vaultix CLI ($Arch)..." -ForegroundColor Cyan
Invoke-WebRequest -Uri $DownloadUrl -OutFile $DestPath

Write-Host "Updating PATH..." -ForegroundColor Cyan
$CurrentPath = [Environment]::GetEnvironmentVariable("Path", "User")
if ($CurrentPath -notlike "*$InstallDir*") {
    $NewPath = "$CurrentPath;$InstallDir"
    [Environment]::SetEnvironmentVariable("Path", $NewPath, "User")
    $env:Path = $NewPath
    Write-Host "✔ Added $InstallDir to your User PATH." -ForegroundColor Green
}

Write-Host "✔ Vaultix CLI installed successfully!" -ForegroundColor Green
Write-Host "Please restart your terminal or run: `$env:Path = [System.Environment]::GetEnvironmentVariable('Path','User')`" -ForegroundColor Yellow
Write-Host "Try running: vaultix --version" -ForegroundColor Cyan
