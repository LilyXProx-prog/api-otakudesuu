const axios = require('axios');
const cheerio = require('cheerio');

module.exports = async (req, res) => {
    const { q, endpoint } = req.query;
    const BASE_URL = 'https://otakudesu.best/';

    // Kumpulan User-Agent biar gak dikira satu robot yang sama
    const userAgents = [
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36'
    ];

    const config = {
        headers: {
            'User-Agent': userAgents[Math.floor(Math.random() * userAgents.length)],
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
            'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
            'Referer': 'https://www.google.com/', // Pura-pura dateng dari Google
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
        },
        timeout: 15000 // Tambahin waktu nunggu biar gak gampang timeout
    };

    try {
        let targetUrl = BASE_URL;
        if (endpoint) {
            // Cek apakah endpoint episode atau anime
            targetUrl = endpoint.includes('episode') ? `${BASE_URL}episode/${endpoint}/` : `${BASE_URL}anime/${endpoint}/`;
        } else if (q) {
            targetUrl = `${BASE_URL}?s=${encodeURIComponent(q)}&post_type=anime`;
        }

        const { data } = await axios.get(targetUrl, config);
        const $ = cheerio.load(data);
        const results = [];

        // Logika Link Download
        if (endpoint && endpoint.includes('episode')) {
            const downloads = [];
            $('.download ul li').each((i, el) => {
                const res = $(el).find('strong').text().trim();
                const links = [];
                $(el).find('a').each((j, a) => {
                    links.push({ server: $(a).text().trim(), url: $(a).attr('href') });
                });
                if (res) downloads.push({ resolution: res, links });
            });
            return res.status(200).json({ status: 'success', type: 'download', data: downloads });
        }

        // Logika Daftar Episode / Search / Home
        const selector = q ? '.chivsrc li' : (endpoint ? '.episodelist ul li' : '.venz ul li');
        $(selector).each((i, el) => {
            const title = $(el).find('h2, a').first().text().trim();
            const rawLink = $(el).find('a').attr('href');
            const ep = rawLink?.split('/').filter(Boolean).pop();
            if (title && ep) results.push({ title, endpoint: ep });
        });

        res.status(200).json({ status: 'success', total: results.length, data: results });

    } catch (err) {
        res.status(err.response?.status || 500).json({
            status: 'error',
            code: err.response?.status,
            message: "Diblokir Otakudesu, babi!",
            detail: err.message
        });
    }
};