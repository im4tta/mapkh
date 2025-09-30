const fs = require('fs');
const { createCanvas } = require('canvas');

// Create PWA icon with Khmer flag horizontal stripes and 3D guard symbol (JPG format)
function createPWAIconJPG(size, filename) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');
  
  // Colors
  const khmerRed = '#DE0000';
  const khmerBlue = '#032EA1';
  const khmerWhite = '#FFFFFF';
  
  // For PWA icons, we don't use rounded corners (unlike iOS icons)
  // Khmer flag horizontal stripes (blue-red-blue)
  const stripeHeight = size / 3;
  
  // Top blue stripe
  ctx.fillStyle = khmerBlue;
  ctx.fillRect(0, 0, size, stripeHeight);
  
  // Middle red stripe
  ctx.fillStyle = khmerRed;
  ctx.fillRect(0, stripeHeight, size, stripeHeight);
  
  // Bottom blue stripe
  ctx.fillStyle = khmerBlue;
  ctx.fillRect(stripeHeight * 2, 0, size, stripeHeight);
  
  // Draw 3D guard shield symbol in center
  const centerX = size / 2;
  const centerY = size / 2;
  const shieldSize = size * 0.3;
  
  // Create 3D shadow effect for shield
  const shadowOffset = size * 0.008;
  ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
  ctx.beginPath();
  ctx.moveTo(centerX + shadowOffset, centerY - shieldSize / 2 + shadowOffset);
  ctx.lineTo(centerX + shieldSize / 3 + shadowOffset, centerY - shieldSize / 2 + shadowOffset);
  ctx.lineTo(centerX + shieldSize / 3 + shadowOffset, centerY + shieldSize / 6 + shadowOffset);
  ctx.lineTo(centerX + shadowOffset, centerY + shieldSize / 2 + shadowOffset);
  ctx.lineTo(centerX - shieldSize / 3 + shadowOffset, centerY + shieldSize / 6 + shadowOffset);
  ctx.lineTo(centerX - shieldSize / 3 + shadowOffset, centerY - shieldSize / 2 + shadowOffset);
  ctx.closePath();
  ctx.fill();
  
  // Shield background (white with slight gradient for 3D effect)
  const gradient = ctx.createLinearGradient(centerX - shieldSize/3, centerY - shieldSize/2, centerX + shieldSize/3, centerY + shieldSize/2);
  gradient.addColorStop(0, '#FFFFFF');
  gradient.addColorStop(0.5, '#F8F8F8');
  gradient.addColorStop(1, '#E8E8E8');
  
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.moveTo(centerX, centerY - shieldSize / 2);
  ctx.lineTo(centerX + shieldSize / 3, centerY - shieldSize / 2);
  ctx.lineTo(centerX + shieldSize / 3, centerY + shieldSize / 6);
  ctx.lineTo(centerX, centerY + shieldSize / 2);
  ctx.lineTo(centerX - shieldSize / 3, centerY + shieldSize / 6);
  ctx.lineTo(centerX - shieldSize / 3, centerY - shieldSize / 2);
  ctx.closePath();
  ctx.fill();
  
  // Add subtle border for 3D effect
  ctx.strokeStyle = '#CCCCCC';
  ctx.lineWidth = size * 0.004;
  ctx.stroke();
  
  // Add blue checkmark symbol in the shield with 3D effect
  ctx.lineWidth = size * 0.018;
  ctx.strokeStyle = khmerBlue;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  
  // Draw checkmark with shadow
  const checkSize = shieldSize * 0.45;
  
  // Checkmark shadow
  ctx.strokeStyle = 'rgba(3, 46, 161, 0.3)';
  ctx.lineWidth = size * 0.020;
  ctx.beginPath();
  ctx.moveTo(centerX - checkSize * 0.3 + shadowOffset/2, centerY + shadowOffset/2);
  ctx.lineTo(centerX - checkSize * 0.1 + shadowOffset/2, centerY + checkSize * 0.2 + shadowOffset/2);
  ctx.lineTo(centerX + checkSize * 0.3 + shadowOffset/2, centerY - checkSize * 0.2 + shadowOffset/2);
  ctx.stroke();
  
  // Main checkmark
  ctx.strokeStyle = khmerBlue;
  ctx.lineWidth = size * 0.018;
  ctx.beginPath();
  ctx.moveTo(centerX - checkSize * 0.3, centerY);
  ctx.lineTo(centerX - checkSize * 0.1, centerY + checkSize * 0.2);
  ctx.lineTo(centerX + checkSize * 0.3, centerY - checkSize * 0.2);
  ctx.stroke();
  
  // Save as JPG with high quality
  const buffer = canvas.toBuffer('image/jpeg', { quality: 0.95 });
  fs.writeFileSync(`public/icons/${filename}`, buffer);
  console.log(`Created icons/${filename} (${size}x${size}) with Khmer flag colors and Guard symbol`);
}

// Create all required PWA icon sizes in JPG format
const sizes = [
  { size: 96, name: 'icon-96x96.jpg' },
  { size: 128, name: 'icon-128x128.jpg' },
  { size: 144, name: 'icon-144x144.jpg' },
  { size: 152, name: 'icon-152x152.jpg' },
  { size: 192, name: 'icon-192x192.jpg' },
  { size: 256, name: 'icon-256x256.jpg' },
  { size: 384, name: 'icon-384x384.jpg' },
  { size: 512, name: 'icon-512x512.jpg' }
];

console.log('Creating new PWA JPG icons...');
sizes.forEach(({ size, name }) => {
  createPWAIconJPG(size, name);
});
console.log('All PWA JPG icons created successfully!');