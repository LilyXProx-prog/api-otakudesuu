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

        // 1. JURUS SIKAT SEMUA (ANIME LIST A-Z)
        if (type === 'all') {
            targetUrl = `${BASE_URL}/anime-list/`; // Jalur gudang utama
        } 
        // 2. DETAIL & DOWNLOAD
        else if (endpoint) {
            targetUrl = `${BASE_URL}/${endpoint.replace(/^\//, '')}/`;
        } 
        // 3. KATEGORI & SEARCH
        else if (category) {
            const catMap = { 'ongoing': 'anime-ongoing', 'tamat': 'anime-tamat', 'movie': 'movie-anime' };
            targetUrl = `${BASE_URL}/${catMap[category] || category}/`;
        } else if (q) {
            targetUrl = `${BASE_URL}/?s=${encodeURIComponent(q)}`;
        }

        // Pagination
        if (page && page > 1) {
            targetUrl += (targetUrl.includes('?') ? '&' : '') + `paged=${page}`;
            if (!targetUrl.includes('?')) targetUrl = targetUrl.replace(/\/$/, '') + `/page/${page}/`;
        }

        const { data } = await axios.get(targetUrl, { headers, timeout: 15000 });
        const $ = cheerio.load(data);

        // RESPONS DETAIL
        if (endpoint) {
            const episodes = [];
            $('.host-link a, .video-nav a, .list-eps a').each((i, el) => {
                const link = $(el).attr('href');
                if (link?.includes('anoboy.si')) {
                    episodes.push({ 
                        title: $(el).text().trim(), 
                        endpoint: link.replace(BASE_URL, '').replace(/\//g, '') 
                    });
                }
            });

            return res.status(200).json({
                status: 'success',
                data: {
                    title: $('.entry-title').text().trim(),
                    player: $('iframe').first().attr('src'),
                    sinopsis: $('.contentp').text().trim() || $('.entry-content p').text().trim(),
                    full_episodes: episodes,
                    downloads: [] 
                }
            });
        }

        // RESPONS LIST (Sikat Database)
        const results = [];
        // Selector khusus buat Anime List (biasanya beda strukturnya)
        const selector = type === 'all' ? '.isi_anime a, .entry-content a, .amv' : '.amv, article, .item';
        
        $(selector).each((i, el) => {
            const a = $(el).is('a') ? $(el) : $(el).find('a').first();
            const title = a.attr('title') || a.text().trim();
            const link = a.attr('href');

            if (link && !link.includes('category') && title.length > 2) {
                results.push({
                    title: title,
                    endpoint: link.replace(BASE_URL, '').replace(/\//g, ''),
                    thumbnail: $(el).find('img').attr('src') || ''
                });
            }
        });

        res.status(200).json({ 
            status: 'success', 
            total: results.length, 
            type: type || 'latest',
            data: results 
        });

    } catch (err) {
        res.status(200).json({ status: 'error', message: "Database lagi dikunci, babi!", debug: targetUrl });
    }
};