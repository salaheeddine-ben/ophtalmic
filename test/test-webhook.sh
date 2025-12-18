#!/bin/bash

# Script de test pour envoyer un webhook local au serveur

echo "🧪 Envoi d'un webhook de test au serveur local..."
echo ""

# Vérifier que le serveur est démarré
if ! curl -s http://localhost:3000/health > /dev/null; then
    echo "❌ Le serveur ne semble pas démarré sur le port 3000"
    echo "   Démarrez-le avec: npm start"
    exit 1
fi

echo "✅ Le serveur est accessible"
echo ""

# Envoyer le webhook
echo "📤 Envoi du webhook orders/create..."
echo ""

response=$(curl -s -w "\nHTTP_CODE:%{http_code}" -X POST http://localhost:3000/webhooks/shopify/orders-create \
  -H "Content-Type: application/json" \
  -H "X-Shopify-Topic: orders/create" \
  -H "X-Shopify-Shop-Domain: test-boutique.myshopify.com" \
  -H "X-Shopify-API-Version: 2025-01" \
  -d @test/sample-order.json)

# Extraire le code HTTP et le body
http_code=$(echo "$response" | grep "HTTP_CODE:" | cut -d: -f2)
body=$(echo "$response" | grep -v "HTTP_CODE:")

echo "📥 Réponse du serveur (HTTP $http_code):"
echo "$body" | python3 -m json.tool 2>/dev/null || echo "$body"
echo ""

if [ "$http_code" = "200" ]; then
    echo "✅ Webhook traité avec succès !"
    echo ""
    echo "📁 Vérifiez le fichier généré dans le répertoire ./orders/"
    echo ""
    # Afficher le dernier fichier créé
    if [ -d "./orders" ]; then
        latest_file=$(ls -t ./orders/*.txt 2>/dev/null | head -1)
        if [ -n "$latest_file" ]; then
            echo "📄 Dernier fichier généré: $latest_file"
            echo ""
            echo "Contenu:"
            echo "─────────────────────────────────────────────────────"
            cat "$latest_file"
            echo "─────────────────────────────────────────────────────"
        fi
    fi
else
    echo "❌ Erreur lors du traitement du webhook"
fi
