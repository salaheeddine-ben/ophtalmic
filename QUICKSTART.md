# 🚀 Guide de démarrage rapide

## Installation en 3 étapes

### 1️⃣ Installer les dépendances
```bash
npm install
```

### 2️⃣ Démarrer le serveur
```bash
npm start
```

Le serveur démarre sur `http://localhost:3000`

### 3️⃣ Tester localement
```bash
./test/test-webhook.sh
```

## ✅ Vérification

Après le test, vous devriez voir :
- Un fichier `.txt` dans le dossier `./orders/`
- Des logs confirmant le traitement du webhook

## 📝 Configuration pour la production

### Étape 1 : Obtenir votre clé secrète Shopify

1. Connectez-vous à votre Admin Shopify
2. Allez dans **Settings** > **Notifications** > **Webhooks**
3. Notez votre clé secrète webhook

### Étape 2 : Configurer le fichier .env

Éditez le fichier `.env` :
```env
SHOPIFY_WEBHOOK_SECRET=votre_cle_secrete_ici
```

### Étape 2bis : Configurer FTP (Optionnel) 📤

Pour activer l'upload automatique sur FTP, ajoutez également :
```env
FTP_HOST=ftp.votre-serveur.com
FTP_USER=votre_utilisateur
FTP_PASSWORD=votre_mot_de_passe
FTP_REMOTE_DIR=/sage-x3/import
```

Testez la connexion FTP :
```bash
curl http://localhost:3000/test-ftp
```

### Étape 3 : Déployer votre serveur

Déployez sur votre hébergeur (Heroku, DigitalOcean, AWS, etc.)

**Important :** Shopify exige HTTPS en production !

### Étape 4 : Configurer le webhook dans Shopify

#### Option A : Via l'interface Admin

1. **Settings** > **Notifications** > **Webhooks**
2. **Create webhook**
3. Event : `Order creation`
4. Format : `JSON`
5. URL : `https://votre-domaine.com/webhooks/shopify/orders-create`

#### Option B : Via l'API REST

```bash
curl -X POST "https://votre-boutique.myshopify.com/admin/api/2025-01/webhooks.json" \
  -H "X-Shopify-Access-Token: VOTRE_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "webhook": {
      "topic": "orders/create",
      "address": "https://votre-domaine.com/webhooks/shopify/orders-create",
      "format": "json"
    }
  }'
```

## 🧪 Test en local avec ngrok

Pour tester avec de vrais webhooks Shopify en développement :

```bash
# Terminal 1 : Démarrer le serveur
npm start

# Terminal 2 : Démarrer ngrok
ngrok http 3000
```

Utilisez l'URL HTTPS de ngrok dans la configuration de votre webhook Shopify.

## 📁 Structure des fichiers générés

Les fichiers sont sauvegardés dans `./orders/` au format :
```
order_[numéro]_[timestamp].txt
```

Exemple : `order_1001_20251218_160110.txt`

## 🔍 Surveillance

### Vérifier l'état du serveur
```bash
curl http://localhost:3000/health
```

### Consulter les logs Shopify

Dans votre Admin Shopify :
**Settings** > **Notifications** > **Webhooks** > Cliquez sur votre webhook

Vous verrez l'historique de tous les webhooks envoyés et leur statut.

## ❓ Problèmes courants

### Le webhook ne fonctionne pas
✅ Vérifiez que `SHOPIFY_WEBHOOK_SECRET` est correct
✅ Vérifiez que votre URL est accessible publiquement (HTTPS)
✅ Consultez les logs du serveur et l'historique dans Shopify Admin

### Les fichiers ne sont pas générés
✅ Vérifiez les permissions d'écriture du dossier `./orders/`
✅ Consultez les logs du serveur pour voir les erreurs

### Erreur HMAC
✅ Assurez-vous que `SHOPIFY_WEBHOOK_SECRET` correspond exactement à celle de Shopify
✅ Ne copiez pas d'espaces avant/après la clé

### L'upload FTP échoue
✅ Testez la connexion : `curl http://localhost:3000/test-ftp`
✅ Vérifiez les identifiants FTP (HOST, USER, PASSWORD)
✅ Activez le debug : `FTP_DEBUG=true`

## 📚 Ressources

- [Documentation complète](README.md)
- [Documentation Shopify Webhooks](https://shopify.dev/docs/apps/build/webhooks)
- [API Shopify Orders](https://shopify.dev/docs/api/admin-rest/2025-01/resources/order)

## 🆘 Support

En cas de problème :
1. Vérifiez les logs du serveur
2. Consultez l'historique des webhooks dans Shopify Admin
3. Testez localement avec `./test/test-webhook.sh`
4. Vérifiez votre configuration `.env`
