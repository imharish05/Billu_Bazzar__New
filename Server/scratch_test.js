'use strict';
const { sequelize, DeliveryZone } = require('./models');

async function test() {
  try {
    await sequelize.authenticate();
    console.log('Database connected successfully.');
    await DeliveryZone.sync({ alter: true });
    console.log('DeliveryZone table synced successfully!');
    process.exit(0);
  } catch (err) {
    console.error('Test error:', err);
    process.exit(1);
  }
}

test();
