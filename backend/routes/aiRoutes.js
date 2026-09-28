const express = require('express');
const { getInsight } = require('../controllers/aiController');

const router = express.Router();

router.get('/insight', getInsight);

module.exports = router;
