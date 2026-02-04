const axios = require('axios');
const cheerio = require('cheerio');

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') return res.status(200).end();

    const { q, endpoint, category, page } = req.query;
    // COBA DOMAIN BARU: Samehadaku sering ganti ke .email atau .care
    const BASE_URL = 'https://samehadaku.email'; 

    const config = {
        timeout: 5000, // Kecilin timeout biar gak bikin Vercel crash
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
            'Referer': 'https://samehadaku.email/',
            'Connection': 'keep-alive'
        }
    };

    try {
        let url = `${BASE_URL}/`;
        if (endpoint) {
            url = endpoint.includes('episode') ? `${BASE_URL}/${endpoint}/` : `${BASE_URL}/anime/${endpoint}/`;
        } else if (category === 'ongoing') {
            url = `${BASE_URL}/anime-ongoing/`;
        } else if (q) {
            url = `${BASE_URL}/?s=${encodeURIComponent(q)}`;
        }

        const p = parseInt(page) || 1;
        if (p > 1) url += `page/${p}/`;

        const response = await axios.get(url, config);
        const $ = cheerio.load(response.data);
        const results = [];

        // JALUR LISTING (ONGOING/HOME/SEARCH)
        if (!endpoint) {
            $('.animpost').each((i, el) => {
                const a = $(el).find('a').first();
                const img = $(el).find('img').first();
                const href = a.attr('href') || '';
                
                // Safety check biar gak crash pas split
                const ep = href.includes('/anime/') ? href.split('/anime/')[1]?.replace(/\//g, '') : href.split('.email/')[1]?.replace(/\//g, '');

                if (ep) {
                    results.push({
                        title: $(el).find('.title, h2').first().text().trim(),
                        endpoint: ep,
                        thumbnail: img.attr('src') || img.attr('data-src'),
                        score: $(el).find('.score').text().trim() || '0'
                    });
                }
            });
            return res.status(200).json({ status: 'success', total: results.length, data: results });
        }

        // JALUR DETAIL (DAPET PLAYER)
        return res.status(200).json({
            status: 'success',
            data: {
                title: $('.entry-title').first().text().trim(),
                player: $('.player-embed iframe').attr('src') || $('#pembed iframe').attr('src') || '',
            }
        });

    } catch (err) {
        // PREVENT 500: Selalu balikin JSON meskipun error
        return res.status(200).json({ 
            status: 'error', 
            message: "Samehadaku lagi ketat babi!", 
            log: err.message,
            tried_url: url 
        });
    }
};