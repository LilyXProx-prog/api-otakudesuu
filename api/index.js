const axios = require('axios');
const cheerio = require('cheerio');

module.exports = async (req, res) => {
    const { q } = req.query;
    const headers = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36' };

    try {
        let url = 'https://otakudesu.best/';
        if (q) url += `?s=${encodeURIComponent(q)}&post_type=anime`;

        const { data } = await axios.get(url, { headers, timeout: 8000 });
        const $ = cheerio.load(data);
        const results = [];

        // Logika gabungan: Home & Search
        const selector = q ? '.chivsrc li' : '.venz ul li';
        
        $(selector).each((i, el) => {
            const title = $(el).find('h2').text().trim();
            const endpoint = $(el).find('a').attr('href')?.split('/').filter(Boolean).pop();
            if (title) results.push({ title, endpoint });
        });

        res.status(200).json({ status: 'success', total: results.length, data: results });
    } catch (err) {
        res.status(500).json({ status: 'error', message: err.message });
    }
};