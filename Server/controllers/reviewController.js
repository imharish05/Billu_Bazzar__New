'use strict';
const { Op } = require('sequelize');
const { Review, Product, Customer, Order, OrderItem, SiteSetting, LoyaltyLedger } = require('../models');
const { toAbsoluteUrl } = require('../utils/imageUrl');

/**
 * Helper: Recalculates and updates average rating & review count for a product.
 */
const recalculateProductRating = async (productId) => {
  const reviews = await Review.findAll({
    where: { productId, isApproved: true },
    attributes: ['rating'],
  });

  const reviewCount = reviews.length;
  let avgRating = 0.0;

  if (reviewCount > 0) {
    const sum = reviews.reduce((acc, r) => acc + Number(r.rating), 0);
    avgRating = parseFloat((sum / reviewCount).toFixed(2));
  }

  await Product.update(
    { rating: avgRating, reviewCount },
    { where: { id: productId } }
  );

  return { rating: avgRating, reviewCount };
};

/**
 * GET /api/reviews/product/:productId
 * Public/Optional Customer: Get all reviews for a product with breakdown & user eligibility.
 */
const getProductReviews = async (req, res) => {
  try {
    const { productId } = req.params;
    const customerId = req.customer ? req.customer.id : null;

    const reviews = await Review.findAll({
      where: { productId, isApproved: true },
      include: [
        {
          model: Customer,
          as: 'customer',
          attributes: ['id', 'name', 'email'],
        },
      ],
      order: [['createdAt', 'DESC']],
    });

    // Calculate rating breakdown (counts of 1..5 stars)
    const ratingBreakdown = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    let totalRatingSum = 0;

    reviews.forEach((r) => {
      const star = Math.min(5, Math.max(1, Math.round(r.rating)));
      ratingBreakdown[star] = (ratingBreakdown[star] || 0) + 1;
      totalRatingSum += Number(r.rating);
    });

    const totalCount = reviews.length;
    const averageRating = totalCount > 0 ? parseFloat((totalRatingSum / totalCount).toFixed(2)) : 0.0;

    // Check customer eligibility & user's existing review if authenticated
    let userCanReview = false;
    let userReview = null;
    let eligibleOrderId = null;

    if (customerId) {
      // Find customer's existing review for this product (approved or pending)
      const ownReview = await Review.findOne({
        where: { productId, customerId },
      });

      if (ownReview) {
        userReview = {
          id: ownReview.id,
          productId: ownReview.productId,
          orderId: ownReview.orderId,
          rating: ownReview.rating,
          title: ownReview.title,
          body: ownReview.body,
          isVerifiedPurchase: ownReview.isVerifiedPurchase,
          isApproved: ownReview.isApproved,
          createdAt: ownReview.createdAt,
          updatedAt: ownReview.updatedAt,
        };
      }

      // Find if customer has a delivered order for this product
      const deliveredOrder = await Order.findOne({
        where: { customerId, status: 'DELIVERED' },
        include: [
          {
            model: OrderItem,
            as: 'items',
            where: { productId },
            required: true,
          },
        ],
      });

      if (deliveredOrder) {
        userCanReview = true;
        eligibleOrderId = deliveredOrder.id;
      }
    }

    return res.json({
      success: true,
      productId: Number(productId),
      averageRating,
      totalCount,
      ratingBreakdown,
      reviews: reviews.map((r) => ({
        id: r.id,
        productId: r.productId,
        orderId: r.orderId,
        rating: r.rating,
        title: r.title,
        body: r.body,
        isVerifiedPurchase: r.isVerifiedPurchase,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
        reviewerName: r.customer ? (r.customer.name || 'Anonymous') : 'Verified Buyer',
        isOwnReview: customerId ? r.customerId === customerId : false,
      })),
      userCanReview,
      userReview,
      eligibleOrderId,
    });
  } catch (error) {
    console.error('[ReviewController] Error in getProductReviews:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch reviews' });
  }
};

/**
 * GET /api/reviews/my-delivered-items
 * Customer authenticated: Fetch all items from customer's DELIVERED orders with their review status.
 */
const getMyDeliveredItems = async (req, res) => {
  try {
    const customerId = req.customer.id;

    const deliveredOrders = await Order.findAll({
      where: { customerId, status: 'DELIVERED' },
      include: [
        {
          model: OrderItem,
          as: 'items',
          include: [{ model: Product, as: 'product', attributes: ['id', 'name', 'slug', 'defaultProductImage', 'images'] }],
        },
      ],
      order: [['createdAt', 'DESC']],
    });

    const userReviews = await Review.findAll({
      where: { customerId },
    });

    const reviewMap = new Map();
    userReviews.forEach((rev) => {
      reviewMap.set(`${rev.orderId}-${rev.productId}`, rev);
      reviewMap.set(`p-${rev.productId}`, rev);
    });

    const deliveredItems = [];
    deliveredOrders.forEach((order) => {
      (order.items || []).forEach((item) => {
        const existingReview = reviewMap.get(`${order.id}-${item.productId}`) || reviewMap.get(`p-${item.productId}`) || null;
        deliveredItems.push({
          orderId: order.id,
          orderNumber: order.orderNumber,
          deliveredAt: order.updatedAt || order.createdAt,
          productId: item.productId,
          productName: item.productName || item.product?.name || 'Product',
          productSlug: item.product?.slug || '',
          productImage: toAbsoluteUrl(item.productImage || item.product?.defaultProductImage || item.product?.images?.[0] || '', req),
          existingReview,
        });
      });
    });

    return res.json({
      success: true,
      items: deliveredItems,
    });
  } catch (error) {
    console.error('[ReviewController] Error in getMyDeliveredItems:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch delivered items' });
  }
};

/**
 * POST /api/reviews
 * Customer authenticated: Submit a review for a product from a DELIVERED order.
 */
const createReview = async (req, res) => {
  try {
    const customerId = req.customer.id;
    let { productId, orderId, rating, title, body } = req.body;

    // Auto-resolve productId from order if productId is null/missing but orderId is provided
    if ((!productId || isNaN(parseInt(productId, 10))) && orderId) {
      const order = await Order.findOne({
        where: { id: orderId, customerId },
        include: [{ model: OrderItem, as: 'items' }]
      });
      if (order && order.items && order.items.length > 0) {
        const itemWithProdId = order.items.find(i => i.productId);
        if (itemWithProdId) {
          productId = itemWithProdId.productId;
        } else {
          for (const item of order.items) {
            if (item.variantId) {
              const variant = await ProductVariant.findByPk(item.variantId);
              if (variant && variant.productId) {
                productId = variant.productId;
                await item.update({ productId: variant.productId });
                break;
              }
            }
          }
        }
      }
    }

    if (!productId || !rating || !body) {
      return res.status(400).json({ success: false, message: 'Product ID, rating (1-5), and review text are required.' });
    }

    const numericProductId = parseInt(productId, 10);
    const numericRating = parseInt(rating, 10);
    if (numericRating < 1 || numericRating > 5) {
      return res.status(400).json({ success: false, message: 'Rating must be between 1 and 5.' });
    }

    // Check delivered order eligibility
    let validOrderId = orderId;
    if (!validOrderId) {
      const deliveredOrder = await Order.findOne({
        where: { customerId, status: 'DELIVERED' },
        include: [
          {
            model: OrderItem,
            as: 'items',
            where: { productId: numericProductId },
            required: true,
          },
        ],
      });
      if (!deliveredOrder) {
        return res.status(403).json({ success: false, message: 'You can only review products from delivered orders.' });
      }
      validOrderId = deliveredOrder.id;
    } else {
      const targetOrder = await Order.findOne({
        where: { id: validOrderId, customerId, status: 'DELIVERED' },
        include: [
          {
            model: OrderItem,
            as: 'items',
            required: false,
          },
        ],
      });
      if (!targetOrder) {
        return res.status(403).json({ success: false, message: 'Order was not found or is not marked as Delivered.' });
      }

      let matchesItem = false;
      for (const item of (targetOrder.items || [])) {
        if (Number(item.productId) === numericProductId) {
          matchesItem = true;
          break;
        }
        if (item.variantId) {
          const variant = await ProductVariant.findByPk(item.variantId);
          if (variant && Number(variant.productId) === numericProductId) {
            matchesItem = true;
            if (!item.productId) {
              await item.update({ productId: numericProductId });
            }
            break;
          }
        }
      }

      if (!matchesItem && targetOrder.items && targetOrder.items.length === 1) {
        matchesItem = true;
        if (!targetOrder.items[0].productId) {
          await targetOrder.items[0].update({ productId: numericProductId });
        }
      }

      if (!matchesItem) {
        return res.status(403).json({ success: false, message: 'This product is not part of the specified order.' });
      }
    }

    // Check if user already reviewed this order item
    const existing = await Review.findOne({
      where: { customerId, productId: numericProductId, orderId: validOrderId },
    });

    if (existing) {
      existing.rating = numericRating;
      existing.title = title || '';
      existing.body = body;
      await existing.save();

      const updatedStats = await recalculateProductRating(numericProductId);

      return res.json({
        success: true,
        message: 'Review updated successfully!',
        review: existing,
        productStats: updatedStats,
      });
    }

    // Create new review
    const review = await Review.create({
      productId: numericProductId,
      customerId,
      orderId: Number(validOrderId),
      rating: numericRating,
      title: title || '',
      body,
      isVerifiedPurchase: true,
      isApproved: false,
    });

    const updatedStats = await recalculateProductRating(productId);

    // Award bonus points for submitting a review
    let reviewBonusPoints = 0;
    try {
      const siteSetting = await SiteSetting.findOne({ where: { key: 'loyalty' } });
      let loyaltySettings = { reviewPointsEnabled: true, reviewPoints: 20 };
      if (siteSetting && siteSetting.value) {
        try { loyaltySettings = { ...loyaltySettings, ...JSON.parse(siteSetting.value) }; } catch (e) {}
      }

      const reviewPts = Number(loyaltySettings.reviewPoints || 0);
      if (loyaltySettings.reviewPointsEnabled !== false && reviewPts > 0) {
        const customer = await Customer.findByPk(customerId);
        if (customer) {
          reviewBonusPoints = reviewPts;
          const newBalance = Number(customer.loyaltyPoints || 0) + reviewPts;
          await customer.update({ loyaltyPoints: newBalance });
          await LoyaltyLedger.create({
            customerId: customer.id,
            type: 'BONUS',
            points: reviewPts,
            balance: newBalance,
            description: `Reward for writing a product review`
          });
        }
      }
    } catch (e) {
      console.warn('[ReviewController] Error awarding review bonus points:', e.message);
    }

    const message = reviewBonusPoints > 0
      ? `Review submitted successfully! You earned +${reviewBonusPoints} bonus loyalty points!`
      : 'Review submitted successfully!';

    return res.status(201).json({
      success: true,
      message,
      review,
      productStats: updatedStats,
      bonusPointsEarned: reviewBonusPoints,
    });
  } catch (error) {
    console.error('[ReviewController] Error in createReview:', error);
    return res.status(500).json({ success: false, message: 'Failed to submit review' });
  }
};

/**
 * PUT /api/reviews/:id
 * Customer authenticated: Update customer's review.
 */
const updateReview = async (req, res) => {
  try {
    const { id } = req.params;
    const customerId = req.customer.id;
    const { rating, title, body } = req.body;

    const review = await Review.findByPk(id);
    if (!review) {
      return res.status(404).json({ success: false, message: 'Review not found.' });
    }

    if (review.customerId !== customerId) {
      return res.status(403).json({ success: false, message: 'You are not authorized to edit this review.' });
    }

    if (rating) {
      const numericRating = parseInt(rating, 10);
      if (numericRating >= 1 && numericRating <= 5) {
        review.rating = numericRating;
      }
    }

    if (title !== undefined) review.title = title;
    if (body) review.body = body;

    await review.save();

    const updatedStats = await recalculateProductRating(review.productId);

    return res.json({
      success: true,
      message: 'Review updated successfully!',
      review,
      productStats: updatedStats,
    });
  } catch (error) {
    console.error('[ReviewController] Error in updateReview:', error);
    return res.status(500).json({ success: false, message: 'Failed to update review' });
  }
};

/**
 * DELETE /api/reviews/:id
 * Customer or Admin authenticated: Delete review.
 */
const deleteReview = async (req, res) => {
  try {
    const { id } = req.params;
    const customerId = req.customer?.id || null;
    const isAdmin = !!req.admin;

    const review = await Review.findByPk(id);
    if (!review) {
      return res.status(404).json({ success: false, message: 'Review not found.' });
    }

    if (!isAdmin && review.customerId !== customerId) {
      return res.status(403).json({ success: false, message: 'You are not authorized to delete this review.' });
    }

    const productId = review.productId;
    await review.destroy();

    const updatedStats = await recalculateProductRating(productId);

    return res.json({
      success: true,
      message: 'Review deleted successfully.',
      productStats: updatedStats,
    });
  } catch (error) {
    console.error('[ReviewController] Error in deleteReview:', error);
    return res.status(500).json({ success: false, message: 'Failed to delete review' });
  }
};

/**
 * GET /api/reviews/admin/all
 * Admin authenticated: Fetch all reviews across all products with approval status filter & search.
 */
const getAllReviewsAdmin = async (req, res) => {
  try {
    const { status, search, page, limit } = req.query;
    const whereClause = {};

    if (status === 'approved') {
      whereClause.isApproved = true;
    } else if (status === 'pending') {
      whereClause.isApproved = false;
    }

    const reviews = await Review.findAll({
      where: whereClause,
      include: [
        {
          model: Product,
          as: 'product',
          attributes: ['id', 'name', 'slug', 'defaultProductImage', 'images', 'rating', 'reviewCount'],
        },
        {
          model: Customer,
          as: 'customer',
          attributes: ['id', 'name', 'email'],
        },
      ],
      order: [['createdAt', 'DESC']],
    });

    let filtered = reviews;
    if (search && search.trim() !== '') {
      const q = search.toLowerCase().trim();
      filtered = reviews.filter((r) => {
        const prodName = r.product?.name?.toLowerCase() || '';
        const custName = r.customer?.name?.toLowerCase() || '';
        const title = r.title?.toLowerCase() || '';
        const body = r.body?.toLowerCase() || '';
        return prodName.includes(q) || custName.includes(q) || title.includes(q) || body.includes(q);
      });
    }

    const total = filtered.length;
    let paginated = filtered;
    let p = 1;
    let l = total;

    if (page !== undefined || limit !== undefined) {
      p = Math.max(1, parseInt(page || 1, 10));
      l = Math.max(1, parseInt(limit || 10, 10));
      const offset = (p - 1) * l;
      paginated = filtered.slice(offset, offset + l);
    }

    return res.json({
      success: true,
      count: total,
      total,
      page: p,
      limit: l,
      totalPages: l > 0 ? Math.ceil(total / l) : 1,
      reviews: paginated.map((r) => ({
        id: r.id,
        productId: r.productId,
        productName: r.product?.name || 'Product',
        productImage: r.product?.defaultProductImage || r.product?.images?.[0] || '',
        customerId: r.customerId,
        reviewerName: r.customer?.name || r.customer?.email || 'Customer',
        reviewerEmail: r.customer?.email || '',
        orderId: r.orderId,
        rating: r.rating,
        title: r.title,
        body: r.body,
        isVerifiedPurchase: r.isVerifiedPurchase,
        isApproved: r.isApproved,
        createdAt: r.createdAt,
      })),
    });
  } catch (error) {
    console.error('[ReviewController] Error in getAllReviewsAdmin:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch reviews for admin' });
  }
};

/**
 * PATCH /api/reviews/admin/:id/status
 * Admin authenticated: Approve or Reject a review.
 */
const updateReviewStatusAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    const { isApproved } = req.body;

    const review = await Review.findByPk(id);
    if (!review) {
      return res.status(404).json({ success: false, message: 'Review not found.' });
    }

    review.isApproved = isApproved === true || isApproved === 'true';
    await review.save();

    const updatedStats = await recalculateProductRating(review.productId);

    return res.json({
      success: true,
      message: `Review ${review.isApproved ? 'Approved' : 'Rejected'} successfully!`,
      review,
      productStats: updatedStats,
    });
  } catch (error) {
    console.error('[ReviewController] Error in updateReviewStatusAdmin:', error);
    return res.status(500).json({ success: false, message: 'Failed to update review status' });
  }
};

/**
 * Helper to sync ratings for all products based on actual approved reviews
 */
const syncAllProductRatings = async () => {
  try {
    const sequelize = Review.sequelize;
    const stats = await Review.findAll({
      attributes: [
        'productId',
        [sequelize.fn('AVG', sequelize.col('rating')), 'avgRating'],
        [sequelize.fn('COUNT', sequelize.col('id')), 'reviewCount']
      ],
      where: { isApproved: true },
      group: ['productId'],
      raw: true
    });

    const updatePromises = stats.map(s => {
      const avg = parseFloat(parseFloat(s.avgRating || 0).toFixed(2));
      const count = parseInt(s.reviewCount || 0, 10);
      return Product.update({ rating: avg, reviewCount: count }, { where: { id: s.productId } });
    });

    await Promise.all(updatePromises);
    console.log(`[RatingSync] Recalculated real ratings for ${stats.length} products with reviews.`);
  } catch (err) {
    console.error('[RatingSync] Error syncing product ratings:', err.message);
  }
};

module.exports = {
  getProductReviews,
  getMyDeliveredItems,
  createReview,
  updateReview,
  deleteReview,
  getAllReviewsAdmin,
  updateReviewStatusAdmin,
  recalculateProductRating,
  syncAllProductRatings,
};
