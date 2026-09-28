import fs from 'fs';
import path from 'path';

const source = 'C:/Users/Forgeindiaconnect/.gemini/antigravity-ide/brain/a676ced8-bbcc-45dd-b602-ab05875a55ea/college_hero_campus_bg_1790596775073.jpg';
const destPublic = path.resolve('public/campus_hero_bg.jpg');
const destAssets = path.resolve('src/assets/campus_hero_bg.jpg');

try {
  if (fs.existsSync(source)) {
    fs.copyFileSync(source, destPublic);
    fs.copyFileSync(source, destAssets);
    console.log('Successfully copied campus hero background image to public and src/assets!');
  } else {
    console.error('Source file does not exist:', source);
  }
} catch (e) {
  console.error('Error copying file:', e.message);
}
