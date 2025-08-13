const express = require('express');
const router = express.Router();
const userService = require('../services/user.service');
const businessService = require('../services/business.service');
const staffService = require('../services/staff.service');
const { validateUser } = require('../middleware/validateUser');
const { uploadImages } = require('../middleware/uploadImage');
const { db, FieldValue } = require('../services/firebase');
const { findCategoryByCode } = require('../utils/category');

/**
 * POST /api/businesses
 * Register a new business
 */
router.post('/', validateUser, async (req, res) => {
  try {
    const uid = req.user.uid;
    const businessData = req.body;

    const result = await userService.registerBusiness(uid, businessData);

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    res.status(201).json({ 
      message: 'Business registration request submitted successfully',
      businessId: result.businessId 
    });
  } catch (error) {
    console.error('Business registration route error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/businesses/search
 * Advanced search endpoint with complex filtering
 */
router.post('/search', async (req, res) => {
  try {
    const {
      // Search terms
      query: searchQuery,
      // Advanced filters
      filters = {},
      // Sorting
      sort = {},
      // Pagination
      pagination = {},
      // Search options
      options = {}
    } = req.body;

    // Validate search query
    if (!searchQuery || typeof searchQuery !== 'string' || searchQuery.trim().length === 0) {
      return res.status(400).json({ 
        error: 'Search query is required and must be a non-empty string' 
      });
    }

    // Build comprehensive filters
    const searchFilters = {
      ...filters,
      search: searchQuery.trim()
    };

    // Default sorting
    const sorting = {
      sortBy: sort.sortBy || 'createdAt',
      sortOrder: sort.sortOrder || 'desc'
    };

    // Default pagination
    const paging = {
      page: parseInt(pagination.page) || 1,
      limit: Math.min(parseInt(pagination.limit) || 10, 100)
    };

    // Search options
    const searchOptions = {
      fuzzySearch: options.fuzzySearch !== false, // Default to true
      caseSensitive: options.caseSensitive === true, // Default to false
      includeInactive: options.includeInactive === true // Default to false
    };

    // If not including inactive, filter out inactive businesses
    if (!searchOptions.includeInactive) {
      searchFilters.status = searchFilters.status || 'active';
    }

    const result = await businessService.getAllBusinesses(searchFilters, paging, sorting);

    if (!result.success) {
      return res.status(500).json({ error: result.error });
    }

    // Add search relevance scoring (simple implementation)
    const searchTerm = searchQuery.toLowerCase();
    const businessesWithScore = result.data.map(business => {
      let relevanceScore = 0;
      
      // Name match gets highest score
      if (business.name && business.name.toLowerCase().includes(searchTerm)) {
        relevanceScore += 10;
      }
      
      // Description match
      if (business.description && business.description.toLowerCase().includes(searchTerm)) {
        relevanceScore += 5;
      }
      
      // Address match
      if (business.address && business.address.toLowerCase().includes(searchTerm)) {
        relevanceScore += 3;
      }
      
      // City match
      if (business.city && business.city.toLowerCase().includes(searchTerm)) {
        relevanceScore += 2;
      }
      
      // Business type match
      if (business.businessType && business.businessType.toLowerCase().includes(searchTerm)) {
        relevanceScore += 1;
      }

      return {
        ...business,
        relevanceScore
      };
    });

    // Sort by relevance if default sorting
    if (sorting.sortBy === 'createdAt' && searchQuery) {
      businessesWithScore.sort((a, b) => {
        if (a.relevanceScore !== b.relevanceScore) {
          return b.relevanceScore - a.relevanceScore; // Higher score first
        }
        // If same relevance, sort by creation date
        const aDate = new Date(a.createdAt.toDate ? a.createdAt.toDate() : a.createdAt);
        const bDate = new Date(b.createdAt.toDate ? b.createdAt.toDate() : b.createdAt);
        return bDate - aDate;
      });
    }

    res.json({
      businesses: businessesWithScore,
      pagination: result.pagination,
      searchInfo: {
        query: searchQuery,
        filters: searchFilters,
        sorting,
        options: searchOptions,
        resultsCount: businessesWithScore.length
      },
      meta: {
        timestamp: new Date().toISOString(),
        processingTime: Date.now() - req.startTime
      }
    });
  } catch (error) {
    console.error('Advanced search error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/businesses/filters/metadata
 * Get available filter options and metadata
 */
router.get('/filters/metadata', async (req, res) => {
  try {
    // Get distinct values for filter options
    const businessesSnapshot = await db.collection('businesses').get();
    const businesses = businessesSnapshot.docs.map(doc => doc.data());

    const metadata = {
      businessTypes: [...new Set(businesses.map(b => b.businessType).filter(Boolean))].sort(),
      cities: [...new Set(businesses.map(b => b.city).filter(Boolean))].sort(),
      categories: [...new Set(businesses.map(b => b.category).filter(Boolean))].sort(),
      statuses: ['pending', 'active', 'rejected', 'inactive'],
      roles: ['seller', 'manager', 'cashier', 'cook', 'delivery'],
      sortOptions: {
        businesses: [
          { value: 'name', label: 'Name' },
          { value: 'rating', label: 'Rating' },
          { value: 'createdAt', label: 'Date Created' },
          { value: 'distance', label: 'Distance' }
        ],
        products: [
          { value: 'name', label: 'Name' },
          { value: 'price', label: 'Price' },
          { value: 'stock', label: 'Stock' },
          { value: 'createdAt', label: 'Date Created' }
        ],
        staff: [
          { value: 'name', label: 'Name' },
          { value: 'role', label: 'Role' },
          { value: 'isActive', label: 'Status' },
          { value: 'createdAt', label: 'Date Created' }
        ]
      },
      ratingRange: { min: 0, max: 5 },
      defaultPagination: { page: 1, limit: 10, maxLimit: 100 }
    };

    res.json({
      success: true,
      metadata,
      generatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Get filter metadata error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/businesses
 * Get all businesses with advanced filtering
 * 
 * Query Parameters:
 * - status: string (pending, active, rejected, inactive)
 * - businessType: string (restaurant, retail, service, etc.)
 * - ownerId: string
 * - category: string (business category)
 * - city: string
 * - name: string (search in business name)
 * - search: string (search in name, description, address)
 * - minRating: number (minimum rating filter)
 * - maxRating: number (maximum rating filter)
 * - isVerified: boolean
 * - isOpen: boolean (currently open based on business hours)
 * - circlecenter: string (lat,lng for radius search)
 * - circleboundingbox: string (lat1,lng1,lat2,lng2 for bounding box)
 * - radius: number (radius in km for location search)
 * - sortBy: string (name, rating, createdAt, distance)
 * - sortOrder: string (asc, desc)
 * - page: number
 * - limit: number
 */
router.get('/', async (req, res) => {
  try {
    console.log('Get all businesses route called', req.query);
    
    const {
      // Basic filters
      status, businessType, ownerId, category, city, name, search,
      // Rating filters
      minRating, maxRating,
      // Boolean filters
      isVerified, isOpen,
      // Location filters
      circlecenter, circleboundingbox, radius,
      // Sorting
      sortBy, sortOrder,
      // Pagination
      page, limit
    } = req.query;

    // Build filters object
    const filters = {};
    if (status) filters.status = status;
    if (businessType) filters.businessType = businessType;
    if (ownerId) filters.ownerId = ownerId;
    if (category) filters.category = category;
    if (city) filters.city = city;
    if (name) filters.name = name;
    if (search) filters.search = search;
    if (minRating) filters.minRating = parseFloat(minRating);
    if (maxRating) filters.maxRating = parseFloat(maxRating);
    if (isVerified !== undefined) filters.isVerified = isVerified === 'true';
    if (isOpen !== undefined) filters.isOpen = isOpen === 'true';
    if (circlecenter) filters.circlecenter = circlecenter;
    if (circleboundingbox) filters.circleboundingbox = circleboundingbox;
    if (radius) filters.radius = parseFloat(radius);

    // Build sorting options
    const sorting = {
      sortBy: sortBy || 'createdAt',
      sortOrder: sortOrder || 'desc'
    };

    // Validate sortBy
    const validSortFields = ['name', 'rating', 'createdAt', 'distance', 'updatedAt'];
    if (!validSortFields.includes(sorting.sortBy)) {
      return res.status(400).json({ 
        error: `Invalid sortBy field. Must be one of: ${validSortFields.join(', ')}` 
      });
    }

    // Validate sortOrder
    if (!['asc', 'desc'].includes(sorting.sortOrder)) {
      return res.status(400).json({ 
        error: 'Invalid sortOrder. Must be either "asc" or "desc"' 
      });
    }

    // Validate location filters
    if (circlecenter && !radius) {
      return res.status(400).json({ 
        error: 'radius parameter is required when using circlecenter' 
      });
    }

    if (radius && !circlecenter) {
      return res.status(400).json({ 
        error: 'circlecenter parameter is required when using radius' 
      });
    }

    // Validate rating range
    if (minRating !== undefined && (minRating < 0 || minRating > 5)) {
      return res.status(400).json({ 
        error: 'minRating must be between 0 and 5' 
      });
    }

    if (maxRating !== undefined && (maxRating < 0 || maxRating > 5)) {
      return res.status(400).json({ 
        error: 'maxRating must be between 0 and 5' 
      });
    }

    if (minRating !== undefined && maxRating !== undefined && minRating > maxRating) {
      return res.status(400).json({ 
        error: 'minRating cannot be greater than maxRating' 
      });
    }

    const pagination = {
      page: parseInt(page) || 1,
      limit: Math.min(parseInt(limit) || 10, 100) // Cap limit at 100
    };

    const result = await businessService.getAllBusinesses(filters, pagination, sorting);
    console.log('Businesses retrieved:', result.data, 'items');

    if (!result.success) {
      return res.status(500).json({ error: result.error });
    }

    res.json({
      businesses: result.data,
      pagination: result.pagination,
      filters: {
        applied: filters,
        sorting,
        total: Object.keys(filters).length
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] || 'unknown'
      }
    });
  } catch (error) {
    console.error('Get businesses route error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/businesses/nearby
 * Get businesses near a specific location using optimized geospatial queries
 * Query Parameters:
 * - lat: number (required) - Center latitude
 * - lng: number (required) - Center longitude  
 * - radius: number (optional, default: 10) - Search radius in km
 * - status: string (optional) - Business status filter
 * - businessType: string (optional) - Business type filter
 * - category: string (optional) - Category filter
 * - city: string (optional) - City filter
 * - isVerified: boolean (optional) - Verification status filter
 * - page: number (optional, default: 1) - Page number
 * - limit: number (optional, default: 10, max: 100) - Items per page
 */
router.get('/nearby', async (req, res) => {
  try {
    const { 
      lat, lng, radius = 10, 
      status, businessType, category, city, isVerified,
      page = 1, limit = 10 
    } = req.query;

    // Validate required parameters
    if (!lat || !lng) {
      return res.status(400).json({ 
        error: 'Latitude (lat) and longitude (lng) are required' 
      });
    }

    const latitude = parseFloat(lat);
    const longitude = parseFloat(lng);
    const radiusKm = parseFloat(radius);

    // Validate coordinate ranges
    if (latitude < -90 || latitude > 90) {
      return res.status(400).json({ 
        error: 'Latitude must be between -90 and 90' 
      });
    }

    if (longitude < -180 || longitude > 180) {
      return res.status(400).json({ 
        error: 'Longitude must be between -180 and 180' 
      });
    }

    if (radiusKm <= 0 || radiusKm > 1000) {
      return res.status(400).json({ 
        error: 'Radius must be between 0 and 1000 km' 
      });
    }

    // Prepare filters
    const filters = {};
    if (status) filters.status = status;
    if (businessType) filters.businessType = businessType;
    if (category) filters.category = category;
    if (city) filters.city = city;
    if (isVerified !== undefined) filters.isVerified = isVerified === 'true';

    // Prepare pagination
    const pagination = {
      page: parseInt(page) || 1,
      limit: Math.min(parseInt(limit) || 10, 100)
    };

    const result = await businessService.getBusinessesNearLocation(
      latitude, longitude, radiusKm, filters, pagination
    );

    if (!result.success) {
      return res.status(500).json({ error: result.error });
    }

    res.json({
      businesses: result.data,
      pagination: result.pagination,
      searchParams: {
        center: { latitude, longitude },
        radius: radiusKm,
        filters
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] || 'unknown'
      }
    });
  } catch (error) {
    console.error('Get nearby businesses route error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/businesses/migrate-location
 * Migrate existing business location data to GeoPoint format and add missing geohashes
 * Admin only endpoint for data migration
 */
router.post('/migrate-location', validateUser, async (req, res) => {
  try {
    // Check if user has admin privileges (you might want to add proper admin check)
    const uid = req.user.uid;
    
    // For now, allowing any authenticated user to run migration
    // In production, you should add proper admin authorization here
    
    const result = await businessService.migrateLocationDataToGeoPoint();

    if (!result.success) {
      return res.status(500).json({ error: result.error });
    }

    res.json({
      message: 'Location data migration completed',
      migratedGeoPoints: result.migrated,
      geohashesAdded: result.geohashesAdded,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Migration route error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/businesses/my
 * Get current user's businesses
 */
router.get('/my', validateUser, async (req, res) => {
  try {
    const uid = req.user.uid;
    const { status } = req.query;

    const result = await businessService.getBusinessesByOwner(uid);

    if (!result.success) {
      return res.status(500).json({ error: result.error });
    }

    // Filter by status if provided
    let businesses = result.data;
    if (status) {
      businesses = businesses.filter(business => business.status === status);
    }

    res.json({
      businesses,
      stats: result.stats
    });
  } catch (error) {
    console.error('Get my businesses route error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/businesses/:businessId
 * Get business by ID
 */
router.get('/:businessId', async (req, res) => {
  try {
    const { businessId } = req.params;

    const result = await businessService.getBusinessById(businessId);

    if (!result.success) {
      return res.status(404).json({ error: result.error });
    }

    res.json(result.data);
  } catch (error) {
    console.error('Get business by ID route error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * PUT /api/businesses/:businessId
 * Update business information (owner only)
 */
router.put('/:businessId', validateUser, uploadImages, async (req, res) => {
  try {
    const { businessId } = req.params;
    const uid = req.user.uid;
    const updates = req.body;

    // Handle file uploads if any
    if (req.files && req.files.length > 0) {
      // Add logic to handle file uploads and update URLs
      // This would integrate with your existing upload logic
    }

    const result = await businessService.updateBusiness(businessId, updates, uid);

    if (!result.success) {
      const statusCode = result.error.includes('Unauthorized') ? 403 : 
                        result.error.includes('not found') ? 404 : 400;
      return res.status(statusCode).json({ error: result.error });
    }

    res.json({
      message: 'Business updated successfully',
      business: result.data
    });
  } catch (error) {
    console.error('Update business route error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * DELETE /api/businesses/:businessId
 * Delete/deactivate business (owner only)
 */
router.delete('/:businessId', validateUser, async (req, res) => {
  try {
    const { businessId } = req.params;
    const uid = req.user.uid;

    const result = await businessService.deleteBusiness(businessId, uid);

    if (!result.success) {
      const statusCode = result.error.includes('Unauthorized') ? 403 : 
                        result.error.includes('not found') ? 404 : 400;
      return res.status(statusCode).json({ error: result.error });
    }

    res.json({ message: 'Business deactivated successfully' });
  } catch (error) {
    console.error('Delete business route error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * PUT /api/businesses/:businessId/approve
 * Approve business registration (admin only)
 */
router.put('/:businessId/approve', async (req, res) => {
  try {
    const { businessId } = req.params;

    const result = await userService.updateBusinessStatus(businessId, 'active');

    if (!result.success) {
      return res.status(404).json({ error: result.error });
    }

    res.json({ message: 'Business approved successfully' });
  } catch (error) {
    console.error('Approve business route error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * PUT /api/businesses/:businessId/reject
 * Reject business registration (admin only)
 */
router.put('/:businessId/reject', async (req, res) => {
  try {
    const { businessId } = req.params;
    const { reason } = req.body;

    const result = await userService.updateBusinessStatus(businessId, 'rejected', reason);

    if (!result.success) {
      return res.status(404).json({ error: result.error });
    }

    res.json({ message: 'Business rejected successfully' });
  } catch (error) {
    console.error('Reject business route error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/:businessId/products', validateUser, async (req, res) => {
  try {
    const user = req.user;
    if (!user.isMerchant) {
      return res.status(403).json({ error: 'Only merchants can add products' });
    }

    console.log('Adding product for business:', req.body);

    const newProduct = req.body;
    const mxikCode = newProduct.mxikCode;
    const category = mxikCode ? mxikCode.slice(0, 3) : null;

    const batch = db.batch();
    // Handle empty barcode by using auto-generated ID
    const productRef = newProduct.barcode && newProduct.barcode.trim() !== '' 
      ? db.collection('products').doc(newProduct.barcode)
      : db.collection('products').doc();
    batch.set(productRef, {
      ...newProduct,
      category,
      businessId: req.params.businessId,
      // merchantUid: user.merchantUid,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    const userRef = db.collection('businesses').doc(req.params.businessId);
    batch.update(userRef, {
      productCount: FieldValue.increment(1)
    });

    const categoryRef = userRef.collection('categories').doc(category);
    batch.set(categoryRef, {
      ...findCategoryByCode(category),
      productCount: FieldValue.increment(1)
    }, { merge: true });

    await batch.commit();
    res.status(201).json({ id: productRef.id });
  } catch (err) {
    console.error('Error adding product:', err);
    res.status(400).json({ error: err.message });
  }
});

router.put('/:businessId/products/:id', validateUser, async (req, res) => {
  const { id } = req.params;
  const updatedData = req.body;
  
  try {
    const user = req.user;
    const productDoc = await db.collection('products').doc(id).get();
    
    if (!productDoc.exists) {
      return res.status(404).json({ error: 'Product not found' });
    }
    
    const productData = productDoc.data();
    if (productData.merchantUid !== user.email) {
      return res.status(403).json({ error: 'You do not have permission to update this product' });
    }
    
    await db.collection('products').doc(id).update(updatedData);
    res.status(200).json({ message: 'Product updated successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:businessId/products/:id', validateUser, async (req, res) => {
  const { id } = req.params;
  try {
    const user = req.user;
    const productDoc = await db.collection('products').doc(id).get();
    if (!productDoc.exists) {
      return res.status(404).json({ error: 'Product not found' });
    }
    const productData = productDoc.data();
    if (productData.merchantUid !== user.email) {
      return res.status(403).json({ error: 'You do not have permission to delete this product' });
    }
    await db.collection('products').doc(id).delete();
    res.status(200).json({ message: 'Product deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/businesses/:businessId/products
 * Get products for a specific business with advanced filtering
 * 
 * Query Parameters:
 * - category: string (product category code)
 * - name: string (search in product name)
 * - search: string (search in name, description, barcode)
 * - minPrice: number
 * - maxPrice: number
 * - inStock: boolean (has stock > 0)
 * - mxikCode: string (specific MXIK code)
 * - barcode: string (specific barcode)
 * - sortBy: string (name, price, createdAt, stock)
 * - sortOrder: string (asc, desc)
 * - page: number
 * - limit: number
 */
router.get('/:businessId/products', async (req, res) => {
  try {
    const { businessId } = req.params;
    
    const {
      // Filter parameters
      category, name, search, minPrice, maxPrice, inStock, mxikCode, barcode,
      // Sorting parameters
      sortBy, sortOrder,
      // Pagination parameters
      page, limit
    } = req.query;

    // Build filters object
    const filters = {};
    if (category) filters.category = category;
    if (name) filters.name = name;
    if (search) filters.search = search;
    if (minPrice) filters.minPrice = parseFloat(minPrice);
    if (maxPrice) filters.maxPrice = parseFloat(maxPrice);
    if (inStock !== undefined) filters.inStock = inStock === 'true';
    if (mxikCode) filters.mxikCode = mxikCode;
    if (barcode) filters.barcode = barcode;

    // Validate price range
    if (minPrice !== undefined && minPrice < 0) {
      return res.status(400).json({ error: 'minPrice must be non-negative' });
    }

    if (maxPrice !== undefined && maxPrice < 0) {
      return res.status(400).json({ error: 'maxPrice must be non-negative' });
    }

    if (minPrice !== undefined && maxPrice !== undefined && minPrice > maxPrice) {
      return res.status(400).json({ 
        error: 'minPrice cannot be greater than maxPrice' 
      });
    }

    // Build sorting options
    const sorting = {
      sortBy: sortBy || 'createdAt',
      sortOrder: sortOrder || 'desc'
    };

    // Validate sortBy
    const validSortFields = ['name', 'price', 'createdAt', 'stock', 'updatedAt'];
    if (!validSortFields.includes(sorting.sortBy)) {
      return res.status(400).json({ 
        error: `Invalid sortBy field. Must be one of: ${validSortFields.join(', ')}` 
      });
    }

    // Validate sortOrder
    if (!['asc', 'desc'].includes(sorting.sortOrder)) {
      return res.status(400).json({ 
        error: 'Invalid sortOrder. Must be either "asc" or "desc"' 
      });
    }

    // Parse pagination parameters
    const pagination = {
      page: parseInt(page) || 1,
      limit: Math.min(parseInt(limit) || 10, 100) // Cap limit at 100
    };

    const skip = (pagination.page - 1) * pagination.limit;

    // Build base query
    let query = db
      .collection('products')
      .where('businessId', '==', businessId);

    // Apply filters
    if (filters.category) {
      query = query.where('category', '==', filters.category);
    }
    if (filters.mxikCode) {
      query = query.where('mxikCode', '==', filters.mxikCode);
    }
    if (filters.barcode) {
      query = query.where('barcode', '==', filters.barcode);
    }

    // Get all products first for client-side filtering (since Firestore has limited query capabilities)
    const allSnapshot = await query.get();
    let products = allSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));

    // Apply client-side filters
    if (filters.name) {
      const searchTerm = filters.name.toLowerCase();
      products = products.filter(product => 
        product.name && product.name.toLowerCase().includes(searchTerm)
      );
    }

    if (filters.search) {
      const searchTerm = filters.search.toLowerCase();
      products = products.filter(product => 
        (product.name && product.name.toLowerCase().includes(searchTerm)) ||
        (product.description && product.description.toLowerCase().includes(searchTerm)) ||
        (product.barcode && product.barcode.toLowerCase().includes(searchTerm))
      );
    }

    if (filters.minPrice !== undefined) {
      products = products.filter(product => 
        product.price !== undefined && product.price >= filters.minPrice
      );
    }

    if (filters.maxPrice !== undefined) {
      products = products.filter(product => 
        product.price !== undefined && product.price <= filters.maxPrice
      );
    }

    if (filters.inStock !== undefined) {
      if (filters.inStock) {
        products = products.filter(product => 
          product.stock !== undefined && product.stock > 0
        );
      } else {
        products = products.filter(product => 
          product.stock === undefined || product.stock <= 0
        );
      }
    }

    // Apply sorting
    products.sort((a, b) => {
      let aValue, bValue;
      
      switch (sorting.sortBy) {
        case 'name':
          aValue = (a.name || '').toLowerCase();
          bValue = (b.name || '').toLowerCase();
          break;
        case 'price':
          aValue = a.price || 0;
          bValue = b.price || 0;
          break;
        case 'stock':
          aValue = a.stock || 0;
          bValue = b.stock || 0;
          break;
        case 'createdAt':
        case 'updatedAt':
          aValue = a[sorting.sortBy] ? new Date(a[sorting.sortBy].toDate ? a[sorting.sortBy].toDate() : a[sorting.sortBy]) : new Date(0);
          bValue = b[sorting.sortBy] ? new Date(b[sorting.sortBy].toDate ? b[sorting.sortBy].toDate() : b[sorting.sortBy]) : new Date(0);
          break;
        default:
          aValue = a[sorting.sortBy] || '';
          bValue = b[sorting.sortBy] || '';
      }

      if (aValue < bValue) return sorting.sortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return sorting.sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    // Calculate pagination info
    const totalItems = products.length;
    const totalPages = Math.ceil(totalItems / pagination.limit);

    // Apply pagination
    const paginatedProducts = products.slice(skip, skip + pagination.limit);
    
    // Return paginated response
    res.json({
      products: paginatedProducts,
      pagination: {
        currentPage: pagination.page,
        totalPages,
        totalItems,
        itemsPerPage: pagination.limit,
        hasNextPage: pagination.page < totalPages,
        hasPreviousPage: pagination.page > 1
      },
      filters: {
        applied: filters,
        sorting,
        total: Object.keys(filters).length
      },
      meta: {
        businessId,
        timestamp: new Date().toISOString()
      }
    });
  } catch (err) {
    console.error('Get products error:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/businesses/:businessId/categories
 * Get categories for a specific business
 */
router.get('/:businessId/categories', async (req, res) => {
  try {
    const { businessId } = req.params;

    const snapshot = await db
      .collection('businesses')
      .doc(businessId)
      .collection('categories')
      .get();

    if (snapshot.empty) {
      return res.json([]);
    }

    const categories = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
    res.json(categories);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/businesses/:businessId/staff
 * Add staff member to a business
 */
router.post('/:businessId/staff', validateUser, async (req, res) => {
  try {
    const { businessId } = req.params;
    const uid = req.user.uid;
    const staffData = req.body;

    const result = await staffService.addStaffMember(businessId, uid, staffData);

    if (!result.success) {
      const statusCode = result.error.includes('Unauthorized') ? 403 : 
                        result.error.includes('not found') ? 404 : 400;
      return res.status(statusCode).json({ error: result.error });
    }

    res.status(201).json({
      message: 'Staff member added successfully',
      staff: result.data
    });
  } catch (error) {
    console.error('Add staff member route error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/businesses/:businessId/staff
 * Get staff members for a business
 */
router.get('/:businessId/staff', validateUser, async (req, res) => {
  try {
    const { businessId } = req.params;
    const uid = req.user.uid;

    const result = await staffService.getStaffMembers(businessId, uid);

    if (!result.success) {
      const statusCode = result.error.includes('Unauthorized') ? 403 : 
                        result.error.includes('not found') ? 404 : 400;
      return res.status(statusCode).json({ error: result.error });
    }

    res.json({
      staffMembers: result.data,
      count: result.data.length
    });
  } catch (error) {
    console.error('Get staff members route error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * PUT /api/businesses/:businessId/staff/:staffId
 * Update staff member
 */
router.put('/:businessId/staff/:staffId', validateUser, async (req, res) => {
  try {
    const { businessId, staffId } = req.params;
    const uid = req.user.uid;
    const updates = req.body;

    const result = await staffService.updateStaffMember(businessId, staffId, uid, updates);

    if (!result.success) {
      const statusCode = result.error.includes('Unauthorized') ? 403 : 
                        result.error.includes('not found') ? 404 : 400;
      return res.status(statusCode).json({ error: result.error });
    }

    res.json({
      message: 'Staff member updated successfully',
      staff: result.data
    });
  } catch (error) {
    console.error('Update staff member route error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * DELETE /api/businesses/:businessId/staff/:staffId
 * Remove staff member from business
 */
router.delete('/:businessId/staff/:staffId', validateUser, async (req, res) => {
  try {
    const { businessId, staffId } = req.params;
    const uid = req.user.uid;

    const result = await staffService.removeStaffMember(businessId, staffId, uid);

    if (!result.success) {
      const statusCode = result.error.includes('Unauthorized') ? 403 : 
                        result.error.includes('not found') ? 404 : 400;
      return res.status(statusCode).json({ error: result.error });
    }

    res.json({ message: 'Staff member removed successfully' });
  } catch (error) {
    console.error('Remove staff member route error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/businesses/staff/all
 * Get all staff members across businesses with advanced filtering (admin endpoint)
 * 
 * Query Parameters:
 * - businessId: string
 * - role: string (manager, cashier, cook, waiter, etc.)
 * - isActive: boolean
 * - name: string (search in staff name)
 * - email: string (search in staff email)
 * - phone: string (search in staff phone)
 * - search: string (search in name, email, phone)
 * - sortBy: string (name, role, createdAt, isActive)
 * - sortOrder: string (asc, desc)
 * - page: number
 * - limit: number
 */
router.get('/staff/all', async (req, res) => {
  try {
    const { 
      // Filter parameters
      businessId, role, isActive, name, email, phone, search,
      // Sorting parameters
      sortBy, sortOrder,
      // Pagination parameters  
      page, limit 
    } = req.query;
    
    // Build filters object
    const filters = {};
    if (businessId) filters.businessId = businessId;
    if (role) filters.role = role;
    if (isActive !== undefined) filters.isActive = isActive === 'true';
    if (name) filters.name = name;
    if (email) filters.email = email;
    if (phone) filters.phone = phone;
    if (search) filters.search = search;

    // Build sorting options
    const sorting = {
      sortBy: sortBy || 'createdAt',
      sortOrder: sortOrder || 'desc'
    };

    // Validate sortBy
    const validSortFields = ['name', 'role', 'createdAt', 'isActive', 'updatedAt'];
    if (!validSortFields.includes(sorting.sortBy)) {
      return res.status(400).json({ 
        error: `Invalid sortBy field. Must be one of: ${validSortFields.join(', ')}` 
      });
    }

    // Validate sortOrder
    if (!['asc', 'desc'].includes(sorting.sortOrder)) {
      return res.status(400).json({ 
        error: 'Invalid sortOrder. Must be either "asc" or "desc"' 
      });
    }

    const pagination = {
      page: parseInt(page) || 1,
      limit: Math.min(parseInt(limit) || 10, 100) // Cap limit at 100
    };

    const result = await staffService.getAllStaffMembers(filters, pagination, sorting);

    if (!result.success) {
      return res.status(500).json({ error: result.error });
    }

    res.json({
      staffMembers: result.data,
      pagination: result.pagination,
      filters: {
        applied: filters,
        sorting,
        total: Object.keys(filters).length
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] || 'unknown'
      }
    });
  } catch (error) {
    console.error('Get all staff members route error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
