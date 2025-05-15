const mongoose = require('mongoose');
const { Campaign, Account, Email, Event } = require('../src/models');
require('dotenv').config();

async function testUser() {
  try {
    // Conectar ao MongoDB
