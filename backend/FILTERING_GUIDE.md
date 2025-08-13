# Business API Filtering Guide

This guide provides comprehensive documentation for the filtering capabilities implemented in the Business API.

## Overview

The Business API now supports advanced filtering, searching, and sorting across multiple endpoints. This includes:

- **Businesses**: Filter by location, type, rating, status, and more
- **Products**: Filter by category, price range, stock status, and search
- **Staff**: Filter by role, status, and search across personal information

## Endpoints with Enhanced Filtering

### 1. GET /api/businesses

#### Query Parameters

| Parameter | Type | Description | Example |
|-----------|------|-------------|---------|
| **Basic Filters** |
| `status` | string | Business status | `active`, `pending`, `rejected`, `inactive` |
| `businessType` | string | Type of business | `restaurant`, `retail`, `service` |
| `ownerId` | string | Business owner ID | `user123` |
| `category` | string | Business category | `food`, `retail` |
| `city` | string | City name | `Tashkent` |
| `name` | string | Search in business name | `Pizza` |
| `search` | string | Search across name, description, address | `Italian food` |
| **Rating Filters** |
| `minRating` | number | Minimum rating (0-5) | `4.0` |
| `maxRating` | number | Maximum rating (0-5) | `5.0` |
| **Boolean Filters** |
| `isVerified` | boolean | Verified businesses only | `true`, `false` |
| `isOpen` | boolean | Currently open businesses | `true`, `false` |
| **Location Filters** |
| `circlecenter` | string | Center point for radius search | `41.2995,69.2401` |
| `radius` | number | Search radius in kilometers | `5.0` |
| `circleboundingbox` | string | Bounding box coordinates | `lat1,lng1,lat2,lng2` |
| **Sorting** |
| `sortBy` | string | Sort field | `name`, `rating`, `createdAt`, `distance` |
| `sortOrder` | string | Sort direction | `asc`, `desc` |
| **Pagination** |
| `page` | number | Page number (default: 1) | `1` |
| `limit` | number | Items per page (max: 100) | `10` |

#### Example Request
```bash
GET /api/businesses?status=active&businessType=restaurant&city=Tashkent&minRating=4.0&sortBy=rating&sortOrder=desc&page=1&limit=20
```

#### Example Response
```json
{
  "businesses": [...],
  "pagination": {
    "currentPage": 1,
    "totalPages": 5,
    "totalItems": 87,
    "itemsPerPage": 20,
    "hasNextPage": true,
    "hasPreviousPage": false
  },
  "filters": {
    "applied": {
      "status": "active",
      "businessType": "restaurant",
      "city": "Tashkent",
      "minRating": 4.0
    },
    "sorting": {
      "sortBy": "rating",
      "sortOrder": "desc"
    },
    "total": 4
  },
  "meta": {
    "timestamp": "2025-08-13T10:30:00.000Z",
    "requestId": "req-123"
  }
}
```

### 2. POST /api/businesses/search (Advanced Search)

For complex search queries with relevance scoring.

#### Request Body
```json
{
  "query": "Italian pizza restaurant",
  "filters": {
    "status": "active",
    "city": "Tashkent",
    "minRating": 3.5
  },
  "sort": {
    "sortBy": "relevance",
    "sortOrder": "desc"
  },
  "pagination": {
    "page": 1,
    "limit": 10
  },
  "options": {
    "fuzzySearch": true,
    "caseSensitive": false,
    "includeInactive": false
  }
}
```

#### Response
```json
{
  "businesses": [
    {
      "id": "business123",
      "name": "Mario's Italian Pizza",
      "relevanceScore": 15,
      ...
    }
  ],
  "pagination": {...},
  "searchInfo": {
    "query": "Italian pizza restaurant",
    "filters": {...},
    "sorting": {...},
    "options": {...},
    "resultsCount": 5
  }
}
```

### 3. GET /api/businesses/:businessId/products

#### Query Parameters

| Parameter | Type | Description | Example |
|-----------|------|-------------|---------|
| **Filters** |
| `category` | string | Product category code | `001` (food category) |
| `name` | string | Search in product name | `Pizza` |
| `search` | string | Search in name, description, barcode | `Margherita` |
| `minPrice` | number | Minimum price | `10.00` |
| `maxPrice` | number | Maximum price | `50.00` |
| `inStock` | boolean | Products with stock > 0 | `true`, `false` |
| `mxikCode` | string | Specific MXIK code | `001001001` |
| `barcode` | string | Specific barcode | `1234567890` |
| **Sorting** |
| `sortBy` | string | Sort field | `name`, `price`, `stock`, `createdAt` |
| `sortOrder` | string | Sort direction | `asc`, `desc` |
| **Pagination** |
| `page` | number | Page number | `1` |
| `limit` | number | Items per page (max: 100) | `10` |

#### Example Request
```bash
GET /api/businesses/business123/products?category=001&minPrice=5.00&maxPrice=25.00&inStock=true&sortBy=price&sortOrder=asc
```

### 4. GET /api/businesses/staff/all

#### Query Parameters

| Parameter | Type | Description | Example |
|-----------|------|-------------|---------|
| **Filters** |
| `businessId` | string | Filter by business | `business123` |
| `role` | string | Staff role | `manager`, `cashier`, `cook` |
| `isActive` | boolean | Active staff only | `true`, `false` |
| `name` | string | Search in staff name | `John` |
| `email` | string | Search in email | `john@example.com` |
| `phone` | string | Search in phone number | `+998` |
| `search` | string | Search across name, email, phone | `manager` |
| **Sorting** |
| `sortBy` | string | Sort field | `name`, `role`, `createdAt`, `isActive` |
| `sortOrder` | string | Sort direction | `asc`, `desc` |
| **Pagination** |
| `page` | number | Page number | `1` |
| `limit` | number | Items per page (max: 100) | `10` |

### 5. GET /api/businesses/filters/metadata

Returns available filter options and metadata to help frontend applications build dynamic filters.

#### Response
```json
{
  "success": true,
  "metadata": {
    "businessTypes": ["restaurant", "retail", "service", "healthcare"],
    "cities": ["Tashkent", "Samarkand", "Bukhara"],
    "categories": ["food", "retail", "service"],
    "statuses": ["pending", "active", "rejected", "inactive"],
    "roles": ["seller", "manager", "cashier", "cook", "delivery"],
    "sortOptions": {
      "businesses": [
        {"value": "name", "label": "Name"},
        {"value": "rating", "label": "Rating"},
        {"value": "createdAt", "label": "Date Created"},
        {"value": "distance", "label": "Distance"}
      ]
    },
    "ratingRange": {"min": 0, "max": 5},
    "defaultPagination": {"page": 1, "limit": 10, "maxLimit": 100}
  }
}
```

## Location-Based Filtering

### Radius Search
Use `circlecenter` and `radius` for finding businesses within a specific distance:

```bash
GET /api/businesses?circlecenter=41.2995,69.2401&radius=5.0
```

### Bounding Box Search
Use `circleboundingbox` for rectangular area search:

```bash
GET /api/businesses?circleboundingbox=41.250,69.200,41.350,69.300
```

## Error Handling

The API returns appropriate HTTP status codes and error messages:

- `400 Bad Request`: Invalid parameters or validation errors
- `404 Not Found`: Resource not found
- `500 Internal Server Error`: Server-side errors

### Example Error Response
```json
{
  "error": "minRating cannot be greater than maxRating"
}
```

## Best Practices

### 1. Performance Optimization
- Use specific filters to reduce dataset size
- Implement pagination for large result sets
- Cache filter metadata on the frontend

### 2. Filter Combinations
- Combine multiple filters for precise results
- Use search parameter for flexible text matching
- Apply rating filters for quality-based filtering

### 3. Location Searches
- Use radius search for "nearby" functionality
- Implement bounding box for map-based interfaces
- Always validate location coordinates

### 4. Pagination
- Start with reasonable page sizes (10-20 items)
- Implement infinite scroll or page-based navigation
- Monitor performance with large datasets

## Implementation Details

### Firestore Limitations
Due to Firestore's query limitations, some filters are applied client-side:
- Text search across multiple fields
- Range queries on non-indexed fields
- Complex combinations of filters

### Sorting with Distance
When using location-based sorting, ensure `circlecenter` is provided:
```bash
GET /api/businesses?circlecenter=41.2995,69.2401&sortBy=distance&sortOrder=asc
```

### Business Hours Filtering
The `isOpen` filter considers current time and business hours:
- Checks current day of week
- Compares current time with opening hours
- Returns businesses that are currently open

## Frontend Integration Examples

### React Hook Example
```javascript
const useBusinessFilters = () => {
  const [filters, setFilters] = useState({
    status: 'active',
    page: 1,
    limit: 10
  });

  const updateFilter = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value,
      page: 1 // Reset to first page
    }));
  };

  return { filters, updateFilter };
};
```

### API Call Example
```javascript
const fetchBusinesses = async (filters) => {
  const queryParams = new URLSearchParams(filters);
  const response = await fetch(`/api/businesses?${queryParams}`);
  return response.json();
};
```

This filtering system provides comprehensive search and filter capabilities while maintaining good performance and usability.
