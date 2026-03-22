// api/groq.js - Optimized for Vercel Serverless Functions
export default async function handler(req, res) {
  // 1. Set CORS headers immediately
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  );

  // 2. Handle OPTIONS request (Pre-flight)
  // This is often what causes the 405 if not handled first
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // 3. Only allow POST for the actual logic
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use POST.' });
  }

  try {
    const { message } = req.body;

    // Basic validation
    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'Message is required' });
    }

    const systemPrompt = `You are an expert EV (Electric Vehicle) assistant. 
    Provide accurate, concise, and helpful advice on battery health, charging, 
    and EV ownership. Maintain a friendly tone.`;

    // 4. Fetch from Groq using the environment variable
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'mixtral-8x7b-32768',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: message.substring(0, 2000) }, // Cap length for safety
        ],
        temperature: 0.7,
        max_tokens: 800, 
      }),
    });

    // 5. Handle Groq-specific errors
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Groq API Error:', errorText);
      return res.status(response.status).json({ error: 'AI Service Error' });
    }

    const data = await response.json();
    const assistantMessage = data.choices[0]?.message?.content || "I'm sorry, I couldn't generate a response.";

    // 6. Return successful response
    return res.status(200).json({ response: assistantMessage });

  } catch (error) {
    console.error('Serverless Function Error:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
