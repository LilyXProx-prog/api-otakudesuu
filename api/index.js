const axios = require('axios');
const cheerio = require('cheerio');

module.exports = async (req, res) => {
    const { q, endpoint } = req.query;
    const BASE_URL = 'https://anoboy.si/';
    const headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
        'Referer': 'https://anoboy.si/',
        'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7'
    };

    try {
        let targetUrl = q ? `${BASE_URL}?s=${encodeURIComponent(q)}` : (endpoint ? `${BASE_URL}${endpoint}/` : BASE_URL);

        const { data } = await axios.get(targetUrl, { headers, timeout: 15000 });
        const $ = cheerio.load(data);
        const results = [];

        // 1. SCAN SEMUA LINK DOWNLOAD (Termasuk di dalam tabel/list)
        // Kita sikat semua elemen yang biasanya nampung link download
        const downloadLinks = [];
        
        // Cari di div v_links, download, atau elemen video
        $('.v_links a, .download a, #isi-video a, .entry-content a').each((i, el) => {
            const url = $(el).attr('href');
            const text = $(el).text().trim();
            
            // Filter link yang beneran download (biasanya mengandung nama server)
            if (url && (url.includes('http') || url.includes('drive') || url.includes('mega')) && 
                !url.includes('anoboy.si') && !url.includes('facebook') && !url.includes('twitter')) {
                downloadLinks.push({ server: text || 'Mirror', url: url });
            }
        });

        if (downloadLinks.length > 0 && endpoint) {
            return res.status(200).json({ status: 'success', type: 'download_links', data: downloadLinks });
        }

        // 2. DAFTAR ANIME (Kalau bukan halaman nonton)
        $('.home-list .amv, .column-content .amv, article, .item').each((i, el) => {
            const title = $(el).find('a').attr('title') || $(el).find('h3').text().trim();
            const link = $(el).find('a').attr('href');
            
            if (link) {
                const ep = link.replace(BASE_URL, '').replace(/\//g, '');
                if (title && ep && !ep.startsWith('series') && !ep.startsWith('category')) {
                    results.push({ title, endpoint: ep });
                }
            }
        });

        res.status(200).json({ status: 'success', total: results.length, data: results });

    } catch (err) {
        res.status(500).json({ status: 'error', message: "Anoboy emang rewel, babi!", detail: err.message });
    }
};