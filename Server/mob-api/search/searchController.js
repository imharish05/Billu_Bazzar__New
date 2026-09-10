'use strict';
const search = require('../../controllers/searchController');

exports.autocomplete = (req, res, next) => search.autocomplete(req, res, next);

exports.trending = (req, res, next) => search.trending(req, res, next);

exports.track = (req, res, next) => search.track(req, res, next);
