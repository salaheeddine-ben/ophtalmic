# Serveur Webhook Shopify pour Sage X3

Ce serveur Node.js reçoit les webhooks de création de commande depuis Shopify et génère des fichiers texte formatés pour l'importation dans l'ERP Sage X3.

## 📋 Fonctionnalités

- ✅ Réception sécurisée des webhooks Shopify (vérification HMAC)
- ✅ Traitement des commandes au format `orders/create`
- ✅ Génération automatique de fichiers texte formatés pour Sage X3
- ✅ Gestion des informations client, produits, prix et remises
- ✅ Support des adresses de livraison et facturation
- ✅ Calcul automatique des remises et TVA

## 🚀 Installation

### 1. Cloner et installer les dépendances

```bash
npm install
```

### 2. Configuration

Créez un fichier `.env` à la racine du projet :

```bash
cp .env.example .env
```

Modifiez le fichier `.env` avec vos paramètres :

```env
# Port du serveur
PORT=3000

# Clé secrète Shopify (trouvée dans Admin > Settings > Notifications > Webhooks)
SHOPIFY_WEBHOOK_SECRET=your_shopify_webhook_secret_here

# Référence client Sage X3
SAGE_CLIENT_REFERENCE=0147907400

# Répertoire de sortie des fichiers
OUTPUT_DIRECTORY=./orders
```

### 3. Démarrer le serveur

**Mode production :**
```bash
npm start
```

**Mode développement (avec auto-reload) :**
```bash
npm run dev
```

Le serveur démarre sur `http://localhost:3000`

## 🔧 Configuration Shopify

### 1. Obtenir votre clé secrète webhook

1. Connectez-vous à votre Admin Shopify
2. Allez dans **Settings** > **Notifications**
3. Descendez jusqu'à la section **Webhooks**
4. Si vous créez un webhook manuellement, notez la clé secrète affichée

### 2. Créer le webhook dans Shopify

#### Via l'interface Admin Shopify :

1. Allez dans **Settings** > **Notifications** > **Webhooks**
2. Cliquez sur **Create webhook**
3. Configurez :
   - **Event** : `Order creation`
   - **Format** : `JSON`
   - **URL** : `https://votre-domaine.com/webhooks/shopify/orders-create`
4. Sauvegardez

#### Via l'API Shopify (REST) :

```bash
curl -X POST "https://votre-boutique.myshopify.com/admin/api/2025-01/webhooks.json" \
  -H "X-Shopify-Access-Token: YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "webhook": {
      "topic": "orders/create",
      "address": "https://votre-domaine.com/webhooks/shopify/orders-create",
      "format": "json"
    }
  }'
```

#### Via l'API Shopify (GraphQL) :

```graphql
mutation {
  webhookSubscriptionCreate(
    topic: ORDERS_CREATE
    webhookSubscription: {
      format: JSON
      callbackUrl: "https://votre-domaine.com/webhooks/shopify/orders-create"
    }
  ) {
    webhookSubscription {
      id
      topic
      format
      endpoint {
        __typename
        ... on WebhookHttpEndpoint {
          callbackUrl
        }
      }
    }
    userErrors {
      field
      message
    }
  }
}
```

## 📁 Format du fichier généré

Les fichiers sont générés dans le répertoire configuré (`./orders` par défaut) avec le format suivant :

```
Entête de commande

Référence de commande: 1001
Référence client: "0147907400"
Date de commande: 18/12/2025 14:30:00
Référence customer: 987654321
Adresse email: client@example.com
Numéro de téléphone: +33612345678
Nom du client: Dupont
Prénom du client: Jean
Adresse de livraison: 123 Rue de la Paix, 75001, Paris, France
Frais de ports: 10.00
Montant TTC: 199.00
Numéro de la transaction CB: auth_123456
Pourcentage de la remise: 10.00%
Montant de la TVA: 33.17

Ligne de commande

Référence Article: PROD-001
Désignation de l'article: Lunettes de vue
Qte: 2
Prix unitaire: 99.50

--- Informations supplémentaires ---
Statut financier: paid
Statut de fulfillment: non traité
Devise: EUR

--- Fichier généré le 18/12/2025 14:30:00 ---
```

## 🔒 Sécurité

Le serveur vérifie automatiquement la signature HMAC de chaque webhook pour s'assurer qu'il provient bien de Shopify.

**Important :** Configurez toujours `SHOPIFY_WEBHOOK_SECRET` en production !

## 🧪 Test local

### Tester avec curl

```bash
curl -X POST http://localhost:3000/webhooks/shopify/orders-create \
  -H "Content-Type: application/json" \
  -H "X-Shopify-Topic: orders/create" \
  -H "X-Shopify-Shop-Domain: votre-boutique.myshopify.com" \
  -d @test/sample-order.json
```

### Tester avec ngrok (pour recevoir de vrais webhooks)

1. Installez [ngrok](https://ngrok.com/)
2. Lancez votre serveur : `npm start`
3. Lancez ngrok : `ngrok http 3000`
4. Utilisez l'URL HTTPS fournie par ngrok dans la configuration de votre webhook Shopify

## 📡 Endpoints disponibles

- `POST /webhooks/shopify/orders-create` - Endpoint principal pour les webhooks
- `GET /health` - Vérification de l'état du serveur
- `GET /` - Informations sur le service

## 🐛 Dépannage

### Le webhook ne fonctionne pas

1. Vérifiez que `SHOPIFY_WEBHOOK_SECRET` est correct
2. Vérifiez les logs du serveur pour voir les erreurs
3. Vérifiez que votre URL est accessible publiquement (HTTPS obligatoire en production)
4. Shopify retry les webhooks qui échouent - consultez l'historique dans Admin > Settings > Notifications

### Les fichiers ne sont pas générés

1. Vérifiez que le répertoire `OUTPUT_DIRECTORY` est accessible en écriture
2. Vérifiez les logs du serveur pour les erreurs de traitement

## 📚 Documentation Shopify

- [Webhooks Shopify](https://shopify.dev/docs/apps/build/webhooks)
- [API REST Webhooks](https://shopify.dev/docs/api/admin-rest/2025-01/resources/webhook)
- [Orders API](https://shopify.dev/docs/api/admin-rest/2025-01/resources/order)

## 📝 Structure du projet

```
.
├── src/
│   ├── server.js          # Serveur Express principal
│   └── orderProcessor.js  # Traitement et formatage des commandes
├── orders/                # Fichiers générés (créé automatiquement)
├── test/                  # Fichiers de test
│   └── sample-order.json  # Exemple de payload Shopify
├── .env                   # Configuration (à créer)
├── .env.example           # Exemple de configuration
├── package.json
└── README.md
```

## 🤝 Support

Pour toute question ou problème, consultez :
- La documentation officielle Shopify
- Les logs du serveur
- Le format des webhooks reçus

## 📄 Licence

ISC
