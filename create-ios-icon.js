const fs = require('fs');
const { createCanvas } = require('canvas');

// Create iOS icon with red center, blue outside, rounded corners
function createIOSIcon(size, filename) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');
  
  // Colors
  const khmerRed = '#DE0000';
  const khmerBlue = '#032EA1';
  const khmerWhite = '#FFFFFF';
  
  // Create rounded rectangle background
  const cornerRadius = size * 0.15; // 15% corner radius for rounded corners
  
  // Blue outside background with rounded corners
  ctx.fillStyle = khmerBlue;
  ctx.beginPath();
  ctx.roundRect(0, 0, size, size, cornerRadius);
  ctx.fill();
  
  // Red center circle
  const centerX = size / 2;
  const centerY = size / 2;
  const centerRadius = size * 0.35; // 35% of size for center circle
  
  ctx.fillStyle = khmerRed;
  ctx.beginPath();
  ctx.arc(centerX, centerY, centerRadius, 0, 2 * Math.PI);
  ctx.fill();
  
  // Draw white shield symbol in center
  const shieldSize = size * 0.25;
  
  // Shield background (white)
  ctx.fillStyle = khmerWhite;
  ctx.beginPath();
  ctx.moveTo(centerX, centerY - shieldSize / 2);
  ctx.lineTo(centerX + shieldSize / 3, centerY - shieldSize / 2);
  ctx.lineTo(centerX + shieldSize / 3, centerY + shieldSize / 6);
  ctx.lineTo(centerX, centerY + shieldSize / 2);
  ctx.lineTo(centerX - shieldSize / 3, centerY + shieldSize / 6);
  ctx.lineTo(centerX - shieldSize / 3, centerY - shieldSize / 2);
  ctx.closePath();
  ctx.fill();
  
  // Add blue checkmark symbol in the shield
  ctx.lineWidth = size * 0.012;
  ctx.strokeStyle = khmerBlue;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  
  // Draw checkmark
  const checkSize = shieldSize * 0.4;
  ctx.beginPath();
  ctx.moveTo(centerX - checkSize * 0.3, centerY);
  ctx.lineTo(centerX - checkSize * 0.1, centerY + checkSize * 0.2);
  ctx.lineTo(centerX + checkSize * 0.3, centerY - checkSize * 0.2);
  ctx.stroke();
  
  // Save as PNG with no transparency
  const buffer = canvas.toBuffer('image/png', { compressionLevel: 6, filters: canvas.PNG_FILTER_NONE });
  fs.writeFileSync(`public/${filename}`, buffer);
  console.log(`Created ${filename} (${size}x${size}) with Khmer flag colors and Guard symbol`);
}

// Create all required iOS icon sizes
const sizes = [
  { size: 180, name: 'apple-touch-icon.png' },
  { size: 180, name: 'apple-touch-icon-180x180.png' },
  { size: 167, name: 'apple-touch-icon-167x167.png' },
  { size: 152, name: 'apple-touch-icon-152x152.png' },
  { size: 120, name: 'apple-touch-icon-120x120.png' }
];

console.log('Creating new iOS-optimized PNG icons...');
sizes.forEach(({ size, name }) => {
  createIOSIcon(size, name);
});
console.log('All iOS icons created successfully!');