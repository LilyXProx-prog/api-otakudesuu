const axios = require('axios');
const cheerio = require('cheerio');

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') return res.status(200).end();

    const { q, endpoint, category, page } = req.query;
    const BASE_URL = 'https://otakudesu.best'; // Update domain sesuai JSON lu
    const headers = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36' };

    try {
        let url = `${BASE_URL}/`;

        // 1. DETAIL ANIME (Daftar Episode)
        if (endpoint && !endpoint.includes('episode')) {
            url = `${BASE_URL}/anime/${endpoint.replace(/^\/|anime\//, '')}/`;
            const { data } = await axios.get(url, { headers });
            const $ = cheerio.load(data);
            const episodes = [];
            $('.episodelist ul li').each((i, el) => {
                const a = $(el).find('a');
                episodes.push({
                    title: a.text().trim(),
                    endpoint: a.attr('href').split('/episode/')[1]?.replace(/\//g, '') || ''
                });
            });
            return res.status(200).json({
                status: 'success',
                type: 'anime_info',
                data: {
                    title: $('.jdlinfo h1').text().trim(),
                    thumbnail: $('.fotoanime img').attr('src'),
                    sinopsis: $('.sinopc').text().trim(),
                    episodes: episodes
                }
            });
        }

        // 2. LIST (HOME / ONGOING / SEARCH)
        if (category === 'ongoing') url = `${BASE_URL}/ongoing-anime/`;
        else if (q) url = `${BASE_URL}/?s=${encodeURIComponent(q)}&post_type=anime`;

        const p = parseInt(page) || 1;
        if (p > 1) url += category ? `page/${p}/` : `&page=${p}`;

        const { data } = await axios.get(url, { headers });
        const $ = cheerio.load(data);
        const results = [];

        $('.venz ul li').each((i, el) => {
            const a = $(el).find('a').first();
            const rawHref = a.attr('href') || '';
            // Bersihin endpoint biar cuma slug-nya aja
            const cleanEndpoint = rawHref.split('/anime/')[1]?.replace(/\//g, '') || rawHref.split('/episode/')[1]?.replace(/\//g, '');
            
            results.push({
                title: $(el).find('h2').text().trim(),
                endpoint: cleanEndpoint,
                thumbnail: $(el).find('img').attr('src'),
                meta: $(el).find('.epz').text().trim() || $(el).find('.newnime').text().trim()
            });
        });

        return res.status(200).json({ status: 'success', total: results.length, data: results });

    } catch (err) {
        return res.status(200).json({ status: 'error', message: "API Batuk babi!", log: err.message });
    }
};