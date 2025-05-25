require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({
  origin: '*', // Allow all origins
  methods: ['GET', 'POST'], // Allow these HTTP methods
  allowedHeaders: ['Content-Type', 'xi-api-key'] // Allow these headers
}));
app.use(express.json());

// ElevenLabs API configuration
const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const ELEVENLABS_API_URL = 'https://api.elevenlabs.io/v1';

// Test ElevenLabs API connection
app.get('/api/test-connection', async (req, res) => {
  try {
    console.log('Testing ElevenLabs API connection...');
    
    // Make a simple API call to ElevenLabs to verify connection
    const response = await axios({
      method: 'GET',
      url: `${ELEVENLABS_API_URL}/voices`,
      headers: {
        'xi-api-key': ELEVENLABS_API_KEY
      }
    });
    
    console.log('ElevenLabs API connection successful!');
    console.log('Available voices:', response.data.voices.length);
    
    res.status(200).json({
      connected: true,
      message: 'Successfully connected to ElevenLabs API',
      voicesCount: response.data.voices.length
    });
  } catch (error) {
    console.error('Error connecting to ElevenLabs API:', error.response?.data || error.message);
    
    res.status(500).json({
      connected: false,
      message: 'Failed to connect to ElevenLabs API',
      error: error.response?.data || error.message
    });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
