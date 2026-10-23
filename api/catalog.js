const APPS_SCRIPT_URL =
  'https://script.google.com/macros/s/AKfycbzL_u_MH4XEtDWRCXwDwWyxpU5ksmib6L2zr2UZtP2yDg8qcwm7rfiu35XSxFLwrivs/exec';

module.exports = async function handler(req, res) {
  // CORS / métodos
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    return res.status(204).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({
      ok: false,
      error: 'Método não permitido.'
    });
  }

  try {
    const url =
      `${APPS_SCRIPT_URL}?action=catalog&t=${Date.now()}`;

    console.log('Consultando Apps Script:', url);

    const response = await fetch(url, {
      method: 'GET',
      redirect: 'follow',
      cache: 'no-store',
      headers: {
        'Accept': 'application/json,text/plain,*/*',
        'User-Agent': 'Mozilla/5.0'
      }
    });

    const contentType = response.headers.get('content-type') || '';
    const finalUrl = response.url;
    const text = await response.text();

    console.log('Apps Script status:', response.status);
    console.log('Apps Script URL final:', finalUrl);
    console.log('Apps Script content-type:', contentType);

    if (!response.ok) {
      console.error(
        'Resposta Apps Script:',
        text.substring(0, 500)
      );

      throw new Error(
        `Apps Script respondeu HTTP ${response.status}`
      );
    }

    // Proteção contra página HTML do Google
    if (
      text.trim().startsWith('<!DOCTYPE') ||
      text.trim().startsWith('<!doctype') ||
      text.trim().startsWith('<html')
    ) {
      console.error(
        'Google retornou HTML em vez de JSON:',
        text.substring(0, 500)
      );

      throw new Error(
        'Google retornou HTML em vez do JSON do catálogo.'
      );
    }

    let data;

    try {
      data = JSON.parse(text);
    } catch (parseError) {
      console.error(
        'Resposta não é JSON válido:',
        text.substring(0, 500)
      );

      throw new Error(
        'Resposta do Apps Script não é JSON válido.'
      );
    }

    res.setHeader(
      'Cache-Control',
      's-maxage=30, stale-while-revalidate=60'
    );

    res.setHeader(
      'Content-Type',
      'application/json; charset=utf-8'
    );

    return res.status(200).json(data);

  } catch (error) {
    console.error(
      'Erro ao consultar catálogo:',
      error.message
    );

    return res.status(502).json({
      ok: false,
      error: 'Não foi possível carregar o catálogo.',
      detail: error.message
    });
  }
};