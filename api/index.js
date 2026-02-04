const axios = require('axios');
const cheerio = require('cheerio');

module.exports = async (req, res) => {
    const { q, endpoint } = req.query;
    const headers = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36' };
    const BASE_URL = 'https://otakudesu.best/';

    try {
        // FITUR 1: AMBIL DETAIL DOWNLOAD (Kalau ada parameter endpoint)
        if (endpoint) {
            const { data } = await axios.get(`${BASE_URL}episode/${endpoint}/`, { headers });
            const $ = cheerio.load(data);
            const downloadLinks = [];

            $('.download ul li').each((i, el) => {
                const resolution = $(el).find('strong').text().trim();
                const links = [];
                $(el).find('a').each((j, a) => {
                    links.push({ server: $(a).text().trim(), url: $(a).attr('href') });
                });
                downloadLinks.push({ resolution, links });
            });

            return res.status(200).json({ status: 'success', endpoint, download_links: downloadLinks });
        }

        // FITUR 2: HOME & SEARCH (Default)
        let url = BASE_URL;
        if (q) url += `?s=${encodeURIComponent(q)}&post_type=anime`;

        const { data } = await axios.get(url, { headers, timeout: 8000 });
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
        res.status(500).json({ status: 'error', message: err.message });
    }
};