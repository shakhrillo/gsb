# Enhanced Image Analysis with Category Support

This enhanced image analysis service can analyze product images by a given category, leveraging the GSB (Government Services Bureau) classification system to extract product metadata, classify them accurately using group/class/position codes, and support category context including auto-suggestion and database-backed lookups.

## Features

✨ **Category-Aware Analysis**: Analyze images with optional category context for improved classification accuracy

🚀 **Auto-Suggestion**: Automatically suggest categories based on detected text in images

🔍 **Database Integration**: Search and match against the GSB classification database

📊 **Enhanced Metadata**: Extract comprehensive product information including:
- Product names in Uzbek Cyrillic
- Barcodes and visible text
- GSB group/class/position codes
- Confidence levels
- Timestamps

## Installation

The service is already integrated into the backend. Make sure you have the required dependencies:

```bash
npm install openai sqlite3 sharp
```

## Environment Variables

```bash
OPENAI_API_KEY=your_openai_api_key_here
```

## Usage

### 1. Basic Image Analysis

```javascript
const { analyzeImage } = require('./src/services/analyzeImage');

// Analyze without category context
const result = await analyzeImage(imageUrl);

// Analyze with category context for better accuracy
const result = await analyzeImage(imageUrl, 'medicine');
```

### 2. Enhanced Analysis with Auto-Suggestion

```javascript
const { analyzeImageEnhanced } = require('./src/services/analyzeImage');

// Enhanced analysis with auto-suggestion
const result = await analyzeImageEnhanced(imageUrl, { 
  autoSuggest: true 
});

// Enhanced analysis with specific category
const result = await analyzeImageEnhanced(imageUrl, { 
  category: 'electronics',
  autoSuggest: false 
});
```

### 3. Category Search and Suggestions

```javascript
const { searchRelevantCategories } = require('./src/services/analyzeImage');
const { getCategorySuggestions } = require('./src/services/categoryUtils');

// Search for relevant categories in database
const categories = await searchRelevantCategories('medicine');

// Get predefined category suggestions
const suggestions = getCategorySuggestions('food');
```

## API Endpoints

### POST `/image-analysis/analyze-image`

Analyze a product image with optional category context.

**Request Body:**
```json
{
  "imageUrl": "https://example.com/product-image.jpg",
  "category": "medicine"  // optional
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "barcode": "4607071234567",
    "product_name": "Парацетамол таблеткалари 500мг",
    "description": "Оғриқ ва иситмага қарши дори воситаси",
    "group": "030-FARMATSEVTIKA MAHSULOTI",
    "class": "03004-Dori vositalari (qadoqlangan)",
    "position": "03004452-Anilidlar (Boshqa analjeziklar va antipiretiklar)",
    "confidence": "high",
    "detected_text": ["Парацетамол", "500мг", "№20"],
    "analysis_timestamp": "2025-07-12T10:30:00.000Z",
    "category_provided": "medicine"
  }
}
```

### POST `/image-analysis/analyze-image-enhanced`

Enhanced image analysis with auto-suggestion capabilities.

**Request Body:**
```json
{
  "imageUrl": "https://example.com/product-image.jpg",
  "category": "electronics",    // optional
  "autoSuggest": true          // optional, default: false
}
```

### GET `/image-analysis/category-suggestions/:productType`

Get predefined category suggestions for a product type.

**Example:** `/image-analysis/category-suggestions/medicine`

**Response:**
```json
{
  "success": true,
  "productType": "medicine",
  "suggestions": ["030-FARMATSEVTIKA MAHSULOTI"]
}
```

## GSB Classification System

The service uses the Government Services Bureau (GSB) classification system with the following hierarchy:

- **Group**: Main category (e.g., "030-FARMATSEVTIKA MAHSULOTI")
- **Class**: Sub-category (e.g., "03004-Dori vositalari (qadoqlangan)")
- **Position**: Specific item (e.g., "03004452-Anilidlar")

### Supported Category Types

- `medicine` - Pharmaceutical products
- `food` - Food and beverages
- `electronics` - Electronic devices
- `clothing` - Clothing and accessories
- `cosmetics` - Beauty and cosmetics
- `construction` - Construction materials
- `vehicle` - Transportation vehicles
- `sport` - Sports equipment and toys

## Example Response Format

```json
{
  "barcode": "1234567890123",
  "product_name": "Махсулот номи (Uzbek Cyrillic)",
  "description": "Махсулот тавсифи (Uzbek Cyrillic)",
  "group": "030-FARMATSEVTIKA MAHSULOTI",
  "class": "03004-Dori vositalari (qadoqlangan)",
  "position": "03004452-Anilidlar (Boshqa analjeziklar va antipiretiklar)",
  "confidence": "high|medium|low",
  "detected_text": ["array", "of", "detected", "text"],
  "analysis_timestamp": "2025-07-12T10:30:00.000Z",
  "category_provided": "medicine",
  "auto_suggested_category": "electronics",  // if auto-suggestion was used
  "category_suggestions": ["array", "of", "suggestions"]  // if available
}
```

## Testing

Run the demonstration script to see the functionality in action:

```bash
node demo-image-analysis.js
```

Run the comprehensive test suite:

```bash
node src/services/testImageAnalysis.js
```

## Error Handling

The service includes comprehensive error handling for:
- Missing or invalid image URLs
- OpenAI API connectivity issues
- Database connection problems
- Invalid JSON responses
- Missing required fields

## Database Integration

The service integrates with the SQLite database containing GSB classification data with the following tables:

- `products` - Contains the full GSB classification hierarchy
- Indexes on `mxik_name`, `position_name`, `class_name`, `group_name`
- Full-text search capabilities

## Performance Considerations

- Database queries are optimized with proper indexing
- Results are limited to prevent excessive memory usage
- OpenAI API calls use appropriate temperature and token limits
- Graceful degradation when API services are unavailable

## Contributing

When adding new category types or improving classification accuracy:

1. Update `categoryUtils.js` with new category mappings
2. Add corresponding GSB codes to the category suggestions
3. Update test cases and documentation
4. Ensure backward compatibility

## License

This service is part of the GSB backend application.
