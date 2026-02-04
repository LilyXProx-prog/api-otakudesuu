const axios = require('axios');
const cheerio = require('cheerio');

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();

    const { q, endpoint, category, genre, page } = req.query;
    const BASE_URL = 'https://anoboy.si/';
    const headers = { 
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
        'Referer': 'https://anoboy.si/',
        'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7'
    };

    try {
        if (endpoint) {
            const { data } = await axios.get(`${BASE_URL}${endpoint}/`, { headers, timeout: 15000 });
            const $ = cheerio.load(data);
            
            // 1. CARI VIDEO PLAYER (EMBED)
            const embedUrl = $('iframe').first().attr('src') || 
                             $('video source').attr('src') || 
                             $('#video_embed iframe').attr('src');

            // 2. CARI SINOPSIS (SELECTOR CADANGAN)
            const sinopsis = $('.contentp').text().trim() || 
                             $('.entry-content p').text().trim() || 
                             $('#informasi').next().text().trim() ||
                             'Sinopsis lagi dicari, babi!';

            const downloads = [];
            $('a').each((i, el) => {
                const url = $(el).attr('href');
                const text = $(el).text().trim().toLowerCase();
                if (url && (url.includes('http')) && !url.includes('anoboy.si')) {
                    if (/download|mirror|drive|mega|720p|480p|360p/.test(text) || /gdrive|mp4upload/.test(url)) {
                        downloads.push({ server: $(el).text().trim() || `Server ${i}`, url });
                    }
                }
            });

            return res.status(200).json({
                status: 'success',
                data: {
                    title: $('.entry-title').text().trim(),
                    player: embedUrl,
                    sinopsis,
                    downloads
                }
            });
        }

        // 3. JALUR LIST (SELECTOR BARU)
        let targetUrl = q ? `${BASE_URL}?s=${encodeURIComponent(q)}` : (category ? `${BASE_URL}category/${category}/` : (genre ? `${BASE_URL}genre/${genre}/` : BASE_URL));
        if (page && page > 1) targetUrl += (q ? `&paged=${page}` : `page/${page}/`);

        const { data } = await axios.get(targetUrl, { headers });
        const $ = cheerio.load(data);
        const results = [];

        // Selector list episode yang lebih luas
        $('.amv, article, .item, .home-list li').each((i, el) => {
            const a = $(el).find('a').first();
            const title = a.attr('title') || $(el).find('h3').text().trim();
            const link = a.attr('href');
            const thumb = $(el).find('img').attr('src');

            if (link && title) {
                const ep = link.replace(BASE_URL, '').replace(/\//g, '');
                if (!ep.startsWith('category') && !ep.startsWith('author')) {
                    results.push({ title, endpoint: ep, thumbnail: thumb });
                }
            }
        });

        res.status(200).json({ status: 'success', total: results.length, data: results });

    } catch (err) {
        res.status(500).json({ status: 'error', message: "Anoboy lagi galak, babi!", detail: err.message });
    }
};