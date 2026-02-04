const axios = require('axios');
const cheerio = require('cheerio');

module.exports = async (req, res) => {
    const { q, endpoint } = req.query;
    // Header yang lebih manusiawi biar gak kena 403
    const headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9,id;q=0.8',
        'Referer': 'https://otakudesu.best/',
        'Connection': 'keep-alive'
    };
    const BASE_URL = 'https://otakudesu.best/';

    try {
        if (endpoint) {
            // Kita coba nembak langsung ke URL-nya, pastiin formatnya bener
            const targetUrl = endpoint.startsWith('http') ? endpoint : `${BASE_URL}episode/${endpoint}/`;
            const { data } = await axios.get(targetUrl, { headers, timeout: 10000 });
            const $ = cheerio.load(data);
            const downloadLinks = [];

            $('.download ul li').each((i, el) => {
                const resolution = $(el).find('strong').text().trim();
                const links = [];
                $(el).find('a').each((j, a) => {
                    links.push({ server: $(a).text().trim(), url: $(a).attr('href') });
                });
                if (resolution) downloadLinks.push({ resolution, links });
            });

            return res.status(200).json({ status: 'success', endpoint, download_links: downloadLinks });
        }

        let url = BASE_URL;
        if (q) url += `?s=${encodeURIComponent(q)}&post_type=anime`;

        const { data } = await axios.get(url, { headers, timeout: 10000 });
        const $ = cheerio.load(data);
        const results = [];
        const selector = q ? '.chivsrc li' : '.venz ul li';
        
        $(selector).each((i, el) => {
            const title = $(el).find('h2').text().trim();
            const link = $(el).find('a').attr('href');
            const ep = link?.split('/').filter(Boolean).pop();
            if (title) results.push({ title, endpoint: ep });
        });

        res.status(200).json({ status: 'success', total: results.length, data: results });
    } catch (err) {
        // Kasih info lebih detil biar kita tau siapa yang blokir
        res.status(err.response?.status || 500).json({ 
            status: 'error', 
            message: "Dihadang Cloudflare atau Otakudesu lemot, babi!",
            detail: err.message
        });
    }
};