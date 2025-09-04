// Use require for compatibility in Vercel Node.js runtime
const fetch = require('node-fetch');

// Vercel serverless functions export a handler function
module.exports = async (req, res) => {
    // Ensure the method is POST
    if (req.method !== 'POST') {
        res.setHeader('Allow', ['POST']);
        return res.status(405).end(`Method ${req.method} Not Allowed`);
    }

    try {
        const { prompt: userPrompt } = req.body;
        if (!userPrompt) {
            return res.status(400).json({ error: 'No prompt provided.' });
        }

        // Vercel automatically loads Environment Variables into process.env
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            console.error('API key is not configured in Vercel Environment Variables.');
            return res.status(500).json({ error: 'API key is not configured on the server.' });
        }
        
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${apiKey}`;

        const systemPrompt = `You are an expert web game developer. Your task is to create a complete, playable, single-file HTML game based on the user's prompt. RULES: ALL HTML, CSS, and JavaScript MUST be in a single .html file. The game must be self-contained and fully playable. Do not include comments. Output only raw HTML code.`;
        
        const fullPrompt = `${systemPrompt}\n\nUser's request: "${userPrompt}"`;
        const payload = { contents: [{ parts: [{ text: fullPrompt }] }] };

        const geminiResponse = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!geminiResponse.ok) {
            const errorBody = await geminiResponse.text();
            console.error('Gemini API Error:', errorBody);
            return res.status(geminiResponse.status).json({ error: `Gemini API failed: ${geminiResponse.statusText}` });
        }

        const result = await geminiResponse.json();
        const gameCode = result.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!gameCode) {
            return res.status(500).json({ error: 'Failed to extract game code from Gemini response.' });
        }

        // Send the successful response back to the frontend
        res.status(200).json({ gameCode: gameCode });

    } catch (error) {
        console.error('Server error:', error);
        res.status(500).json({ error: error.message });
    }
};
