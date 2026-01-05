#!/bin/sh
echo "Installing Vaultix CLI..."
cd cli && npm install && npm run build
npm install -g .
echo "Done. Run 'vaultix login' to begin."
