const axios = require('axios');
const cheerio = require('cheerio');

module.exports = async (req, res) => {
    const { q, endpoint } = req.query;
    const BASE_URL = 'https://otakudesu.best/';
    const headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
        'Referer': 'https://otakudesu.best/'
    };

    try {
        let targetUrl = BASE_URL;
        if (q) {
            targetUrl = `${BASE_URL}?s=${encodeURIComponent(q)}&post_type=anime`;
        } else if (endpoint) {
            // Kita coba dua kemungkinan URL: episode atau anime
            targetUrl = `${BASE_URL}episode/${endpoint}/`;
        }

        let { data } = await axios.get(targetUrl, { headers, timeout: 10000 });
        let $ = cheerio.load(data);
        const results = [];

        // 1. LOGIKA LINK DOWNLOAD (Kalau ada di halaman tersebut)
        if ($('.download').length > 0) {
            const downloads = [];
            $('.download ul li').each((i, el) => {
                const resolution = $(el).find('strong').text().trim();
                const links = [];
                $(el).find('a').each((j, a) => {
                    links.push({ server: $(a).text().trim(), url: $(a).attr('href') });
                });
                if (resolution) downloads.push({ resolution, links });
            });
            return res.status(200).json({ status: 'success', type: 'download', data: downloads });
        }

        // 2. LOGIKA DAFTAR EPISODE (Di halaman detail anime)
        if ($('.episodelist').length > 0) {
            $('.episodelist ul li').each((i, el) => {
                const title = $(el).find('a').text().trim();
                const epLink = $(el).find('a').attr('href')?.split('/').filter(Boolean).pop();
                if (title) results.push({ title, endpoint: epLink });
            });
            return res.status(200).json({ status: 'success', type: 'episode_list', total: results.length, data: results });
        }

        // 3. LOGIKA SEARCH & HOME (Daftar Anime)
        const selector = q ? '.chivsrc li' : '.venz ul li';
        $(selector).each((i, el) => {
            const title = $(el).find('h2').text().trim() || $(el).find('a').text().trim();
            const rawLink = $(el).find('a').attr('href');
            const ep = rawLink?.split('/').filter(Boolean).pop();
            if (title && ep) {
                results.push({ title, endpoint: ep });
            }
        });

        res.status(200).json({ status: 'success', total: results.length, data: results });

    } catch (err) {
        // Kalau error 404 pas nyari episode, mungkin itu link anime (bukan episode)
        if (err.response?.status === 404 && endpoint) {
             try {
                const altUrl = `${BASE_URL}anime/${endpoint}/`;
                const { data: altData } = await axios.get(altUrl, { headers });
                const $alt = cheerio.load(altData);
                const altResults = [];
                $alt('.episodelist ul li').each((i, el) => {
                    const t = $alt(el).find('a').text().trim();
                    const e = $alt(el).find('a').attr('href')?.split('/').filter(Boolean).pop();
                    altResults.push({ title: t, endpoint: e });
                });
                return res.status(200).json({ status: 'success', type: 'episode_list', total: altResults.length, data: altResults });
             } catch (e) {
                return res.status(404).json({ status: 'error', message: 'Endpoint gak ketemu, babi!' });
             }
        }
        res.status(err.response?.status || 500).json({ status: 'error', message: err.message });
    }
};