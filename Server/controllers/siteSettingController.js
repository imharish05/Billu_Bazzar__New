'use strict';
const { SiteSetting } = require('../models');

const defaultAboutSettings = {
  hero: {
    subtitle: 'Est. 2019',
    titleMain: 'Your Premium',
    titleGold: 'Lifestyle Destination',
    description: 'Bringing you a meticulously curated selection of cutting-edge electronics, fashion apparel, home styling, beauty, and outdoor sports.',
  },
  story: {
    subtitle: 'Our Legacy',
    titleMain: 'Curation For The',
    titleSub: 'Modern Connoisseur',
    description1: 'Billu Bazaar was established in 2019 with a singular, clear objective: to redefine how you shop for life\'s essentials. We believed that shopping for premium tech shouldn\'t feel separate from buying designer apparel or selecting elegant home furnishings. By bringing these diverse categories together, we created a unified, luxury-tier marketplace.',
    description2: 'Today, our catalog is divided into six pillars: Electronics & Gadgets, Apparel & Fashion, Home & Living, Beauty & Personal Care, Sports & Outdoors, and Toys, Hobbies & Media. We verify and partner directly with top manufacturers and authorized brands, filtering out the noise to bring you only products that pass our strict design and quality audits.',
    feature1Title: 'Authentic Sourcing',
    feature1Desc: 'We guarantee 100% original products sourced directly from brands or authorized global distributors.',
    feature2Title: 'Global Standard',
    feature2Desc: 'Our products are selected based on strict criteria: build quality, performance, aesthetics, and user reviews.',
    qualityOathTitle: 'Our Quality Oath',
    qualityOathDesc: 'Every gadget, garment, and home accent is hand-inspected for quality before shipping.',
    imageUrl: '/about-story-general.png',
  },
  stats: [
    { value: '50000+', label: 'Happy Patrons', sub: 'Verified satisfied customers' },
    { value: '200000+', label: 'Social Family', sub: 'Engaged lifestyle community' },
    { value: '150000+', label: 'Orders Delivered', sub: 'Safely packed & shipped items' },
    { value: '150+', label: 'Curated Brands', sub: 'Top-tier verified partners' },
  ],
  values: [
    { title: 'Our Vision', accent: 'Modern Curation', description: 'To create a single, curated lifestyle ecosystem where cutting-edge electronics, designer fashion, premium home goods, and health essentials seamlessly converge into a single, high-end marketplace.' },
    { title: 'Our Mission', accent: 'Authenticity & Trust', description: 'To source and deliver strictly authentic, certified products across all categories, ensuring our customers experience top-tier quality, transparent pricing, and concierge-level customer care.' },
    { title: 'Our Goal', accent: 'Curated Excellence', description: 'To bridge the gap between verified global manufacturers and design-conscious shoppers, offering an unparalleled catalog of curated electronics, apparel, home decor, beauty, and hobbies.' },
  ],
  philosophy: {
    subtitle: 'Our Philosophy',
    title: 'Pillars of Excellence',
    description: 'Our foundations are built on sourcing authentic products, providing seamless digital solutions, and earning long-term customer loyalty.',
  },
  concierge: {
    subtitle: 'Need Assistance?',
    title: 'We are Here to Help',
    description: 'Whether you need product recommendations, order tracking help, or bulk procurement support across our catalog, our concierge team is always available.',
  },
  marqueeWords: ['ELECTRONICS', 'APPAREL', 'HOME', 'BEAUTY', 'SPORTS', 'TOYS', 'EXCLUSIVITY', 'QUALITY', 'CRAFTSMANSHIP']
};

const defaultOtpSettings = {
  inrThreshold: 20000,
  aedThreshold: 800,
  requireCodOtp: true,
};

const defaultLoyaltySettings = {
  earnRate: 20,
  redeemRate: 0.2,
  maxRedeemAmount: 500,
  expiryMonths: 2,
  signupPointsEnabled: true,
  signupPoints: 50,
  reviewPointsEnabled: true,
  reviewPoints: 20,
  earnRules: [
    { id: '1', action: 'Every ₹100 spent', points: '+5 points' },
    { id: '2', action: 'New Account Registration', points: '+50 points' },
    { id: '3', action: 'Write a product review', points: '+20 points' }
  ]
};

const defaultInventorySettings = {
  globalLowStockThreshold: 10,
};

const defaultTaxSettings = {
  taxRate: 5,
};

const getSetting = async (req, res) => {
  try {
    const { key } = req.params;
    const setting = await SiteSetting.findOne({ where: { key } });
    if (!setting) {
      if (key === 'about') {
        return res.json({ success: true, key, data: defaultAboutSettings });
      }
      if (key === 'otp_threshold' || key === 'security') {
        return res.json({ success: true, key, data: defaultOtpSettings });
      }
      if (key === 'loyalty') {
        return res.json({ success: true, key, data: defaultLoyaltySettings });
      }
      if (key === 'inventory') {
        return res.json({ success: true, key, data: defaultInventorySettings });
      }
      if (key === 'tax' || key === 'gst') {
        return res.json({ success: true, key, data: defaultTaxSettings });
      }
      return res.json({ success: true, key, data: {} });
    }
    const parsed = JSON.parse(setting.value);
    if (key === 'loyalty') {
      return res.json({ success: true, key, data: { ...defaultLoyaltySettings, ...parsed } });
    }
    if (key === 'tax' || key === 'gst') {
      return res.json({ success: true, key, data: { ...defaultTaxSettings, ...parsed } });
    }
    return res.json({ success: true, key, data: parsed });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

const updateSetting = async (req, res) => {
  try {
    const { key } = req.params;
    let data = {};
    
    if (req.body.data) {
      data = typeof req.body.data === 'string' ? JSON.parse(req.body.data) : req.body.data;
    } else {
      data = req.body;
    }

    if (req.file) {
      const relativePath = `/uploads/settings/${req.file.filename}`;
      if (key === 'about') {
        if (!data.story) data.story = {};
        data.story.imageUrl = relativePath;
      }
    }

    const valueStr = JSON.stringify(data);
    let setting = await SiteSetting.findOne({ where: { key } });
    if (setting) {
      await setting.update({ value: valueStr });
    } else {
      setting = await SiteSetting.create({ key, value: valueStr });
    }

    return res.json({ success: true, key, data });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

const subscribeNewsletter = async (req, res) => {
  // Newsletter subscription removed — endpoint kept for backward compat
  return res.json({ success: true, message: 'Thank you!', pointsAwarded: 0 });
};

module.exports = { getSetting, updateSetting, subscribeNewsletter };
