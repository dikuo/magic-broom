// api/maps-proxy.js

const axios = require('axios');

// Vercel CLI loads variables from the .env file in the root directory.
const GOOGLE_API_KEY = process.env.GOOGLE_MAPS_API_KEY; 

module.exports = async (req, res) => {
  // 1. Set CORS Headers to allow access from your Expo client (e.g., http://localhost:8081)
  res.setHeader('Access-Control-Allow-Origin', '*'); 
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle OPTIONS request (CORS preflight)
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Only allow GET requests for the API call
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { input, language } = req.query;

  // Basic input validation
  if (!input || !GOOGLE_API_KEY) {
    return res.status(400).json({ error: 'Missing input or API key.' });
  }

  // 2. Construct the Google Maps Autocomplete URL
  const googleMapsUrl = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${input}&key=${GOOGLE_API_KEY}&language=${language || 'en'}`;

  try {
    // 3. Forward the request to Google Maps API
    const response = await axios.get(googleMapsUrl);

    // 4. Return Google's response data to the frontend client
    res.status(200).json(response.data);
  } catch (error) {
    console.error("Error calling Google Maps API from proxy:", error.message);
    res.status(500).json({ error: 'Proxy forwarding failed.' });
  }
};