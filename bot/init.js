#!/usr/bin/env node

/**
 * init.js - Initialization and startup script for Discord Staff Management Bot
 * This file handles pre-flight checks and starts the bot
 */

const fs = require('fs');
const path = require('path');

console.log('╔═══════════════════════════════════════════════════════╗');
console.log('║   Discord Staff Management Bot - Initialization      ║');
console.log('╚═══════════════════════════════════════════════════════╝\n');

// Check if .env file exists
const envPath = path.join(__dirname, '.env');
const hasEnvFile = fs.existsSync(envPath);

if (hasEnvFile) {
  // Load environment variables from .env
  require('dotenv').config();
  console.log('✅ Environment variables loaded from .env');
} else {
  console.log('ℹ️  .env file not found, using system environment variables');
}

// Validate required environment variables
const requiredVars = ['DISCORD_TOKEN', 'CLIENT_ID'];
const missing = requiredVars.filter(varName => !process.env[varName]);

if (missing.length > 0) {
  if (!hasEnvFile) {
    console.error('❌ ERROR: Missing required environment variables and no .env file found!');
    console.error('Please add DISCORD_TOKEN and CLIENT_ID to Replit Secrets or create a .env file.');
  } else {
    console.error('❌ ERROR: Missing required environment variables in .env:');
    missing.forEach(varName => console.error(`   - ${varName}`));
  }
  process.exit(1);
}

if (!hasEnvFile) {
  console.log('✅ Required environment variables verified from system');
}

// Ensure data directory exists
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
  console.log('✅ Created data directory');
} else {
  console.log('✅ Data directory exists');
}

// Check if node_modules exists
const nodeModulesPath = path.join(__dirname, 'node_modules');
if (!fs.existsSync(nodeModulesPath)) {
  console.log('⚠️  node_modules not found - installing dependencies...');
  const { execSync } = require('child_process');
  try {
    execSync('npm install', { stdio: 'inherit', cwd: __dirname });
    console.log('✅ Dependencies installed successfully');
  } catch (error) {
    console.error('❌ Failed to install dependencies');
    console.error('Please run: npm install');
    process.exit(1);
  }
} else {
  console.log('✅ Dependencies verified');
}

// Check if commands directory exists
const commandsDir = path.join(__dirname, 'commands');
if (!fs.existsSync(commandsDir)) {
  console.error('❌ ERROR: commands directory not found!');
  process.exit(1);
}

// Count command files
const commandFiles = fs.readdirSync(commandsDir).filter(file => file.endsWith('.js'));
console.log(`✅ Found ${commandFiles.length} command files`);

// Check if utils directory exists
const utilsDir = path.join(__dirname, 'utils');
if (!fs.existsSync(utilsDir)) {
  console.error('❌ ERROR: utils directory not found!');
  process.exit(1);
}
console.log('✅ Utils directory verified');

// All checks passed, start the bot
console.log('\n🚀 Starting Discord bot...\n');
console.log('═══════════════════════════════════════════════════════\n');

// Start the main bot file
require('./index.js');
