const axios = require('axios');
const cheerio = require('cheerio');

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') return res.status(200).end();

    const { q, endpoint, category, page } = req.query;
    const BASE_URL = 'https://otakudesu.best'; 
    
    // TOPENG PENYAMARAN (ANTI-403)
    const headers = { 
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
        'Referer': 'https://otakudesu.best/',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
        'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
        'Cache-Control': 'max-age=0'
    };

    try {
        let url = `${BASE_URL}/`;

        if (endpoint && !endpoint.includes('episode')) {
            url = `${BASE_URL}/anime/${endpoint.replace(/^\/|anime\//, '')}/`;
        } else if (category === 'ongoing') {
            url = `${BASE_URL}/ongoing-anime/`;
        } else if (q) {
            url = `${BASE_URL}/?s=${encodeURIComponent(q)}&post_type=anime`;
        }

        const p = parseInt(page) || 1;
        if (p > 1) url += category ? `page/${p}/` : `&page=${p}`;

        // REQUEST DENGAN TIMEOUT DAN HEADERS LENGKAP
        const { data } = await axios.get(url, { headers, timeout: 8000 });
        const $ = cheerio.load(data);
        const results = [];

        // KALO DETAIL ANIME
        if (endpoint && !endpoint.includes('episode')) {
            const episodes = [];
            $('.episodelist ul li').each((i, el) => {
                const a = $(el).find('a');
                episodes.push({
                    title: a.text().trim(),
                    endpoint: a.attr('href')?.split('/episode/')[1]?.replace(/\//g, '') || ''
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

        // KALO LIST
        $('.venz ul li').each((i, el) => {
            const a = $(el).find('a').first();
            const rawHref = a.attr('href') || '';
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
        // FALLBACK: Kalo 403, kasih tau jalurnya rill
        return res.status(200).json({ 
            status: 'error', 
            message: "Otakudesu nge-block Vercel lu, babi!", 
            log: err.message,
            tried_url: url 
        });
    }
};