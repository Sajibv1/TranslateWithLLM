const fetch = require('node-fetch');

exports.handler = async (event, context) => {
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            body: JSON.stringify({ error: 'Method Not Allowed' }),
        };
    }

    const { text, fromLang, toLang } = JSON.parse(event.body);
    const apiKey = process.env.GROQ_API_KEY;

    if (!apiKey) {
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'API key not configured' }),
        };
    }

    if (!text || !fromLang || !toLang) {
        return {
            statusCode: 400,
            body: JSON.stringify({ error: 'Missing required parameters' }),
        };
    }

    try {
        // Map language codes to full names for better LLM understanding
        const languageMap = {
            'bn': 'Bengali',
            'en': 'English',
            'ar': 'Arabic',
            'hi': 'Hindi',
            'es': 'Spanish',
            'fr': 'French',
            'de': 'German',
            'zh': 'Chinese (Simplified)',
            'ja': 'Japanese',
            'at': 'Western Punjabi',
            'ru': 'Russian',
            'pt': 'Portuguese',
            'it': 'Italian',
            'ko': 'Korean',
            'tr': 'Turkish',
            'vi': 'Vietnamese'
        };

        const sourceLanguage = languageMap[fromLang] || fromLang;
        const targetLanguage = languageMap[toLang] || toLang;

        const prompt = `Translate the following text from ${sourceLanguage} to ${targetLanguage}. 
        Preserve the meaning, tone, and cultural context accurately. 
        Do not add any additional explanations or notes, just provide the translation.
        
        Text to translate: ${text}`;

        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: 'meta-llama/llama-4-maverick-17b-128e-instruct',
                messages: [
                    {
                        role: 'system',
                        content: 'You are a professional translator that provides accurate and fluent translations between languages.'
                    },
                    {
                        role: 'user',
                        content: prompt
                    }
                ],
                temperature: 0.3,
                max_tokens: 2000
            })
        });

        if (!response.ok) {
            throw new Error(`API request failed with status ${response.status}`);
        }

        const data = await response.json();
        const translation = data.choices[0]?.message?.content?.trim() || '';

        return {
            statusCode: 200,
            body: JSON.stringify({ translation }),
        };
    } catch (error) {
        console.error('Translation error:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Failed to translate text' }),
        };
    }
};
