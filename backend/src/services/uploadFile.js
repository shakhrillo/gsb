const admin = require("firebase-admin");

/**
 * Uploads a file to Firebase Storage.
 *
 * @param {Buffer} fileBuffer - The file buffer to upload.
 * @param {string} destination - The destination path to upload the file.
 * @returns {Promise<string>} - The public URL of the uploaded file.
 */
async function uploadFile(fileBuffer, destination) {
  try {
    const bucket = admin.storage().bucket();
    const file = bucket.file(destination);

    await new Promise((resolve, reject) => {
      const stream = file.createWriteStream({
        metadata: { contentType: "application/octet-stream" },
      });

      stream.on("error", reject);
      stream.on("finish", resolve);
      stream.end(fileBuffer);
    });

    const [url] = await file.getSignedUrl({
      action: "read",
      expires: "03-09-2491",
    });

    return url;
  } catch (error) {
    throw new Error(`Error uploading file: ${error.message}`);
  }
}

module.exports = uploadFile;