/* eslint-disable no-undef */
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const SVG_PATH = path.join(__dirname, '../assets/icon.svg');
const OUTPUT_DIR = path.join(__dirname, '../assets/images');

// Background color from icon.svg (#fafdff)
const BACKGROUND_COLOR = { r: 250, g: 253, b: 255, alpha: 1 };

// Default crop padding to remove from SVG (out of 1000px render)
const DEFAULT_CROP_PADDING = 120;

const ICONS = [
	{ name: 'icon.png', size: 1024 },
	{ name: 'icon-rounded.png', size: 256, rounded: true },
	{ name: 'favicon.png', size: 48, rounded: true, cropPadding: 180 },
	{ name: 'splash-icon.png', size: 512 },
	{ name: 'android-icon-foreground.png', size: 432 },
	{ name: 'android-icon-background.png', size: 432, solidBackground: true },
	{ name: 'android-icon-monochrome.png', size: 432, monochrome: true },
];

async function generateIcons() {
	const svgBuffer = fs.readFileSync(SVG_PATH);

	if (!fs.existsSync(OUTPUT_DIR)) {
		fs.mkdirSync(OUTPUT_DIR, { recursive: true });
	}

	for (const icon of ICONS) {
		const outputPath = path.join(OUTPUT_DIR, icon.name);
		console.log(`Generating ${icon.name} (${icon.size}x${icon.size})...`);

		let pipeline;

		if (icon.solidBackground) {
			pipeline = sharp({
				create: {
					width: icon.size,
					height: icon.size,
					channels: 4,
					background: BACKGROUND_COLOR,
				},
			});
		} else if (icon.monochrome) {
			// Create white silhouette with alpha for Android themed icons
			const resized = await sharp(svgBuffer)
				.resize(icon.size, icon.size, {
					fit: 'contain',
					background: { r: 0, g: 0, b: 0, alpha: 0 },
				})
				.ensureAlpha()
				.raw()
				.toBuffer({ resolveWithObject: true });

			const { data, info } = resized;
			const pixels = Buffer.alloc(data.length);

			for (let i = 0; i < data.length; i += 4) {
				const alpha = data[i + 3];
				// White pixel with original alpha
				pixels[i] = 255;
				pixels[i + 1] = 255;
				pixels[i + 2] = 255;
				pixels[i + 3] = alpha;
			}

			pipeline = sharp(pixels, {
				raw: { width: info.width, height: info.height, channels: 4 },
			});
		} else if (icon.rounded || icon.cropPadding !== undefined) {
			// Crop out the padding from the SVG
			const roundedCorners = icon.rounded
				? Buffer.from(
						`<svg><circle cx="${icon.size / 2}" cy="${icon.size / 2}" r="${icon.size / 2}"/></svg>`
					)
				: null;

			// First render at higher resolution, then crop the content area
			const fullSize = 1000;
			const cropPadding = icon.cropPadding ?? DEFAULT_CROP_PADDING;
			const cropSize = fullSize - cropPadding * 2;

			const croppedBuffer = await sharp(svgBuffer)
				.resize(fullSize, fullSize, {
					fit: 'contain',
					background: { r: 0, g: 0, b: 0, alpha: 0 },
				})
				.extract({
					left: cropPadding,
					top: cropPadding,
					width: cropSize,
					height: cropSize,
				})
				.toBuffer();

			pipeline = sharp(croppedBuffer).resize(icon.size, icon.size);

			if (roundedCorners) {
				pipeline = pipeline.flatten({ background: BACKGROUND_COLOR }).composite([
					{
						input: roundedCorners,
						blend: 'dest-in',
					},
				]);
			}
		} else {
			pipeline = sharp(svgBuffer).resize(icon.size, icon.size, {
				fit: 'contain',
				background: { r: 0, g: 0, b: 0, alpha: 0 },
			});
		}

		await pipeline.png().toFile(outputPath);
		console.log(`  Created: ${outputPath}`);
	}

	console.log('\nAll icons generated successfully!');
}

generateIcons().catch(console.error);
