const fetch = require('node-fetch');

exports.handler = async (event) => {
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            body: JSON.stringify({ error: 'Method Not Allowed' }),
        };
    }

    const { topic } = JSON.parse(event.body);
    const apiKey = process.env.GROQ_API_KEY;

    if (!apiKey) {
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'API key not configured' }),
        };
    }

    if (!topic) {
        return {
            statusCode: 400,
            body: JSON.stringify({ error: 'Missing required parameter: topic' }),
        };
    }

    try {
        const prompt = `Generate a multiple-choice quiz on the topic "${topic}".
        Provide 5 questions.
        Return the quiz as a JSON object with a single key "quiz" which is an array of objects.
        Each object in the array should have three keys: "question", "options" (an array of 4 strings), and "answer" (a string with the correct answer).
        Do not include any other text or explanations, just the JSON object.`;

        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: 'llama3-8b-8192',
                messages: [
                    {
                        role: 'system',
                        content: 'You are an AI assistant that generates multiple-choice quizzes in a specific JSON format.'
                    },
                    {
                        role: 'user',
                        content: prompt
                    }
                ],
                response_format: { type: 'json_object' },
                temperature: 0.5,
                max_tokens: 1024
            })
        });

        if (!response.ok) {
            const errorBody = await response.text();
            throw new Error(`API request failed with status ${response.status}: ${errorBody}`);
        }

        const data = await response.json();
        const quizContent = data.choices[0]?.message?.content?.trim();

        if (!quizContent) {
            throw new Error('No content received from the API.');
        }

        // The response from the model is already a JSON object because of response_format
        const quizData = JSON.parse(quizContent);

        return {
            statusCode: 200,
            body: JSON.stringify(quizData), // The data should contain the { "quiz": [...] } object
        };
    } catch (error) {
        console.error('Quiz generation error:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Failed to generate quiz', details: error.message }),
        };
    }
};
