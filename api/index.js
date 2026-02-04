const axios = require('axios');
const cheerio = require('cheerio');

module.exports = async (req, res) => {
    const { q, endpoint } = req.query;
    const BASE_URL = 'https://anoboy.si/';
    const headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
        'Referer': 'https://anoboy.si/'
    };

    try {
        let targetUrl = q ? `${BASE_URL}?s=${encodeURIComponent(q)}` : (endpoint ? `${BASE_URL}${endpoint}/` : BASE_URL);

        const { data } = await axios.get(targetUrl, { headers, timeout: 15000 });
        const $ = cheerio.load(data);
        const results = [];

        // 1. CARI LINK DOWNLOAD (Target Utama)
        // Kita coba sikat semua link yang ada di dalem div .v_links, .download, atau tabel
        const downloadElement = $('.v_links, .download, #isi-video, .video-content');
        if (downloadElement.length > 0) {
            const videoLinks = [];
            downloadElement.find('a').each((i, el) => {
                const url = $(el).attr('href');
                const text = $(el).text().trim();
                // Filter biar gak nangkep link navigasi atau iklan
                if (url && (url.includes('http') || url.includes('drive') || url.includes('mega'))) {
                    videoLinks.push({ server: text || 'Download Link', url: url });
                }
            });
            
            if (videoLinks.length > 0) {
                return res.status(200).json({ status: 'success', type: 'download_links', data: videoLinks });
            }
        }

        // 2. DAFTAR ANIME (Kalau bukan halaman nonton)
        $('.home-list .amv, .column-content .amv, article').each((i, el) => {
            const title = $(el).find('a').attr('title') || $(el).find('h3').text().trim();
            const link = $(el).find('a').attr('href');
            const ep = link?.replace(BASE_URL, '').replace(/\//g, '');
            if (title && ep && !ep.startsWith('series')) {
                results.push({ title, endpoint: ep });
            }
        });

        res.status(200).json({ status: 'success', total: results.length, data: results });

    } catch (err) {
        res.status(500).json({ status: 'error', message: "Anoboy emang ribet, babi!", detail: err.message });
    }
};