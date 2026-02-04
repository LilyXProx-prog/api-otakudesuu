const axios = require('axios');
const cheerio = require('cheerio');

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') return res.status(200).end();

    const { q, endpoint, category, genre, page } = req.query;
    const BASE_URL = 'https://anoboy.si';
    const headers = { 
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
        'Referer': 'https://anoboy.si/' 
    };

    try {
        let targetUrl = `${BASE_URL}/`;

        // 1. DETAIL JALUR
        if (endpoint) {
            targetUrl = `${BASE_URL}/${endpoint.replace(/^\//, '')}/`;
        } 
        // 2. NAVIGASI JALUR (FIXED MAPPING 2026)
        else if (genre) {
            targetUrl = `${BASE_URL}/genre/${genre}/`;
        } else if (category) {
            // INI MAPPING TERBARU BIAR GAK 404 LAGI, BABI!
            const catMap = { 
                'ongoing': 'anime-ongoing', // Mereka ganti dari category/ongoing ke ini
                'tamat': 'anime-tamat', 
                'movie': 'movie-anime', 
                'live-action': 'live-action-series' 
            };
            targetUrl = `${BASE_URL}/${catMap[category] || category}/`;
        } else if (q) {
            targetUrl = `${BASE_URL}/?s=${encodeURIComponent(q)}`;
        }

        // Pagination format terbaru
        if (page && page > 1) {
            targetUrl += (targetUrl.includes('?') ? '&' : '') + `paged=${page}`;
            // Khusus kategori folder-based, kadang pake /page/X/
            if (!q && !targetUrl.includes('?')) {
                targetUrl = targetUrl.replace(/\/$/, '') + `/page/${page}/`;
            }
        }

        const { data } = await axios.get(targetUrl, { headers, timeout: 10000 });
        const $ = cheerio.load(data);

        // ... (Logika Detail & List tetep sama kayak kodingan sebelumnya) ...
        if (endpoint) {
            const episodes = [];
            $('.host-link a, .video-nav a, .list-eps a').each((i, el) => {
                const link = $(el).attr('href');
                if (link && link.includes('anoboy.si')) {
                    episodes.push({ 
                        title: $(el).text().trim(), 
                        endpoint: link.replace(BASE_URL, '').replace(/\//g, '') 
                    });
                }
            });

            const downloads = [];
            $('a').each((i, el) => {
                const url = $(el).attr('href');
                if (url && url.includes('http') && !url.includes('anoboy.si')) {
                    if (/download|mirror|drive|mega|720p|480p|360p/.test($(el).text().toLowerCase())) {
                        downloads.push({ server: $(el).text().trim(), url });
                    }
                }
            });

            return res.status(200).json({
                status: 'success',
                data: {
                    title: $('.entry-title').text().trim(),
                    player: $('iframe').first().attr('src'),
                    sinopsis: $('.contentp').text().trim() || $('.entry-content p').text().trim(),
                    full_episodes: episodes,
                    downloads
                }
            });
        }

        const results = [];
        $('.amv, article, .item').each((i, el) => {
            const a = $(el).find('a').first();
            const link = a.attr('href');
            if (link) {
                results.push({
                    title: a.attr('title') || $(el).find('h3').text().trim(),
                    endpoint: link.replace(BASE_URL, '').replace(/\//g, ''),
                    thumbnail: $(el).find('img').attr('src'),
                    meta: $(el).find('.jam, .ep').text().trim()
                });
            }
        });

        res.status(200).json({ status: 'success', total: results.length, data: results });

    } catch (err) {
        // FALLBACK JALUR TERAKHIR (Kalo masih 404, kita paksa balik ke home)
        res.status(200).json({ 
            status: 'error', 
            message: "Anoboy ganti struktur lagi, babi!",
            tried_url: targetUrl
        });
    }
};