import https from 'https';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const modelsDir = path.join(__dirname, '../public/models');

const MODEL_BASE_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model/';

const modelFiles = [
  'tiny_face_detector_model-weights_manifest.json',
  'tiny_face_detector_model-shard1',
  'face_expression_model-weights_manifest.json',
  'face_expression_model-shard1',
];

function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    https.get(url, (response) => {
      response.pipe(file);
      file.on('finish', () => {
        file.close();
        resolve();
      });
    }).on('error', (err) => {
      fs.unlink(dest, () => {});
      reject(err);
    });
  });
}

async function downloadModels() {
  if (!fs.existsSync(modelsDir)) {
    fs.mkdirSync(modelsDir, { recursive: true });
  }

  console.log('Downloading face-api models...');
  
  for (const file of modelFiles) {
    const url = MODEL_BASE_URL + file;
    const dest = path.join(modelsDir, file);
    console.log(`  Downloading ${file}...`);
    try {
      await downloadFile(url, dest);
      console.log(`  ✓ ${file}`);
    } catch (err) {
      console.log(`  ✗ Failed to download ${file}: ${err.message}`);
    }
  }

  console.log('Done!');
}

downloadModels().catch(console.error);
