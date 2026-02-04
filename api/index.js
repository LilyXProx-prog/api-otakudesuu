const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const app = express();

const BASE_URL = 'https://otakudesu.best/';
const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36'
};

// 1. Endpoint Home (Update Terbaru)
app.get('/api/latest', async (req, res) => {
    try {
        const { data } = await axios.get(BASE_URL, { headers });
        const $ = cheerio.load(data);
        const results = [];
        $('.venz ul li').each((i, el) => {
            results.push({
                title: $(el).find('h2').text().trim(),
                episodes: $(el).find('.epz').text().trim(),
                date: $(el).find('.newn').text().trim(),
                endpoint: $(el).find('a').attr('href').replace(BASE_URL, ''),
                thumb: $(el).find('img').attr('src')
            });
        });
        res.status(200).json({ status: 'success', data: results });
    } catch (err) {
        res.status(500).json({ status: 'fail', message: err.message });
    }
});

// 2. Endpoint Search
app.get('/api/search', async (req, res) => {
    const query = req.query.q;
    if (!query) return res.status(400).json({ message: 'Mana keyword-nya, babi?' });
    try {
        const { data } = await axios.get(`${BASE_URL}?s=${query}&post_type=anime`, { headers });
        const $ = cheerio.load(data);
        const results = [];
        $('.chivsrc li').each((i, el) => {
            results.push({
                title: $(el).find('h2').text().trim(),
                status: $(el).find('.set').next().text().replace(':', '').trim(),
                endpoint: $(el).find('a').attr('href').replace(BASE_URL, ''),
                thumb: $(el).find('img').attr('src')
            });
        });
        res.status(200).json({ status: 'success', query, data: results });
    } catch (err) {
        res.status(500).json({ status: 'fail', message: err.message });
    }
});

// 3. Endpoint Root (Status Check)
app.get('/', (req, res) => {
    res.json({ message: "Lilyeyes Sakti API is Running! 😈", endpoints: ["/api/latest", "/api/search?q=query"] });
});

module.exports = app;