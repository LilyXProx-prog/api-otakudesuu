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

        // 1. DETAIL JALUR (EPISODE/SERIES)
        if (endpoint) {
            targetUrl = `${BASE_URL}/${endpoint.replace(/^\//, '')}/`;
        } 
        // 2. NAVIGASI JALUR (MAPPING TERBARU - ANTI 404)
        else if (genre) {
            targetUrl = `${BASE_URL}/genre/${genre}/`;
        } else if (category) {
            // Kita coba tanpa prefix 'category/' karena sering bikin 404
            const catMap = { 
                'ongoing': 'anime-ongoing', // Anoboy sering ganti jadi ini
                'tamat': 'anime-tamat', 
                'movie': 'movie-anime', 
                'live-action': 'live-action' 
            };
            targetUrl = `${BASE_URL}/${catMap[category] || category}/`;
        } else if (q) {
            targetUrl = `${BASE_URL}/?s=${encodeURIComponent(q)}`;
        }

        // Pagination
        if (page && page > 1) {
            targetUrl += (targetUrl.includes('?') ? '&' : '') + `paged=${page}`;
        }

        const { data } = await axios.get(targetUrl, { headers });
        const $ = cheerio.load(data);

        // KONDISI A: KALO INI HALAMAN DETAIL (Ada Player)
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

        // KONDISI B: KALO INI HALAMAN LIST (Home/Category/Search)
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
        // Kalo gagal 404 lagi, kita coba fallback ke URL category lama
        if (err.response?.status === 404 && category && !targetUrl.includes('category/')) {
            return res.redirect(`/api?category=category/${category}`);
        }
        res.status(err.response?.status || 500).json({ 
            status: 'error', 
            message: "Anoboy emang rewel, babi!", 
            url: targetUrl 
        });
    }
};