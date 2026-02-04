const axios = require('axios');
const cheerio = require('cheerio');

module.exports = async (req, res) => {
    // KUNCI BIAR GAK GAGAL NARIK DATA (CORS FIX)
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
    );

    // Tangani preflight request
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    const { q, endpoint } = req.query;
    const BASE_URL = 'https://anoboy.si/';
    const headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
        'Referer': 'https://anoboy.si/'
    };

    try {
        // 1. JALUR DETAIL EPISODE / DOWNLOAD
        if (endpoint) {
            const targetUrl = `${BASE_URL}${endpoint}/`;
            const { data } = await axios.get(targetUrl, { headers, timeout: 15000 });
            const $ = cheerio.load(data);
            const downloadLinks = [];

            // TEKNIK BRUTAL: Sikat semua tag <a>
            $('a').each((i, el) => {
                const url = $(el).attr('href');
                const text = $(el).text().trim().toLowerCase();
                
                if (url && (url.includes('http')) && !url.includes('anoboy.si')) {
                    const isDownload = /download|mirror|drive|mega|zippyshare|mediafire|720p|480p|360p/.test(text) || 
                                     /gdrive|mp4upload|odrive/.test(url.toLowerCase());
                    
                    if (isDownload) {
                        downloadLinks.push({ 
                            server: $(el).text().trim() || `Link ${i}`, 
                            url: url 
                        });
                    }
                }
            });

            if (downloadLinks.length > 0) {
                return res.status(200).json({ status: 'success', type: 'download_links', endpoint, data: downloadLinks });
            } else {
                return res.status(200).json({ status: 'fail', message: 'Gak nemu link download, babi!', url: targetUrl });
            }
        }

        // 2. JALUR LIST EPISODE / SEARCH
        let targetUrl = q ? `${BASE_URL}?s=${encodeURIComponent(q)}` : BASE_URL;
        const { data } = await axios.get(targetUrl, { headers });
        const $ = cheerio.load(data);
        const results = [];

        $('.home-list .amv, .column-content .amv, article').each((i, el) => {
            const title = $(el).find('a').attr('title') || $(el).find('h3').text().trim();
            const link = $(el).find('a').attr('href');
            const thumb = $(el).find('img').attr('src'); // Tambahin thumbnail biar web lu cakep

            if (link) {
                const ep = link.replace(BASE_URL, '').replace(/\//g, '');
                if (title && ep && !ep.startsWith('series')) {
                    results.push({ title, endpoint: ep, thumbnail: thumb });
                }
            }
        });

        res.status(200).json({ status: 'success', total: results.length, data: results });

    } catch (err) {
        res.status(500).json({ status: 'error', message: err.message });
    }
};