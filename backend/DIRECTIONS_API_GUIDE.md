# Directions API Guide

This guide covers the `/directions` endpoints in the GSB backend API, which provide routing and navigation services using Google Routes API.

## Overview

The Directions API offers three main endpoints:
- `POST /directions` - Full-featured routing with advanced options
- `GET /directions/simple` - Simplified routing for basic use cases
- `POST /directions/distance-matrix` - Distance and duration calculations between multiple points

All endpoints use Google's new Routes API v2 for improved accuracy and features.

## Authentication

All endpoints require a valid Google Maps API Key configured in the `GOOGLE_MAPS_API_KEY` environment variable.

## Caching

The main `/directions` endpoint implements intelligent caching:
- **Cache Duration**: 30 minutes
- **Cache Key**: Based on origin, destination, travel mode, routing preference, and route modifiers
- **Auto-cleanup**: Expired entries are automatically removed when cache size exceeds 100 entries

## Endpoints

### 1. POST /directions

**Purpose**: Get detailed directions between two points with advanced routing options.

#### Request Body

```json
{
  "origin": {
    "location": {
      "latLng": {
        "latitude": 41.2995,
        "longitude": 69.2401
      }
    }
  },
  "destination": {
    "location": {
      "latLng": {
        "latitude": 41.3111,
        "longitude": 69.2797
      }
    }
  },
  "travelMode": "DRIVE",
  "routingPreference": "TRAFFIC_AWARE",
  "computeAlternativeRoutes": false,
  "avoidTolls": false,
  "avoidHighways": false,
  "avoidFerries": false,
  "languageCode": "en",
  "units": "METRIC"
}
```

#### Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `origin` | Object | Yes | - | Starting point with latitude/longitude |
| `destination` | Object | Yes | - | End point with latitude/longitude |
| `travelMode` | String | No | "DRIVE" | Travel mode: DRIVE, WALK, BICYCLE, TRANSIT |
| `routingPreference` | String | No | "TRAFFIC_AWARE" | TRAFFIC_UNAWARE, TRAFFIC_AWARE, TRAFFIC_AWARE_OPTIMAL |
| `computeAlternativeRoutes` | Boolean | No | false | Whether to compute alternative routes |
| `avoidTolls` | Boolean | No | false | Avoid toll roads |
| `avoidHighways` | Boolean | No | false | Avoid highways |
| `avoidFerries` | Boolean | No | false | Avoid ferries |
| `languageCode` | String | No | "en" | Language for instructions (e.g., "uz" for Uzbek) |
| `units` | String | No | "METRIC" | Unit system: METRIC or IMPERIAL |

#### Example Request

```bash
curl -X POST http://localhost:3000/directions \
  -H "Content-Type: application/json" \
  -d '{
    "origin": {
      "location": {
        "latLng": {
          "latitude": 41.2995,
          "longitude": 69.2401
        }
      }
    },
    "destination": {
      "location": {
        "latLng": {
          "latitude": 41.3111,
          "longitude": 69.2797
        }
      }
    },
    "travelMode": "DRIVE",
    "languageCode": "uz"
  }'
```

#### Response

Returns Google Routes API response with detailed route information:

```json
{
  "routes": [
    {
      "duration": "1847s",
      "distanceMeters": 15420,
      "polyline": {
        "encodedPolyline": "o}~iEaihcMKOGOEQCOAOAQ?Q@Q@O@QBQ..."
      },
      "legs": [
        {
          "distanceMeters": 15420,
          "duration": "1847s",
          "staticDuration": "1647s",
          "polyline": {
            "encodedPolyline": "o}~iEaihcMKOGOEQCOAOAQ?Q@Q@O@QBQ..."
          },
          "startLocation": {
            "latLng": {
              "latitude": 41.2995,
              "longitude": 69.2401
            }
          },
          "endLocation": {
            "latLng": {
              "latitude": 41.3111,
              "longitude": 69.2797
            }
          },
          "steps": [
            {
              "distanceMeters": 142,
              "staticDuration": "101s",
              "polyline": {
                "encodedPolyline": "o}~iEaihcMKOGOEQCOAOAQ"
              },
              "startLocation": {
                "latLng": {
                  "latitude": 41.2995,
                  "longitude": 69.2401
                }
              },
              "endLocation": {
                "latLng": {
                  "latitude": 41.30012,
                  "longitude": 69.24089
                }
              },
              "navigationInstruction": {
                "maneuver": "STRAIGHT",
                "instructions": "Head northeast on Mustaqillik Avenue"
              }
            }
          ]
        }
      ]
    }
  ]
}
```

#### Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `routes` | Array | Array of route objects (main route + alternatives if requested) |
| `routes[].duration` | String | Total travel time in seconds format (e.g., "1847s") |
| `routes[].distanceMeters` | Number | Total distance in meters |
| `routes[].polyline.encodedPolyline` | String | Encoded polyline string for map visualization |
| `routes[].legs` | Array | Route segments (typically one leg for simple routes) |
| `routes[].legs[].distanceMeters` | Number | Distance for this leg in meters |
| `routes[].legs[].duration` | String | Travel time for this leg with traffic |
| `routes[].legs[].staticDuration` | String | Travel time without traffic considerations |
| `routes[].legs[].startLocation` | Object | Starting coordinates of the leg |
| `routes[].legs[].endLocation` | Object | Ending coordinates of the leg |
| `routes[].legs[].steps` | Array | Turn-by-turn navigation steps |
| `routes[].legs[].steps[].distanceMeters` | Number | Distance for this step |
| `routes[].legs[].steps[].staticDuration` | String | Time for this step |
| `routes[].legs[].steps[].navigationInstruction` | Object | Turn instruction and description |

#### Response Processing Tips

- **Duration Conversion**: Convert duration strings (e.g., "1847s") to readable format:
  ```javascript
  const durationInMinutes = parseInt(duration.replace('s', '')) / 60;
  ```

- **Distance Formatting**: Convert meters to kilometers:
  ```javascript
  const distanceInKm = distanceMeters / 1000;
  ```

- **Polyline Decoding**: Use Google's polyline utility or libraries like `@googlemaps/polyline-codec` to decode the encoded polyline for map rendering.

### 2. GET /directions/simple

**Purpose**: Simplified routing for basic use cases using query parameters.

#### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `originLat` | Number | Yes | Origin latitude |
| `originLng` | Number | Yes | Origin longitude |
| `destLat` | Number | Yes | Destination latitude |
| `destLng` | Number | Yes | Destination longitude |
| `travelMode` | String | No | Travel mode (default: DRIVE) |

#### Example Request

```bash
curl "http://localhost:3000/directions/simple?originLat=41.2995&originLng=69.2401&destLat=41.3111&destLng=69.2797&travelMode=DRIVE"
```

#### Response

Returns the same structure as the main `/directions` endpoint:

```json
{
  "routes": [
    {
      "duration": "1847s",
      "distanceMeters": 15420,
      "polyline": {
        "encodedPolyline": "o}~iEaihcMKOGOEQCOAOAQ?Q@Q@O@QBQ..."
      },
      "legs": [
        {
          "distanceMeters": 15420,
          "duration": "1847s",
          "staticDuration": "1647s",
          "startLocation": {
            "latLng": {
              "latitude": 41.2995,
              "longitude": 69.2401
            }
          },
          "endLocation": {
            "latLng": {
              "latitude": 41.3111,
              "longitude": 69.2797
            }
          }
        }
      ]
    }
  ]
}
```

#### Use Cases

- Quick testing and debugging
- Simple mobile app integrations
- URL-based routing requests

### 3. POST /directions/distance-matrix

**Purpose**: Calculate distances and durations between multiple origins and destinations.

#### Request Body

```json
{
  "origins": [
    {
      "waypoint": {
        "location": {
          "latLng": {
            "latitude": 41.2995,
            "longitude": 69.2401
          }
        }
      }
    }
  ],
  "destinations": [
    {
      "waypoint": {
        "location": {
          "latLng": {
            "latitude": 41.3111,
            "longitude": 69.2797
          }
        }
      }
    }
  ],
  "travelMode": "DRIVE"
}
```

#### Example Request

```bash
curl -X POST http://localhost:3000/directions/distance-matrix \
  -H "Content-Type: application/json" \
  -d '{
    "origins": [
      {
        "waypoint": {
          "location": {
            "latLng": {
              "latitude": 41.2995,
              "longitude": 69.2401
            }
          }
        }
      }
    ],
    "destinations": [
      {
        "waypoint": {
          "location": {
            "latLng": {
              "latitude": 41.3111,
              "longitude": 69.2797
            }
          }
        }
      }
    ],
    "travelMode": "DRIVE"
  }'
```

#### Response

Returns distance matrix with origin-destination pairs:

```json
{
  "elements": [
    {
      "originIndex": 0,
      "destinationIndex": 0,
      "status": "OK",
      "duration": "1847s",
      "distanceMeters": 15420,
      "condition": "ROUTE_EXISTS"
    }
  ]
}
```

#### Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `elements` | Array | Array of origin-destination combinations |
| `elements[].originIndex` | Number | Index of the origin in the request array |
| `elements[].destinationIndex` | Number | Index of the destination in the request array |
| `elements[].status` | String | Status of the calculation (OK, NOT_FOUND, etc.) |
| `elements[].duration` | String | Travel time in seconds format |
| `elements[].distanceMeters` | Number | Distance in meters |
| `elements[].condition` | String | Route condition (ROUTE_EXISTS, ROUTE_NOT_FOUND) |

#### Matrix Example

For multiple origins and destinations:

**Request with 2 origins and 2 destinations produces 4 combinations:**

```json
{
  "elements": [
    {
      "originIndex": 0,
      "destinationIndex": 0,
      "status": "OK",
      "duration": "1847s",
      "distanceMeters": 15420,
      "condition": "ROUTE_EXISTS"
    },
    {
      "originIndex": 0,
      "destinationIndex": 1,
      "status": "OK", 
      "duration": "2156s",
      "distanceMeters": 18750,
      "condition": "ROUTE_EXISTS"
    },
    {
      "originIndex": 1,
      "destinationIndex": 0,
      "status": "OK",
      "duration": "1693s", 
      "distanceMeters": 14230,
      "condition": "ROUTE_EXISTS"
    },
    {
      "originIndex": 1,
      "destinationIndex": 1,
      "status": "OK",
      "duration": "2034s",
      "distanceMeters": 17890,
      "condition": "ROUTE_EXISTS"
    }
  ]
}
```

#### Use Cases

- Delivery route optimization
- Finding nearest restaurants/businesses
- Travel time calculations for multiple destinations

## Error Handling

All endpoints return consistent error responses:

### 400 Bad Request
Missing or invalid required parameters.

```json
{
  "error": "Origin and destination are required parameters"
}
```

### 500 Internal Server Error
Google API errors or server issues.

```json
{
  "error": "Google Routes API error",
  "message": "Error message from Google API",
  "details": { /* Google API error details */ }
}
```

## Best Practices

### 1. Use Appropriate Travel Modes
- **DRIVE**: For car navigation
- **WALK**: For pedestrian routes
- **BICYCLE**: For cycling routes
- **TRANSIT**: For public transportation

### 2. Optimize for Your Use Case
- Use `/simple` endpoint for basic routing needs
- Use main `/directions` endpoint when you need advanced features
- Use `/distance-matrix` for multiple destination calculations

### 3. Leverage Caching
- Identical requests within 30 minutes return cached results
- This reduces API costs and improves response times
- Cache considers all routing parameters

### 4. Handle Rate Limits
- Implement retry logic with exponential backoff
- Monitor your Google API quota usage
- Consider implementing client-side caching

### 5. Language Support
- Set `languageCode` to "uz" for Uzbek instructions
- Support other languages as needed for your users

## Integration Examples

### Frontend Integration

```javascript
// React/JavaScript example
const getDirections = async (origin, destination) => {
  try {
    const response = await fetch('/api/directions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        origin: {
          location: {
            latLng: {
              latitude: origin.lat,
              longitude: origin.lng
            }
          }
        },
        destination: {
          location: {
            latLng: {
              latitude: destination.lat,
              longitude: destination.lng
            }
          }
        },
        travelMode: 'DRIVE',
        languageCode: 'uz'
      })
    });
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching directions:', error);
    throw error;
  }
};
```

### Mobile App Integration

```javascript
// React Native example
const getSimpleDirections = async (originLat, originLng, destLat, destLng) => {
  const url = `/api/directions/simple?originLat=${originLat}&originLng=${originLng}&destLat=${destLat}&destLng=${destLng}&travelMode=DRIVE`;
  
  try {
    const response = await fetch(url);
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching directions:', error);
    throw error;
  }
};
```

## Configuration

Ensure the following environment variable is set:

```bash
GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here
```

## API Limits and Quotas

- Monitor your Google Maps API usage in the Google Cloud Console
- Consider implementing request throttling if needed
- The caching mechanism helps reduce API calls for repeated requests

## Troubleshooting

### Common Issues

1. **Missing API Key**: Ensure `GOOGLE_MAPS_API_KEY` is properly configured
2. **Invalid Coordinates**: Verify latitude/longitude values are within valid ranges
3. **Route Not Found**: Some routes may not be available for certain travel modes
4. **Quota Exceeded**: Check your Google Cloud Console for API usage limits

### Debug Information

All endpoints log errors to the console with detailed information for debugging purposes.

## Support

For additional support or questions about the Directions API, refer to:
- Google Routes API documentation
- Internal API documentation
- Backend development team
