'use strict';
const { Op } = require('sequelize');
const { MarketingMessage } = require('../models');
const sequelize = require('../config/db');

// Helper to normalize and re-sequence all marketing messages to 1, 2, 3, ...
const normalizePositions = async (transaction) => {
  const allMessages = await MarketingMessage.findAll({
    order: [['position', 'ASC'], ['updatedAt', 'DESC'], ['id', 'ASC']],
    transaction
  });

  for (let i = 0; i < allMessages.length; i++) {
    const targetPos = i + 1;
    if (allMessages[i].position !== targetPos) {
      await allMessages[i].update({ position: targetPos }, { transaction });
    }
  }
};

const getAll = async (req, res) => {
  try {
    const { all } = req.query;
    const where = {};
    if (!all) where.isActive = true;

    const messages = await MarketingMessage.findAll({ where, order: [['position', 'ASC'], ['id', 'ASC']] });

    if (all) {
      const positions = messages.map(m => m.position);
      const hasDuplicates = new Set(positions).size !== positions.length;
      const isNotSequential = positions.some((p, idx) => p !== idx + 1);

      if (hasDuplicates || isNotSequential) {
        await normalizePositions();
        const reloaded = await MarketingMessage.findAll({ where, order: [['position', 'ASC'], ['id', 'ASC']] });
        return res.json({ success: true, messages: reloaded });
      }
    }

    res.json({ success: true, messages });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const create = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    let targetPos = parseInt(req.body.position, 10);
    const count = await MarketingMessage.count({ transaction: t });

    if (isNaN(targetPos) || targetPos < 1) {
      targetPos = count + 1;
    }

    // Shift existing messages with position >= targetPos down by +1
    await MarketingMessage.increment('position', {
      by: 1,
      where: {
        position: { [Op.gte]: targetPos }
      },
      transaction: t
    });

    const message = await MarketingMessage.create({
      ...req.body,
      position: targetPos
    }, { transaction: t });

    // Normalize all positions strictly
    await normalizePositions(t);

    await t.commit();

    const refreshed = await MarketingMessage.findByPk(message.id);
    res.status(201).json({ success: true, message: refreshed || message });
  } catch (err) {
    await t.rollback();
    res.status(500).json({ success: false, message: err.message });
  }
};

const update = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const message = await MarketingMessage.findByPk(req.params.id, { transaction: t });
    if (!message) {
      await t.rollback();
      return res.status(404).json({ success: false, message: 'Message not found' });
    }

    const oldPos = message.position;
    const newPos = req.body.position !== undefined ? parseInt(req.body.position, 10) : oldPos;

    if (!isNaN(newPos) && newPos !== oldPos) {
      if (newPos < oldPos) {
        // Moving up: items in [newPos, oldPos - 1] shift down (+1)
        await MarketingMessage.increment('position', {
          by: 1,
          where: {
            id: { [Op.ne]: message.id },
            position: { [Op.gte]: newPos, [Op.lt]: oldPos }
          },
          transaction: t
        });
      } else {
        // Moving down: items in [oldPos + 1, newPos] shift up (-1)
        await MarketingMessage.decrement('position', {
          by: 1,
          where: {
            id: { [Op.ne]: message.id },
            position: { [Op.gt]: oldPos, [Op.lte]: newPos }
          },
          transaction: t
        });
      }
    }

    await message.update(req.body, { transaction: t });

    // Normalize all positions strictly
    await normalizePositions(t);

    await t.commit();

    const refreshed = await MarketingMessage.findByPk(message.id);
    res.json({ success: true, message: refreshed || message });
  } catch (err) {
    await t.rollback();
    res.status(500).json({ success: false, message: err.message });
  }
};

const remove = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const message = await MarketingMessage.findByPk(req.params.id, { transaction: t });
    if (!message) {
      await t.rollback();
      return res.status(404).json({ success: false, message: 'Message not found' });
    }
    await message.destroy({ transaction: t });
    await normalizePositions(t);
    await t.commit();
    res.json({ success: true, message: 'Message deleted' });
  } catch (err) {
    await t.rollback();
    res.status(500).json({ success: false, message: err.message });
  }
};

const reorder = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { items } = req.body; // [{ id, position }]
    if (!Array.isArray(items) || items.length === 0) {
      await t.rollback();
      return res.status(400).json({ success: false, message: 'items array required' });
    }

    for (const item of items) {
      await MarketingMessage.update(
        { position: item.position },
        { where: { id: item.id }, transaction: t }
      );
    }

    await normalizePositions(t);
    await t.commit();
    res.json({ success: true, message: 'Reordered successfully' });
  } catch (err) {
    await t.rollback();
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = { getAll, create, update, remove, reorder };
