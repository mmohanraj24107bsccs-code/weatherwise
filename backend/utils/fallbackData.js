// Deterministic-ish mock data so the app stays fully usable in demos, offline
// environments, or whenever OPENWEATHER_API_KEY / GEMINI_API_KEY are unset.

const CONDITIONS = [
  { main: 'Clear', description: 'clear sky', icon: '01d' },
  { main: 'Clouds', description: 'scattered clouds', icon: '03d' },
  { main: 'Rain', description: 'light rain', icon: '10d' },
  { main: 'Thunderstorm', description: 'thunderstorms', icon: '11d' },
  { main: 'Snow', description: 'light snow', icon: '13d' },
  { main: 'Mist', description: 'misty', icon: '50d' },
];

function seededPick(seed, arr) {
  const hash = String(seed)
    .split('')
    .reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return arr[hash % arr.length];
}

function buildFallbackWeather(cityName) {
  const condition = seededPick(cityName, CONDITIONS);
  const baseTemp = 15 + (String(cityName).length % 15); // 15-29 range, varies per city
  return {
    source: 'fallback',
    city: cityName,
    temperature: baseTemp,
    feelsLike: baseTemp - 1,
    humidity: 40 + (String(cityName).length % 40),
    windSpeed: 2 + (String(cityName).length % 10),
    condition: condition.main,
    description: condition.description,
    icon: condition.icon,
    forecast: Array.from({ length: 5 }).map((_, i) => ({
      day: i,
      high: baseTemp + i,
      low: baseTemp - 4 + i,
      condition: seededPick(cityName + i, CONDITIONS).main,
    })),
  };
}

function buildFallbackInsight(weather) {
  const tips = [];
  if (weather.condition === 'Rain' || weather.condition === 'Thunderstorm') {
    tips.push('Pack a compact umbrella and waterproof shoes.');
  }
  if (weather.temperature >= 28) {
    tips.push('Stay hydrated and plan outdoor activities for early morning or evening.');
  }
  if (weather.temperature <= 10) {
    tips.push('Layer up - a warm jacket and gloves are a good idea.');
  }
  if (weather.windSpeed >= 8) {
    tips.push('It will be breezy - secure loose items if you are outdoors.');
  }
  if (tips.length === 0) {
    tips.push('Conditions look pleasant - a great day for outdoor plans.');
  }

  return {
    source: 'fallback',
    summary: `${weather.city} is looking ${weather.description} with a high near ${weather.temperature}°C. ${tips[0]}`,
    recommendations: tips,
  };
}

module.exports = { buildFallbackWeather, buildFallbackInsight };
