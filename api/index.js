const axios = require('axios');
const cheerio = require('cheerio');

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') return res.status(200).end();

    const { q, endpoint, category, genre, page } = req.query;
    const BASE_URL = 'https://animetop-id.com'; 
    const headers = { 
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
        'Referer': 'https://animetop-id.com/'
    };

    try {
        let url = `${BASE_URL}/`;

        // 1. JALUR STREAMING (NONTON)
        if (endpoint && endpoint.includes('episode')) {
            url = `${BASE_URL}/${endpoint.replace(/^\//, '')}/`;
            const { data } = await axios.get(url, { headers, timeout: 8000 });
            const $ = cheerio.load(data);
            
            return res.status(200).json({
                status: 'success',
                type: 'streaming',
                data: {
                    title: $('.entry-title').text().trim(),
                    player: $('.player-embed iframe').attr('src') || $('.video-content iframe').attr('src') || '',
                }
            });
        }

        // 2. JALUR DETAIL ANIME (LIST EPISODE)
        if (endpoint) {
            url = `${BASE_URL}/anime/${endpoint.replace(/^\/|anime\//, '')}/`;
            const { data } = await axios.get(url, { headers, timeout: 8000 });
            const $ = cheerio.load(data);
            
            const episodes = [];
            $('.eplister ul li').each((i, el) => {
                const a = $(el).find('a');
                episodes.push({
                    title: $(el).find('.epl-num').text() + ' - ' + $(el).find('.epl-title').text(),
                    endpoint: a.attr('href').replace(BASE_URL, '').replace(/\//g, '')
                });
            });

            return res.status(200).json({
                status: 'success',
                type: 'anime_detail',
                data: {
                    title: $('.entry-title').text().trim(),
                    thumbnail: $('.thumb img').attr('src'),
                    sinopsis: $('.entry-content p').text().trim(),
                    genres: $('.genxed').text().trim(),
                    episodes: episodes
                }
            });
        }

        // 3. JALUR LIST (ONGOING, SEARCH, GENRE)
        if (q) url = `${BASE_URL}/?s=${encodeURIComponent(q)}`;
        else if (genre) url = `${BASE_URL}/genres/${genre}/`;
        else if (category === 'ongoing') url = `${BASE_URL}/anime/?status=ongoing&order=update`;
        else if (category === 'completed') url = `${BASE_URL}/anime/?status=completed&order=update`;
        else url = `${BASE_URL}/anime/?order=update`;

        if (page && page > 1) url += (url.includes('?') ? '&' : '?') + `page=${page}`;

        const { data } = await axios.get(url, { headers, timeout: 8000 });
        const $ = cheerio.load(data);
        const results = [];

        $('.listupd .bs').each((i, el) => {
            const a = $(el).find('a');
            results.push({
                title: a.attr('title') || $(el).find('.tt').text().trim(),
                endpoint: a.attr('href').replace(BASE_URL, '').replace(/\//g, '').replace('anime', ''),
                thumbnail: $(el).find('img').attr('src'),
                status: $(el).find('.epx').text().trim(),
                type: $(el).find('.typez').text().trim()
            });
        });

        return res.status(200).json({ status: 'success', total: results.length, data: results });

    } catch (err) {
        return res.status(200).json({ 
            status: 'error', 
            message: "Animetop lagi tidur babi!", 
            log: err.message,
            tried: url
        });
    }
};