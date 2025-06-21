const { Storage } = require("@google-cloud/storage");
const admin = require("firebase-admin");
const environment = process.env.APP_ENVIRONMENT;
const firebaseProjectId = process.env.APP_FIREBASE_PROJECT_ID;
const firebaseUrl = process.env.APP_FIREBASE_IPV4_ADDRESS;

/**
 * Uploads a file to Firebase Storage.
 *
 * @param {Buffer} fileBuffer - The file buffer to upload.
 * @param {string} destination - The destination path to upload the file.
 * @returns {Promise<string>} - The public URL of the uploaded file.
 */
async function uploadFile(fileBuffer, destination) {
  try {
    // if (environment === "development") {
    //   const storage = new Storage({
    //     apiEndpoint: `http://${firebaseUrl}:${process.env.APP_FIREBASE_EMULATOR_STORAGE}`,
    //   });

    //   const bucket = storage.bucket(`${firebaseProjectId}.appspot.com`);
    //   const file = bucket.file(destination);

    //   await file.save(fileBuffer, { resumable: false, public: true });

    //   const publicUrl = file.publicUrl();
    //   return publicUrl.includes("localhost")
    //     ? publicUrl
    //     : publicUrl.replace(`${firebaseUrl}`, `localhost`);
    // }

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