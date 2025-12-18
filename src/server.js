require('dotenv').config();
const express = require('express');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const orderProcessor = require('./orderProcessor');
const ftpUploader = require('./ftpUploader');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware pour parser le body en raw pour vérifier la signature HMAC
app.use('/webhooks/shopify', express.raw({ type: 'application/json' }));

// Middleware pour parser le JSON pour les autres routes
app.use(express.json());

/**
 * Vérifie la signature HMAC du webhook Shopify
 * @param {Buffer} data - Le body brut du webhook
 * @param {string} hmacHeader - Le header X-Shopify-Hmac-Sha256
 * @returns {boolean}
 */
function verifyShopifyWebhook(data, hmacHeader) {
  if (!process.env.SHOPIFY_WEBHOOK_SECRET) {
    console.warn('⚠️ SHOPIFY_WEBHOOK_SECRET non configuré - vérification HMAC désactivée');
    return true; // En développement, permettre sans vérification
  }

  const hash = crypto
    .createHmac('sha256', process.env.SHOPIFY_WEBHOOK_SECRET)
    .update(data, 'utf8')
    .digest('base64');

  return hash === hmacHeader;
}

/**
 * Route principale pour recevoir les webhooks Shopify
 */
app.post('/webhooks/shopify/orders-create', async (req, res) => {
  try {
    const hmacHeader = req.get('X-Shopify-Hmac-Sha256');
    const shopifyTopic = req.get('X-Shopify-Topic');
    const shopifyDomain = req.get('X-Shopify-Shop-Domain');

    console.log(`📬 Webhook reçu de ${shopifyDomain} - Topic: ${shopifyTopic}`);

    // Vérifier la signature HMAC
    if (!verifyShopifyWebhook(req.body, hmacHeader)) {
      console.error('❌ Signature HMAC invalide');
      return res.status(401).json({ error: 'Signature HMAC invalide' });
    }

    console.log('✅ Signature HMAC vérifiée');

    // Parser le JSON
    const orderData = JSON.parse(req.body.toString());

    console.log(`📦 Commande #${orderData.order_number || orderData.name} reçue`);

    // Traiter la commande et générer le fichier
    const result = await orderProcessor.processOrder(orderData);

    console.log(`✅ Fichier généré: ${result.filePath}`);

    if (result.ftp.success) {
      console.log(`✅ Fichier uploadé sur FTP: ${result.ftp.remotePath}`);
    } else if (!result.ftp.skipped) {
      console.log(`⚠️  Upload FTP échoué: ${result.ftp.message}`);
    }

    // Répondre rapidement à Shopify (important: répondre dans les 5 secondes)
    res.status(200).json({
      success: true,
      message: 'Webhook traité avec succès',
      file: result.filePath,
      ftp: result.ftp
    });

  } catch (error) {
    console.error('❌ Erreur lors du traitement du webhook:', error);

    // Toujours répondre 200 à Shopify pour éviter les retries
    // Mais logger l'erreur pour investigation
    res.status(200).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Route de santé pour vérifier que le serveur fonctionne
 */
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'Shopify Webhook Server'
  });
});

/**
 * Route racine
 */
app.get('/', (req, res) => {
  res.json({
    service: 'Shopify Webhook Server',
    version: '1.0.0',
    endpoints: {
      webhook: '/webhooks/shopify/orders-create',
      health: '/health',
      ftpTest: '/test-ftp'
    }
  });
});

/**
 * Route de test de connexion FTP
 */
app.get('/test-ftp', async (req, res) => {
  try {
    const result = await ftpUploader.testFTPConnection();
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Créer le répertoire de sortie s'il n'existe pas
const outputDir = process.env.OUTPUT_DIRECTORY || './orders';
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
  console.log(`📁 Répertoire créé: ${outputDir}`);
}

// Démarrer le serveur
app.listen(PORT, () => {
  console.log(`🚀 Serveur webhook Shopify démarré sur le port ${PORT}`);
  console.log(`📍 Endpoint webhook: http://localhost:${PORT}/webhooks/shopify/orders-create`);
  console.log(`📂 Fichiers de sortie: ${path.resolve(outputDir)}`);
  console.log(`🔐 Vérification HMAC: ${process.env.SHOPIFY_WEBHOOK_SECRET ? 'ACTIVÉE' : 'DÉSACTIVÉE'}`);
});

// Gestion propre de l'arrêt du serveur
process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM reçu, arrêt du serveur...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('🛑 SIGINT reçu, arrêt du serveur...');
  process.exit(0);
});
