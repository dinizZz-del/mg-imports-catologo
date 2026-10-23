// O catálogo usa uma rota própria da Vercel para consultar o Apps Script.
// Isso evita problemas de CORS/redirecionamento no navegador do cliente.
window.CATALOG_CONFIG = {
  apiUrl: "/api/catalog",
  fallbackToDemo: false
};
