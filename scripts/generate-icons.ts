/**
 * APEX Icon Generator
 * Run: npx ts-node scripts/generate-icons.ts
 * Requires: npm install -D sharp @types/sharp ts-node
 */

import sharp from 'sharp'
import * as fs from 'fs'
import * as path from 'path'

const ICONS_DIR = path.join(process.cwd(), 'public', 'icons')
const SPLASH_DIR = path.join(process.cwd(), 'public', 'splash')
;[ICONS_DIR, SPLASH_DIR].forEach((d) => fs.mkdirSync(d, { recursive: true }))

// APEX logo SVG — "A" letterform with gradient
function makeLogoSVG(size: number, padding = 0): string {
  const inner = size - padding * 2
  const gradId = `g${Math.random().toString(36).slice(2)}`
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs>
    <linearGradient id="${gradId}" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#6C63FF"/>
      <stop offset="100%" stop-color="#00D4AA"/>
    </linearGradient>
  </defs>
  <rect width="${size}" height="${size}" fill="#0A0A0F"/>
  <text
    x="${size / 2}"
    y="${size / 2 + inner * 0.30}"
    text-anchor="middle"
    font-family="Arial Black, sans-serif"
    font-weight="900"
    font-size="${inner * 0.72}"
    fill="url(#${gradId})"
  >A</text>
</svg>`
}

// Shortcut icon SVG
function makeShortcutSVG(emoji: string, bg: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96">
  <rect width="96" height="96" rx="20" fill="${bg}"/>
  <text x="48" y="64" text-anchor="middle" font-size="44">${emoji}</text>
</svg>`
}

// Splash screen SVG
function makeSplashSVG(width: number, height: number): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
  <defs>
    <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#6C63FF"/>
      <stop offset="100%" stop-color="#00D4AA"/>
    </linearGradient>
    <radialGradient id="glow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#6C63FF" stop-opacity="0.25"/>
      <stop offset="100%" stop-color="#6C63FF" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="${width}" height="${height}" fill="#0A0A0F"/>
  <!-- Glow -->
  <ellipse cx="${width / 2}" cy="${height / 2 - 50}" rx="200" ry="200" fill="url(#glow)"/>
  <!-- Logo background -->
  <rect x="${width / 2 - 70}" y="${height / 2 - 180}" width="140" height="140" rx="32" fill="#13131A"/>
  <!-- A letterform -->
  <text x="${width / 2}" y="${height / 2 - 60}" text-anchor="middle"
    font-family="Arial Black, sans-serif" font-weight="900" font-size="110"
    fill="url(#grad)">A</text>
  <!-- Wordmark -->
  <text x="${width / 2}" y="${height / 2 + 50}" text-anchor="middle"
    font-family="Arial Black, sans-serif" font-weight="900" font-size="52"
    letter-spacing="12" fill="#F0F0FF">APEX</text>
  <!-- Tagline -->
  <text x="${width / 2}" y="${height / 2 + 110}" text-anchor="middle"
    font-family="Arial, sans-serif" font-weight="400" font-size="26"
    fill="#6B7280">Your AI Personal Trainer</text>
</svg>`
}

async function generateIcons() {
  console.log('Generating APEX icons...')

  const sizes = [72, 96, 128, 144, 152, 192, 384, 512]

  for (const size of sizes) {
    // Regular icon (no padding)
    const svg = makeLogoSVG(size)
    await sharp(Buffer.from(svg)).png().toFile(path.join(ICONS_DIR, `icon-${size}.png`))
    console.log(`  ✓ icon-${size}.png`)
  }

  // Apple touch icon (180x180)
  const appleSvg = makeLogoSVG(180, 18)
  await sharp(Buffer.from(appleSvg)).png().toFile(path.join(ICONS_DIR, 'apple-touch-icon.png'))
  console.log('  ✓ apple-touch-icon.png')

  // Favicon (32x32)
  const faviconSvg = makeLogoSVG(32)
  await sharp(Buffer.from(faviconSvg)).png().toFile(path.join(ICONS_DIR, 'favicon-32.png'))
  // Copy to public root as favicon.ico (browser will use PNG)
  await sharp(Buffer.from(faviconSvg)).resize(32, 32).png().toFile(path.join(process.cwd(), 'public', 'favicon.ico'))
  console.log('  ✓ favicon.ico')

  // Shortcut icons
  const shortcuts = [
    { name: 'shortcut-train', emoji: '🏋️', bg: '#1A1A2E' },
    { name: 'shortcut-nutrition', emoji: '🥗', bg: '#0D1F1A' },
    { name: 'shortcut-coach', emoji: '💬', bg: '#1A1A2E' },
  ]
  for (const { name, emoji, bg } of shortcuts) {
    const svg = makeShortcutSVG(emoji, bg)
    await sharp(Buffer.from(svg)).png().toFile(path.join(ICONS_DIR, `${name}.png`))
    console.log(`  ✓ ${name}.png`)
  }

  // Badge icon (72x72, solid violet circle)
  const badgeSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="72" height="72">
    <circle cx="36" cy="36" r="36" fill="#6C63FF"/>
    <text x="36" y="48" text-anchor="middle" font-family="Arial Black" font-weight="900" font-size="32" fill="white">A</text>
  </svg>`
  await sharp(Buffer.from(badgeSvg)).png().toFile(path.join(ICONS_DIR, 'badge-72.png'))
  console.log('  ✓ badge-72.png')

  console.log('\nGenerating splash screens...')

  const splashes = [
    { name: 'iphone-14-pro', w: 1179, h: 2556 },
    { name: 'iphone-14', w: 1170, h: 2532 },
    { name: 'iphone-se', w: 750, h: 1334 },
    { name: 'ipad-pro-12', w: 2048, h: 2732 },
  ]

  fs.mkdirSync(path.join(process.cwd(), 'public', 'screenshots'), { recursive: true })

  for (const { name, w, h } of splashes) {
    const svg = makeSplashSVG(w, h)
    await sharp(Buffer.from(svg)).png().toFile(path.join(SPLASH_DIR, `${name}.png`))
    console.log(`  ✓ splash/${name}.png`)
  }

  console.log('\n✅ All icons and splash screens generated!')
  console.log('   → public/icons/ — all icon sizes')
  console.log('   → public/splash/ — iOS splash screens')
}

generateIcons().catch(console.error)
