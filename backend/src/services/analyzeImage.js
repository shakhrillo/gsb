const { OpenAI } = require('openai');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Analyzes a product image from a public URL.
 * Returns product metadata.
 * @param {string} imageUrl - Public URL of the image
 */
async function analyzeImage(imageUrl) {
  const messages = [
    {
      role: "system",
      content: `
You are an expert assistant that analyzes product images and extracts basic product information.

**Image Analysis Process:**
1. Carefully analyze the product image to identify all visible text and barcodes
2. Extract the product name in Uzbek Cyrillic script
3. Identify any visible barcode numbers
4. Create a brief product description in Uzbek Cyrillic

**Response Format:**
Return a valid JSON object with the following structure:

{
  "barcode": "<barcode number from image or null if not visible>",
  "product_name": "<product name in Uzbek Cyrillic>",
  "description": "<brief product description in Uzbek Cyrillic>",
  "category": "<category name in Uzbek Cyrillic>",
  "groupCodes": <numeric group codes from the available categories>
}

**Available Group Codes:**
Select the most appropriate groupCodes from these categories:
- 1: ТИРИК ҲАЙВОНЛАР (Live Animals)
- 2: ГЎШТ ВА ГЎШТЛИ ОЗИҚ-ОВҚАТ СУБМАҲСУЛОТЛАРИ (Meat and Meat Food Sub-products)
- 3: БАЛИҚ ВА СУВДА ЯШОВЧИ УМУРТҚАСИЗ БОШҚА ҲАЙВОНЛАР (Fish and Other Aquatic Invertebrates)
- 4: ҲАЙВОНЛАРДАН ОЛИНАДИГАН МАҲСУЛОТЛАР (Animal Products)
- 5: БОШҚА ЖОЙЛАРДА КЎРСАТИЛМАГАН ЁКИ КИРИТИЛМАГАН ҲАЙВОН МАҲСУЛОТЛАРИ (Other Animal Products)
- 6: ТИРИК ДАРАХТ ВА ЎСИМЛИКЛАР (Live Trees and Plants)
- 7: САБЗАВОТЛАР (Vegetables)
- 8: МЕВАЛАР ВА ЁНҒОҚЛАР (Fruits and Nuts)
- 9: КОФЕ, ЧОЙ ВА ЗИРАВОРЛАР (Coffee, Tea and Spices)
- 10: ДОНЛИ ЎСИМЛИКЛАР (Grains)
- 11: УН ВА УН-ДОН МАҲСУЛОТЛАРИ (Flour and Grain Products)
- 12: ДОРИВОР ЎСИМЛИКЛАР УРУҒЛАРИ, МЕВАЛАРИ ВА ТЕХНИК МАҚСАДЛАРДАГИ ЎСИМЛИКЛАР (Medicinal Plant Seeds, Fruits and Technical Plants)
- 13: ШЕЛЛАК ТАБИИЙ ТОЗАЛАНМАГАН; САҚИЧ, ҚАТРОНЛАР ВА БОШҚА ЎСИМЛИК ШАРБАТЛАРИ ВА ЭКСТРАКТЛАРИ (Natural Unrefined Shellac; Gums, Resins and Other Plant Juices and Extracts)
- 14: ТЎҚИЛАДИГАН МАҲСУЛОТЛАРДА ҚЎЛЛАНАДИГАН ЎСИМЛИК МАТЕРИАЛЛАРИ (Plant Materials for Woven Products)
- 15: ҲАЙВОН ЁКИ ЎСИМЛИК ЁҒЛАРИ ВА УЛАРНИНГ ПАРЧАЛАНИШИ МАҲСУЛОТЛАРИ (Animal or Plant Oils and Their Decomposition Products)
- 16: ГЎШТ, БАЛИҚ ЁКИ БОШҚА СУВДА ЯШОВЧИ УМУРТҚАСИЗ ҲАЙВОНЛАРДАН ТАЙЁРЛАНГАН МАҲСУЛОТЛАР (Products from Meat, Fish or Other Aquatic Invertebrates)
- 17: ШАКАР ВА ШАКАРДАН ОЛИНАДИГАН ҚАНДОЛАТ МАҲСУЛОТЛАРИ (Sugar and Confectionery from Sugar)
- 18: КАКАО ВА УНИНГ МАҲСУЛОТЛАРИ (Cocoa and Its Products)
- 19: УН, ҚАНДОЛАТ ВА ЁРМА - ДОН МАҲСУЛОТЛАРИ (Flour, Confectionery and Grain Products)
- 20: САБЗАВОТ, МЕВА, ЁНҒОҚ ЁКИ ЎСИМЛИКЛАРНИНГ БОШҚА ҚИСМЛАРИНИ ҚАЙТА ИШЛАШ МАҲСУЛОТЛАРИ (Products from Processing Vegetables, Fruits, Nuts or Other Plant Parts)
- 21: ТУРЛИ ОЗИҚ-ОВҚАТ МАҲСУЛОТЛАРИ (Various Food Products)
- 22: АЛКОГОЛЛИ ВА АЛКОГОЛСИЗ ИЧИМЛИКЛАР ҲАМДА СИРКА (Alcoholic and Non-alcoholic Beverages and Vinegar)
- 23: ОЗИҚ-ОВҚАТ САНОАТИ ҚОЛДИҚЛАРИ ВА ЧИҚИНДИЛАРИ ҲАМДА ХАЙВОНЛАР УЧУН ТАЙЁР ОЗУҚА МАҲСУЛОТЛАРИ (Food Industry Residues and Waste and Ready Feed for Animals)
- 24: ТАМАКИ ВА ТАМАКИ ЎРНИНИ БОСУВЧИ МАҲСУЛОТЛАР (Tobacco and Tobacco Substitutes)
- 25: ТУЗ, ОЛТИНГУГУРТ, ГИПС МАТЕРИАЛЛАРИ, ОҲАК ВА ЦЕМЕНТ (Salt, Sulfur, Gypsum Materials, Lime and Cement)
- 26: РУДАЛАР, ШЛАК ВА КУЛ (Ores, Slag and Ash)
- 27: МИНЕРАЛ ЁҚИЛҒИ ВА БИТУМСИМОН МОДДАЛАР (Mineral Fuel and Bituminous Substances)
- 28: НООРГАНИК ВА ОРГАНИК КИМЁ МАҲСУЛОТЛАРИ (Inorganic and Organic Chemical Products)
- 29: ОРГАНИК КИМЁВИЙ МОДДАЛАР (Organic Chemical Substances)
- 30: ФАРМАЦЕВТИКА МАҲСУЛОТИ (Pharmaceutical Products)
- 31: ЎҒИТЛАР (Fertilizers)
- 32: ҚОРИШМА ВА БЎЁҚ ЭКСТРАКТЛАР (Tanning and Dye Extracts)
- 33: ЭФИР МОЙЛАРИ ВА БОШҚА ПАРФЮМЕРИЯ, КОСМЕТИКА ЁКИ ГЎЗАЛЛИК МАҲСУЛОТЛАРИ (Essential Oils and Other Perfumery, Cosmetics or Beauty Products)
- 34: СОВУН, ЮВИШ ВОСИТАЛАРИ, МОЙЛАШ МАТЕРИАЛЛАРИ, МУМЛАР ВА МОДЕЛЛАШТИРИШ МАҲСУЛОТЛАРИ (Soap, Detergents, Lubricants, Waxes and Modeling Products)
- 35: ОҚСИЛ МОДДАЛАР, ЕЛИМЛАР ВА ФЕРМЕНТЛАР (Proteins, Glues and Enzymes)
- 36: ПИРОТЕХНИКА МАҲСУЛОТЛАРИ, ГУГУРТ ВА БАЪЗИ ЁНУВЧИ МОДДАЛАР (Pyrotechnic Products, Matches and Some Combustible Substances)
- 37: ФОТО ВА КИНО МАҲСУЛОТЛАРИ (Photo and Cinema Products)
- 38: БОШҚА КИМЁВИЙ МАҲСУЛОТЛАР (Other Chemical Products)
- 39: ПЛАСТМАССАЛАР ВА ПЛАСТМАССА МАҲСУЛОТЛАР (Plastics and Plastic Products)
- 40: КАУЧУК, РЕЗИНА ВА УЛАРДАН МАҲСУЛОТЛАР (Rubber, Rubber and Products from Them)
- 41: ХОМ ВА КЕСИЛГАН ТЕРИ (Raw and Cut Leather)
- 42: ТЕРИ МАҲСУЛОТЛАРИ (Leather Products)
- 43: МЎЙНА ВА МЎЙНАЛИ МАҲСУЛОТЛАР (Natural and Artificial Fur; Products from It)
- 44: ЁҒОЧ ВА УНИНГ МАҲСУЛОТЛАРИ (Wood and Its Products)
- 45: ПРОБКА ВА УНИНГ МАҲСУЛОТЛАРИ (Cork and Its Products)
- 46: САВАТ (Basket Products from Straw)
- 47: ЁҒОЧ МАССАСИ (Wood Pulp)
- 48: ҚОҒОЗ ВА КАРТОН МАҲСУЛОТЛАРИ (Paper and Cardboard Products)
- 49: КИТОБЛАР, ГАЗEТАЛАР ВА БОШҚА МАТБАА МАҲСУЛОТЛАРИ (Books, Newspapers and Other Printing Products)
- 50: ИПАК (Silk)
- 51: ЖУН (Wool)
- 52: ПАХТА (Cotton)
- 53: БОШҚА ЎСИМЛИКЛАРНИНГ ТЎҚИМАЧИЛИК ТОЛАЛАРИ (Other Plant Textile Fibers)
- 54: КИМЁВИЙ ИПЛАР; ТЎҚИМАЧИЛИК МАТЕРИАЛЛАРИНИНГ ТЕКИС ВА ЎХШАШ УЧЛАРИ (Chemical Threads; Flat and Similar Ends of Textile Materials)
- 55: КИМЁВИЙ ТОЛАЛАР (Chemical Fibers)
- 56: ЮНГ ВА ТЎҚИЛМАЙДИГАН МАТEРИАЛЛАР (Felt and Non-woven Materials)
- 57: ГИЛАМЛАР (Carpets)
- 58: МАТОЛАР (Fabrics)
- 59: ТEХНИКА МАҚСАДЛАРИ УЧУН ТEКСТИЛ МАТEРИАЛЛАРИ (Textile Materials for Technical Purposes)
- 60: ТРИКОТАЖ МАТО (Knitted Fabric)
- 61: КИЙИМ ВА КИЙИМ АКСEССУАРЛАРИ (Clothing and Clothing Accessories)
- 62: МАШИНАДА ЁКИ ҚЎЛДА ТЎҚИЛГАН ТРИКОТАЖДАН ТАШҚАРИ КИЙИМ-КЕЧАК БУЮМЛАРИ ВА КИЙИМ-КЕЧАК ЖИҲОЗЛАРИ (Clothing Items and Clothing Equipment Other Than Machine or Hand-knitted Knitwear)
- 63: БОШҚА ТУГАЛЛАНГАН ТЎҚИМАЧИЛИК МАҲСУЛОТЛАРИ, ТЎПЛАМЛАР (Other Finished Textile Products, Sets)
- 64: ПОЙАБЗАЛ ВА УНИНГ ТАФСИЛОТЛАРИ (Footwear and Its Details)
- 65: ШЛЯПАЛАР ВА УЛАРНИНГ ҚИСМЛАРИ (Hats and Their Parts)
- 66: СОЯБОНЛАР ВА ҲАССАЛАР (Umbrellas and Canes)
- 67: ҚАЙТА ИШЛАНГАН ТУКЛАР ВА ТУКЛАР ВА ПАТЛАРДАН ЯСАЛГАН БУЮМЛАР; СУН'ИЙ ГУЛЛАР; ИНСОН СОЧЛАРИ МАҲСУЛОТЛАРИ (Processed Feathers and Items Made from Feathers and Down; Artificial Flowers; Human Hair Products)
- 68: ТОШ, ГИПС, ЦЕМЕНТ, АСБЕСТ, МИКИКА ЁКИ ШУНГА ЎХШАШ МАТЕРИАЛЛАР (Stone, Gypsum, Cement, Asbestos, Mica or Similar Materials)
- 69: КEРАМИК МАҲСУЛОТЛАР (Ceramic Products)
- 70: ШИША ВА ШИША МАҲСУЛОТЛАР (Glass and Glass Products)
- 71: ҚИММАТЛИ ЁКИ ЯРИМ ҚИММАТ ТОШЛАР ВА МEТАЛЛАР (Precious or Semi-precious Stones and Metals)
- 72: ҚОРА МEТАЛЛАР (Ferrous Metals)
- 73: ҚОРА МEТАЛЛАРДАН МАҲСУЛОТЛАР (Products from Ferrous Metals)
- 74: МИС ВА МИС МАҲСУЛОТЛАРИ (Copper and Copper Products)
- 75: НИКЕЛЬ ВА УНИНГ МАҲСУЛОТЛАРИ (Nickel and Its Products)
- 76: АЛЮМИНИЙ ВА УНИНГ МАҲСУЛОТЛАРИ (Aluminum and Its Products)
- 78: ҚЎРҒОШИН ВА УНИНГ МАҲСУЛОТЛАРИ (Lead and Its Products)
- 79: РУХ ВА УНИНГ МАҲСУЛОТЛАРИ (Zinc and Its Products)
- 80: ҚАЛАЙ ВА УНИНГ МАҲСУЛОТЛАРИ (Tin and Its Products)
- 81: БОШҚА ҚИММАТЛИ БЎЛМАГАН МEТАЛЛАР ВА КEРАМИКАЛАР (Other Non-precious Metals and Ceramics)
- 82: ҚУРИЛМАЛАР ВА МОСЛАМАЛАР (Tools and Devices)
- 83: ОДДИЙ МЕТАЛЛАРДАН ЯСАЛГАН БОШҚА БУЮМЛАР (Other Items Made from Common Metals)
- 84: ЯДРО РЕАКТОРЛАРИ, ҚОЗОНХОНАЛАР, ЖИҲОЗЛАР ВА МЕХАНИК ҚУРИЛМАЛАР; УЛАРНИНГ ҚИСМЛАРИ (Nuclear Reactors, Boilers, Equipment and Mechanical Devices; Their Parts)
- 85: ЭЛEКТР МАШИНАЛАР, АППАРАТ, АСБОБ-УСКУНАЛАР ВА УЛАРНИНГ ҚИСМЛАРИ (Electric Machines, Apparatus, Equipment and Their Parts)
- 86: ТEМИР ЙЎЛ ЛОКОМОТИВЛАРИ ВА АВТОМОБИЛЛАР ТРАМВАЙ, ВАГОН УЛАРНИНГ ҚИСМЛАРИ; ЙЎЛ УСКУНАЛАРИ ВА ТЕМИР ЙЎЛЛАР УЧУН ЖИҲОЗ ЁКИ ТРАМВАЙ ЙЎЛЛАРИ ВА УЛАРНИНГ ҚИСМЛАРИ (Railway Locomotives and Tramway Cars, Wagons and Their Parts; Railway Equipment and Devices for Railways or Tramways and Their Parts)
- 87: ТРАНСПОРТ ВОСИТАСИ (Transport Vehicles)
- 88: ҲАВОДА УЧУВЧИ АППАРАТЛАР, КОСМИК АППАРАТЛАРИ ВА УЛАРНИНГ ҚИСМЛАРИ (Aircraft, Spacecraft and Their Parts)
- 89: ҚАЙИҚ ВА СУЗУВЧИ ВОСИТАЛАР (Boats and Floating Vehicles)
- 90: АСБОБ-УСКУНАЛАР ВА АППАРАТЛАР (Instruments and Apparatus)
- 91: СОАТЛАР (Clocks and Watches)
- 92: МУСИҚА АСБОБЛАРИ (Musical Instruments)
- 93: ҚУРОЛ ВА ЎҚ-ДОРИЛАР; УЛАРНИНГ ҚИСМЛАРИ ВА ЖИҲОЗЛАРИ (Weapons and Ammunition; Their Parts and Equipment)
- 94: МЕБЕЛЬ, ЁТОҚ ВА ЛАМПАЛАР (Furniture, Beds and Lamps)
- 95: ЎЙИНЧОҚЛАР ВА СПОРТ АСБОБ-УСКУНАЛАРИ (Toys and Sports Equipment)
- 96: ТУРЛИ ХИЛ ТАЙЁР МАҲСУЛОТЛАР (Various Ready Products)
- 97: САНЪАТ АСАРЛАРИ (Works of Art)
- 98: БОШҚА МАҲСУЛОТЛАР (Other Products)
- 99: КОММУНАЛ ХИЗМАТЛАР (Utility Services)
- 100: ҚУРИЛИШ ХИЗМАТЛАРИ (Construction Services)
- 101: ТАШИШ ВА САҚЛАШ ХИЗМАТЛАРИ (Transportation and Storage Services)
- 102: ТУРАРЖОЙ ВА ОВҚАТЛАНИШ ХИЗМАТЛАРИ (Accommodation and Food Services)
- 103: АХБОРОТ ВА АЛОҚА СОҲАСИДАГИ ХИЗМАТЛАР (Information and Communication Services)
- 104: МОЛИЯВИЙ ХИЗМАТЛАР (Financial Services)
- 105: МУЛК БИЛАН БОҒЛИҚ ХИЗМАТЛАР (Property Related Services)
- 106: ПРОФEССИОНАЛ ХИЗМАТЛАР (Professional Services)
- 107: МАЪМУРИЙ ВА ЁРДАМЧИ ХИЗМАТЛАР (Administrative and Support Services)
- 108: ТАЪЛИМ ВА СПОРТ ТАЙЁРЛОВ ХИЗМАТЛАРИ (Education and Sports Training Services)
- 109: СОҒЛИҚНИ САҚЛАШ СОҲАСИДАГИ ХИЗМАТЛАР (Health Care Services)
- 110: САНЪАТ, ИЖОДКОРЛИК, СПОРТ, ДАМ ОЛИШ ВА КЎНГИЛ ОЧИШ (Arts, Creativity, Sports, Recreation and Entertainment)
- 111: БОШҚА ХИЗМАТЛАР (Other Services)
- 112: РАҚАМЛИ АХБОРОТ ТЕХНОЛОГИЯЛАРИ СОҲАСИДАГИ ХИЗМАТЛАР (Digital Information Technology Services)
- 113: ТАЪМИРЛАШ (ТИКЛАШ), ЎРНАТИШ ВА ДЕМОНТАЖ ҚИЛИШ БЎЙИЧА ХИЗМАТЛАР (Repair (Restoration), Installation and Dismantling Services)
- 114: САНОАТ ХИЗМАТЛАРИ (Industrial Services)
- 115: БАНДЛИК ВА МЕҲНАТНИ МУҲОФАЗА ҚИЛИШ (Employment and Labor Protection)
- 116: AТРОФ МУҲИТНИ МУҲОФАЗА ҚИЛИШ (Environmental Protection)
- 117: МАИШИЙ, ШАХСИЙ ТАЪМИРЛАШ ХИЗМАТЛАРИ (Household, Personal Repair Services)
- 118: БОШҚА ДАРОМАДЛАР (Other Income)

**Important Notes:**
- Use null for barcode if not visible or readable
- Product name and description must be in Uzbek Cyrillic script
- groupCodes must be a numeric array value from the available categories above and  groupCodes can be selected
- category should describe what type of product it is without pluralization
- Keep description concise and informative
- Return only the JSON object, no explanations or additional text
`,
    },
    {
      role: "user",
      content: [
        {
          type: "image_url",
          image_url: { url: imageUrl },
        },
      ],
    },
  ];

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages,
      max_tokens: 600,
      temperature: 0.2,
    });

    const content = response.choices[0].message.content;

    const jsonStart = content.indexOf('{');
    const jsonEnd = content.lastIndexOf('}');
    const jsonString = content.slice(jsonStart, jsonEnd + 1);

    return JSON.parse(jsonString);
  } catch (err) {
    throw new Error(`Could not parse JSON from GPT response:\n${err.message}`);
  }
}

module.exports = analyzeImage;
