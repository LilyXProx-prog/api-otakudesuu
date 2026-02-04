const axios = require('axios');
const cheerio = require('cheerio');

module.exports = async (req, res) => {
    // KUNCI UTAMA: JANGAN BIARKAN VERCEL CRASH
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') return res.status(200).end();

    const { q, endpoint, category, page } = req.query;
    const BASE_URL = 'https://anoboy.si';
    const headers = { 
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
        'Referer': 'https://anoboy.si/' 
    };

    try {
        let targetUrl = `${BASE_URL}/`;

        // LOGIKA PENENTUAN URL
        if (endpoint) {
            targetUrl = `${BASE_URL}/${endpoint.replace(/^\//, '')}/`;
        } else if (category) {
            const catMap = { 'ongoing': 'anime-ongoing', 'tamat': 'anime-tamat', 'movie': 'movie-anime' };
            targetUrl = `${BASE_URL}/${catMap[category] || category}/`;
        } else if (q) {
            targetUrl = `${BASE_URL}/?s=${encodeURIComponent(q)}`;
        }

        // Pagination Safe
        const p = parseInt(page) || 1;
        if (p > 1) {
            targetUrl += (targetUrl.includes('?') ? '&' : '') + `paged=${p}`;
            if (!targetUrl.includes('?')) targetUrl = targetUrl.replace(/\/$/, '') + `/page/${p}/`;
        }

        // REQUEST DENGAN LIMITASI MEMORI
        const response = await axios.get(targetUrl, { 
            headers, 
            timeout: 7000,
            maxContentLength: 5000000 // Batasi 5MB biar gak crash
        });

        const $ = cheerio.load(response.data);
        const results = [];

        // JALUR DETAIL (EPISODE)
        if (endpoint) {
            return res.status(200).json({
                status: 'success',
                data: {
                    title: $('.entry-title').first().text().trim() || 'Judul Gak Ada',
                    player: $('iframe').first().attr('src') || '',
                    sinopsis: $('.contentp').first().text().trim() || 'Sinopsis Kosong',
                    downloads: []
                }
            });
        }

        // JALUR LIST (HOME/ETC)
        $('.amv, article').each((i, el) => {
            const a = $(el).find('a').first();
            const href = a.attr('href');
            if (href && href.includes(BASE_URL)) {
                results.push({
                    title: a.attr('title') || $(el).find('h3').text().trim() || 'No Title',
                    endpoint: href.replace(BASE_URL, '').replace(/\//g, ''),
                    thumbnail: $(el).find('img').attr('src') || ''
                });
            }
        });

        return res.status(200).json({ status: 'success', total: results.length, data: results });

    } catch (err) {
        // PREVENT 500 ERROR: Balikin 200 dengan info error JSON
        return res.status(200).json({ 
            status: 'error', 
            message: "Anoboy lagi batuk, refresh aja babi!",
            log: err.message
        });
    }
};