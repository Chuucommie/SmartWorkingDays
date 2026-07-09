#!/bin/bash
# EOS Smart Working — Setup iniziale secrets iOS
# Esegui UNA VOLTA dopo aver clonato il repo.
# Uso: ./scripts/setup-ios-secrets.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
CONFIG_DIR="$SCRIPT_DIR/../Config"

echo "🔐 EOS Smart Working — Setup Secrets iOS"
echo ""

# Chiede il token (o lo prende da variabile d'ambiente)
if [ -n "${TURSO_TOKEN:-}" ]; then
    TOKEN="$TURSO_TOKEN"
    echo "✅ Token preso da variabile d'ambiente TURSO_TOKEN"
else
    read -r -p "Incolla il token Turso: " TOKEN
fi

if [ -z "$TOKEN" ]; then
    echo "❌ Token vuoto. Riprova con: TURSO_TOKEN=eyJ... ./scripts/setup-ios-secrets.sh"
    exit 1
fi

# Crea secret.xcconfig
cat > "$CONFIG_DIR/secret.xcconfig" << EOF
// EOS Smart Working — Secrets
// Generato automaticamente da setup-ios-secrets.sh
// NON committare mai questo file!

TURSO_URL = https://smartworking-chuucommie.aws-eu-west-1.turso.io
TURSO_TOKEN=${TOKEN}
EOF

echo "✅ secret.xcconfig creato"

# Genera Secrets.plist
"$SCRIPT_DIR/generate-secrets.sh"

echo ""
echo "🎉 Setup completato!"
echo ""
echo "⚠️  Ora in Xcode:"
echo "   1. Apri il progetto"
echo "   2. Vai su Target → Build Phases → Copy Bundle Resources"
echo "   3. Clicca + e aggiungi ios/Config/Secrets.plist"
echo "   4. Builda e prova il login!"
