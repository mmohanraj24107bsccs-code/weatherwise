const express = require('express');
const {
  getCurrentWeather,
  getFavoritesWeather,
  addFavorite,
  removeFavorite,
} = require('../controllers/weatherController');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.get('/current', getCurrentWeather);
router.get('/favorites', protect, getFavoritesWeather);
router.post('/favorites', protect, addFavorite);
router.delete('/favorites/:cityId', protect, removeFavorite);

module.exports = router;
