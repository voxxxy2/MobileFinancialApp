const express = require('express');
const router = express.Router();
const https = require('https');
const auth = require('../middleware/auth');

// Simple in-memory cache (1 hour TTL)
const cache = new Map();
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

function cachedFetch(url, cacheKey) {
  return new Promise((resolve, reject) => {
    const cached = cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return resolve(cached.data);
    }
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          cache.set(cacheKey, { data: parsed, timestamp: Date.now() });
          resolve(parsed);
        } catch (e) { reject(e); }
      });
    }).on('error', reject);
  });
}

// GET /api/currency/rates?base=USD
router.get('/rates', auth, async (req, res) => {
  const base = (req.query.base || 'USD').toUpperCase();
  try {
    const url = `https://api.exchangerate-api.com/v4/latest/${base}`;
    const data = await cachedFetch(url, `rates_${base}`);
    res.json({ base, rates: data.rates, date: data.date });
  } catch (err) {
    console.error('Exchange rate fetch failed:', err.message);
    res.status(503).json({ error: 'Exchange rate service unavailable' });
  }
});

// GET /api/currency/list — returns popular currencies
router.get('/list', auth, (req, res) => {
  const currencies = [
    { code: 'USD', name: 'US Dollar', symbol: '$' },
    { code: 'EUR', name: 'Euro', symbol: '€' },
    { code: 'GBP', name: 'British Pound', symbol: '£' },
    { code: 'JPY', name: 'Japanese Yen', symbol: '¥' },
    { code: 'CNY', name: 'Chinese Yuan', symbol: '¥' },
    { code: 'AUD', name: 'Australian Dollar', symbol: 'A$' },
    { code: 'CAD', name: 'Canadian Dollar', symbol: 'C$' },
    { code: 'CHF', name: 'Swiss Franc', symbol: 'Fr' },
    { code: 'HKD', name: 'Hong Kong Dollar', symbol: 'HK$' },
    { code: 'SGD', name: 'Singapore Dollar', symbol: 'S$' },
    { code: 'INR', name: 'Indian Rupee', symbol: '₹' },
    { code: 'KRW', name: 'South Korean Won', symbol: '₩' },
    { code: 'BRL', name: 'Brazilian Real', symbol: 'R$' },
    { code: 'MXN', name: 'Mexican Peso', symbol: '$' },
    { code: 'IDR', name: 'Indonesian Rupiah', symbol: 'Rp' },
    { code: 'THB', name: 'Thai Baht', symbol: '฿' },
    { code: 'MYR', name: 'Malaysian Ringgit', symbol: 'RM' },
    { code: 'PHP', name: 'Philippine Peso', symbol: '₱' },
    { code: 'VND', name: 'Vietnamese Dong', symbol: '₫' },
    { code: 'ZAR', name: 'South African Rand', symbol: 'R' },
    { code: 'RUB', name: 'Russian Ruble', symbol: '₽' },
    { code: 'TRY', name: 'Turkish Lira', symbol: '₺' },
    { code: 'SEK', name: 'Swedish Krona', symbol: 'kr' },
    { code: 'NOK', name: 'Norwegian Krone', symbol: 'kr' },
    { code: 'DKK', name: 'Danish Krone', symbol: 'kr' },
    { code: 'NZD', name: 'New Zealand Dollar', symbol: 'NZ$' },
    { code: 'AED', name: 'UAE Dirham', symbol: 'د.إ' },
    { code: 'SAR', name: 'Saudi Riyal', symbol: '﷼' },
    { code: 'EGP', name: 'Egyptian Pound', symbol: '£' },
    { code: 'NGN', name: 'Nigerian Naira', symbol: '₦' },
  ];
  res.json(currencies);
});

// GET /api/currency/crypto-prices?ids=bitcoin,ethereum
router.get('/crypto-prices', auth, async (req, res) => {
  const ids = req.query.ids || 'bitcoin,ethereum';
  const vsCurrency = (req.query.vs || 'usd').toLowerCase();
  try {
    const url = `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=${vsCurrency}&include_24hr_change=true`;
    const data = await cachedFetch(url, `crypto_${ids}_${vsCurrency}`);
    res.json(data);
  } catch (err) {
    console.error('Crypto price fetch failed:', err.message);
    res.status(503).json({ error: 'Crypto price service unavailable' });
  }
});

// GET /api/currency/stock-price?symbol=AAPL
router.get('/stock-price', auth, async (req, res) => {
  const { symbol } = req.query;
  if (!symbol) return res.status(400).json({ error: 'symbol is required' });

  const apiKey = process.env.ALPHA_VANTAGE_KEY || 'demo';
  try {
    const url = `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${apiKey}`;
    const data = await cachedFetch(url, `stock_${symbol}`);
    const quote = data['Global Quote'];
    if (!quote || !quote['05. price']) {
      return res.status(404).json({ error: 'Symbol not found or API limit reached' });
    }
    res.json({
      symbol: quote['01. symbol'],
      price: parseFloat(quote['05. price']),
      change: parseFloat(quote['09. change']),
      change_percent: quote['10. change percent'],
    });
  } catch (err) {
    console.error('Stock price fetch failed:', err.message);
    res.status(503).json({ error: 'Stock price service unavailable' });
  }
});

module.exports = router;
