import sharp from "sharp";
import fs from "fs";
import path from "path";

const sizes = [192, 512];
const outputDir = path.join(process.cwd(), "public", "icons");

// Colors from the app theme
const bgColor = "#09090b"; // zinc-950
const circleColor = "#6366f1"; // indigo-500
const iconColor = "#ffffff"; // white

function createSvg(size) {
  const padding = Math.round(size * 0.18);
  const circleRadius = Math.round((size - padding * 2) / 2);
  const cx = Math.round(size / 2);
  const cy = Math.round(size / 2);
  const strokeWidth = Math.max(2, Math.round(size * 0.04));
  const chartHeight = Math.round(size * 0.25);
  const chartWidth = Math.round(size * 0.3);
  const chartX = cx - chartWidth / 2;
  const chartY = cy + Math.round(size * 0.02);
  const barWidth = Math.round(chartWidth / 5);
  const barGap = Math.round(barWidth * 0.6);
  const bar1H = Math.round(chartHeight * 0.5);
  const bar2H = Math.round(chartHeight * 0.8);
  const bar3H = Math.round(chartHeight * 0.35);
  const bar1X = chartX + barGap;
  const bar2X = bar1X + barWidth + barGap;
  const bar3X = bar2X + barWidth + barGap;
  const bar1Y = chartY + chartHeight - bar1H;
  const bar2Y = chartY + chartHeight - bar2H;
  const bar3Y = chartY + chartHeight - bar3H;

  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
      <rect width="${size}" height="${size}" fill="${bgColor}" rx="${Math.round(size * 0.22)}" />
      <circle cx="${cx}" cy="${cy}" r="${circleRadius}" fill="${circleColor}" />
      <rect x="${bar1X}" y="${bar1Y}" width="${barWidth}" height="${bar1H}" rx="${Math.round(barWidth * 0.2)}" fill="${iconColor}" opacity="0.9" />
      <rect x="${bar2X}" y="${bar2Y}" width="${barWidth}" height="${bar2H}" rx="${Math.round(barWidth * 0.2)}" fill="${iconColor}" opacity="0.9" />
      <rect x="${bar3X}" y="${bar3Y}" width="${barWidth}" height="${bar3H}" rx="${Math.round(barWidth * 0.2)}" fill="${iconColor}" opacity="0.9" />
    </svg>
  `;
}

async function main() {
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  for (const size of sizes) {
    const svg = createSvg(size);
    const outputPath = path.join(outputDir, `icon-${size}.png`);
    await sharp(Buffer.from(svg))
      .png()
      .toFile(outputPath);
    console.log(`Generated ${outputPath}`);
  }
}

main().catch((err) => {
  console.error("Icon generation failed:", err);
  process.exit(1);
});
