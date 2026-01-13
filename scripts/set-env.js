#!/usr/bin/env node

/**
 * Script para generar archivos de environment desde variables de entorno
 * Uso: node scripts/set-env.js
 * 
 * Variables de entorno requeridas:
 * - FIREBASE_API_KEY
 * - FIREBASE_AUTH_DOMAIN
 * - FIREBASE_PROJECT_ID
 * - FIREBASE_STORAGE_BUCKET
 * - FIREBASE_MESSAGING_SENDER_ID
 * - FIREBASE_APP_ID
 * - AI_PROXY_URL (opcional)
 */

const fs = require('fs');
const path = require('path');

// Leer archivo .env si existe
const dotEnvPath = path.join(__dirname, '../.env');
if (fs.existsSync(dotEnvPath)) {
  const envContent = fs.readFileSync(dotEnvPath, 'utf8');
  envContent.split('\n').forEach(line => {
    line = line.trim();
    if (line && !line.startsWith('#')) {
      const [key, ...valueParts] = line.split('=');
      const value = valueParts.join('=').trim();
      if (key && value) {
        process.env[key] = value;
      }
    }
  });
  console.log('📁 Archivo .env cargado');
}

// Leer variables de entorno
const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY || '',
  authDomain: process.env.FIREBASE_AUTH_DOMAIN || '',
  projectId: process.env.FIREBASE_PROJECT_ID || '',
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || '',
  appId: process.env.FIREBASE_APP_ID || ''
};

const aiProxyUrl = process.env.AI_PROXY_URL || '';

// Determinar si es producción
const isProduction = process.env.NODE_ENV === 'production' || process.argv.includes('--prod');

// Generar contenido del archivo
const envContent = `// Este archivo es generado automáticamente por scripts/set-env.js
// NO editar manualmente - los cambios se sobrescribirán

export const environment = {
  production: ${isProduction},
  firebase: {
    apiKey: '${firebaseConfig.apiKey}',
    authDomain: '${firebaseConfig.authDomain}',
    projectId: '${firebaseConfig.projectId}',
    storageBucket: '${firebaseConfig.storageBucket}',
    messagingSenderId: '${firebaseConfig.messagingSenderId}',
    appId: '${firebaseConfig.appId}'
  },
  aiProxyUrl: '${aiProxyUrl}'
};
`;

// Determinar ruta del archivo
const envPath = isProduction
  ? path.join(__dirname, '../src/environments/environment.prod.ts')
  : path.join(__dirname, '../src/environments/environment.ts');

// Escribir archivo
try {
  fs.writeFileSync(envPath, envContent, 'utf8');
  console.log(`✅ Environment file generated: ${envPath}`);
  console.log(`   Production: ${isProduction}`);
  console.log(`   Firebase Project: ${firebaseConfig.projectId || 'NOT SET'}`);
  console.log(`   AI Proxy: ${aiProxyUrl || 'NOT SET (using mock)'}`);
} catch (error) {
  console.error('❌ Error generating environment file:', error);
  process.exit(1);
}
