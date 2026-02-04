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
        if (endpoint) {
            const targetUrl = `${BASE_URL}${endpoint}/`;
            const { data } = await axios.get(targetUrl, { headers, timeout: 15000 });
            const $ = cheerio.load(data);
            const downloadLinks = [];

            // TEKNIK BRUTAL: Sikat semua tag <a> di seluruh halaman
            $('a').each((i, el) => {
                const url = $(el).attr('href');
                const text = $(el).text().trim().toLowerCase();
                
                if (url && (url.includes('http')) && !url.includes('anoboy.si')) {
                    // Filter: Cari kata kunci download atau nama server populer
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
                // Kalo masih gagal, balikin HTML mentahnya (buat kita debug manual, babi!)
                return res.status(200).json({ status: 'fail', message: 'Masih zonk, babi! Cek manual!', url: targetUrl });
            }
        }

        // Jalur List Episode (Udah Berhasil)
        let targetUrl = q ? `${BASE_URL}?s=${encodeURIComponent(q)}` : BASE_URL;
        const { data } = await axios.get(targetUrl, { headers });
        const $ = cheerio.load(data);
        const results = [];

        $('.home-list .amv, .column-content .amv, article').each((i, el) => {
            const title = $(el).find('a').attr('title') || $(el).find('h3').text().trim();
            const link = $(el).find('a').attr('href');
            if (link) {
                const ep = link.replace(BASE_URL, '').replace(/\//g, '');
                if (title && ep && !ep.startsWith('series')) {
                    results.push({ title, endpoint: ep });
                }
            }
        });

        res.status(200).json({ status: 'success', total: results.length, data: results });

    } catch (err) {
        res.status(500).json({ status: 'error', message: err.message });
    }
};