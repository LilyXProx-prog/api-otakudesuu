const axios = require('axios');
const cheerio = require('cheerio');

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') return res.status(200).end();

    const { q, endpoint, category, page } = req.query;
    const BASE_URL = 'https://anoboy.si/';
    const headers = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36', 'Referer': 'https://anoboy.si/' };

    try {
        if (endpoint) {
            const { data } = await axios.get(`${BASE_URL}${endpoint}/`, { headers });
            const $ = cheerio.load(data);
            
            // Scrape List Episode (1, 2, 3...) yang ada di halaman nonton
            const allEpisodes = [];
            $('.host-link a, .video-nav a, .list-eps a').each((i, el) => {
                const title = $(el).text().trim();
                const link = $(el).attr('href');
                if (link && link.includes('anoboy.si')) {
                    allEpisodes.push({ 
                        episode: title, 
                        endpoint: link.replace(BASE_URL, '').replace(/\//g, '') 
                    });
                }
            });

            const downloads = [];
            $('a').each((i, el) => {
                const url = $(el).attr('href');
                const text = $(el).text().trim().toLowerCase();
                if (url && url.includes('http') && !url.includes('anoboy.si')) {
                    if (/download|mirror|drive|mega|720p|480p|360p/.test(text) || /gdrive|mp4upload/.test(url)) {
                        downloads.push({ server: $(el).text().trim() || `Link ${i}`, url });
                    }
                }
            });

            return res.status(200).json({
                status: 'success',
                type: 'detail',
                data: {
                    title: $('.entry-title').text().trim(),
                    player: $('iframe').first().attr('src'),
                    sinopsis: $('.contentp').text().trim() || 'Sinopsis belum tersedia.',
                    episodes: allEpisodes, // INI LIST EPISODE LAINNYA, BABI!
                    downloads
                }
            });
        }

        // Jalur List dengan Kategori yang Diperbaiki
        let targetUrl = BASE_URL;
        if (category) {
            // Mapping kategori biar gak typo
            const catMap = { 'ongoing': 'category/ongoing', 'tamat': 'category/anime-tamat', 'movie': 'category/movie-anime', 'live-action': 'category/live-action' };
            targetUrl = `${BASE_URL}${catMap[category] || category}/`;
        } else if (q) {
            targetUrl = `${BASE_URL}?s=${encodeURIComponent(q)}`;
        }

        if (page && page > 1) targetUrl += (q ? `&paged=${page}` : `page/${page}/`);

        const { data } = await axios.get(targetUrl, { headers });
        const $ = cheerio.load(data);
        const results = [];

        $('.amv, article, .item').each((i, el) => {
            const a = $(el).find('a').first();
            const title = a.attr('title') || $(el).find('h3').text().trim();
            const link = a.attr('href');
            if (link && title) {
                results.push({
                    title,
                    endpoint: link.replace(BASE_URL, '').replace(/\//g, ''),
                    thumbnail: $(el).find('img').attr('src')
                });
            }
        });

        res.status(200).json({ status: 'success', total: results.length, data: results });
    } catch (err) { res.status(500).json({ status: 'error', message: err.message }); }
};