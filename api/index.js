const axios = require('axios');
const cheerio = require('cheerio');

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') return res.status(200).end();

    const { q, endpoint, category, genre, page } = req.query;
    const BASE_URL = 'https://otakudesu.best'; 
    const headers = { 
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
        'Referer': 'https://otakudesu.best/'
    };

    try {
        let url = `${BASE_URL}/`;

        // 1. JALUR STREAMING (EPISODE)
        if (endpoint && (endpoint.includes('episode') || endpoint.includes('eps'))) {
            url = `${BASE_URL}/episode/${endpoint.replace(/^\/|episode\//, '')}/`;
            const { data } = await axios.get(url, { headers, timeout: 8000 });
            const $ = cheerio.load(data);
            
            return res.status(200).json({
                status: 'success',
                type: 'streaming',
                data: {
                    title: $('.venutama h1').text().trim(),
                    // Ambil player pertama (biasanya HD/360p tergantung server)
                    player: $('.responsive-embed-stream iframe').attr('src') || $('#pembed iframe').attr('src') || '',
                }
            });
        }

        // 2. JALUR DETAIL ANIME (LIST SEMUA EPISODE)
        if (endpoint) {
            url = `${BASE_URL}/anime/${endpoint.replace(/^\/|anime\//, '')}/`;
            const { data } = await axios.get(url, { headers, timeout: 8000 });
            const $ = cheerio.load(data);
            
            const episodes = [];
            $('.episodelist ul li').each((i, el) => {
                const a = $(el).find('a');
                const href = a.attr('href') || '';
                if (href.includes('/episode/')) {
                    episodes.push({
                        title: a.text().trim(),
                        endpoint: href.split('/episode/')[1]?.replace(/\//g, '')
                    });
                }
            });

            return res.status(200).json({
                status: 'success',
                type: 'anime_detail',
                data: {
                    title: $('.jdlinfo h1').text().trim(),
                    thumbnail: $('.fotoanime img').attr('src'),
                    sinopsis: $('.sinopc').text().trim(),
                    genres: $('.infozin .infozingle').find('span:contains("Genre")').text().replace('Genre: ', '').trim(),
                    episodes: episodes.reverse() // Urutin dari episode 1
                }
            });
        }

        // 3. JALUR LIST (ONGOING, COMPLETE, GENRE, SEARCH)
        if (genre) url = `${BASE_URL}/genres/${genre}/`;
        else if (category === 'ongoing') url = `${BASE_URL}/ongoing-anime/`;
        else if (category === 'complete') url = `${BASE_URL}/complete-anime/`;
        else if (q) url = `${BASE_URL}/?s=${encodeURIComponent(q)}&post_type=anime`;

        const p = parseInt(page) || 1;
        if (p > 1) url += category || genre ? `page/${p}/` : `&page=${p}`;

        const { data } = await axios.get(url, { headers, timeout: 8000 });
        const $ = cheerio.load(data);
        const results = [];

        $('.venz ul li').each((i, el) => {
            const a = $(el).find('a').first();
            const href = a.attr('href') || '';
            const ep = href.split('/anime/')[1]?.replace(/\//g, '') || href.split('/episode/')[1]?.replace(/\//g, '');
            
            if (ep) {
                results.push({
                    title: $(el).find('h2').text().trim(),
                    endpoint: ep,
                    thumbnail: $(el).find('img').attr('src'),
                    meta: $(el).find('.epz').text().trim() || $(el).find('.newnime').text().trim()
                });
            }
        });

        return res.status(200).json({ status: 'success', total: results.length, data: results });

    } catch (err) {
        return res.status(200).json({ 
            status: 'error', 
            message: "Otakudesu lagi sensi babi!", 
            log: err.message 
        });
    }
};