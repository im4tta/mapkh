const fs = require('fs');
const { createCanvas, loadImage } = require('canvas');
const path = require('path');

async function createGuardMapIcon() {
  try {
    console.log('Starting guard-map icon creation...');

    // Load the original clean PNG
    const originalPath = path.join(__dirname, 'public', 'icons', 'original-decoded.png');
    const originalImage = await loadImage(originalPath);

    // Create canvas with the same dimensions
    const canvas = createCanvas(originalImage.width, originalImage.height);
    const ctx = canvas.getContext('2d');

    // Draw the original image first (this includes the guard shape)
    ctx.drawImage(originalImage, 0, 0);

    const W = originalImage.width;
    const H = originalImage.height;

    // Approximate guard interior bounds (based on typical placement)
    // These values are tuned to cover the inner panel of the shield
    const guardLeft = Math.round(W * 0.29);
    const guardTop = Math.round(H * 0.30);
    const guardWidth = Math.round(W * 0.26);
    const guardHeight = Math.round(H * 0.32);

    // Tick is usually in the lower-right quadrant of the guard interior
    const tickBoxX = Math.round(guardLeft + guardWidth * 0.52);
    const tickBoxY = Math.round(guardTop + guardHeight * 0.38);
    const tickBoxW = Math.round(guardWidth * 0.40);
    const tickBoxH = Math.round(guardHeight * 0.40);

    // Remove very white pixels in tick box (tick strokes are bright white)
    const imgData = ctx.getImageData(tickBoxX, tickBoxY, tickBoxW, tickBoxH);
    const data = imgData.data;
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const a = data[i + 3];
      // High brightness threshold to target the white tick only
      if (a > 10 && r > 230 && g > 230 && b > 230) {
        data[i + 3] = 0; // make transparent
      }
    }
    ctx.putImageData(imgData, tickBoxX, tickBoxY);

    // Draw a clean map line icon inside the guard interior
    const mapX = guardLeft + guardWidth * 0.12;
    const mapY = guardTop + guardHeight * 0.18;
    const mapW = guardWidth * 0.70;
    const mapH = guardHeight * 0.60;

    // Outline in blue to contrast the white interior
    ctx.strokeStyle = '#2563eb';
    ctx.lineWidth = Math.max(2, Math.round(W * 0.006));
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';

    // Folded map outline (three panels)
    ctx.beginPath();
    ctx.moveTo(mapX, mapY + mapH);                 // left bottom
    ctx.lineTo(mapX + mapW * 0.30, mapY + mapH * 0.10); // left top fold
    ctx.lineTo(mapX + mapW * 0.60, mapY + mapH * 0.90); // middle bottom
    ctx.lineTo(mapX + mapW, mapY + mapH * 0.20);        // right top fold
    ctx.lineTo(mapX + mapW, mapY + mapH);               // right bottom
    ctx.lineTo(mapX + mapW * 0.60, mapY + mapH * 0.10); // middle top
    ctx.lineTo(mapX + mapW * 0.30, mapY + mapH * 0.90); // left bottom fold
    ctx.lineTo(mapX, mapY + mapH * 0.20);               // left top
    ctx.closePath();
    ctx.stroke();

    // Inner fold lines
    ctx.beginPath();
    ctx.moveTo(mapX + mapW * 0.30, mapY + mapH * 0.10);
    ctx.lineTo(mapX + mapW * 0.30, mapY + mapH * 0.90);
    ctx.moveTo(mapX + mapW * 0.60, mapY + mapH * 0.10);
    ctx.lineTo(mapX + mapW * 0.60, mapY + mapH * 0.90);
    ctx.stroke();

    // Optional small location pin to indicate map
    const pinR = Math.min(mapW, mapH) * 0.06;
    const pinX = mapX + mapW * 0.50;
    const pinY = mapY + mapH * 0.55;
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.arc(pinX, pinY, pinR, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(pinX, pinY);
    ctx.lineTo(pinX, pinY + pinR * 1.2);
    ctx.strokeStyle = '#ef4444';
    ctx.stroke();

    // Convert canvas to PNG buffer
    const buffer = canvas.toBuffer('image/png');

    // Save the modified PNG
    const outputPath = path.join(__dirname, 'public', 'icons', 'icon-512x512.png');
    fs.writeFileSync(outputPath, buffer);
    console.log('✅ Updated icon-512x512.png');

    // Update the SVG file with the new base64 encoded PNG
    const base64Data = buffer.toString('base64');
    const svgPath = path.join(__dirname, 'public', 'icons', 'icon-512x512.svg');

    const svgContent = `<?xml version="1.0" encoding="UTF-8"?>\n<svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">\n  <image width="512" height="512" xlink:href="data:image/png;base64,${base64Data}"/>\n</svg>`;

    fs.writeFileSync(svgPath, svgContent);
    console.log('✅ Updated icon-512x512.svg');

    console.log('🎉 Guard-map icon creation completed successfully!');
    console.log('📍 The tick has been removed and replaced with a map icon inside the guard.');
  } catch (error) {
    console.error('❌ Error creating guard-map icon:', error);
    process.exit(1);
  }
}

createGuardMapIcon();