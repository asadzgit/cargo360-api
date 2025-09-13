#!/usr/bin/env node

// Node.js Console for Cargo360 API (like Rails console)
// Usage: node console.js

require('dotenv').config();
const repl = require('repl');
const { User, Vehicle, Shipment, Review, sequelize } = require('./models');

console.log('🚀 Cargo360 API Console');
console.log('📦 Available models: User, Vehicle, Shipment, Review, sequelize');
console.log('💡 Example: await User.findAll()');
console.log('💡 Example: await User.create({name: "Test", email: "test@example.com", passwordHash: "hash", role: "customer"})');
console.log('---');

// Start REPL with models available
const replServer = repl.start({
  prompt: 'cargo360> ',
  useColors: true,
});

// Make models available in REPL context
replServer.context.User = User;
replServer.context.Vehicle = Vehicle;
replServer.context.Shipment = Shipment;
replServer.context.Review = Review;
replServer.context.sequelize = sequelize;
replServer.context.db = sequelize;

// Add some helper functions
replServer.context.reload = () => {
  console.log('🔄 Reloading models...');
  delete require.cache[require.resolve('./models')];
  const models = require('./models');
  Object.assign(replServer.context, models);
  console.log('✅ Models reloaded');
};

replServer.context.testConnection = async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connection successful');
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
  }
};

// Graceful shutdown
replServer.on('exit', () => {
  console.log('\n👋 Goodbye!');
  process.exit();
});
