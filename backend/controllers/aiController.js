const fetch = require('node-fetch');
const { fetchCurrentWeather } = require('./weatherController');
const { buildFallbackInsight } = require('../utils/fallbackData');

async function callGemini(prompt) {
  const apiKey = process.env.GEMINI_API_KEY;
  const model = process.env.GEMINI_MODEL || 'gemini-1.5-flash';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
    }),
    timeout: 8000,
  });

  if (!response.ok) throw new Error(`Gemini responded ${response.status}`);
  const data = await response.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('Gemini returned no content');
  return text;
}

function buildPrompt(weather, activity) {
  return [
    'You are Weatherwise, a friendly weather assistant.',
    `City: ${weather.city}`,
    `Condition: ${weather.description}, ${weather.temperature}°C (feels like ${weather.feelsLike}°C)`,
    `Humidity: ${weather.humidity}%, Wind: ${weather.windSpeed} m/s`,
    activity ? `Planned activity: ${activity}` : '',
    'In under 80 words, write: (1) a one-sentence plain-language summary, then',
    '(2) 3 short, practical recommendations (clothing, timing, or precautions) as a bullet list.',
  ]
    .filter(Boolean)
    .join('\n');
}

// GET /api/ai/insight?city=Chennai&activity=hiking
async function getInsight(req, res, next) {
  try {
    const { city, activity } = req.query;
    if (!city) {
      return res.status(400).json({ success: false, message: 'city query parameter is required' });
    }

    const weather = await fetchCurrentWeather(city);

    if (!process.env.GEMINI_API_KEY) {
      return res.json({ success: true, weather, insight: buildFallbackInsight(weather) });
    }

    try {
      const text = await callGemini(buildPrompt(weather, activity));
      return res.json({
        success: true,
        weather,
        insight: { source: 'gemini', summary: text, recommendations: [] },
      });
    } catch (err) {
      console.warn(`[ai] Gemini call failed (${err.message}) - using fallback insight.`);
      return res.json({ success: true, weather, insight: buildFallbackInsight(weather) });
    }
  } catch (err) {
    next(err);
  }
}

module.exports = { getInsight };
