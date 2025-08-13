/**
 * Business Service
 * 
 * Handles business management operations including registration,
 * approval, and business queries.
 */

const { db } = require('./firebase');
const admin = require('firebase-admin');

class BusinessService {
  /**
   * Get all businesses with enhanced filtering and pagination
   * @param {Object} filters - Filter options
   * @param {Object} pagination - Pagination options
   * @param {Object} sorting - Sorting options
   * @returns {Promise<{success: boolean, data?: any, pagination?: any, error?: string}>}
   */
  async getAllBusinesses(filters = {}, pagination = {}, sorting = {}) {
    try {
      const { 
        status, businessType, ownerId, category, city, name, search,
        minRating, maxRating, isVerified, isOpen,
        circlecenter, circleboundingbox, radius
      } = filters;

      console.log('Filters:', filters);
      
      const { page = 1, limit = 10 } = pagination;
      const { sortBy = 'createdAt', sortOrder = 'desc' } = sorting;
      const skip = (page - 1) * limit;

      let query = db.collection('businesses');

      // Apply basic filters that Firestore can handle
      if (status) {
        query = query.where('status', '==', status);
      }
      if (businessType) {
        query = query.where('businessType', '==', businessType);
      }
      if (ownerId) {
        query = query.where('ownerId', '==', ownerId);
      }
      if (category) {
        query = query.where('category', '==', category);
      }
      if (city) {
        query = query.where('city', '==', city);
      }
      if (isVerified !== undefined) {
        query = query.where('isVerified', '==', isVerified);
      }

      // Get all matching documents for client-side filtering
      const snapshot = await query.get();
      let businesses = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Apply client-side filters
      if (name) {
        const searchTerm = name.toLowerCase();
        businesses = businesses.filter(business => 
          business.name && business.name.toLowerCase().includes(searchTerm)
        );
      }

      if (search) {
        const searchTerm = search.toLowerCase();
        businesses = businesses.filter(business => 
          (business.name && business.name.toLowerCase().includes(searchTerm)) ||
          (business.description && business.description.toLowerCase().includes(searchTerm)) ||
          (business.address && business.address.toLowerCase().includes(searchTerm)) ||
          (business.city && business.city.toLowerCase().includes(searchTerm))
        );
      }

      // Rating filters
      if (minRating !== undefined) {
        businesses = businesses.filter(business => 
          business.rating !== undefined && business.rating >= minRating
        );
      }

      if (maxRating !== undefined) {
        businesses = businesses.filter(business => 
          business.rating !== undefined && business.rating <= maxRating
        );
      }

      // Location-based filtering
      if (circlecenter && radius) {
        const [centerLat, centerLng] = circlecenter.split(',').map(parseFloat);
        console.log('Circle center filtering:', { centerLat, centerLng, radius });
        
        businesses = businesses.filter(business => {
          // Handle different location formats: GeoPoint, businessLocation GeoPoint, legacy formats
          let lat, lng;
          
          if (business.geoLocation && business.geoLocation._latitude !== undefined) {
            lat = business.geoLocation._latitude;
            lng = business.geoLocation._longitude;
          } else if (business.businessLocation && business.businessLocation._latitude !== undefined) {
            // Handle GeoPoint format in businessLocation
            lat = business.businessLocation._latitude;
            lng = business.businessLocation._longitude;
          } else if (business.businessLocation?.latitude && business.businessLocation?.longitude) {
            // Handle legacy object format
            lat = business.businessLocation.latitude;
            lng = business.businessLocation.longitude;
          } else if (business.location?.lat && business.location?.lng) {
            // Handle legacy location format
            lat = business.location.lat;
            lng = business.location.lng;
          }
          
          if (!lat || !lng) {
            console.log('Business has no valid location:', business.id, business.businessName);
            return false;
          }
          
          const distance = this.calculateDistance(
            centerLat, centerLng, lat, lng
          );
          
          console.log(`Business ${business.businessName} (${business.id}): lat=${lat}, lng=${lng}, distance=${distance}km, within radius: ${distance <= radius}`);
          
          return distance <= radius;
        });
      }

      if (circleboundingbox) {
        const [lat1, lng1, lat2, lng2] = circleboundingbox.split(',').map(parseFloat);
        const minLat = Math.min(lat1, lat2);
        const maxLat = Math.max(lat1, lat2);
        const minLng = Math.min(lng1, lng2);
        const maxLng = Math.max(lng1, lng2);
        
        businesses = businesses.filter(business => {
          // Handle different location formats: GeoPoint, businessLocation GeoPoint, legacy formats
          let lat, lng;
          
          if (business.geoLocation && business.geoLocation._latitude !== undefined) {
            lat = business.geoLocation._latitude;
            lng = business.geoLocation._longitude;
          } else if (business.businessLocation && business.businessLocation._latitude !== undefined) {
            // Handle GeoPoint format in businessLocation
            lat = business.businessLocation._latitude;
            lng = business.businessLocation._longitude;
          } else if (business.businessLocation?.latitude && business.businessLocation?.longitude) {
            // Handle legacy object format
            lat = business.businessLocation.latitude;
            lng = business.businessLocation.longitude;
          } else if (business.location?.lat && business.location?.lng) {
            // Handle legacy location format
            lat = business.location.lat;
            lng = business.location.lng;
          }
          
          if (!lat || !lng) {
            return false;
          }
          
          return lat >= minLat && lat <= maxLat && lng >= minLng && lng <= maxLng;
        });
      }

      // Business hours filter (isOpen)
      if (isOpen !== undefined) {
        const currentTime = new Date();
        const currentDay = currentTime.getDay(); // 0 = Sunday, 1 = Monday, etc.
        const currentHour = currentTime.getHours();
        const currentMinute = currentTime.getMinutes();
        const currentTimeMinutes = currentHour * 60 + currentMinute;

        businesses = businesses.filter(business => {
          if (!business.businessHours || !business.businessHours[currentDay]) {
            return !isOpen; // If no hours defined, consider closed
          }
          
          const dayHours = business.businessHours[currentDay];
          if (!dayHours.isOpen) {
            return !isOpen;
          }
          
          const openTime = this.timeToMinutes(dayHours.openTime);
          const closeTime = this.timeToMinutes(dayHours.closeTime);
          
          const isCurrentlyOpen = currentTimeMinutes >= openTime && currentTimeMinutes <= closeTime;
          return isOpen ? isCurrentlyOpen : !isCurrentlyOpen;
        });
      }

      // Apply sorting
      businesses.sort((a, b) => {
        let aValue, bValue;
        
        switch (sortBy) {
          case 'name':
            aValue = (a.name || '').toLowerCase();
            bValue = (b.name || '').toLowerCase();
            break;
          case 'rating':
            aValue = a.rating || 0;
            bValue = b.rating || 0;
            break;
          case 'distance':
            if (circlecenter) {
              const [centerLat, centerLng] = circlecenter.split(',').map(parseFloat);
              
              // Helper function to get coordinates from different formats
              const getCoordinates = (business) => {
                if (business.geoLocation && business.geoLocation._latitude !== undefined) {
                  return {
                    lat: business.geoLocation._latitude,
                    lng: business.geoLocation._longitude
                  };
                } else if (business.businessLocation && business.businessLocation._latitude !== undefined) {
                  // Handle GeoPoint format in businessLocation
                  return {
                    lat: business.businessLocation._latitude,
                    lng: business.businessLocation._longitude
                  };
                } else if (business.businessLocation?.latitude && business.businessLocation?.longitude) {
                  // Handle legacy object format
                  return {
                    lat: business.businessLocation.latitude,
                    lng: business.businessLocation.longitude
                  };
                } else if (business.location?.lat && business.location?.lng) {
                  // Handle legacy location format
                  return {
                    lat: business.location.lat,
                    lng: business.location.lng
                  };
                }
                return null;
              };
              
              const aCoords = getCoordinates(a);
              const bCoords = getCoordinates(b);
              
              aValue = aCoords ? this.calculateDistance(centerLat, centerLng, aCoords.lat, aCoords.lng) : Infinity;
              bValue = bCoords ? this.calculateDistance(centerLat, centerLng, bCoords.lat, bCoords.lng) : Infinity;
            } else {
              aValue = bValue = 0; // If no center point, treat as equal
            }
            break;
          case 'createdAt':
          case 'updatedAt':
            aValue = a[sortBy] ? new Date(a[sortBy].toDate ? a[sortBy].toDate() : a[sortBy]) : new Date(0);
            bValue = b[sortBy] ? new Date(b[sortBy].toDate ? b[sortBy].toDate() : b[sortBy]) : new Date(0);
            break;
          default:
            aValue = a[sortBy] || '';
            bValue = b[sortBy] || '';
        }

        if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
        return 0;
      });

      // Calculate pagination info
      const totalItems = businesses.length;
      const totalPages = Math.ceil(totalItems / limit);

      // Apply pagination
      const paginatedBusinesses = businesses.slice(skip, skip + limit);

      return { 
        success: true, 
        data: paginatedBusinesses,
        pagination: {
          currentPage: page,
          totalPages,
          totalItems,
          itemsPerPage: limit,
          hasNextPage: page < totalPages,
          hasPreviousPage: page > 1
        }
      };
    } catch (error) {
      console.error('Get all businesses error:', error);
      return { success: false, error: 'Internal server error' };
    }
  }

  /**
   * Calculate distance between two coordinates using Haversine formula
   * @param {number} lat1 - Latitude of first point
   * @param {number} lng1 - Longitude of first point
   * @param {number} lat2 - Latitude of second point
   * @param {number} lng2 - Longitude of second point
   * @returns {number} Distance in kilometers
   */
  calculateDistance(lat1, lng1, lat2, lng2) {
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.toRadians(lat2 - lat1);
    const dLng = this.toRadians(lng2 - lng1);
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) *
              Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  /**
   * Convert degrees to radians
   * @param {number} degrees - Degrees to convert
   * @returns {number} Radians
   */
  toRadians(degrees) {
    return degrees * (Math.PI / 180);
  }

  /**
   * Get businesses near a location using optimized geospatial queries
   * @param {number} latitude - Center latitude
   * @param {number} longitude - Center longitude
   * @param {number} radiusKm - Search radius in kilometers
   * @param {Object} additionalFilters - Additional filters to apply
   * @param {Object} pagination - Pagination options
   * @returns {Promise<{success: boolean, data?: any, pagination?: any, error?: string}>}
   */
  async getBusinessesNearLocation(latitude, longitude, radiusKm = 10, additionalFilters = {}, pagination = {}) {
    try {
      // Convert radius from kilometers to degrees (approximate)
      // 1 degree ≈ 111 km at the equator
      const radiusDegrees = radiusKm / 111;
      
      const minLat = latitude - radiusDegrees;
      const maxLat = latitude + radiusDegrees;
      const minLng = longitude - radiusDegrees;
      const maxLng = longitude + radiusDegrees;

      // Create a bounding box query
      let query = db.collection('businesses');

      // Apply additional filters first
      const { status, businessType, category, city, isVerified } = additionalFilters;
      
      if (status) {
        query = query.where('status', '==', status);
      }
      if (businessType) {
        query = query.where('businessType', '==', businessType);
      }
      if (category) {
        query = query.where('category', '==', category);
      }
      if (city) {
        query = query.where('city', '==', city);
      }
      if (isVerified !== undefined) {
        query = query.where('isVerified', '==', isVerified);
      }

      const snapshot = await query.get();
      let businesses = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Filter by bounding box and calculate exact distance
      businesses = businesses.filter(business => {
        // Handle different location formats: GeoPoint, businessLocation GeoPoint, legacy formats
        let lat, lng;
        
        if (business.geoLocation && business.geoLocation._latitude !== undefined) {
          lat = business.geoLocation._latitude;
          lng = business.geoLocation._longitude;
        } else if (business.businessLocation && business.businessLocation._latitude !== undefined) {
          // Handle GeoPoint format in businessLocation
          lat = business.businessLocation._latitude;
          lng = business.businessLocation._longitude;
        } else if (business.businessLocation?.latitude && business.businessLocation?.longitude) {
          // Handle legacy object format
          lat = business.businessLocation.latitude;
          lng = business.businessLocation.longitude;
        } else if (business.location?.lat && business.location?.lng) {
          // Handle legacy location format
          lat = business.location.lat;
          lng = business.location.lng;
        }
        
        if (!lat || !lng) {
          return false;
        }

        // Check if within bounding box
        if (lat < minLat || lat > maxLat || lng < minLng || lng > maxLng) {
          return false;
        }

        // Calculate exact distance and filter by radius
        const distance = this.calculateDistance(latitude, longitude, lat, lng);
        business.distance = distance; // Add distance to the business object
        return distance <= radiusKm;
      });

      // Sort by distance
      businesses.sort((a, b) => a.distance - b.distance);

      // Apply pagination
      const { page = 1, limit = 10 } = pagination;
      const skip = (page - 1) * limit;
      const totalItems = businesses.length;
      const totalPages = Math.ceil(totalItems / limit);
      const paginatedBusinesses = businesses.slice(skip, skip + limit);

      return {
        success: true,
        data: paginatedBusinesses,
        pagination: {
          currentPage: page,
          totalPages,
          totalItems,
          itemsPerPage: limit,
          hasNextPage: page < totalPages,
          hasPreviousPage: page > 1
        }
      };
    } catch (error) {
      console.error('Get businesses near location error:', error);
      return { success: false, error: 'Internal server error' };
    }
  }

  /**
   * Convert location data to Firestore GeoPoint
   * @param {number} latitude - Latitude
   * @param {number} longitude - Longitude
   * @returns {admin.firestore.GeoPoint} Firestore GeoPoint
   */
  createGeoPoint(latitude, longitude) {
    return new admin.firestore.GeoPoint(latitude, longitude);
  }

  /**
   * Migrate existing businessLocation data to GeoPoint format
   * This method helps migrate old location format to new GeoPoint format
   * @returns {Promise<{success: boolean, migrated?: number, error?: string}>}
   */
  async migrateLocationDataToGeoPoint() {
    try {
      const snapshot = await db.collection('businesses').get();
      let migratedCount = 0;
      const batch = db.batch();

      snapshot.docs.forEach(doc => {
        const data = doc.data();
        
        // Check if business has old format location data and no geoLocation
        if (data.businessLocation?.latitude && data.businessLocation?.longitude && !data.geoLocation) {
          const geoPoint = this.createGeoPoint(
            data.businessLocation.latitude, 
            data.businessLocation.longitude
          );
          
          batch.update(doc.ref, {
            geoLocation: geoPoint,
            updatedAt: new Date()
          });
          
          migratedCount++;
        }
      });

      if (migratedCount > 0) {
        await batch.commit();
      }

      return {
        success: true,
        migrated: migratedCount
      };
    } catch (error) {
      console.error('Migration error:', error);
      return { success: false, error: 'Migration failed' };
    }
  }

  /**
   * Convert time string (HH:MM) to minutes
   * @param {string} timeString - Time in HH:MM format
   * @returns {number} Time in minutes from midnight
   */
  timeToMinutes(timeString) {
    if (!timeString) return 0;
    const [hours, minutes] = timeString.split(':').map(parseInt);
    return hours * 60 + minutes;
  }

  /**
   * Get business by ID
   * @param {string} businessId - Business ID
   * @returns {Promise<{success: boolean, data?: any, error?: string}>}
   */
  async getBusinessById(businessId) {
    try {
      const businessRef = db.collection('businesses').doc(businessId);
      const businessDoc = await businessRef.get();

      if (!businessDoc.exists) {
        return { success: false, error: 'Business not found' };
      }

      return { 
        success: true, 
        data: { 
          id: businessDoc.id, 
          ...businessDoc.data() 
        } 
      };
    } catch (error) {
      console.error('Get business by ID error:', error);
      return { success: false, error: 'Internal server error' };
    }
  }

  /**
   * Update business information
   * @param {string} businessId - Business ID
   * @param {Object} updates - Fields to update
   * @param {string} ownerId - Owner ID (for authorization)
   * @returns {Promise<{success: boolean, data?: any, error?: string}>}
   */
  async updateBusiness(businessId, updates, ownerId) {
    try {
      const businessRef = db.collection('businesses').doc(businessId);
      const businessDoc = await businessRef.get();

      if (!businessDoc.exists) {
        return { success: false, error: 'Business not found' };
      }

      const businessData = businessDoc.data();

      // Check if user owns this business
      if (businessData.ownerId !== ownerId) {
        return { success: false, error: 'Unauthorized: You can only update your own businesses' };
      }

      // Prevent updating protected fields
      const protectedFields = ['businessId', 'ownerId', 'status', 'createdAt', 'innPinfl'];
      const filteredUpdates = Object.keys(updates)
        .filter(key => !protectedFields.includes(key))
        .reduce((obj, key) => {
          obj[key] = updates[key];
          return obj;
        }, {});

      if (Object.keys(filteredUpdates).length === 0) {
        return { success: false, error: 'No valid fields to update' };
      }

      filteredUpdates.updatedAt = new Date();

      await businessRef.update(filteredUpdates);

      // Fetch updated business data
      const updatedBusinessDoc = await businessRef.get();
      
      return { 
        success: true, 
        data: { 
          id: updatedBusinessDoc.id, 
          ...updatedBusinessDoc.data() 
        } 
      };
    } catch (error) {
      console.error('Update business error:', error);
      return { success: false, error: 'Internal server error' };
    }
  }

  /**
   * Delete/deactivate business
   * @param {string} businessId - Business ID
   * @param {string} ownerId - Owner ID (for authorization)
   * @returns {Promise<{success: boolean, error?: string}>}
   */
  async deleteBusiness(businessId, ownerId) {
    try {
      const businessRef = db.collection('businesses').doc(businessId);
      const businessDoc = await businessRef.get();

      if (!businessDoc.exists) {
        return { success: false, error: 'Business not found' };
      }

      const businessData = businessDoc.data();

      // Check if user owns this business
      if (businessData.ownerId !== ownerId) {
        return { success: false, error: 'Unauthorized: You can only delete your own businesses' };
      }

      // Instead of deleting, mark as inactive
      await businessRef.update({
        status: 'inactive',
        deactivatedAt: new Date(),
        updatedAt: new Date()
      });

      return { success: true };
    } catch (error) {
      console.error('Delete business error:', error);
      return { success: false, error: 'Internal server error' };
    }
  }

  /**
   * Get businesses by owner with enhanced data
   * @param {string} ownerId - Owner ID
   * @returns {Promise<{success: boolean, data?: any, error?: string}>}
   */
  async getBusinessesByOwner(ownerId) {
    try {
      const snapshot = await db.collection('businesses')
        .where('ownerId', '==', ownerId)
        .orderBy('createdAt', 'desc')
        .get();

      if (snapshot.empty) {
        return { success: true, data: [] };
      }

      const businesses = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Calculate statistics
      const stats = {
        total: businesses.length,
        active: businesses.filter(b => b.status === 'active').length,
        pending: businesses.filter(b => b.status === 'pending').length,
        rejected: businesses.filter(b => b.status === 'rejected').length,
        inactive: businesses.filter(b => b.status === 'inactive').length
      };

      return { 
        success: true, 
        data: businesses,
        stats 
      };
    } catch (error) {
      console.error('Get businesses by owner error:', error);
      return { success: false, error: 'Internal server error' };
    }
  }
}

// Create singleton instance
const businessService = new BusinessService();

module.exports = businessService;
