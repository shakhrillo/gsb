const { OpenAI } = require('openai');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Analyzes a product image from a public URL.
 * Returns product type from barcode lookup.
 * @param {string} imageUrl - Public URL of the image
 */
async function analyzeImage(imageUrl) {
  const messages = [
    {
      role: "system",
      content: `
You are an expert assistant that analyzes product images to extract barcode information.

**Image Analysis Process:**
1. Carefully analyze the product image to identify any visible barcodes
2. Extract the exact barcode number if visible and readable
3. Focus only on extracting the barcode - ignore all other product information

**Response Format:**
Return a valid JSON object with the following structure:

{
  "barcode": "<exact barcode number from image or null if not visible/readable>"
}

**Important Notes:**
- Use null for barcode if not visible, not readable, or unclear
- Return only the barcode number without any additional characters or formatting
- Return only the JSON object, no explanations or additional text
- Be very precise with barcode extraction - only return if you're confident it's correct
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
      max_tokens: 200,
      temperature: 0.1,
    });

    const content = response.choices[0].message.content;

    const jsonStart = content.indexOf('{');
    const jsonEnd = content.lastIndexOf('}');
    const jsonString = content.slice(jsonStart, jsonEnd + 1);

    return JSON.parse(jsonString);
  } catch (err) {
    throw new Error(`Could not analyze image or lookup barcode:\n${err.message}`);
  }
}

module.exports = analyzeImage;
