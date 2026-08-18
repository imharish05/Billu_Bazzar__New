/**
 * Generates an elegant gold-accented luxury vector placeholder SVG as a data URL.
 * Used when product images fail to load or the user is offline.
 */
export const getPlaceholderSvg = (title = 'Luxury Item') => {
  const cleanTitle = String(title)
    .replace(/[&<>'"]/g, (c) => {
      switch (c) {
        case '&': return '&amp;';
        case '<': return '&lt;';
        case '>': return '&gt;';
        case "'": return '&#39;';
        case '"': return '&quot;';
        default: return c;
      }
    });

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="800" viewBox="0 0 600 800">
    <rect width="600" height="800" fill="%23FAF9F5"/>
    <rect x="20" y="20" width="560" height="760" fill="none" stroke="%23C9A24B" stroke-width="1.5"/>
    <rect x="26" y="26" width="548" height="748" fill="none" stroke="%23C9A24B" stroke-width="0.5" stroke-dasharray="3,3"/>
    
    <!-- Geometric luxury diamond icon -->
    <g transform="translate(300, 320) scale(1.2)">
      <polygon points="0,-40 30,-15 0,40 -30,-15" fill="none" stroke="%23C9A24B" stroke-width="1.5"/>
      <line x1="-30" y1="-15" x2="30" y2="-15" stroke="%23C9A24B" stroke-width="1"/>
      <line x1="0" y1="-40" x2="0" y2="40" stroke="%23C9A24B" stroke-width="0.5" stroke-dasharray="2,2"/>
    </g>

    <text x="300" y="470" font-family="Cinzel, Playfair Display, Georgia, serif" font-size="22" font-weight="bold" fill="%231A1A1A" text-anchor="middle" letter-spacing="4">BILLU BAZAAR</text>
    <text x="300" y="505" font-family="Inter, system-ui, sans-serif" font-size="12" fill="%23C9A24B" text-anchor="middle" letter-spacing="3">EXQUISITE CREATION</text>
    
    <path d="M220,530 L380,530" stroke="%23C9A24B" stroke-width="1"/>
    
    <text x="300" y="570" font-family="Playfair Display, Georgia, serif" font-size="16" font-style="italic" fill="%23555555" text-anchor="middle">${cleanTitle}</text>
  </svg>`;

  return `data:image/svg+xml;utf8,${svg.replace(/#/g, '%23')}`;
};
