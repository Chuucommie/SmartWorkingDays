#!/bin/bash
# EOS Smart Working — Genera Secrets.plist da secret.xcconfig
# Uso: ./scripts/generate-secrets.sh
# Richiede PlistBuddy (incluso in macOS).

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
CONFIG_DIR="$SCRIPT_DIR/../Config"
XCCONFIG="$CONFIG_DIR/secret.xcconfig"
PLIST="$CONFIG_DIR/Secrets.plist"

if [ ! -f "$XCCONFIG" ]; then
    echo "❌ $XCCONFIG non trovato. Copia secret.example.xcconfig → secret.xcconfig e compila i valori."
    exit 1
fi

echo "🔐 Generazione Secrets.plist da secret.xcconfig..."

# Crea plist vuoto
cat > "$PLIST" << 'PLISTHEADER'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
PLISTHEADER

# Legge ogni riga del xcconfig e la converte in chiave/valore plist
while IFS='=' read -r key value; do
    # Salta commenti e righe vuote
    [[ -z "$key" || "$key" =~ ^[[:space:]]*// ]] && continue
    key=$(echo "$key" | xargs)
    value=$(echo "$value" | xargs)
    echo "	<key>$key</key>"
    echo "	<string>$value</string>"
done < "$XCCONFIG" >> "$PLIST"

# Chiude plist
cat >> "$PLIST" << 'PLISTFOOTER'
</dict>
</plist>
PLISTFOOTER

echo "✅ Secrets.plist generato: $PLIST"
