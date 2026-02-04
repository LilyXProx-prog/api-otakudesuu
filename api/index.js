const axios = require('axios');
const cheerio = require('cheerio');

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') return res.status(200).end();

    const { q, endpoint, category, page } = req.query;
    // Update domain ini kalau mereka pindah (Check samehadaku.care / samehadaku.email)
    const BASE_URL = 'https://samehadaku.email'; 
    const headers = { 
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
        'Referer': BASE_URL
    };

    try {
        let url = `${BASE_URL}/`;

        // 1. JALUR STREAMING (EPISODE)
        if (endpoint && endpoint.includes('-episode-')) {
            url = `${BASE_URL}/${endpoint.replace(/^\//, '')}/`;
            const { data } = await axios.get(url, { headers, timeout: 8000 });
            const $ = cheerio.load(data);
            
            return res.status(200).json({
                status: 'success',
                type: 'streaming',
                data: {
                    title: $('.entry-title').text().trim(),
                    player: $('.player-embed iframe').attr('src') || $('#pembed iframe').attr('src') || '',
                    prev: $('.nvs.prev a').attr('href')?.replace(BASE_URL, '').replace(/\//g, '') || '',
                    next: $('.nvs.next a').attr('href')?.replace(BASE_URL, '').replace(/\//g, '') || ''
                }
            });
        }

        // 2. JALUR DETAIL ANIME (DAFTAR EPISODE LENGKAP)
        if (endpoint) {
            url = `${BASE_URL}/anime/${endpoint.replace(/^\/|anime\//, '')}/`;
            const { data } = await axios.get(url, { headers, timeout: 8000 });
            const $ = cheerio.load(data);
            
            const episodes = [];
            $('.lstepsiode ul li').each((i, el) => {
                const a = $(el).find('a');
                episodes.push({
                    title: a.text().trim(),
                    date: $(el).find('.resoci').text().trim(),
                    endpoint: a.attr('href').replace(BASE_URL, '').replace(/\//g, '')
                });
            });

            return res.status(200).json({
                status: 'success',
                type: 'anime_detail',
                data: {
                    title: $('.entry-title').text().trim(),
                    thumbnail: $('.thumb img').attr('src'),
                    score: $('.rating strong').text().replace('Rating ', '').trim(),
                    sinopsis: $('.entry-content p').first().text().trim(),
                    episodes: episodes
                }
            });
        }

        // 3. JALUR LISTING (ONGOING, COMPLETE, SEARCH)
        if (q) url = `${BASE_URL}/?s=${encodeURIComponent(q)}`;
        else if (category === 'ongoing') url = `${BASE_URL}/anime-ongoing/`;
        else if (category === 'complete') url = `${BASE_URL}/anime-completed/`;
        else url = `${BASE_URL}/daftar-anime-2/`; // Default: List All

        const p = parseInt(page) || 1;
        if (p > 1) url += (url.includes('?') ? '&' : '') + `page/${p}/`;

        const { data } = await axios.get(url, { headers, timeout: 10000 });
        const $ = cheerio.load(data);
        const results = [];

        $('.animpost').each((i, el) => {
            const a = $(el).find('a').first();
            const img = $(el).find('img').first();
            const href = a.attr('href') || '';
            
            results.push({
                title: $(el).find('.title').text().trim(),
                endpoint: href.replace(BASE_URL, '').replace(/\//g, '').replace('anime', ''),
                thumbnail: img.attr('src'),
                score: $(el).find('.score').text().trim(),
                type: $(el).find('.type').text().trim()
            });
        });

        return res.status(200).json({ status: 'success', total: results.length, data: results });

    } catch (err) {
        return res.status(200).json({ 
            status: 'error', 
            message: "Samehadaku lagi rapat babi!", 
            log: err.message,
            tried: url
        });
    }
};