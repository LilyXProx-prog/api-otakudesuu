app.get('/api/search', async (req, res) => {
    const query = req.query.q;
    if (!query) return res.status(400).json({ message: 'Mana keyword-nya, babi?' });
    
    try {
        // Otakudesu pake pencarian via query string 's'
        const searchUrl = `${BASE_URL}?s=${encodeURIComponent(query)}&post_type=anime`;
        const { data } = await axios.get(searchUrl, { headers });
        const $ = cheerio.load(data);
        const results = [];

        // Update selector: Otakudesu biasanya pake .chivsrc atau .venz buat search
        $('.chivsrc li').each((i, el) => {
            const title = $(el).find('h2 a').text().trim();
            const endpoint = $(el).find('h2 a').attr('href')?.replace(BASE_URL, '');
            const thumb = $(el).find('img').attr('src');
            const status = $(el).find('.set').first().text().trim();

            if (title) {
                results.push({ title, status, endpoint, thumb });
            }
        });

        // Kalau masih kosong, coba selector cadangan
        if (results.length === 0) {
            $('.venz ul li').each((i, el) => {
                const title = $(el).find('h2').text().trim();
                const endpoint = $(el).find('a').attr('href')?.replace(BASE_URL, '');
                results.push({ title, endpoint });
            });
        }

        res.status(200).json({ 
            status: 'success', 
            query, 
            total_results: results.length,
            data: results 
        });

    } catch (err) {
        res.status(500).json({ status: 'fail', message: err.message });
    }
});