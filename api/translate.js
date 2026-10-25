export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { text, lang, targets } = req.body;
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: 'GEMINI_API_KEY is not configured on Vercel.' });
  }

  if (!text || !targets || !targets.length) {
    return res.status(400).json({ error: 'Missing text or targets' });
  }

  try {
    const prompt = `Translate the following text from "${lang || 'auto'}" into these target language codes: ${targets.join(', ')}. 
    Return ONLY a valid JSON object where keys are the target language codes and values are the translated text. Do not include markdown formatting or extra text.
    Text to translate: "${text}"`;

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }]
      })
    });

    const data = await response.json();
    const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
    const cleanedJSON = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
    const translations = JSON.parse(cleanedJSON);

    const result = {
      translations: translations,
      ja: translations['ja'] || translations['en'] || text,
      en: translations['en'] || text,
      back: translations[lang] || translations['en'] || text
    };

    return res.status(200).json(result);
  } catch (error) {
    console.error('Translation error:', error);
    return res.status(500).json({ error: 'Translation failed: ' + error.message });
  }
}