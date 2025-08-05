/**
 * Utility functions for category analysis and suggestions
 */

/**
 * Get category suggestions based on common product types
 * @param {string} productType - Type of product
 * @returns {Array} Array of suggested categories
 */
function getCategorySuggestions(productType) {
  const categoryMap = {
    // Food & Beverages
    'food': ['016-GO\'SHT, BALIQ YOKI BOSHQA', '017-SHAKAR VA SHAKARDAN', '019-UN, QANDOLAT VA YORMA', '020-SABZAVOT, MEVA'],
    'beverage': ['022-ALKOGOLLI VA ALKOGOLSIZ ICHIMLIKLAR'],
    'medicine': ['030-FARMATSEVTIKA MAHSULOTI'],
    'cosmetics': ['033-EFIR MOYLARI VA BOSHQA PARFYUMERIYA'],
    
    // Textiles & Clothing
    'clothing': ['061-KIYIM VA KIYIM AKSESSUARLARI', '062-MASHINADA YOKI QO\'LDA TO\'QILGAN'],
    'shoes': ['064-POYABZAL VA UNING TAFSILOTLARI'],
    'fabric': ['058-MATOLAR', '059-TEXNIKA MAQSADLARI UCHUN TEKSTIL'],
    
    // Electronics & Technology
    'electronics': ['085-ELEKTR MASHINALAR, APPARAT'],
    'computer': ['085-ELEKTR MASHINALAR, APPARAT'],
    'phone': ['085-ELEKTR MASHINALAR, APPARAT'],
    
    // Construction & Hardware
    'construction': ['068-TOSH, GIPS, SEMENT', '072-QORA METALLAR', '073-QORA METALLARDAN MAHSULOTLAR'],
    'tools': ['082-QURILMALAR VA MOSLAMALAR', '083-ODDIY METALLARDAN YASALGAN'],
    
    // Vehicles & Transportation
    'car': ['087-TRANSPORT VOSITASI'],
    'vehicle': ['087-TRANSPORT VOSITASI'],
    'auto': ['087-TRANSPORT VOSITASI'],
    
    // Home & Garden
    'furniture': ['094-MEBEL, YOTOQ VA LAMPALAR'],
    'garden': ['006-TIRIK DARAXT VA O\'SIMLIKLAR', '007-SABZAVOTLAR'],
    
    // Sports & Recreation
    'sport': ['095-O\'YINCHOQLAR VA SPORT ASBOB-USKUNALARI'],
    'toy': ['095-O\'YINCHOQLAR VA SPORT ASBOB-USKUNALARI'],
    
    // Beauty & Personal Care
    'beauty': ['033-EFIR MOYLARI VA BOSHQA PARFYUMERIYA'],
    'hygiene': ['034-SOVUN, YUVISH VOSITALARI']
  };
  
  const lowerType = productType.toLowerCase();
  
  // Find matching categories
  for (const [key, categories] of Object.entries(categoryMap)) {
    if (lowerType.includes(key)) {
      return categories;
    }
  }
  
  return [];
}

/**
 * Extract keywords from product name for category matching
 * @param {string} productName - Product name
 * @returns {Array} Array of keywords
 */
function extractKeywords(productName) {
  if (!productName) return [];
  
  // Common Uzbek/Russian product keywords
  const keywords = productName.toLowerCase()
    .split(/[\s,.-]+/)
    .filter(word => word.length > 2);
    
  return keywords;
}

/**
 * Get the most likely category based on detected text
 * @param {Array} detectedText - Array of detected text from image
 * @returns {string|null} Most likely category
 */
function suggestCategoryFromText(detectedText) {
  if (!detectedText || !Array.isArray(detectedText)) return null;
  
  const allText = detectedText.join(' ').toLowerCase();
  
  // Medicine indicators
  if (allText.match(/(мг|гр|таблетка|капсула|сироп|мазь|гель|крем|лекар)/)) {
    return 'medicine';
  }
  
  // Food indicators
  if (allText.match(/(грам|кг|литр|молоко|хлеб|мясо|рыба|овощ|фрукт)/)) {
    return 'food';
  }
  
  // Electronics indicators
  if (allText.match(/(вольт|ватт|мгц|гигабайт|usb|wifi|bluetooth)/)) {
    return 'electronics';
  }
  
  // Clothing indicators
  if (allText.match(/(размер|хлопок|полиэстер|шерсть|xl|xxl|м|л|с)/)) {
    return 'clothing';
  }
  
  return null;
}

module.exports = {
  getCategorySuggestions,
  extractKeywords,
  suggestCategoryFromText
};
