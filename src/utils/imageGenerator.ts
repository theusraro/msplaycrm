/**
 * MSPLAY Offline Cinematic Image Generator
 * Generates lightweight, crisp, futuristic SVG Data URIs for offline streaming demo.
 */

// Color palettes for cinematic poster styles
const PALETTES: Record<string, { bg1: string; bg2: string; accent: string; secondary: string }> = {
  red: { bg1: '#140507', bg2: '#3d0c10', accent: '#E50914', secondary: '#ff6b6b' },
  cyan: { bg1: '#041018', bg2: '#082838', accent: '#00d2ff', secondary: '#80eaff' },
  purple: { bg1: '#0d0418', bg2: '#240a3e', accent: '#9d4edd', secondary: '#c77dff' },
  gold: { bg1: '#181204', bg2: '#3d2c08', accent: '#ffb703', secondary: '#ffd166' },
  emerald: { bg1: '#04180f', bg2: '#093622', accent: '#06d6a0', secondary: '#70e000' },
  dark: { bg1: '#080808', bg2: '#1a1a1a', accent: '#E50914', secondary: '#888888' },
  blue: { bg1: '#050c1e', bg2: '#0d2250', accent: '#2196f3', secondary: '#64b5f6' },
  crimson: { bg1: '#1a0505', bg2: '#400808', accent: '#ff1744', secondary: '#ff8a80' },
};

function getPalette(seed: string) {
  const keys = Object.keys(PALETTES);
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % keys.length;
  return PALETTES[keys[index]];
}

export function generatePoster(title: string, genre: string = 'MSPLAY ORIGINAL', year: number = 2026): string {
  const palette = getPalette(title);
  const cleanTitle = title.length > 22 ? title.substring(0, 20) + '...' : title;
  
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 600" width="100%" height="100%">
      <defs>
        <linearGradient id="g_${title.replace(/\s+/g, '_')}" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="${palette.bg1}" />
          <stop offset="60%" stop-color="${palette.bg2}" />
          <stop offset="100%" stop-color="#050505" />
        </linearGradient>
        <linearGradient id="overlay" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="rgba(0,0,0,0.1)" />
          <stop offset="60%" stop-color="rgba(0,0,0,0.4)" />
          <stop offset="100%" stop-color="rgba(5,5,5,0.95)" />
        </linearGradient>
        <radialGradient id="glow" cx="50%" cy="35%" r="60%">
          <stop offset="0%" stop-color="${palette.accent}" stop-opacity="0.35" />
          <stop offset="100%" stop-color="${palette.accent}" stop-opacity="0" />
        </radialGradient>
        <filter id="blurFilter" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="30" />
        </filter>
      </defs>

      <!-- Background -->
      <rect width="400" height="600" fill="url(#g_${title.replace(/\s+/g, '_')})" />
      
      <!-- Cinematic Glow Sphere -->
      <circle cx="200" cy="220" r="160" fill="url(#glow)" />
      
      <!-- Futuristic Geometric Shapes -->
      <g opacity="0.25" stroke="${palette.accent}" stroke-width="1.5" fill="none">
        <polygon points="200,80 320,280 80,280" />
        <circle cx="200" cy="220" r="110" stroke-dasharray="8 6" />
        <line x1="40" y1="220" x2="360" y2="220" stroke-opacity="0.5" />
        <line x1="200" y1="40" x2="200" y2="400" stroke-opacity="0.5" />
      </g>

      <!-- MSPLAY Watermark Tag -->
      <rect x="24" y="24" width="76" height="22" rx="4" fill="rgba(229,9,20,0.9)" />
      <text x="62" y="39" fill="#ffffff" font-size="10" font-weight="900" font-family="'Inter', system-ui, sans-serif" letter-spacing="1.5" text-anchor="middle">MSPLAY</text>
      
      <text x="376" y="40" fill="rgba(255,255,255,0.6)" font-size="11" font-weight="600" font-family="'Inter', system-ui, sans-serif" text-anchor="end">${year}</text>

      <!-- Gradient Dark Overlay at bottom -->
      <rect width="400" height="600" fill="url(#overlay)" />

      <!-- Content Details -->
      <g transform="translate(24, 520)">
        <text x="0" y="-36" fill="${palette.secondary}" font-size="12" font-weight="700" letter-spacing="2" font-family="'Inter', system-ui, sans-serif" text-transform="uppercase">${genre}</text>
        <text x="0" y="-6" fill="#ffffff" font-size="24" font-weight="800" font-family="'Inter', system-ui, sans-serif" letter-spacing="0.5">${cleanTitle}</text>
        <rect x="0" y="10" width="36" height="3" fill="${palette.accent}" rx="1.5" />
      </g>
    </svg>
  `.trim();

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

export function generateBackdrop(title: string, subtitle: string = 'Uma produção exclusiva MSPLAY'): string {
  const palette = getPalette(title);
  
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1920 1080" width="100%" height="100%">
      <defs>
        <linearGradient id="bgGrad_${title.replace(/\s+/g, '_')}" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="${palette.bg1}" />
          <stop offset="50%" stop-color="${palette.bg2}" />
          <stop offset="100%" stop-color="#0a0a0a" />
        </linearGradient>
        <radialGradient id="sunGlow" cx="65%" cy="40%" r="50%">
          <stop offset="0%" stop-color="${palette.accent}" stop-opacity="0.4" />
          <stop offset="60%" stop-color="${palette.bg2}" stop-opacity="0.1" />
          <stop offset="100%" stop-color="transparent" />
        </radialGradient>
        <linearGradient id="vignetteLeft" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="#0a0a0a" stop-opacity="0.95" />
          <stop offset="45%" stop-color="#0a0a0a" stop-opacity="0.75" />
          <stop offset="85%" stop-color="transparent" />
        </linearGradient>
        <linearGradient id="vignetteBottom" x1="0%" y1="100%" x2="0%" y2="0%">
          <stop offset="0%" stop-color="#0a0a0a" stop-opacity="1" />
          <stop offset="35%" stop-color="#0a0a0a" stop-opacity="0.8" />
          <stop offset="80%" stop-color="transparent" />
        </linearGradient>
      </defs>

      <!-- Main Background -->
      <rect width="1920" height="1080" fill="url(#bgGrad_${title.replace(/\s+/g, '_')})" />
      
      <!-- Big Cinematic Light Aura -->
      <circle cx="1300" cy="450" r="600" fill="url(#sunGlow)" />
      
      <!-- Abstract Cinematic Shapes in Background -->
      <g opacity="0.15" stroke="${palette.accent}" stroke-width="2" fill="none">
        <polygon points="1300,150 1700,750 900,750" />
        <circle cx="1300" cy="450" r="400" stroke-dasharray="16 12" />
        <circle cx="1300" cy="450" r="280" />
        <line x1="600" y1="450" x2="1900" y2="450" stroke-opacity="0.4" />
      </g>

      <!-- Vignettes for text contrast -->
      <rect width="1920" height="1080" fill="url(#vignetteLeft)" />
      <rect width="1920" height="1080" fill="url(#vignetteBottom)" />
      
      <!-- Futuristic Grid Lines on floor -->
      <g opacity="0.08" stroke="#ffffff" stroke-width="1">
        <line x1="0" y1="800" x2="1920" y2="800" />
        <line x1="0" y1="880" x2="1920" y2="880" />
        <line x1="0" y1="960" x2="1920" y2="960" />
      </g>
    </svg>
  `.trim();

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

export function generateChannelLogo(name: string, category: string = 'TV'): string {
  const palette = getPalette(name);
  
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 200" width="100%" height="100%">
      <defs>
        <linearGradient id="chGrad_${name.replace(/\s+/g, '_')}" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="${palette.bg2}" />
          <stop offset="100%" stop-color="#111111" />
        </linearGradient>
      </defs>

      <rect width="300" height="200" rx="16" fill="url(#chGrad_${name.replace(/\s+/g, '_')})" stroke="rgba(255,255,255,0.08)" stroke-width="2" />
      
      <circle cx="150" cy="85" r="42" fill="${palette.accent}" opacity="0.15" />
      <circle cx="150" cy="85" r="32" fill="none" stroke="${palette.accent}" stroke-width="2" stroke-dasharray="4 3" />
      
      <!-- Icon Graphic -->
      <polygon points="144,73 162,85 144,97" fill="${palette.accent}" />
      
      <text x="150" y="145" fill="#ffffff" font-size="20" font-weight="900" font-family="'Inter', system-ui, sans-serif" letter-spacing="1" text-anchor="middle">${name}</text>
      <text x="150" y="170" fill="${palette.secondary}" font-size="11" font-weight="600" font-family="'Inter', system-ui, sans-serif" letter-spacing="2" text-anchor="middle" text-transform="uppercase">${category}</text>
    </svg>
  `.trim();

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

export function generateEpisodeThumb(title: string, episodeNum: number): string {
  const palette = getPalette(title);
  
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 180" width="100%" height="100%">
      <defs>
        <linearGradient id="epGrad_${episodeNum}" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="${palette.bg2}" />
          <stop offset="100%" stop-color="#0a0a0a" />
        </linearGradient>
      </defs>

      <rect width="320" height="180" rx="8" fill="url(#epGrad_${episodeNum})" />
      
      <!-- Play overlay button -->
      <circle cx="160" cy="90" r="26" fill="rgba(0,0,0,0.6)" stroke="#ffffff" stroke-width="2" />
      <polygon points="155,80 171,90 155,100" fill="#ffffff" />
      
      <!-- Episode badge -->
      <rect x="16" y="16" width="36" height="22" rx="4" fill="rgba(229,9,20,0.9)" />
      <text x="34" y="31" fill="#ffffff" font-size="11" font-weight="800" font-family="'Inter', system-ui, sans-serif" text-anchor="middle">E${episodeNum}</text>
    </svg>
  `.trim();

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}
