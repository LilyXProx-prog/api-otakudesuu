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
        // 1. JALUR DETAIL EPISODE (Jika ada parameter endpoint)
        if (endpoint) {
            const targetUrl = `${BASE_URL}${endpoint}/`;
            const { data } = await axios.get(targetUrl, { headers, timeout: 15000 });
            const $ = cheerio.load(data);
            const downloadLinks = [];

            // Selector super luas khusus halaman nonton
            $('.v_links a, .download a, #isi-video a, .entry-content a').each((i, el) => {
                const url = $(el).attr('href');
                const text = $(el).text().trim();
                if (url && (url.includes('http') || url.includes('drive') || url.includes('mega')) && !url.includes('anoboy.si')) {
                    downloadLinks.push({ server: text || `Link ${i+1}`, url: url });
                }
            });

            if (downloadLinks.length > 0) {
                return res.status(200).json({ status: 'success', type: 'download_links', endpoint, data: downloadLinks });
            } else {
                return res.status(200).json({ status: 'fail', message: 'Gak nemu link download di halaman ini, babi!', url: targetUrl });
            }
        }

        // 2. JALUR SEARCH & HOME (Jika gak ada endpoint)
        let targetUrl = q ? `${BASE_URL}?s=${encodeURIComponent(q)}` : BASE_URL;
        const { data } = await axios.get(targetUrl, { headers, timeout: 15000 });
        const $ = cheerio.load(data);
        const results = [];

        $('.home-list .amv, .column-content .amv, article').each((i, el) => {
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
        res.status(500).json({ status: 'error', message: "Anoboy emang rewel!", detail: err.message });
    }
};