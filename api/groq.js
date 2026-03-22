export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { message } = req.body;

    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'Invalid message' });
    }

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'mixtral-8x7b-32768',
        messages: [
          {
            role: 'system',
            content: 'You are an expert EV assistant.',
          },
          {
            role: 'user',
            content: message,
          },
        ],
        temperature: 0.7,
        max_tokens: 512,
      }),
    });

    const data = await response.json();
    const assistantMessage = data.choices[0].message.content;

    return res.status(200).json({ response: assistantMessage });
  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({ error: 'Failed to process request' });
  }
}
