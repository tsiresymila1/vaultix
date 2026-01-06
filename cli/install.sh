#!/bin/bash

# Vaultix CLI Installer
# Usage: curl -fsSL https://raw.githubusercontent.com/tsiresymila1/vaultix/main/cli/install.sh | sh

set -e

# Configuration
REPO="tsiresymila1/vaultix" # UPDATE THIS TO THE ACTUAL REPO NAME IF DIFFERENT
BINARY_NAME="vaultix"
INSTALL_DIR="/usr/local/bin"

if [ "$EUID" -ne 0 ]; then
  INSTALL_DIR="$HOME/.vaultix/bin"
  mkdir -p "$INSTALL_DIR"
  export PATH="$PATH:$INSTALL_DIR"
  echo "Notice: Installing to $INSTALL_DIR because not running as root."
  echo "Make sure to add $INSTALL_DIR to your PATH."
fi

# Detect OS and Architecture
OS=$(uname -s | tr '[:upper:]' '[:lower:]')
ARCH=$(uname -m)

case "$OS" in
  linux)
    PLATFORM="linux"
    ;;
  darwin)
    PLATFORM="macos"
    ;;
  *)
    echo "Error: Unsupported OS $OS"
    exit 1
    ;;
esac

case "$ARCH" in
  x86_64)
    ARCH_SUFFIX="x64"
    ;;
  arm64|aarch64)
    ARCH_SUFFIX="arm64"
    ;;
  *)
    echo "Error: Unsupported architecture $ARCH"
    exit 1
    ;;
esac

# Construct binary name as per pkg output
# pkg names: vaultix-linux-x64, vaultix-macos-x64, vaultix-macos-arm64
REMOTE_BINARY="${BINARY_NAME}-${PLATFORM}-${ARCH_SUFFIX}"

# Get latest release from GitHub API
RELEASE_URL="https://api.github.com/repos/${REPO}/releases/latest"
DOWNLOAD_URL=$(curl -s $RELEASE_URL | grep "browser_download_url" | grep "$REMOTE_BINARY" | cut -d '"' -f 4)

if [ -z "$DOWNLOAD_URL" ]; then
  echo "Error: Could not find binary for $PLATFORM-$ARCH_SUFFIX in the latest release."
  exit 1
fi

echo "Downloading Vaultix CLI ($PLATFORM-$ARCH_SUFFIX)..."
curl -L "$DOWNLOAD_URL" -o "$BINARY_NAME"
chmod +x "$BINARY_NAME"

echo "Installing to $INSTALL_DIR..."
mv "$BINARY_NAME" "$INSTALL_DIR/$BINARY_NAME"

# macOS Specific Fixes (Code Signing and Quarantine)
if [ "$PLATFORM" = "macos" ]; then
  echo "Applying macOS security fixes..."
  # Remove quarantine attribute
  xattr -d com.apple.quarantine "$INSTALL_DIR/$BINARY_NAME" 2>/dev/null || true
  # Ad-hoc sign the binary (fixes 'killed' error on Apple Silicon)
  if command -v codesign >/dev/null 2>&1; then
    codesign -s - --force "$INSTALL_DIR/$BINARY_NAME" 2>/dev/null || true
  fi
fi

echo "✔ Vaultix CLI installed successfully!"
echo "Try running: vaultix --version"
