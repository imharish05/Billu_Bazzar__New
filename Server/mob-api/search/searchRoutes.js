'use strict';
const router = require('express').Router();
const controller = require('./searchController');

router.get('/search/autocomplete', controller.autocomplete);
router.get('/search/trending', controller.trending);
router.post('/search/track', controller.track);

module.exports = router;
