import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function testImports() {
  console.log('Testing server.js imports...');
  try {
    await import('./server.js');
    console.log('✅ server.js loaded successfully!');
  } catch (err) {
    console.error('❌ Error importing:', err);
  }
}

testImports();
