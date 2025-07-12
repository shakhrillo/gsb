const express = require('express');
const router = express.Router();
const { db } = require('../services/firebase');

router.get('/', async (req, res) => {
  try {
    const snapshot = await db.collection('cities').get();
    
    if (snapshot.empty) {
      return res.status(404).json({ message: 'No cities found' });
    }
      
    const cities = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));
      
    res.json(cities);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const cityData = req.body;
    
    if (!cityData.city || !cityData.province) {
      return res.status(400).json({ error: 'City and province are required' });
    }

    // Check if city already exists
    const existingCity = await db.collection('cities')
      .where('city', '==', cityData.city)
      .where('province', '==', cityData.province)
      .get();
    if (!existingCity.empty) {
      return res.status(400).json({ error: 'City already exists' });
    }

    if (cityData.passcode !== process.env.CITY_PASSCODE) {
      return res.status(403).json({ error: 'Invalid passcode' });
    }
    
    const cityRef = await db.collection('cities').add({
      city: cityData.city,
      province: cityData.province,
      createdAt: new Date(),
    });
    
    res.status(201).json({ id: cityRef.id });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const cityId = req.params.id;
    const cityData = req.body;

    if (cityData.passcode !== process.env.CITY_PASSCODE) {
      return res.status(403).json({ error: 'Invalid passcode' });
    }
    
    const cityRef = db.collection('cities').doc(cityId);
    const cityDoc = await cityRef.get();
    
    if (!cityDoc.exists) {
      return res.status(404).json({ error: 'City not found' });
    }
    
    await cityRef.delete();
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;