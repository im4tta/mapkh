const fs = require('fs');
const { createCanvas, loadImage } = require('canvas');

async function createFinalMapIcon() {
    try {
        const originalImagePath = 'D:/META/MapKH/MapCorrectKH-4.0/public/icons/original-decoded.png';
        const outputImagePath = 'D:/META/MapKH/MapCorrectKH-4.0/public/icon-512x512.png';
        const outputSvgPath = 'D:/META/MapKH/MapCorrectKH-4.0/public/icon-512x512.svg';

        // Load the original image
        const image = await loadImage(originalImagePath);
        const { width, height } = image;

        // Create a canvas and draw the original image
        const canvas = createCanvas(width, height);
        const ctx = canvas.getContext('2d');
        ctx.drawImage(image, 0, 0);

        // Define the green color of the tick to be removed
        const tickColor = [118, 202, 4, 255]; // R, G, B, A
        const colorThreshold = 50;

        // Get image data to manipulate pixels
        const imageData = ctx.getImageData(0, 0, width, height);
        const data = imageData.data;

        // Iterate through pixels and remove the tick
        for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];

            const colorDistance = Math.sqrt(
                Math.pow(r - tickColor[0], 2) +
                Math.pow(g - tickColor[1], 2) +
                Math.pow(b - tickColor[2], 2)
            );

            if (colorDistance < colorThreshold) {
                // Set pixel to transparent
                data[i + 3] = 0;
            }
        }
        ctx.putImageData(imageData, 0, 0);

        // Define the map icon properties
        const mapRect = {
            x: width * 0.35,
            y: height * 0.4,
            w: width * 0.3,
            h: height * 0.25,
            borderColor: '#FFFFFF',
            borderWidth: 12,
        };

        // Draw the map icon (a simple rectangle)
        ctx.strokeStyle = mapRect.borderColor;
        ctx.lineWidth = mapRect.borderWidth;
        ctx.strokeRect(mapRect.x, mapRect.y, mapRect.w, mapRect.h);

        // Save the modified image to PNG
        const buffer = canvas.toBuffer('image/png');
        fs.writeFileSync(outputImagePath, buffer);
        console.log(`Successfully created ${outputImagePath}`);

        // Save the modified image to SVG
        const svgString = `
            <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
                <image href="${canvas.toDataURL()}" height="${height}" width="${width}"/>
            </svg>`;
        fs.writeFileSync(outputSvgPath, svgString);
        console.log(`Successfully created ${outputSvgPath}`);

    } catch (error) {
        console.error('Error creating final map icon:', error);
    }
}

createFinalMapIcon();