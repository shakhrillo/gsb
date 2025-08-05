const axios = require('axios');

const tasnifApiUrl = 'https://tasnif.soliq.uz/api/cl-api';
const tasnifApiImgUrl = 'https://tasnif.soliq.uz/api/cls-api';

const getProduct = async (barcode) => {
  try {
    const response = await axios.post(`${tasnifApiUrl}/integration-mxik/barcode`, [barcode], {
      headers: {
        'accept': '*/*',
        'Content-Type': 'application/json'
      }
    });
    const results = response.data;
    const mxikCode = results['data'][0]?.mxikCode || barcode;

    if (!mxikCode && !barcode) {
      throw new Error('Product not found for the given barcode');
    }

    const infoResponse = await axios.get(`${tasnifApiUrl}/integration-mxik/get/information`, {
      params: {
        page: 0,
        size: 25,
        mxikCode: mxikCode,
        type: 1,
        lang: 'uz',
        is_cash_register: 0
      },
    });
    const infoResults = infoResponse.data['data'];
    const productInfo = infoResults[0] || {};

    const imageResponse = await axios.get(`${tasnifApiImgUrl}/integration-mxik/references/get/mxik/picture-names`, {
      params: {
        lang: 'ru',
        mxik_code: mxikCode
      }
    });
    return {
      ...productInfo,
      images: (imageResponse.data || []).map(img => ({
        url: `https://tasnif.soliq.uz/api/cls-api/integration-mxik/references/get/file/${img}`,
        alt: img
      })),
      barcode: barcode
    };
  } catch (error) {
    console.error('Error fetching product:', error);
    throw error;
  }
};

const getProductByMxikcode = async (mxikCode) => {
  try {
    if (!mxikCode) {
      throw new Error('Product not found for the given barcode');
    }

    const infoResponse = await axios.get(`${tasnifApiUrl}/integration-mxik/get/information`, {
      params: {
        page: 0,
        size: 25,
        mxikCode: mxikCode,
        type: 1,
        lang: 'uz',
        is_cash_register: 0
      },
    });
    const infoResults = infoResponse.data['data'];
    const productInfo = infoResults[0] || {};

    const imageResponse = await axios.get(`${tasnifApiImgUrl}/integration-mxik/references/get/mxik/picture-names`, {
      params: {
        lang: 'ru',
        mxik_code: mxikCode
      }
    });
    return {
      ...productInfo,
      images: (imageResponse.data || []).map(img => ({
        url: `https://tasnif.soliq.uz/api/cls-api/integration-mxik/references/get/file/${img}`,
        alt: img
      })),
      barcode: null
    };
  } catch (error) {
    console.error('Error fetching product:', error);
    throw error;
  }
};

module.exports = {
  getProduct,
  getProductByMxikcode
};