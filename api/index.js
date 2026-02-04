const axios = require('axios');
const cheerio = require('cheerio');

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') return res.status(200).end();

    const { q, endpoint, category, page } = req.query;
    const BASE_URL = 'https://otakudesu.cloud'; // Cek domain terbaru kalo 404
    const headers = { 
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36' 
    };

    try {
        let url = `${BASE_URL}/`;

        // 1. DETAIL ANIME (Daftar Episode Lengkap)
        if (endpoint) {
            // Kita bersihin endpoint biar gak double slash
            url = `${BASE_URL}/anime/${endpoint.replace(/^\/|anime\//, '')}/`;
            const { data } = await axios.get(url, { headers, timeout: 8000 });
            const $ = cheerio.load(data);
            
            const episodes = [];
            $('.episodelist ul li').each((i, el) => {
                const a = $(el).find('a');
                if (a.attr('href')) {
                    episodes.push({
                        title: a.text().trim(),
                        // Ambil endpoint episodenya aja
                        endpoint: a.attr('href').replace(BASE_URL, '').replace(/\//g, '').replace('episode', '')
                    });
                }
            });

            return res.status(200).json({
                status: 'success',
                data: {
                    title: $('.jdlinfo h1').text().trim(),
                    thumbnail: $('.fotoanime img').attr('src'),
                    sinopsis: $('.sinopc').text().trim() || 'Sinopsis belum tersedia.',
                    genres: $('.infozin .infozingle').find('span:contains("Genre")').text().replace('Genre: ', '').trim(),
                    episodes: episodes
                }
            });
        }

        // 2. LIST NAVIGASI
        if (category === 'ongoing') url = `${BASE_URL}/ongoing-anime/`;
        else if (category === 'complete') url = `${BASE_URL}/complete-anime/`;
        else if (q) url = `${BASE_URL}/?s=${encodeURIComponent(q)}&post_type=anime`;

        // Pagination Safe
        const p = parseInt(page) || 1;
        if (p > 1) {
            url += category ? `page/${p}/` : `&page=${p}`;
        }

        const { data } = await axios.get(url, { headers, timeout: 8000 });
        const $ = cheerio.load(data);
        const results = [];

        // Selector list Otakudesu (venz)
        $('.venz ul li').each((i, el) => {
            const a = $(el).find('a');
            const href = a.attr('href');
            if (href) {
                results.push({
                    title: $(el).find('h2').text().trim(),
                    // Endpoint dibersihin biar cantik
                    endpoint: href.replace(BASE_URL, '').replace(/\//g, '').replace('anime', ''),
                    thumbnail: $(el).find('img').attr('src'),
                    epz: $(el).find('.epz').text().trim(),
                    date: $(el).find('.newnime').text().trim()
                });
            }
        });

        return res.status(200).json({ status: 'success', total: results.length, data: results });

    } catch (err) {
        return res.status(200).json({ 
            status: 'error', 
            message: "Otakudesu lagi maintenance babi!", 
            log: err.message,
            tried_url: url 
        });
    }
};