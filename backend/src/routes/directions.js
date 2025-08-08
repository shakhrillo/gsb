const express = require('express');
const axios = require('axios');
const router = express.Router();

const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;

// In-memory cache for route calculations
const routeCache = new Map();
const CACHE_EXPIRY = 30 * 60 * 1000; // 30 minutes in milliseconds

// Helper function to generate cache key
function generateCacheKey(origin, destination, travelMode, routingPreference, routeModifiers) {
  return JSON.stringify({
    origin,
    destination,
    travelMode,
    routingPreference,
    routeModifiers: routeModifiers || {}
  });
}

// Helper function to check if cache entry is expired
function isCacheExpired(timestamp) {
  return Date.now() - timestamp > CACHE_EXPIRY;
}

/**
 * @swagger
 * /directions:
 *   post:
 *     summary: Get directions between two points using new Routes API
 *     description: Get directions from origin to destination using Google Routes API
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - origin
 *               - destination
 *             properties:
 *               origin:
 *                 type: object
 *                 properties:
 *                   location:
 *                     type: object
 *                     properties:
 *                       latLng:
 *                         type: object
 *                         properties:
 *                           latitude:
 *                             type: number
 *                             example: 41.2995
 *                           longitude:
 *                             type: number
 *                             example: 69.2401
 *               destination:
 *                 type: object
 *                 properties:
 *                   location:
 *                     type: object
 *                     properties:
 *                       latLng:
 *                         type: object
 *                         properties:
 *                           latitude:
 *                             type: number
 *                             example: 41.3111
 *                           longitude:
 *                             type: number
 *                             example: 69.2797
 *               travelMode:
 *                 type: string
 *                 enum: [DRIVE, WALK, BICYCLE, TRANSIT]
 *                 default: DRIVE
 *               routingPreference:
 *                 type: string
 *                 enum: [TRAFFIC_UNAWARE, TRAFFIC_AWARE, TRAFFIC_AWARE_OPTIMAL]
 *                 default: TRAFFIC_AWARE
 *               computeAlternativeRoutes:
 *                 type: boolean
 *                 default: false
 *               avoidTolls:
 *                 type: boolean
 *                 default: false
 *               avoidHighways:
 *                 type: boolean
 *                 default: false
 *               avoidFerries:
 *                 type: boolean
 *                 default: false
 *               languageCode:
 *                 type: string
 *                 default: en
 *                 example: uz
 *               units:
 *                 type: string
 *                 enum: [METRIC, IMPERIAL]
 *                 default: METRIC
 *     responses:
 *       200:
 *         description: Directions retrieved successfully
 *       400:
 *         description: Missing required parameters
 *       500:
 *         description: Internal server error
 */
router.post('/', async (req, res) => {
  try {
    const {
      origin,
      destination,
      travelMode = 'DRIVE',
      routingPreference = 'TRAFFIC_AWARE',
      computeAlternativeRoutes = false,
      avoidTolls = false,
      avoidHighways = false,
      avoidFerries = false,
      languageCode = 'en',
      units = 'METRIC'
    } = req.body;

    // Validate required parameters
    if (!origin || !destination) {
      return res.status(400).json({
        error: 'Origin and destination are required parameters'
      });
    }

    // Add route modifiers if specified
    const routeModifiers = {};
    if (avoidTolls) routeModifiers.avoidTolls = true;
    if (avoidHighways) routeModifiers.avoidHighways = true;
    if (avoidFerries) routeModifiers.avoidFerries = true;

    // Generate cache key
    const cacheKey = generateCacheKey(origin, destination, travelMode, routingPreference, routeModifiers);
    
    // Check cache first
    const cachedResult = routeCache.get(cacheKey);
    if (cachedResult && !isCacheExpired(cachedResult.timestamp)) {
      console.log('Returning cached route result');
      return res.json(cachedResult.data);
    }

    // Build request body for new Routes API
    const requestBody = {
      origin,
      destination,
      travelMode,
      routingPreference,
      computeAlternativeRoutes,
      languageCode,
      units
    };

    if (Object.keys(routeModifiers).length > 0) {
      requestBody.routeModifiers = routeModifiers;
    }

    // Make request to Google Routes API
    const response = await axios.post(
      'https://routes.googleapis.com/directions/v2:computeRoutes',
      requestBody,
      {
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': GOOGLE_MAPS_API_KEY,
          'X-Goog-FieldMask': 'routes.duration,routes.distanceMeters,routes.polyline.encodedPolyline,routes.legs'
        }
      }
    );

    // Cache the result
    routeCache.set(cacheKey, {
      data: response.data,
      timestamp: Date.now()
    });

    // Clean up expired cache entries periodically
    if (routeCache.size > 100) { // Limit cache size
      for (const [key, value] of routeCache.entries()) {
        if (isCacheExpired(value.timestamp)) {
          routeCache.delete(key);
        }
      }
    }

    // Return the routes data
    res.json(response.data);

  } catch (error) {
    console.error('Routes API error:', error);
    
    if (error.response) {
      return res.status(error.response.status).json({
        error: 'Google Routes API error',
        message: error.response.data?.error?.message || 'Unknown error',
        details: error.response.data
      });
    }
    
    res.status(500).json({
      error: 'Failed to get directions',
      message: error.message
    });
  }
});

/**
 * @swagger
 * /directions/simple:
 *   get:
 *     summary: Get directions with simple coordinates (GET method for easy testing)
 *     description: Get directions using latitude and longitude coordinates
 *     parameters:
 *       - in: query
 *         name: originLat
 *         required: true
 *         description: Origin latitude
 *         schema:
 *           type: number
 *           example: 41.2995
 *       - in: query
 *         name: originLng
 *         required: true
 *         description: Origin longitude
 *         schema:
 *           type: number
 *           example: 69.2401
 *       - in: query
 *         name: destLat
 *         required: true
 *         description: Destination latitude
 *         schema:
 *           type: number
 *           example: 41.3111
 *       - in: query
 *         name: destLng
 *         required: true
 *         description: Destination longitude
 *         schema:
 *           type: number
 *           example: 69.2797
 *       - in: query
 *         name: travelMode
 *         required: false
 *         description: Travel mode
 *         schema:
 *           type: string
 *           enum: [DRIVE, WALK, BICYCLE, TRANSIT]
 *           default: DRIVE
 *     responses:
 *       200:
 *         description: Directions retrieved successfully
 *       400:
 *         description: Missing required parameters
 *       500:
 *         description: Internal server error
 */
router.get('/simple', async (req, res) => {
  try {
    const { originLat, originLng, destLat, destLng, travelMode = 'DRIVE' } = req.query;

    // Validate required parameters
    if (!originLat || !originLng || !destLat || !destLng) {
      return res.status(400).json({
        error: 'originLat, originLng, destLat, and destLng are required parameters'
      });
    }

    // Build request body for new Routes API
    const requestBody = {
      origin: {
        location: {
          latLng: {
            latitude: parseFloat(originLat),
            longitude: parseFloat(originLng)
          }
        }
      },
      destination: {
        location: {
          latLng: {
            latitude: parseFloat(destLat),
            longitude: parseFloat(destLng)
          }
        }
      },
      travelMode,
      routingPreference: 'TRAFFIC_AWARE',
      computeAlternativeRoutes: false,
      languageCode: 'en',
      units: 'METRIC'
    };

    // Make request to Google Routes API
    const response = await axios.post(
      'https://routes.googleapis.com/directions/v2:computeRoutes',
      requestBody,
      {
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': GOOGLE_MAPS_API_KEY,
          'X-Goog-FieldMask': 'routes.duration,routes.distanceMeters,routes.polyline.encodedPolyline,routes.legs'
        }
      }
    );

    // Return the routes data
    res.json(response.data);

  } catch (error) {
    console.error('Routes API error:', error);
    
    if (error.response) {
      return res.status(error.response.status).json({
        error: 'Google Routes API error',
        message: error.response.data?.error?.message || 'Unknown error',
        details: error.response.data
      });
    }
    
    res.status(500).json({
      error: 'Failed to get directions',
      message: error.message
    });
  }
});

/**
 * @swagger
 * /directions/distance-matrix:
 *   post:
 *     summary: Get distance and duration between multiple points
 *     description: Get distance and duration matrix using Google Routes API Matrix
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - origins
 *               - destinations
 *             properties:
 *               origins:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     waypoint:
 *                       type: object
 *                       properties:
 *                         location:
 *                           type: object
 *                           properties:
 *                             latLng:
 *                               type: object
 *                               properties:
 *                                 latitude:
 *                                   type: number
 *                                 longitude:
 *                                   type: number
 *               destinations:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     waypoint:
 *                       type: object
 *                       properties:
 *                         location:
 *                           type: object
 *                           properties:
 *                             latLng:
 *                               type: object
 *                               properties:
 *                                 latitude:
 *                                   type: number
 *                                 longitude:
 *                                   type: number
 *               travelMode:
 *                 type: string
 *                 enum: [DRIVE, WALK, BICYCLE, TRANSIT]
 *                 default: DRIVE
 *     responses:
 *       200:
 *         description: Distance matrix retrieved successfully
 *       400:
 *         description: Missing required parameters
 *       500:
 *         description: Internal server error
 */
router.post('/distance-matrix', async (req, res) => {
  try {
    const { origins, destinations, travelMode = 'DRIVE' } = req.body;

    // Validate required parameters
    if (!origins || !destinations || !Array.isArray(origins) || !Array.isArray(destinations)) {
      return res.status(400).json({
        error: 'Origins and destinations arrays are required parameters'
      });
    }

    // Build request body for Routes API Matrix
    const requestBody = {
      origins,
      destinations,
      travelMode
    };

    // Make request to Google Routes API Matrix
    const response = await axios.post(
      'https://routes.googleapis.com/distanceMatrix/v2:computeRouteMatrix',
      requestBody,
      {
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': GOOGLE_MAPS_API_KEY,
          'X-Goog-FieldMask': 'originIndex,destinationIndex,duration,distanceMeters,status,condition'
        }
      }
    );

    // Return the distance matrix data
    res.json(response.data);

  } catch (error) {
    console.error('Distance Matrix API error:', error);
    
    if (error.response) {
      return res.status(error.response.status).json({
        error: 'Google Routes API error',
        message: error.response.data?.error?.message || 'Unknown error',
        details: error.response.data
      });
    }
    
    res.status(500).json({
      error: 'Failed to get distance matrix',
      message: error.message
    });
  }
});

module.exports = router;
