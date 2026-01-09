const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const SVG_PATH = path.join(__dirname, '../assets/icon.svg');
const OUTPUT_DIR = path.join(__dirname, '../assets/images');

const ICONS = [
  { name: 'icon.png', size: 1024 },
  { name: 'favicon.png', size: 48 },
  { name: 'splash-icon.png', size: 288 },
  { name: 'android-icon-foreground.png', size: 432 },
];

async function generateIcons() {
  const svgBuffer = fs.readFileSync(SVG_PATH);

  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  for (const icon of ICONS) {
    const outputPath = path.join(OUTPUT_DIR, icon.name);
    console.log(`Generating ${icon.name} (${icon.size}x${icon.size})...`);

    await sharp(svgBuffer)
      .resize(icon.size, icon.size, {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      })
      .png()
      .toFile(outputPath);

    console.log(`Created: ${outputPath}`);
  }

  // Generate Android adaptive icon background (solid color from app.json)
  const backgroundPath = path.join(OUTPUT_DIR, 'android-icon-background.png');
  console.log('Generating android-icon-background.png (432x432)...');
  await sharp({
    create: {
      width: 432,
      height: 432,
      channels: 4,
      background: { r: 230, g: 244, b: 254, alpha: 1 }, // #E6F4FE
    },
  })
    .png()
    .toFile(backgroundPath);
  console.log(`Created: ${backgroundPath}`);

  // Generate Android monochrome icon (grayscale version)
  const monochromePath = path.join(OUTPUT_DIR, 'android-icon-monochrome.png');
  console.log('Generating android-icon-monochrome.png (432x432)...');
  await sharp(svgBuffer)
    .resize(432, 432, {
      fit: 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .grayscale()
    .png()
    .toFile(monochromePath);
  console.log(`Created: ${monochromePath}`);

  console.log('\nAll icons generated successfully!');
}

generateIcons().catch(console.error);
