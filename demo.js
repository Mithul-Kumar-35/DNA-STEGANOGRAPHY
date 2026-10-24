// Enhanced demo.js with advanced features
// This file handles the LSB steganography encoding and decoding logic

/**
 * Enhanced Status Display
 */
function showStatus(element, message, isError = false) {
    element.textContent = message;
    element.className = isError ? 'status error' : 'status success';
    element.style.display = 'block';
    
    // Auto-hide success messages after 3 seconds
    if (!isError) {
        setTimeout(() => {
            element.style.opacity = '0';
            setTimeout(() => {
                element.style.display = 'none';
                element.style.opacity = '1';
            }, 300);
        }, 3000);
    }
}

/**
 * Calculate capacity of an image
 */
function calculateCapacity(width, height) {
    // Each pixel has 3 channels (R, G, B)
    // We can store 1 bit per channel
    // 32 bits are used for length, rest for message
    const totalBits = width * height * 3;
    const messageBits = totalBits - 32;
    const capacity = Math.floor(messageBits / 8); // Convert to bytes
    return { totalBits, messageBits, capacity };
}

/**
 * LSB Encoding Algorithm
 */
function encodeMessageLSB(imageData, message) {
    const data = new Uint8ClampedArray(imageData.data);
    const msgBytes = new TextEncoder().encode(message);
    const msgLen = msgBytes.length;
    const pixelCount = data.length / 4;
    
    // Calculate capacity
    const capacity = calculateCapacity(imageData.width, imageData.height);
    
    // Check if message fits
    if (msgLen > capacity.capacity) {
        return {
            success: false,
            error: `Message too large! Max: ${capacity.capacity} bytes, Need: ${msgLen} bytes`
        };
    }
    
    // Encode length in first 32 pixels (LSB of red channel)
    for (let i = 0; i < 32; i++) {
        const bit = (msgLen >>> (31 - i)) & 1;
        const idx = i * 4;
        data[idx] = (data[idx] & 0xFE) | bit;
    }
    
    // Encode message bits
    let bitPos = 0;
    for (let byteIdx = 0; byteIdx < msgLen; byteIdx++) {
        const byte = msgBytes[byteIdx];
        for (let bitIdx = 0; bitIdx < 8; bitIdx++) {
            const bit = (byte >>> (7 - bitIdx)) & 1;
            const pixelIdx = 32 + bitPos;
            const dataIdx = pixelIdx * 4;
            
            // Store in red channel LSB
            data[dataIdx] = (data[dataIdx] & 0xFE) | bit;
            bitPos++;
        }
    }
    
    return {
        success: true,
        imageData: new ImageData(data, imageData.width, imageData.height),
        stats: {
            imageSize: `${imageData.width}×${imageData.height}`,
            maxCapacity: capacity.capacity,
            messageSize: msgLen,
            utilization: ((msgLen / capacity.capacity) * 100).toFixed(2) + '%'
        }
    };
}

/**
 * LSB Decoding Algorithm
 */
function decodeMessageLSB(imageData) {
    const data = imageData.data;
    const pixelCount = data.length / 4;
    
    if (pixelCount < 32) {
        return { success: false, error: 'Image too small to contain hidden data' };
    }
    
    // Read length from first 32 pixels (LSB of red channel)
    let msgLen = 0;
    for (let i = 0; i < 32; i++) {
        const idx = i * 4;
        const bit = data[idx] & 1;
        msgLen = (msgLen << 1) | bit;
    }
    
    // Validate length
    if (msgLen === 0 || msgLen > 1000000) {
        return { success: false, error: 'No valid hidden message found' };
    }
    
    const bitsNeeded = 32 + (msgLen * 8);
    if (bitsNeeded > pixelCount * 3) { // 3 channels per pixel
        return { success: false, error: 'Insufficient data or corrupted image' };
    }
    
    // Read message bytes
    const msgBytes = new Uint8Array(msgLen);
    let bitPos = 0;
    
    for (let byteIdx = 0; byteIdx < msgLen; byteIdx++) {
        let byte = 0;
        for (let bitIdx = 0; bitIdx < 8; bitIdx++) {
            const pixelIdx = 32 + bitPos;
            const dataIdx = pixelIdx * 4;
            const bit = data[dataIdx] & 1;
            byte = (byte << 1) | bit;
            bitPos++;
        }
        msgBytes[byteIdx] = byte;
    }
    
    try {
        const message = new TextDecoder().decode(msgBytes);
        return { 
            success: true, 
            message: message,
            stats: {
                imageSize: `${imageData.width}×${imageData.height}`,
                extractedLength: msgLen
            }
        };
    } catch (e) {
        return { success: false, error: 'Failed to decode message (invalid UTF-8)' };
    }
}

/**
 * Draw image to canvas with preview
 */
function drawImageToCanvas(file, canvas, ctx, callback) {
    const reader = new FileReader();
    reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
            // Create full-resolution canvas
            const fullCanvas = document.createElement('canvas');
            fullCanvas.width = img.width;
            fullCanvas.height = img.height;
            const fullCtx = fullCanvas.getContext('2d');
            fullCtx.drawImage(img, 0, 0);
            
            // Get full-resolution image data
            const fullImageData = fullCtx.getImageData(0, 0, img.width, img.height);
            
            // Draw preview (scaled)
            const w = canvas.width;
            const h = canvas.height;
            const scale = Math.min(w / img.width, h / img.height);
            const scaledWidth = img.width * scale;
            const scaledHeight = img.height * scale;
            const x = (w - scaledWidth) / 2;
            const y = (h - scaledHeight) / 2;
            
            ctx.fillStyle = 'rgba(0,0,0,0.5)';
            ctx.fillRect(0, 0, w, h);
            ctx.drawImage(img, x, y, scaledWidth, scaledHeight);
            
            callback(fullImageData, img);
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
}

/**
 * Download canvas as PNG
 */
function downloadCanvas(canvas, filename) {
    canvas.toBlob((blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }, 'image/png');
}

// Export functions for use in HTML
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        encodeMessageLSB,
        decodeMessageLSB,
        drawImageToCanvas,
        downloadCanvas,
        showStatus,
        calculateCapacity
    };
}
