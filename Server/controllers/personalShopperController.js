'use strict';

const { PersonalShopperRequest, Customer } = require('../models');
const { Op } = require('sequelize');

/**
 * Submit Personal Shopper Request (Customer / Public)
 */
exports.submitRequest = async (req, res) => {
  try {
    const { name, email, phone, occasion, budget, style, notes } = req.body;

    let customerId = req.customer?.id || null;
    let customerName = name || (req.customer ? req.customer.name : '');
    let customerEmail = email || req.customer?.email;
    let customerPhone = phone || req.customer?.phone;

    if (!customerName || !customerName.trim()) {
      return res.status(400).json({ success: false, message: 'Full name is required' });
    }
    if (!customerEmail || !customerEmail.trim()) {
      return res.status(400).json({ success: false, message: 'Email address is required' });
    }
    if (!occasion || !occasion.trim()) {
      return res.status(400).json({ success: false, message: 'Occasion is required' });
    }
    if (!budget || !String(budget).trim()) {
      return res.status(400).json({ success: false, message: 'Budget is required' });
    }

    const shopperRequest = await PersonalShopperRequest.create({
      customerId,
      name: customerName.trim(),
      email: customerEmail.trim().toLowerCase(),
      phone: customerPhone ? customerPhone.trim() : null,
      occasion: occasion.trim(),
      budget: String(budget).trim(),
      style: style ? style.trim() : null,
      notes: notes ? notes.trim() : null,
      status: 'PENDING',
    });

    res.status(201).json({
      success: true,
      message: 'Styling request sent — our stylist will reach out within 24h',
      data: shopperRequest,
    });
  } catch (error) {
    console.error('Error in submitRequest:', error);
    res.status(500).json({ success: false, message: 'Failed to submit personal shopper request', error: error.message });
  }
};

/**
 * Get paginated list of Personal Shopper requests (Admin)
 */
exports.getRequests = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.max(1, Math.min(100, parseInt(req.query.limit, 10) || 20));
    const offset = (page - 1) * limit;

    const { search, status } = req.query;

    const where = {};

    if (search && search.trim()) {
      const q = search.trim();
      where[Op.or] = [
        { name: { [Op.like]: `%${q}%` } },
        { email: { [Op.like]: `%${q}%` } },
        { phone: { [Op.like]: `%${q}%` } },
        { occasion: { [Op.like]: `%${q}%` } },
        { style: { [Op.like]: `%${q}%` } },
        { notes: { [Op.like]: `%${q}%` } },
      ];
    }

    if (status && status !== 'ALL') {
      where.status = status;
    }

    const { count, rows } = await PersonalShopperRequest.findAndCountAll({
      where,
      limit,
      offset,
      order: [['createdAt', 'DESC']],
      include: [
        {
          model: Customer,
          as: 'customer',
          attributes: ['id', 'name', 'email', 'phone', 'avatar'],
        },
      ],
    });

    // Calculate Summary Stats
    const totalRequests = await PersonalShopperRequest.count();
    const pendingCount = await PersonalShopperRequest.count({ where: { status: 'PENDING' } });
    const inProgressCount = await PersonalShopperRequest.count({ where: { status: 'IN_PROGRESS' } });
    const contactedCount = await PersonalShopperRequest.count({ where: { status: 'CONTACTED' } });
    const completedCount = await PersonalShopperRequest.count({ where: { status: 'COMPLETED' } });
    const cancelledCount = await PersonalShopperRequest.count({ where: { status: 'CANCELLED' } });

    res.json({
      success: true,
      requests: rows,
      total: count,
      page,
      limit,
      totalPages: Math.ceil(count / limit),
      stats: {
        totalRequests,
        pendingCount,
        inProgressCount,
        contactedCount,
        completedCount,
        cancelledCount,
      },
    });
  } catch (error) {
    console.error('Error in getRequests:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch personal shopper requests', error: error.message });
  }
};

/**
 * Get single request details (Admin)
 */
exports.getRequestById = async (req, res) => {
  try {
    const { id } = req.params;
    const request = await PersonalShopperRequest.findByPk(id, {
      include: [
        {
          model: Customer,
          as: 'customer',
          attributes: ['id', 'name', 'email', 'phone', 'avatar'],
        },
      ],
    });

    if (!request) {
      return res.status(404).json({ success: false, message: 'Personal shopper request not found' });
    }

    res.json({ success: true, request });
  } catch (error) {
    console.error('Error in getRequestById:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch request details', error: error.message });
  }
};

/**
 * Update request status & admin notes (Admin)
 */
exports.updateRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, adminNotes } = req.body;

    const request = await PersonalShopperRequest.findByPk(id);
    if (!request) {
      return res.status(404).json({ success: false, message: 'Personal shopper request not found' });
    }

    const validStatuses = ['PENDING', 'IN_PROGRESS', 'CONTACTED', 'COMPLETED', 'CANCELLED'];
    if (status && validStatuses.includes(status)) {
      request.status = status;
    }

    if (adminNotes !== undefined) {
      request.adminNotes = adminNotes;
    }

    await request.save();

    res.json({
      success: true,
      message: 'Personal shopper request updated successfully',
      request,
    });
  } catch (error) {
    console.error('Error in updateRequest:', error);
    res.status(500).json({ success: false, message: 'Failed to update request', error: error.message });
  }
};

/**
 * Delete single request (Admin)
 */
exports.deleteRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const request = await PersonalShopperRequest.findByPk(id);

    if (!request) {
      return res.status(404).json({ success: false, message: 'Personal shopper request not found' });
    }

    await request.destroy();
    res.json({ success: true, message: 'Personal shopper request deleted successfully' });
  } catch (error) {
    console.error('Error in deleteRequest:', error);
    res.status(500).json({ success: false, message: 'Failed to delete request', error: error.message });
  }
};

/**
 * Bulk delete requests (Admin)
 */
exports.bulkDeleteRequests = async (req, res) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ success: false, message: 'No request IDs provided' });
    }

    const deletedCount = await PersonalShopperRequest.destroy({
      where: { id: { [Op.in]: ids } },
    });

    res.json({
      success: true,
      message: `Successfully deleted ${deletedCount} personal shopper requests`,
    });
  } catch (error) {
    console.error('Error in bulkDeleteRequests:', error);
    res.status(500).json({ success: false, message: 'Failed to bulk delete requests', error: error.message });
  }
};
