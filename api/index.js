const axios = require('axios');
const cheerio = require('cheerio');

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') return res.status(200).end();

    const { q, endpoint, category, genre, page } = req.query;
    const BASE_URL = 'https://animetop-id.com'; 
    const headers = { 
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
        'Referer': BASE_URL
    };

    try {
        let url = `${BASE_URL}/`;

        // 1. DETAIL / STREAMING
        if (endpoint) {
            url = `${BASE_URL}/${endpoint.replace(/^\//, '')}/`;
            if (!url.endsWith('/')) url += '/';
        } 
        // 2. LISTING
        else if (q) url = `${BASE_URL}/?s=${encodeURIComponent(q)}`;
        else if (genre) url = `${BASE_URL}/genres/${genre}/`;
        else if (category === 'ongoing') url = `${BASE_URL}/anime/?status=ongoing&order=update`;
        else url = `${BASE_URL}/anime/?order=update`;

        if (page && page > 1) url += (url.includes('?') ? '&' : '?') + `page=${page}`;

        const { data } = await axios.get(url, { headers, timeout: 10000 });
        const $ = cheerio.load(data);
        const results = [];

        // JALUR DETAIL ANIME
        if (endpoint && !url.includes('episode')) {
            const episodes = [];
            $('.eplister ul li').each((i, el) => {
                const a = $(el).find('a');
                episodes.push({
                    title: $(el).find('.epl-num').text() + ' - ' + $(el).find('.epl-title').text(),
                    endpoint: a.attr('href').replace(BASE_URL, '').replace(/\//g, '')
                });
            });
            return res.status(200).json({ status: 'success', type: 'detail', episodes });
        }

        // JALUR LIST (PAKE MULTI-SELECTOR BIAR GAK ZONK)
        $('.listupd .bs, .listupd article, .post-show article').each((i, el) => {
            const a = $(el).find('a').first();
            const img = $(el).find('img').first();
            const title = $(el).find('.tt, h2, h3').first().text().trim() || a.attr('title');
            const href = a.attr('href') || '';

            if (href && title) {
                results.push({
                    title: title,
                    endpoint: href.replace(BASE_URL, '').replace(/\//g, '').replace('anime', ''),
                    thumbnail: img.attr('data-src') || img.attr('src'),
                    meta: $(el).find('.epx, .bt .ep').text().trim()
                });
            }
        });

        return res.status(200).json({ 
            status: 'success', 
            total: results.length, 
            data: results,
            debug_url: url 
        });

    } catch (err) {
        return res.status(200).json({ status: 'error', log: err.message });
    }
};