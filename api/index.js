const axios = require('axios');
const cheerio = require('cheerio');

module.exports = async (req, res) => {
    const { q, endpoint } = req.query;
    const BASE_URL = 'https://otakudesu.best/';

    // Kumpulan User-Agent biar gak dikira satu robot yang sama
    const userAgents = [
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
        'Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Mobile/15E148 Safari/604.1',
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    ];

    const config = {
        headers: {
            'User-Agent': userAgents[Math.floor(Math.random() * userAgents.length)],
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
            'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
            'Referer': 'https://www.google.com/',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1'
        },
        timeout: 10000
    };

    try {
        let targetUrl = BASE_URL;
        if (q) {
            targetUrl = `${BASE_URL}?s=${encodeURIComponent(q)}&post_type=anime`;
        } else if (endpoint) {
            // Coba arahkan ke episode langsung
            targetUrl = `${BASE_URL}episode/${endpoint}/`;
        }

        const { data } = await axios.get(targetUrl, config);
        const $ = cheerio.load(data);
        const results = [];

        // Logika Link Download
        if ($('.download').length > 0) {
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
        const selector = q ? '.chivsrc li' : ($('.episodelist').length > 0 ? '.episodelist ul li' : '.venz ul li');
        $(selector).each((i, el) => {
            const title = $(el).find('h2, a').first().text().trim();
            const rawLink = $(el).find('a').attr('href');
            const ep = rawLink?.split('/').filter(Boolean).pop();
            if (title && ep) results.push({ title, endpoint: ep });
        });

        res.status(200).json({ status: 'success', total: results.length, data: results });

    } catch (err) {
        // Jika 403 atau 404, coba arahkan ke /anime/ kalau tadi nembak /episode/
        if (endpoint && !endpoint.includes('episode')) {
            try {
                const altUrl = `${BASE_URL}anime/${endpoint}/`;
                const { data: altData } = await axios.get(altUrl, config);
                const $alt = cheerio.load(altData);
                const altResults = [];
                $alt('.episodelist ul li').each((i, el) => {
                    const t = $alt(el).find('a').text().trim();
                    const e = $alt(el).find('a').attr('href')?.split('/').filter(Boolean).pop();
                    altResults.push({ title: t, endpoint: e });
                });
                return res.status(200).json({ status: 'success', type: 'episode_list', total: altResults.length, data: altResults });
            } catch (e) { /* ignore */ }
        }
        res.status(err.response?.status || 500).json({ 
            status: 'error', 
            message: "Masih diblokir Cloudflare, babi!", 
            detail: err.message 
        });
    }
};