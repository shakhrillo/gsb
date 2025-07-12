const express = require('express');
const router = express.Router();
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');
const Fuse = require('fuse.js');
const { db } = require('../services/firebase');
const { validateUser } = require('../middleware/validateUser');
const uploadImage = require('../middleware/uploadImage');
const uploadFile = require('../services/uploadFile');
const analyzeImage = require('../services/analyzeImage');

// Function to format group ID with proper zero padding
function formatGroupId(groupCode) {
  const id = parseInt(groupCode);
  if (id >= 1 && id <= 9) {
    return String(id).padStart(3, '0'); // 001, 002, etc.
  } else if (id >= 10 && id <= 99) {
    return String(id).padStart(3, '0'); // 010, 011, etc.
  } else {
    return String(id); // 100, 101, etc.
  }
}

// Function to get all MXIK group data
function getAllMxikGroupData() {
  const allGroupData = [];
  
  try {
    // Loop through all 118 groups
    for (let groupCode = 1; groupCode <= 118; groupCode++) {
      const formattedId = formatGroupId(groupCode);
      const filePath = path.join(__dirname, '../../data/mxik', `group_${formattedId}.json`);
      
      if (fs.existsSync(filePath)) {
        const fileContent = fs.readFileSync(filePath, 'utf8');
        const jsonData = JSON.parse(fileContent);
        
        // Extract the data part if it has metadata structure, otherwise use as is
        const groupItems = jsonData?.data?.data || jsonData;
        
        if (Array.isArray(groupItems)) {
          allGroupData.push(...groupItems);
        }
      }
    }
    
    return allGroupData;
    
  } catch (error) {
    console.error('Error reading MXIK group files:', error);
    return [];
  }
}

router.post('/', validateUser, async (req, res) => {
  try {
    const user = req.user;
    
    if (!user.isMerchant) {
      return res.status(403).json({ error: 'Only merchants can add products' });
    }

    const newProduct = req.body;
    const docRef = await db
      .collection('products')
      .add({
        ...newProduct,
        merchantUid: user.uid,
        createdAt: new Date(),
        updatedAt: new Date()
      });
    
    res.status(201).json({ id: docRef.id });
  } catch (err) {
    console.error('Error adding product:', err);
    res.status(400).json({ error: err.message });
  }
});

router.put('/:id', validateUser, async (req, res) => {
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

router.delete('/:id', validateUser, async (req, res) => {
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

router.post('/analyze', validateUser, uploadImage, async (req, res) => {
  try {
    const user = req.user;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ error: 'No file provided' });
    }

    const uniqueFileName = `${Date.now()}-${file.originalname}`;
    const firebasePath = `uploads/${user.email}/${uniqueFileName}`;

    const resizedBuffer = await sharp(file.buffer)
      .resize({ width: 512 })
      .toFormat('jpeg')
      .toBuffer();

    const fileUrl = await uploadFile(resizedBuffer, firebasePath);
    const analysisResult = await analyzeImage(fileUrl);
    console.log('Image Analysis Result:', analysisResult);

    // Get all MXIK group data and search across all groups
    let allGroupData = null;
    let filteredGroupData = null;
    
    if (analysisResult && analysisResult.category) {
      allGroupData = getAllMxikGroupData();
      
      // Search across all groups with 50% similarity
      if (allGroupData && allGroupData.length > 0) {
        const fuseOptions = {
          includeScore: true,
          threshold: 0.5, // 50% similarity threshold
          keys: [
            { name: 'nameUZ', weight: 0.4 },
            { name: 'nameLAT', weight: 0.3 },
            { name: 'nameRU', weight: 0.3 }
          ]
        };
        
        const fuse = new Fuse(allGroupData, fuseOptions);
        const searchResults = fuse.search(analysisResult.category);
        
        // Filter results with score <= 0.5 (which means similarity >= 0.5)
        filteredGroupData = searchResults
          .filter(result => result.score <= 0.5)
          .map(result => ({
            ...result.item,
            similarity: (1 - result.score).toFixed(2) // Convert score to similarity percentage
          }))
          .slice(0, 20); // Limit to top 20 results for performance
      }
    }

    res.status(201).json({
      message: 'File uploaded and analyzed successfully',
      fileUrl,
      data: {
        ...analysisResult,
        photo: fileUrl,
        filteredGroupData: filteredGroupData,
        totalSearchResults: filteredGroupData?.length || 0,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    });

  } catch (err) {
    console.error('Upload/Analysis Error:', err);
    res.status(500).json({ error: err.message || 'Failed to process file' });
  }
});
  
module.exports = router;
