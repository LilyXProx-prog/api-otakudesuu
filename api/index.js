const axios = require('axios');
const cheerio = require('cheerio');

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') return res.status(200).end();

    const { q, endpoint, category, page } = req.query;
    const BASE_URL = 'https://otakudesu.cloud'; 
    const headers = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36' };

    try {
        let url = `${BASE_URL}/`;

        // 1. JALUR NONTON (EPISODE DETAIL)
        if (endpoint && endpoint.includes('episode')) {
            url = `${BASE_URL}/episode/${endpoint.replace(/^\/|episode\//, '')}/`;
            const { data } = await axios.get(url, { headers });
            const $ = cheerio.load(data);
            
            const downloads = [];
            $('.download ul li').each((i, el) => {
                const quality = $(el).find('strong').text().trim();
                const links = [];
                $(el).find('a').each((j, a) => {
                    links.push({ server: $(a).text().trim(), url: $(a).attr('href') });
                });
                downloads.push({ quality, links });
            });

            return res.status(200).json({
                status: 'success',
                type: 'episode',
                data: {
                    title: $('.venutama h1').text().trim(),
                    player: $('.responsive-embed-stream iframe').attr('src'),
                    downloads: downloads
                }
            });
        }

        // 2. JALUR INFO ANIME (LIST EPISODE)
        if (endpoint) {
            url = `${BASE_URL}/anime/${endpoint.replace(/^\/|anime\//, '')}/`;
            const { data } = await axios.get(url, { headers });
            const $ = cheerio.load(data);
            
            const episodes = [];
            $('.episodelist ul li').each((i, el) => {
                const a = $(el).find('a');
                episodes.push({
                    title: a.text().trim(),
                    endpoint: a.attr('href').replace(BASE_URL, '').replace(/\/|episode\//g, '')
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

        // 3. JALUR LIST (HOME, ONGOING, COMPLETE, SEARCH)
        if (category === 'ongoing') url = `${BASE_URL}/ongoing-anime/`;
        else if (category === 'complete') url = `${BASE_URL}/complete-anime/`;
        else if (q) url = `${BASE_URL}/?s=${encodeURIComponent(q)}&post_type=anime`;

        const p = parseInt(page) || 1;
        if (p > 1) url += category ? `page/${p}/` : `&page=${p}`;

        const { data } = await axios.get(url, { headers });
        const $ = cheerio.load(data);
        const results = [];

        $('.venz ul li').each((i, el) => {
            const a = $(el).find('a');
            results.push({
                title: $(el).find('h2').text().trim(),
                endpoint: a.attr('href').replace(BASE_URL, '').replace(/\/|anime\//g, ''),
                thumbnail: $(el).find('img').attr('src'),
                meta: $(el).find('.epz').text().trim() || $(el).find('.newnime').text().trim()
            });
        });

        return res.status(200).json({ status: 'success', total: results.length, data: results });

    } catch (err) {
        return res.status(200).json({ status: 'error', message: "API Batuk babi!", log: err.message });
    }
};