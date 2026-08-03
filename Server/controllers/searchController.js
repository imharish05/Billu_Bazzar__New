'use strict';
const { Op } = require('sequelize');
const { SearchKeyword, Product, TrendingCache } = require('../models');

const autocomplete = async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || q.trim().length < 1) {
      return res.json({ success: true, suggestions: [], products: [] });
    }

    const query = q.trim();

    // 1. Prefix match suggestions on SearchKeyword table
    const keywords = await SearchKeyword.findAll({
      where: {
        keyword: { [Op.like]: `${query}%` }
      },
      order: [['search_count', 'DESC']],
      limit: 8,
      attributes: ['keyword']
    });

    const suggestions = keywords.map(k => k.keyword);

    // 2. Query top 4 matching products
    const products = await Product.findAll({
      where: {
        isActive: true,
        [Op.or]: [
          { name: { [Op.like]: `%${query}%` } },
          { tags: { [Op.like]: `%${query}%` } }
        ]
      },
      limit: 4,
      attributes: ['id', 'name', 'price', 'comparePrice', 'images', 'slug', 'discountPercent']
    });

    const formattedProducts = products.map(p => ({
      id: p.id,
      name: p.name,
      price: p.price,
      comparePrice: p.comparePrice,
      image: p.images?.[0] || '',
      slug: p.slug,
      discountPercent: p.discountPercent || 0
    }));

    res.json({
      success: true,
      suggestions,
      products: formattedProducts
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const trending = async (req, res) => {
  try {
    // Cron-free real-time database query for trending searches
    const topKeywords = await SearchKeyword.findAll({
      order: [
        ['is_trending', 'DESC'],
        ['search_count_today', 'DESC'],
        ['search_count', 'DESC']
      ],
      limit: 10,
      attributes: ['keyword']
    });

    let list = topKeywords.map(k => k.keyword);

    if (list.length === 0) {
      list = ['Luxury Watches', 'Designer Shirts', 'Leather Jackets', 'Handbags', 'Sneakers'];
    }

    res.json({ success: true, trending: list });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const track = async (req, res) => {
  try {
    const { q } = req.body;
    if (!q || q.trim().length < 1) {
      return res.status(400).json({ success: false, message: 'Query is required' });
    }

    const keywordStr = q.trim();

    // Increment counts on target keyword
    const [record, created] = await SearchKeyword.findOrCreate({
      where: { keyword: keywordStr },
      defaults: {
        search_count: 1,
        search_count_today: 1,
        search_count_week: 1,
        last_searched_at: new Date()
      }
    });

    if (!created) {
      await record.increment({
        search_count: 1,
        search_count_today: 1,
        search_count_week: 1
      });
      await record.update({ last_searched_at: new Date() });
    }

    res.json({ success: true, message: 'Search tracked successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = { autocomplete, trending, track };
