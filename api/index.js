const axios = require('axios');
const cheerio = require('cheerio');

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();

    const { q, endpoint, category, genre, page } = req.query;
    const BASE_URL = 'https://anoboy.si/';
    const headers = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36' };

    try {
        // 1. DETAIL LENGKAP (Sinopsis, Rating, Genre, Download)
        if (endpoint) {
            const { data } = await axios.get(`${BASE_URL}${endpoint}/`, { headers });
            const $ = cheerio.load(data);
            
            // Metadata Scraper
            const title = $('.entry-title').text().trim();
            const sinopsis = $('.contentp').text().trim();
            const thumbnail = $('.entry-content img').first().attr('src');
            
            // Ambil Info Detail (Rating, Status, dll)
            const info = {};
            $('.contentp p').each((i, el) => {
                const text = $(el).text();
                if (text.includes(':')) {
                    const [key, val] = text.split(':').map(s => s.trim());
                    info[key.toLowerCase()] = val;
                }
            });

            // Download Links (Teknik Brutal 2.0)
            const downloads = [];
            $('a').each((i, el) => {
                const url = $(el).attr('href');
                const text = $(el).text().trim();
                if (url && url.includes('http') && !url.includes('anoboy.si')) {
                    if (/download|mirror|drive|mega|720p|480p|360p/.test(text.toLowerCase()) || /gdrive|mp4upload/.test(url)) {
                        downloads.push({ server: text || `Link ${i}`, url });
                    }
                }
            });

            return res.status(200).json({
                status: 'success',
                type: 'detail',
                data: { title, sinopsis, thumbnail, info, downloads }
            });
        }

        // 2. NAVIGASI DATABASE (Category, Genre, Search)
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
            const epInfo = $(el).find('.jam, .ep').text().trim(); // Episode berapa atau jam berapa rilis

            if (link) {
                const ep = link.replace(BASE_URL, '').replace(/\//g, '');
                results.push({ title, endpoint: ep, thumbnail: thumb, meta: epInfo });
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