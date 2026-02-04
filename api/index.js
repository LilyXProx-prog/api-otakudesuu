const axios = require('axios');
const cheerio = require('cheerio');

module.exports = async (req, res) => {
    const { q, endpoint } = req.query;
    const BASE_URL = 'https://anoboy.ninja/';
    const headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
        'Referer': 'https://anoboy.ninja/'
    };

    try {
        let targetUrl = BASE_URL;
        if (q) {
            targetUrl = `${BASE_URL}?s=${encodeURIComponent(q)}`;
        } else if (endpoint) {
            targetUrl = `${BASE_URL}${endpoint}/`;
        }

        const { data } = await axios.get(targetUrl, { headers, timeout: 10000 });
        const $ = cheerio.load(data);
        const results = [];

        // 1. LOGIKA DETAIL VIDEO (Jika ada di halaman episode)
        if ($('#isi-video').length > 0 || $('.v_links').length > 0) {
            const videoLinks = [];
            // Ambil Embed
            $('iframe').each((i, el) => {
                const src = $(el).attr('src');
                if (src) videoLinks.push({ type: 'embed', url: src });
            });
            // Ambil Link Download manual
            $('.v_links a').each((i, el) => {
                videoLinks.push({ server: $(el).text().trim(), url: $(el).attr('href') });
            });
            return res.status(200).json({ status: 'success', type: 'video_links', data: videoLinks });
        }

        // 2. LOGIKA DAFTAR ANIME (Home & Search)
        // Anoboy biasanya pake .home-list atau article
        $('.column-content .amv, .home-list .amv, article').each((i, el) => {
            const title = $(el).find('a').attr('title') || $(el).find('h3').text().trim();
            const rawLink = $(el).find('a').attr('href');
            const thumb = $(el).find('img').attr('src');
            
            // Bersihin endpoint biar gak double slash
            const ep = rawLink?.replace(BASE_URL, '').replace(/\//g, '');
            
            if (title && ep) {
                results.push({ title, endpoint: ep, thumbnail: thumb });
            }
        });

        res.status(200).json({ status: 'success', total: results.length, data: results });

    } catch (err) {
        res.status(err.response?.status || 500).json({ 
            status: 'error', 
            message: "Anoboy nolak lagi, babi!", 
            detail: err.message 
        });
    }
};