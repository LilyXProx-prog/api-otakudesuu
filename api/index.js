const axios = require('axios');
const cheerio = require('cheerio');

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') return res.status(200).end();

    const { q, endpoint, category, page } = req.query;
    const BASE_URL = 'https://zorotv.com.ua';
    const headers = { 
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
        'Referer': BASE_URL 
    };

    try {
        let url = `${BASE_URL}/`;

        // 1. DETAIL ANIME (EPISODE LIST)
        if (endpoint) {
            url = `${BASE_URL}/watch/${endpoint.replace(/^\/|watch\//, '')}`;
            const { data } = await axios.get(url, { headers });
            const $ = cheerio.load(data);
            
            return res.status(200).json({
                status: 'success',
                data: {
                    title: $('.anime-name').text().trim(),
                    description: $('.text-justify').text().trim(),
                    thumbnail: $('.film-poster-img').attr('src'),
                    // Zoro pake ID buat list eps, ini basic metadata-nya
                    id: endpoint.split('-').pop()
                }
            });
        }

        // 2. NAVIGASI JALUR (HOME / SEARCH / RECENT)
        if (q) url = `${BASE_URL}/search?keyword=${encodeURIComponent(q)}`;
        else if (category === 'ongoing') url = `${BASE_URL}/recently-updated`;
        else if (category === 'movie') url = `${BASE_URL}/movie`;

        if (page && page > 1) url += (q ? `&page=${page}` : `?page=${page}`);

        const { data } = await axios.get(url, { headers });
        const $ = cheerio.load(data);
        const results = [];

        $('.flw-item').each((i, el) => {
            const a = $(el).find('.film-name a');
            const href = a.attr('href') || '';
            results.push({
                title: a.text().trim(),
                endpoint: href.replace(/^\/watch\//, ''),
                thumbnail: $(el).find('img').attr('data-src') || $(el).find('img').attr('src'),
                quality: $(el).find('.tick-quality').text().trim(),
                episodes: $(el).find('.tick-sub').text().trim() || $(el).find('.tick-eps').text().trim()
            });
        });

        return res.status(200).json({ status: 'success', total: results.length, data: results });

    } catch (err) {
        return res.status(200).json({ status: 'error', message: err.message, tried_url: url });
    }
};