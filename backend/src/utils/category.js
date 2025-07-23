// import json
const categoriesJSON = require('../categories.json');

const findCategoryByCode = (code) => {
  return categoriesJSON.find(category => category.code === code) || {
    code: code,
    name: 'Unknown Category',
    productCount: 0
  };
}

module.exports = {
  findCategoryByCode
};