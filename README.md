# DNA Steganography

An Cyber Security web project that demonstrates how a text message can be represented as a DNA sequence and hidden inside an image. 

## How it works

The DNA Steganography page demonstrates this process:

1. Convert the message into binary.
2. Map each pair of bits to a DNA base:
   - `00` → `A`
   - `01` → `C`
   - `10` → `G`
   - `11` → `T`
3. Convert the DNA sequence back into bits. 
4. Store those bits in the least significant bits of an image’s RGB pixel values.
5. Read the hidden bits from the image and convert them back into the message.

The project also includes educational pages about DNA steganography, how steganography works, and an image steganography demo.

## Run the project

### VS Code Live Server

1. Open this project folder in VS Code.
2. Install the **Live Server** extension if you don’t already have it.
3. Open `index.html`.
4. Right-click the file and choose **Open with Live Server**.


## Try the DNA demo

1. Open the **DNA Stego** page.
2. Enter a message in the encoder.
3. Choose an image.
4. Select **Encode & Hide in Image**, then download the generated image.
5. Open the decoder, select that downloaded image, and choose **Extract & Decode**.

## Project files

- `index.html` — Main page
- `dna.html` — DNA sequence converter and DNA-in-image demonstration
- `about-dna.html` — Information about DNA steganography
- `demo.html` and `demo.js` — Image-based LSB demonstration
- `how.html`, `applications.html`, `about.html`, and `conclusion.html` — Educational pages
- `styles.css` and `app.js` — Shared styling and page behavior

## Important Future Enhancements 

This is an educational demonstration. It uses an image as the carrier; it does not synthesize, store, or sequence physical DNA.

Steganography hides the presence of a message, but it does not encrypt the message. Don’t use this project to protect passwords, private information, or other sensitive data.

The account screen is a browser-side demonstration. It stores account data in local browser storage and is not a secure authentication system.

The current text-to-binary conversion is intended for basic ASCII text. Unicode characters may not encode and decode correctly.

## Technologies

- HTML
- CSS
- JavaScript
- HTML Canvas and browser file APIs 