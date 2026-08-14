// Converts every JPG/PNG in src/images to a WebP sibling, e.g. hero.jpg -> hero.webp
// Run with: npm run images
import sharp from "sharp";
import fg from "fast-glob";
import path from "node:path";

const files = await fg("src/images/**/*.{jpg,jpeg,png}");

if (files.length === 0) {
  console.log("No JPG/PNG files found in src/images.");
} else {
  for (const file of files) {
    const outFile = file.replace(/\.(jpg|jpeg|png)$/i, ".webp");
    await sharp(file).webp({ quality: 80 }).toFile(outFile);
    console.log(`Converted: ${path.basename(file)} -> ${path.basename(outFile)}`);
  }
}
