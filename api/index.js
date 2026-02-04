const axios = require('axios');
const cheerio = require('cheerio');

module.exports = async (req, res) => {
    // KUNCI CORS BIAR FRONTEND LU GAK MATI
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();

    const { q, endpoint, category, genre, page } = req.query;
    const BASE_URL = 'https://anoboy.si/';
    const headers = { 
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
        'Referer': 'https://anoboy.si/' 
    };

    try {
        // 1. JALUR DETAIL LENGKAP (Sinopsis + Download + Info)
        if (endpoint) {
            const { data } = await axios.get(`${BASE_URL}${endpoint}/`, { headers, timeout: 15000 });
            const $ = cheerio.load(data);
            
            // Selector sinopsis yang lebih galak (nyari di berbagai tempat)
            const sinopsis = $('.contentp').text().trim() || 
                             $('.entry-content p').first().text().trim() || 
                             'Sinopsis belum tersedia untuk episode ini, babi.';

            const info = {};
            // Scrape metadata (Genre, Rating, Status)
            $('.contentp p, .entry-content p').each((i, el) => {
                const text = $(el).text();
                if (text.includes(':')) {
                    const parts = text.split(':');
                    const key = parts[0].trim().toLowerCase().replace(/\s/g, '_');
                    const val = parts.slice(1).join(':').trim();
                    if (key && val) info[key] = val;
                }
            });

            // Scrape Link Download (Brutal Mode)
            const downloads = [];
            $('a').each((i, el) => {
                const url = $(el).attr('href');
                const text = $(el).text().trim();
                if (url && url.includes('http') && !url.includes('anoboy.si')) {
                    const isDownload = /download|mirror|drive|mega|zippyshare|720p|480p|360p/.test(text.toLowerCase()) || 
                                     /gdrive|mp4upload|odrive/.test(url.toLowerCase());
                    if (isDownload) {
                        downloads.push({ server: text || `Server ${i}`, url: url });
                    }
                }
            });

            return res.status(200).json({
                status: 'success',
                type: 'detail',
                data: {
                    title: $('.entry-title').text().trim(),
                    sinopsis,
                    thumbnail: $('.entry-content img').first().attr('src'),
                    info,
                    downloads
                }
            });
        }

        // 2. JALUR LIST DATABASE (Home, Genre, Category, Search)
        let targetUrl = BASE_URL;
        if (genre) targetUrl = `${BASE_URL}genre/${genre}/`;
        else if (category) targetUrl = `${BASE_URL}category/${category}/`;
        else if (q) targetUrl = `${BASE_URL}?s=${encodeURIComponent(q)}`;

        if (page && page > 1) {
            targetUrl = (genre || category) ? `${targetUrl}page/${page}/` : `${targetUrl}&paged=${page}`;
        }

        const { data } = await axios.get(targetUrl, { headers });
        const $ = cheerio.load(data);
        const results = [];

        $('.home-list .amv, .column-content .amv, article').each((i, el) => {
            const title = $(el).find('a').attr('title') || $(el).find('h3').text().trim();
            const link = $(el).find('a').attr('href');
            const thumb = $(el).find('img').attr('src');
            const meta = $(el).find('.jam, .ep').text().trim();

            if (link) {
                const ep = link.replace(BASE_URL, '').replace(/\//g, '');
                // Filter biar gak masukin endpoint sampah
                if (title && ep && !ep.startsWith('category') && !ep.startsWith('author')) {
                    results.push({ title, endpoint: ep, thumbnail: thumb, meta });
                }
            }
        });

        res.status(200).json({ 
            status: 'success', 
            total: results.length, 
            filter: { category, genre, q, page: page || 1 },
            data: results 
        });

    } catch (err) {
        res.status(500).json({ status: 'error', message: "Database jebol, babi!", detail: err.message });
    }
};