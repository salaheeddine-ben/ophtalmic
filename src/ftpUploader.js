const ftp = require('basic-ftp');
const path = require('path');
const fs = require('fs');

/**
 * Upload un fichier vers un serveur FTP
 * @param {string} localFilePath - Chemin local du fichier à uploader
 * @returns {Promise<Object>} - Résultat de l'upload
 */
async function uploadToFTP(localFilePath) {
  // Vérifier si l'upload FTP est activé
  if (!isFTPEnabled()) {
    console.log('ℹ️  Upload FTP désactivé (configuration manquante)');
    return {
      success: false,
      skipped: true,
      message: 'Upload FTP désactivé'
    };
  }

  const client = new ftp.Client();
  client.ftp.verbose = process.env.FTP_DEBUG === 'true';

  try {
    console.log(`📤 Connexion au serveur FTP ${process.env.FTP_HOST}:${process.env.FTP_PORT || 21}...`);

    // Connexion au serveur FTP
    await client.access({
      host: process.env.FTP_HOST,
      port: parseInt(process.env.FTP_PORT || '21'),
      user: process.env.FTP_USER,
      password: process.env.FTP_PASSWORD,
      secure: process.env.FTP_SECURE === 'true' // FTPS si activé
    });

    console.log('✅ Connecté au serveur FTP');

    // Changer vers le répertoire distant si spécifié
    if (process.env.FTP_REMOTE_DIR) {
      console.log(`📁 Navigation vers ${process.env.FTP_REMOTE_DIR}...`);

      // Créer le répertoire s'il n'existe pas (ensureDir crée récursivement)
      await client.ensureDir(process.env.FTP_REMOTE_DIR);
      await client.cd(process.env.FTP_REMOTE_DIR);

      console.log(`✅ Répertoire: ${process.env.FTP_REMOTE_DIR}`);
    }

    // Nom du fichier distant (peut être personnalisé)
    const fileName = path.basename(localFilePath);
    const remoteFileName = process.env.FTP_FILE_PREFIX
      ? `${process.env.FTP_FILE_PREFIX}${fileName}`
      : fileName;

    console.log(`📤 Upload de ${fileName} vers ${remoteFileName}...`);

    // Upload du fichier
    await client.uploadFrom(localFilePath, remoteFileName);

    console.log(`✅ Fichier uploadé avec succès: ${remoteFileName}`);

    // Option: supprimer le fichier local après upload
    if (process.env.FTP_DELETE_AFTER_UPLOAD === 'true') {
      fs.unlinkSync(localFilePath);
      console.log(`🗑️  Fichier local supprimé: ${localFilePath}`);
    }

    return {
      success: true,
      fileName: remoteFileName,
      remotePath: process.env.FTP_REMOTE_DIR
        ? path.join(process.env.FTP_REMOTE_DIR, remoteFileName)
        : remoteFileName,
      message: 'Upload FTP réussi'
    };

  } catch (error) {
    console.error('❌ Erreur lors de l\'upload FTP:', error.message);

    return {
      success: false,
      error: error.message,
      message: 'Échec de l\'upload FTP'
    };

  } finally {
    // Toujours fermer la connexion
    client.close();
  }
}

/**
 * Vérifie si la configuration FTP est complète
 * @returns {boolean}
 */
function isFTPEnabled() {
  return !!(
    process.env.FTP_HOST &&
    process.env.FTP_USER &&
    process.env.FTP_PASSWORD
  );
}

/**
 * Teste la connexion FTP
 * @returns {Promise<Object>}
 */
async function testFTPConnection() {
  if (!isFTPEnabled()) {
    return {
      success: false,
      message: 'Configuration FTP incomplète'
    };
  }

  const client = new ftp.Client();
  client.ftp.verbose = true;

  try {
    console.log('🧪 Test de connexion FTP...');

    await client.access({
      host: process.env.FTP_HOST,
      port: parseInt(process.env.FTP_PORT || '21'),
      user: process.env.FTP_USER,
      password: process.env.FTP_PASSWORD,
      secure: process.env.FTP_SECURE === 'true'
    });

    console.log('✅ Connexion FTP réussie');

    // Tester l'accès au répertoire
    if (process.env.FTP_REMOTE_DIR) {
      await client.ensureDir(process.env.FTP_REMOTE_DIR);
      console.log(`✅ Accès au répertoire ${process.env.FTP_REMOTE_DIR} réussi`);
    }

    // Lister les fichiers dans le répertoire courant
    const list = await client.list();
    console.log(`📁 Nombre de fichiers dans le répertoire: ${list.length}`);

    return {
      success: true,
      message: 'Connexion FTP réussie',
      fileCount: list.length
    };

  } catch (error) {
    console.error('❌ Échec du test FTP:', error.message);
    return {
      success: false,
      error: error.message,
      message: 'Échec de la connexion FTP'
    };

  } finally {
    client.close();
  }
}

module.exports = {
  uploadToFTP,
  isFTPEnabled,
  testFTPConnection
};
