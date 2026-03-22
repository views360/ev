export default async function handler(req, res) {
  // 1. Handle CORS Pre-flight
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { message } = req.body;

  // 2. Validate Input
  if (!message) {
    return res.status(400).json({ error: 'Message is required' });
  }

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile", // Ensure this exact string
        messages: [
          { role: "system", content: "You are a helpful assistant for EV owners." },
          { role: "user", content: message }
        ],
        temperature: 0.7,
        max_tokens: 1024
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Groq API Error Details:", data);
      // This will now pass the REAL error message back to your console
      return res.status(response.status).json({ 
        error: data.error?.message || 'AI Service Error',
        details: data 
      });
    }

    return res.status(200).json({ response: data.choices[0].message.content });

  } catch (error) {
    console.error("Server Crash:", error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
