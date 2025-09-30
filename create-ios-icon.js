const fs = require('fs');
const { createCanvas } = require('canvas');

// Create iOS icon with Khmer flag colors and Guard symbol
function createIOSIcon(size, filename) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');
  
  // Khmer flag colors
  const khmerRed = '#DE0000';
  const khmerBlue = '#032EA1';
  const khmerWhite = '#FFFFFF';
  
  // Create Khmer flag background with horizontal stripes
  const stripeHeight = size / 3;
  
  // Top red stripe
  ctx.fillStyle = khmerRed;
  ctx.fillRect(0, 0, size, stripeHeight);
  
  // Middle blue stripe
  ctx.fillStyle = khmerBlue;
  ctx.fillRect(0, stripeHeight, size, stripeHeight);
  
  // Bottom red stripe
  ctx.fillStyle = khmerRed;
  ctx.fillRect(0, stripeHeight * 2, size, stripeHeight);
  
  // Draw Guard shield symbol in center
  const centerX = size / 2;
  const centerY = size / 2;
  const shieldSize = size * 0.4;
  
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
  
  // Shield border (dark blue)
  ctx.strokeStyle = khmerBlue;
  ctx.lineWidth = size * 0.01;
  ctx.stroke();
  
  // Add checkmark symbol in the shield
  ctx.fillStyle = khmerBlue;
  ctx.lineWidth = size * 0.015;
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