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

        const { data } = await axios.get(targetUrl, { headers, timeout: 10000 });
        const $ = cheerio.load(data);
        const results = [];

        // PRIORITAS 1: AMBIL LINK DOWNLOAD/VIDEO (Khusus Halaman Nonton)
        // Kita cari di div .v_links atau .download
        if ($('.v_links, .download').length > 0) {
            const videoData = [];
            $('.v_links a, .download a').each((i, el) => {
                const link = $(el).attr('href');
                const server = $(el).text().trim();
                if (link && !link.includes('javascript')) {
                    videoData.push({ server, url: link });
                }
            });
            // Kalo ketemu link download, langsung balikin hasilnya
            if (videoData.length > 0) {
                return res.status(200).json({ status: 'success', type: 'download_links', data: videoData });
            }
        }

        // PRIORITAS 2: DAFTAR ANIME (Search & Home)
        const selector = '.home-list .amv, .column-content .amv, article';
        $(selector).each((i, el) => {
            const title = $(el).find('a').attr('title');
            const link = $(el).find('a').attr('href');
            const thumb = $(el).find('img').attr('src');
            const ep = link?.replace(BASE_URL, '').replace(/\//g, '');
            
            if (title && ep && !ep.startsWith('series')) { // Filter biar gak nangkep link series
                results.push({ title, endpoint: ep, thumbnail: thumb });
            }
        });

        res.status(200).json({ status: 'success', total: results.length, data: results });

    } catch (err) {
        res.status(500).json({ status: 'error', message: "Gagal narik data Anoboy, babi!", detail: err.message });
    }
};