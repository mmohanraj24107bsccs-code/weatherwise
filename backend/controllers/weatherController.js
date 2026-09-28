const fetch = require('node-fetch');
const User = require('../models/User');
const { buildFallbackWeather } = require('../utils/fallbackData');

const OWM_BASE = 'https://api.openweathermap.org/data/2.5';

async function fetchCurrentWeather(city, units = 'metric') {
  const apiKey = process.env.OPENWEATHER_API_KEY;

  if (!apiKey) {
    return buildFallbackWeather(city);
  }

  try {
    const url = `${OWM_BASE}/weather?q=${encodeURIComponent(city)}&units=${units}&appid=${apiKey}`;
    const response = await fetch(url, { timeout: 6000 });
    if (!response.ok) throw new Error(`OpenWeatherMap responded ${response.status}`);
    const data = await response.json();

    return {
      source: 'openweathermap',
      city: data.name,
      temperature: Math.round(data.main.temp),
      feelsLike: Math.round(data.main.feels_like),
      humidity: data.main.humidity,
      windSpeed: data.wind.speed,
      condition: data.weather[0].main,
      description: data.weather[0].description,
      icon: data.weather[0].icon,
    };
  } catch (err) {
    console.warn(`[weather] Live API failed (${err.message}) - using fallback data.`);
    return buildFallbackWeather(city);
  }
}

// GET /api/weather/current?city=Chennai
async function getCurrentWeather(req, res, next) {
  try {
    const { city, units } = req.query;
    if (!city) {
      return res.status(400).json({ success: false, message: 'city query parameter is required' });
    }
    const weather = await fetchCurrentWeather(city, units || 'metric');
    res.json({ success: true, weather });
  } catch (err) {
    next(err);
  }
}

// GET /api/weather/favorites (protected) - weather for all of the user's saved cities
async function getFavoritesWeather(req, res, next) {
  try {
    const cities = req.user.favoriteCities || [];
    const results = await Promise.all(
      cities.map(async (c) => ({ city: c, weather: await fetchCurrentWeather(c.name) }))
    );
    res.json({ success: true, count: results.length, results });
  } catch (err) {
    next(err);
  }
}

// POST /api/weather/favorites (protected) - save a city, enforcing the freemium cap
async function addFavorite(req, res, next) {
  try {
    const { name, country, lat, lon } = req.body;
    if (!name || lat === undefined || lon === undefined) {
      return res.status(400).json({ success: false, message: 'name, lat and lon are required' });
    }

    const user = await User.findById(req.user._id);
    if (!user.canAddFavorite()) {
      return res.status(403).json({
        success: false,
        message: 'Free plan is limited to 3 saved cities - upgrade to Premium for unlimited cities.',
      });
    }
    user.favoriteCities.push({ name, country, lat, lon });
    await user.save();
    return res.status(201).json({ success: true, favoriteCities: user.favoriteCities });
  } catch (err) {
    next(err);
  }
}

// DELETE /api/weather/favorites/:cityId (protected)
async function removeFavorite(req, res, next) {
  try {
    const user = await User.findById(req.user._id);
    user.favoriteCities = user.favoriteCities.filter((c) => c._id.toString() !== req.params.cityId);
    await user.save();
    res.json({ success: true, favoriteCities: user.favoriteCities });
  } catch (err) {
    next(err);
  }
}

module.exports = { getCurrentWeather, getFavoritesWeather, addFavorite, removeFavorite, fetchCurrentWeather };
