'use strict';

const { ContactEnquiry } = require('../models');
const { Op } = require('sequelize');
const { sendContactEnquiryAdminNotification } = require('../services/emailService');

/**
 * Submit Contact Enquiry (Public Storefront)
 */
exports.submitContactEnquiry = async (req, res) => {
  try {
    const { name, email, phone, subject, message } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Full name is required' });
    }
    if (!email || !email.trim()) {
      return res.status(400).json({ success: false, message: 'Email address is required' });
    }
    if (!message || !message.trim()) {
      return res.status(400).json({ success: false, message: 'Message is required' });
    }

    const enquiry = await ContactEnquiry.create({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      phone: phone ? phone.trim() : null,
      subject: subject ? subject.trim() : 'General Inquiry',
      message: message.trim(),
      status: 'PENDING',
    });

    // Send email notification to Admin asynchronously
    sendContactEnquiryAdminNotification(enquiry).catch(err => {
      console.error('Asynchronous contact enquiry email failed:', err.message);
    });

    res.status(201).json({
      success: true,
      message: 'Thank you! Your message has been sent successfully.',
      data: enquiry
    });
  } catch (error) {
    console.error('Error in submitContactEnquiry:', error);
    res.status(500).json({ success: false, message: 'Failed to submit enquiry', error: error.message });
  }
};

/**
 * Get paginated list of contact enquiries with search & status filter (Admin)
 */
exports.getContactEnquiries = async (req, res) => {
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
        { subject: { [Op.like]: `%${q}%` } },
        { message: { [Op.like]: `%${q}%` } },
        { phone: { [Op.like]: `%${q}%` } },
      ];
    }

    if (status && status !== 'ALL') {
      where.status = status;
    }

    const { count, rows } = await ContactEnquiry.findAndCountAll({
      where,
      limit,
      offset,
      order: [['createdAt', 'DESC']],
    });

    // Calculate Summary Stats
    const totalEnquiries = await ContactEnquiry.count();
    const pendingCount = await ContactEnquiry.count({ where: { status: 'PENDING' } });
    const inProgressCount = await ContactEnquiry.count({ where: { status: 'IN_PROGRESS' } });
    const resolvedCount = await ContactEnquiry.count({ where: { status: 'RESOLVED' } });

    res.json({
      success: true,
      enquiries: rows,
      total: count,
      page,
      limit,
      totalPages: Math.ceil(count / limit),
      stats: {
        totalEnquiries,
        pendingCount,
        inProgressCount,
        resolvedCount
      }
    });
  } catch (error) {
    console.error('Error in getContactEnquiries:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch contact enquiries', error: error.message });
  }
};

/**
 * Get single enquiry details (Admin)
 */
exports.getContactEnquiryById = async (req, res) => {
  try {
    const { id } = req.params;
    const enquiry = await ContactEnquiry.findByPk(id);

    if (!enquiry) {
      return res.status(404).json({ success: false, message: 'Enquiry not found' });
    }

    res.json({ success: true, enquiry });
  } catch (error) {
    console.error('Error in getContactEnquiryById:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch enquiry details', error: error.message });
  }
};

/**
 * Update enquiry status & admin notes (Admin)
 */
exports.updateContactEnquiry = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, adminNotes } = req.body;

    const enquiry = await ContactEnquiry.findByPk(id);
    if (!enquiry) {
      return res.status(404).json({ success: false, message: 'Enquiry not found' });
    }

    if (status && ['PENDING', 'IN_PROGRESS', 'RESOLVED'].includes(status)) {
      enquiry.status = status;
    }

    if (adminNotes !== undefined) {
      enquiry.adminNotes = adminNotes;
    }

    await enquiry.save();

    res.json({
      success: true,
      message: 'Enquiry updated successfully',
      enquiry
    });
  } catch (error) {
    console.error('Error in updateContactEnquiry:', error);
    res.status(500).json({ success: false, message: 'Failed to update enquiry', error: error.message });
  }
};

/**
 * Delete single enquiry (Admin)
 */
exports.deleteContactEnquiry = async (req, res) => {
  try {
    const { id } = req.params;
    const enquiry = await ContactEnquiry.findByPk(id);

    if (!enquiry) {
      return res.status(404).json({ success: false, message: 'Enquiry not found' });
    }

    await enquiry.destroy();
    res.json({ success: true, message: 'Enquiry deleted successfully' });
  } catch (error) {
    console.error('Error in deleteContactEnquiry:', error);
    res.status(500).json({ success: false, message: 'Failed to delete enquiry', error: error.message });
  }
};

/**
 * Bulk delete enquiries (Admin)
 */
exports.bulkDeleteContactEnquiries = async (req, res) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ success: false, message: 'No enquiry IDs provided' });
    }

    const deletedCount = await ContactEnquiry.destroy({
      where: { id: { [Op.in]: ids } }
    });

    res.json({
      success: true,
      message: `Successfully deleted ${deletedCount} enquiries`
    });
  } catch (error) {
    console.error('Error in bulkDeleteContactEnquiries:', error);
    res.status(500).json({ success: false, message: 'Failed to bulk delete enquiries', error: error.message });
  }
};
