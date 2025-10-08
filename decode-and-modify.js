const fs = require('fs');
const { createCanvas, loadImage } = require('canvas');

async function decodeAndModifyIcon() {
  try {
    // Read the current SVG file
    const svgContent = fs.readFileSync('public/icons/icon-512x512.svg', 'utf8');
    
    // Extract the base64 data
    const base64Match = svgContent.match(/data:image\/png;base64,([^"]+)/);
    if (!base64Match) {
      throw new Error('No base64 PNG data found in SVG');
    }
    
    const base64Data = base64Match[1];
    
    // Decode and save the original PNG for reference
    const pngBuffer = Buffer.from(base64Data, 'base64');
    fs.writeFileSync('public/icons/original-decoded.png', pngBuffer);
    
    console.log('Original PNG decoded and saved as original-decoded.png');
    
    // Load the original image
    const originalImg = await loadImage(pngBuffer);
    
    // Create a new canvas with the same dimensions
    const canvas = createCanvas(originalImg.width, originalImg.height);
    const ctx = canvas.getContext('2d');
    
    // Draw the original image
    ctx.drawImage(originalImg, 0, 0);
    
    // Now we need to modify the guard/shield symbol to a map symbol
    // First, let's identify where the guard symbol is and replace it
    
    // Clear the area where the guard symbol is (approximate center-top area)
    // We'll need to analyze the image to find the exact location
    const centerX = originalImg.width / 2;
    const centerY = originalImg.height * 0.4; // Approximate location of guard symbol
    
    // Clear a rectangular area where the guard symbol is
    ctx.fillStyle = '#D6001C'; // Cambodia flag red background
    ctx.fillRect(centerX - 80, centerY - 60, 160, 120);
    
    // Draw a map symbol instead
    ctx.fillStyle = '#FFFFFF';
    ctx.strokeStyle = '#003DA5';
    ctx.lineWidth = 4;
    
    // Draw map rectangle
    ctx.fillRect(centerX - 70, centerY - 50, 140, 100);
    ctx.strokeRect(centerX - 70, centerY - 50, 140, 100);
    
    // Draw map grid lines
    ctx.strokeStyle = '#003DA5';
    ctx.lineWidth = 2;
    ctx.globalAlpha = 0.6;
    
    // Horizontal grid lines
    ctx.beginPath();
    ctx.moveTo(centerX - 60, centerY - 15);
    ctx.lineTo(centerX + 60, centerY - 15);
    ctx.moveTo(centerX - 60, centerY + 15);
    ctx.lineTo(centerX + 60, centerY + 15);
    ctx.stroke();
    
    // Vertical grid lines
    ctx.beginPath();
    ctx.moveTo(centerX - 35, centerY - 40);
    ctx.lineTo(centerX - 35, centerY + 40);
    ctx.moveTo(centerX, centerY - 40);
    ctx.lineTo(centerX, centerY + 40);
    ctx.moveTo(centerX + 35, centerY - 40);
    ctx.lineTo(centerX + 35, centerY + 40);
    ctx.stroke();
    
    ctx.globalAlpha = 1.0;
    
    // Draw a location pin on the map
    ctx.fillStyle = '#D6001C';
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 2;
    
    const pinX = centerX + 20;
    const pinY = centerY - 10;
    
    // Pin shape
    ctx.beginPath();
    ctx.arc(pinX, pinY, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    
    // Pin dot
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(pinX, pinY, 5, 0, Math.PI * 2);
    ctx.fill();
    
    // Convert the modified canvas to PNG buffer
    const modifiedBuffer = canvas.toBuffer('image/png');
    
    // Convert to base64
    const newBase64 = modifiedBuffer.toString('base64');
    
    // Update the SVG content with the new base64 data
    const newSvgContent = svgContent.replace(
      /data:image\/png;base64,[^"]+/,
      `data:image/png;base64,${newBase64}`
    );
    
    // Write the updated SVG
    fs.writeFileSync('public/icons/icon-512x512.svg', newSvgContent);
    
    // Also save the modified PNG for reference
    fs.writeFileSync('public/icons/modified-icon.png', modifiedBuffer);
    
    console.log('Icon successfully modified with map symbol!');
    console.log('Updated SVG: public/icons/icon-512x512.svg');
    console.log('Modified PNG reference: public/icons/modified-icon.png');
    
  } catch (error) {
    console.error('Error modifying icon:', error);
  }
}

decodeAndModifyIcon();