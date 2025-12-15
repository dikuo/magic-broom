// functions/index.js


const functions = require('firebase-functions');
const axios = require('axios');
const { defineString } = require('firebase-functions/params');

// 1. 定义环境变量参数 (必须是大写)
const GOOGLE_MAPS_KEY = defineString('GOOGLE_MAPS_KEY');

/**
 * CORS 代理函数，用于转发 Google Places Autocomplete 请求
 */
exports.placesProxy = functions.https.onRequest(async (req, res) => {
  
  const API_KEY = GOOGLE_MAPS_KEY.value();

  // 1. 设置 CORS 头部 (允许前端访问)
  res.set('Access-Control-Allow-Origin', '*'); 

  
  if (req.method === 'OPTIONS') {
    res.set('Access-Control-Allow-Methods', 'GET');
    res.set('Access-Control-Allow-Headers', 'Content-Type, X-Client-ID'); 
    res.set('Access-Control-Max-Age', '3600');
    res.status(204).send('');
    return;
  }

  if (req.method !== 'GET') {
    return res.status(405).send('Method Not Allowed');
  }

  const { input, language } = req.query;

  
  if (!input || !API_KEY) {
    console.error("Missing input or Google API Key in environment.");
    return res.status(400).send('Configuration Error. API Key not found.');
  }

  // 2. 构造 Google Maps API URL
  const googleMapsUrl = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${input}&key=${API_KEY}&language=${language || 'en'}`;

  try {
    // 3. 将请求转发给 Google Maps
    const response = await axios.get(googleMapsUrl);

    // 4. 将 Google 的响应返回给客户端
    return res.status(200).json(response.data);

  } catch (error) {
    console.error("Error calling Google Maps API:", error.message);
    return res.status(500).send('Proxy forwarding failed.');
  }
});