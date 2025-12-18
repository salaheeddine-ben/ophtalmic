const fs = require('fs');
const path = require('path');
const moment = require('moment');
const ftpUploader = require('./ftpUploader');

/**
 * Traite une commande Shopify et génère un fichier texte pour Sage X3
 * @param {Object} order - Données de la commande Shopify
 * @returns {Promise<Object>} - Résultat du traitement avec info FTP
 */
async function processOrder(order) {
  const orderText = formatOrderForSageX3(order);
  const filePath = saveOrderToFile(order, orderText);

  // Uploader le fichier vers FTP si configuré
  const ftpResult = await ftpUploader.uploadToFTP(filePath);

  return {
    filePath,
    ftp: ftpResult
  };
}

/**
 * Formate les données de commande selon le format Sage X3
 * @param {Object} order - Données de la commande Shopify
 * @returns {string} - Texte formaté
 */
function formatOrderForSageX3(order) {
  const lines = [];

  // ===== EN-TÊTE DE COMMANDE =====
  lines.push('Entête de commande');
  lines.push('');

  // Référence de commande (numéro de commande Shopify)
  const orderReference = order.order_number || order.name || order.id;
  lines.push(`Référence de commande: ${orderReference}`);

  // Référence client (fixe depuis .env)
  const clientReference = process.env.SAGE_CLIENT_REFERENCE || '0147907400';
  lines.push(`Référence client: "${clientReference}"`);

  // Date de commande (format ISO converti en format FR)
  const orderDate = moment(order.created_at).format('DD/MM/YYYY HH:mm:ss');
  lines.push(`Date de commande: ${orderDate}`);

  // Référence customer (ID client Shopify)
  const customerId = order.customer?.id || 'N/A';
  lines.push(`Référence customer: ${customerId}`);

  // Adresse email
  const email = order.email || order.customer?.email || 'N/A';
  lines.push(`Adresse email: ${email}`);

  // Numéro de téléphone
  const phone = order.customer?.phone ||
                order.billing_address?.phone ||
                order.shipping_address?.phone ||
                'N/A';
  lines.push(`Numéro de téléphone: ${phone}`);

  // Nom du client
  const lastName = order.customer?.last_name ||
                   order.billing_address?.last_name ||
                   'N/A';
  lines.push(`Nom du client: ${lastName}`);

  // Prénom du client
  const firstName = order.customer?.first_name ||
                    order.billing_address?.first_name ||
                    'N/A';
  lines.push(`Prénom du client: ${firstName}`);

  // Adresse de livraison (format complet)
  const shippingAddress = formatAddress(order.shipping_address);
  lines.push(`Adresse de livraison: ${shippingAddress}`);

  // Frais de port
  const shippingCost = calculateShippingCost(order.shipping_lines);
  lines.push(`Frais de ports: ${shippingCost}`);

  // Montant TTC (total avec taxes)
  const totalTTC = parseFloat(order.total_price || 0).toFixed(2);
  lines.push(`Montant TTC: ${totalTTC}`);

  // Numéro de transaction CB (depuis payment_details ou transactions)
  const transactionNumber = extractTransactionNumber(order);
  lines.push(`Numéro de la transaction CB: ${transactionNumber}`);

  // Pourcentage de la remise
  const discountPercentage = calculateDiscountPercentage(order);
  lines.push(`Pourcentage de la remise: ${discountPercentage}%`);

  // Montant de la TVA
  const tvaAmount = parseFloat(order.total_tax || 0).toFixed(2);
  lines.push(`Montant de la TVA: ${tvaAmount}`);

  lines.push('');

  // ===== LIGNES DE COMMANDE =====
  lines.push('Ligne de commande');
  lines.push('');

  // Traiter chaque article de la commande
  if (order.line_items && Array.isArray(order.line_items)) {
    order.line_items.forEach((item, index) => {
      // Référence Article (SKU)
      const sku = item.sku || item.variant_id || `ITEM-${index + 1}`;
      lines.push(`Référence Article: ${sku}`);

      // Désignation de l'article
      const designation = item.title || item.name || 'Article sans nom';
      lines.push(`Désignation de l'article: ${designation}`);

      // Quantité
      const quantity = item.quantity || 1;
      lines.push(`Qte: ${quantity}`);

      // Prix unitaire (optionnel, peut être utile)
      const unitPrice = parseFloat(item.price || 0).toFixed(2);
      lines.push(`Prix unitaire: ${unitPrice}`);

      lines.push('');
    });
  }

  // ===== INFORMATIONS SUPPLÉMENTAIRES =====
  lines.push('--- Informations supplémentaires ---');

  // Statut financier
  lines.push(`Statut financier: ${order.financial_status || 'N/A'}`);

  // Statut de fulfillment
  lines.push(`Statut de fulfillment: ${order.fulfillment_status || 'non traité'}`);

  // Devise
  lines.push(`Devise: ${order.currency || 'EUR'}`);

  // Note de commande (si présente)
  if (order.note) {
    lines.push(`Note: ${order.note}`);
  }

  lines.push('');
  lines.push(`--- Fichier généré le ${moment().format('DD/MM/YYYY HH:mm:ss')} ---`);

  return lines.join('\n');
}

/**
 * Formate une adresse en une seule ligne
 */
function formatAddress(address) {
  if (!address) return 'N/A';

  const parts = [
    address.address1,
    address.address2,
    address.zip,
    address.city,
    address.province,
    address.country
  ].filter(Boolean); // Retire les valeurs null/undefined

  return parts.join(', ');
}

/**
 * Calcule le coût total des frais de port
 */
function calculateShippingCost(shippingLines) {
  if (!shippingLines || !Array.isArray(shippingLines)) return '0.00';

  const total = shippingLines.reduce((sum, line) => {
    return sum + parseFloat(line.price || 0);
  }, 0);

  return total.toFixed(2);
}

/**
 * Extrait le numéro de transaction de paiement
 */
function extractTransactionNumber(order) {
  // Essayer différentes sources
  if (order.payment_details?.credit_card_number) {
    return order.payment_details.credit_card_number;
  }

  if (order.transactions && Array.isArray(order.transactions) && order.transactions.length > 0) {
    const transaction = order.transactions[0];
    return transaction.authorization || transaction.id || 'N/A';
  }

  if (order.checkout_token) {
    return order.checkout_token;
  }

  return 'N/A';
}

/**
 * Calcule le pourcentage de remise
 */
function calculateDiscountPercentage(order) {
  const subtotal = parseFloat(order.subtotal_price || order.total_line_items_price || 0);
  const totalDiscount = parseFloat(order.total_discounts || 0);

  if (subtotal === 0 || totalDiscount === 0) return '0.00';

  const percentage = (totalDiscount / subtotal) * 100;
  return percentage.toFixed(2);
}

/**
 * Sauvegarde le texte de commande dans un fichier
 */
function saveOrderToFile(order, orderText) {
  const outputDir = process.env.OUTPUT_DIRECTORY || './orders';

  // Créer le répertoire s'il n'existe pas
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Générer un nom de fichier unique
  const timestamp = moment().format('YYYYMMDD_HHmmss');
  const orderNumber = order.order_number || order.name || order.id;
  const fileName = `order_${orderNumber}_${timestamp}.txt`;
  const filePath = path.join(outputDir, fileName);

  // Écrire le fichier
  fs.writeFileSync(filePath, orderText, 'utf8');

  return filePath;
}

module.exports = {
  processOrder,
  formatOrderForSageX3
};
