const fs = require('fs');
const { createCanvas, loadImage } = require('canvas');

async function convertSvgToPng() {
  try {
    // Read the SVG file
    const svgData = fs.readFileSync('public/icons/icon-512x512-modified.svg', 'utf8');
    
    // Create a canvas
    const canvas = createCanvas(512, 512);
    const ctx = canvas.getContext('2d');
    
    // Create data URL from SVG
    const svgDataUrl = 'data:image/svg+xml;base64,' + Buffer.from(svgData).toString('base64');
    
    // Load and draw the image
    const img = await loadImage(svgDataUrl);
    ctx.drawImage(img, 0, 0, 512, 512);
    
    // Convert to PNG buffer
    const buffer = canvas.toBuffer('image/png');
    
    // Write to file
    fs.writeFileSync('public/icons/icon-512x512-new.png', buffer);
    
    console.log('PNG created successfully at public/icons/icon-512x512-new.png');
  } catch (error) {
    console.error('Error converting SVG to PNG:', error);
  }
}

convertSvgToPng();