const axios = require('axios');
const cheerio = require('cheerio');

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') return res.status(200).end();

    const { q, endpoint, category, page, type } = req.query;
    const BASE_URL = 'https://anoboy.si';
    const headers = { 
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
        'Referer': 'https://anoboy.si/' 
    };

    try {
        let targetUrl = `${BASE_URL}/`;

        // 1. JALUR DATABASE (Pake Pagination biar Gak Crash)
        if (type === 'all') {
            // Kita tembak halaman All Anime tapi pake pagination
            targetUrl = `${BASE_URL}/anime-tamat/`; 
        } else if (endpoint) {
            targetUrl = `${BASE_URL}/${endpoint.replace(/^\//, '')}/`;
        } else if (category) {
            const catMap = { 'ongoing': 'anime-ongoing', 'tamat': 'anime-tamat', 'movie': 'movie-anime' };
            targetUrl = `${BASE_URL}/${catMap[category] || category}/`;
        } else if (q) {
            targetUrl = `${BASE_URL}/?s=${encodeURIComponent(q)}`;
        }

        // Pagination (WAJIB BIAR ENTENG)
        const p = page || 1;
        if (p > 1) {
            targetUrl += (targetUrl.includes('?') ? '&' : '') + `paged=${p}`;
            if (!targetUrl.includes('?')) targetUrl = targetUrl.replace(/\/$/, '') + `/page/${p}/`;
        }

        // Limit timeout biar gak crash
        const response = await axios.get(targetUrl, { headers, timeout: 5000 });
        const $ = cheerio.load(response.data);
        const results = [];

        // RESPONS DETAIL
        if (endpoint) {
            return res.status(200).json({
                status: 'success',
                data: {
                    title: $('.entry-title').first().text().trim(),
                    player: $('iframe').first().attr('src') || '',
                    sinopsis: $('.contentp').first().text().trim() || 'No Synopsis',
                    full_episodes: [], // Scrape link eps di sini kalo butuh
                    downloads: []
                }
            });
        }

        // RESPONS LIST (Selector yang paling cepet)
        $('.amv, article').each((i, el) => {
            const a = $(el).find('a').first();
            if (a.attr('href')) {
                results.push({
                    title: a.attr('title') || $(el).find('h3').text().trim(),
                    endpoint: a.attr('href').replace(BASE_URL, '').replace(/\//g, ''),
                    thumbnail: $(el).find('img').attr('src') || ''
                });
            }
        });

        return res.status(200).json({ 
            status: 'success', 
            total: results.length, 
            page: p,
            data: results 
        });

    } catch (err) {
        return res.status(200).json({ 
            status: 'error', 
            message: "Server Anoboy lemot, Vercel gak sabaran babi!",
            debug: targetUrl 
        });
    }
};