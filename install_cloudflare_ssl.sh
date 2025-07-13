#!/bin/bash

DOMAIN="md2pdf.download"
SSL_DIR="/etc/ssl/cloudflare"

# Create the directory to store SSL certificates
echo "📁 Creating SSL directory: $SSL_DIR"
sudo mkdir -p "$SSL_DIR"

# Prompt to paste the Cloudflare Origin Certificate
echo "📄 Paste your Cloudflare Origin Certificate and press Ctrl+D when done:"
sudo tee "$SSL_DIR/$DOMAIN.pem" > /dev/null

# Prompt to paste the private key
echo "🔑 Paste your private key and press Ctrl+D when done:"
sudo tee "$SSL_DIR/$DOMAIN.key" > /dev/null

# Set correct file permissions
echo "🔒 Setting file permissions"
sudo chmod 600 "$SSL_DIR/$DOMAIN.key"   # Private key should be readable only by root
sudo chmod 644 "$SSL_DIR/$DOMAIN.pem"  # Certificate can be readable by others

# Display Nginx SSL configuration snippet
echo "✅ Done. Add the following to your Nginx server block:"
echo
echo "    ssl_certificate     $SSL_DIR/$DOMAIN.pem;"
echo "    ssl_certificate_key $SSL_DIR/$DOMAIN.key;"
echo
echo "🧪 Then test and reload Nginx:"
echo "    sudo nginx -t && sudo systemctl reload nginx"