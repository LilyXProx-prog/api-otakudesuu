const axios = require('axios');
const cheerio = require('cheerio');

module.exports = async (req, res) => {
    const { q, endpoint } = req.query;
    const BASE_URL = 'https://anoboy.ninja/';
    const headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
    };

    try {
        let targetUrl = BASE_URL;
        
        // Logika Search
        if (q) {
            targetUrl = `${BASE_URL}?s=${encodeURIComponent(q)}`;
        } 
        // Logika Detail Episode/Anime
        else if (endpoint) {
            targetUrl = `${BASE_URL}${endpoint}/`;
        }

        const { data } = await axios.get(targetUrl, { headers, timeout: 10000 });
        const $ = cheerio.load(data);
        const results = [];

        // 1. Ambil Link Download/Video (Jika di halaman detail)
        if ($('.download').length > 0 || $('#isi-video').length > 0) {
            const videoLinks = [];
            $('#isi-video iframe').each((i, el) => {
                videoLinks.push({ server: 'Embed Player', url: $(el).attr('src') });
            });
            // Link Download manual biasanya ada di dalam .download
            $('.download a').each((i, el) => {
                videoLinks.push({ server: $(el).text().trim(), url: $(el).attr('href') });
            });
            return res.status(200).json({ status: 'success', type: 'video', data: videoLinks });
        }

        // 2. Daftar Anime (Home & Search)
        $('.column-content a').each((i, el) => {
            const title = $(el).attr('title');
            const link = $(el).attr('href');
            const thumb = $(el).find('img').attr('src');
            const ep = link?.replace(BASE_URL, '').replace(/\//g, '');
            
            if (title && ep) {
                results.push({ title, endpoint: ep, thumbnail: thumb });
            }
        });

        res.status(200).json({ status: 'success', total: results.length, data: results });

    } catch (err) {
        res.status(err.response?.status || 500).json({ 
            status: 'error', 
            message: "Gagal nembak Anoboy, babi!", 
            detail: err.message 
        });
    }
};