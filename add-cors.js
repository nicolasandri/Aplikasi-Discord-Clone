
// Add frontend VPS origin
if (!ALLOWED_ORIGINS.includes('http://165.22.63.51')) {
  ALLOWED_ORIGINS.push('http://165.22.63.51');
}

// Add HTTPS domain
if (!ALLOWED_ORIGINS.includes('https://workgrid.homeku.net')) {
  ALLOWED_ORIGINS.push('https://workgrid.homeku.net');
}
