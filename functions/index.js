/**
 * Import function triggers from their respective submodules:
 *
 * const {onCall} = require("firebase-functions/v2/https");
 * const {onDocumentWritten} = require("firebase-functions/v2/firestore");
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

const {setGlobalOptions} = require("firebase-functions");
const {onRequest} = require("firebase-functions/https");
const {onDocumentCreated} = require("firebase-functions/v2/firestore");
const logger = require("firebase-functions/logger");
const admin = require("firebase-admin");

// Initialize Firebase Admin
admin.initializeApp();
const db = admin.firestore();

// For cost control, you can set the maximum number of containers that can be
// running at the same time. This helps mitigate the impact of unexpected
// traffic spikes by instead downgrading performance. This limit is a
// per-function limit. You can override the limit for each function using the
// `maxInstances` option in the function's options, e.g.
// `onRequest({ maxInstances: 5 }, (req, res) => { ... })`.
// NOTE: setGlobalOptions does not apply to functions using the v1 API. V1
// functions should each use functions.runWith({ maxInstances: 10 }) instead.
// In the v1 API, each function can only serve one request per container, so
// this will be the maximum concurrent request count.
setGlobalOptions({maxInstances: 10});

/**
 * Helper function to get courier users with push tokens
 * @return {Promise<Array>} Array of courier users with tokens
 */
async function getCourierUsersWithTokens() {
  try {
    const courierUsersSnapshot = await db.collection("users")
        .where("isCourier", "==", true)
        .get();

    if (courierUsersSnapshot.empty) {
      logger.info("No courier users found");
      return [];
    }

    const courierUsers = [];
    for (const doc of courierUsersSnapshot.docs) {
      const userData = doc.data();

      // Get push tokens for this courier
      const pushTokensSnapshot = await db.collection("push_tokens")
          .where("userId", "==", doc.id)
          .where("isActive", "==", true)
          .get();

      const pushTokens = pushTokensSnapshot.docs
          .map((tokenDoc) => tokenDoc.data().pushToken);

      if (pushTokens.length > 0) {
        courierUsers.push({
          uid: doc.id,
          name: userData.name || userData.displayName || "Courier",
          pushTokens,
        });
      }
    }

    logger.info(`Found ${courierUsers.length} active couriers with tokens`);
    return courierUsers;
  } catch (error) {
    logger.error("Error getting courier users:", error);
    return [];
  }
}

/**
 * Helper function to send push notification
 * @param {string} pushToken The push token
 * @param {string} title Notification title
 * @param {string} body Notification body
 * @param {Object} data Additional data
 * @return {Promise} Send result
 */
async function sendPushNotification(pushToken, title, body, data = {}) {
  try {
    const message = {
      token: pushToken,
      notification: {
        title,
        body,
      },
      data: {
        ...data,
        timestamp: new Date().toISOString(),
      },
      android: {
        priority: "high",
        notification: {
          sound: "default",
          priority: "high",
        },
      },
      apns: {
        payload: {
          aps: {
            sound: "default",
            badge: 1,
          },
        },
      },
    };

    const response = await admin.messaging().send(message);
    logger.info(`Successfully sent notification to ${pushToken}:`, response);
    return response;
  } catch (error) {
    logger.error(`Error sending notification to ${pushToken}:`, error);
    return null;
  }
}

/**
 * Helper function to notify couriers about new order
 * @param {string} orderId The order ID
 * @param {Object} orderData The order data
 */
async function notifyCouriersAboutOrder(orderId, orderData) {
  try {
    const couriers = await getCourierUsersWithTokens();

    if (couriers.length === 0) {
      logger.info(`No couriers available for order ${orderId}`);

      // Set order status to dismissed if no couriers available
      await db.collection("orders").doc(orderId).update({
        status: "dismissed",
        dismissedReason: "No couriers available",
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      return;
    }

    const title = "New Order Available";
    const body = `Order #${orderId.substring(0, 8)} - ` +
        `${orderData.customerName || "Customer"} - ` +
        `$${orderData.total || "N/A"}`;

    const notificationData = {
      type: "new_order_for_courier",
      orderId: orderId,
      customerName: orderData.customerName || "",
      total: (orderData.total && orderData.total.toString()) || "0",
      address: orderData.deliveryAddress || "",
      action: "accept_decline",
    };

    // Send notification to first courier
    const firstCourier = couriers[0];
    logger.info(`Sending order ${orderId} to first courier: ` +
        `${firstCourier.uid}`);

    for (const pushToken of firstCourier.pushTokens) {
      await sendPushNotification(pushToken, title, body, notificationData);
    }

    // Update order with pending courier assignment
    await db.collection("orders").doc(orderId).update({
      status: "pending_courier_acceptance",
      currentCourierIndex: 0,
      availableCouriers: couriers.map((c) => c.uid),
      courierNotificationSentAt:
          admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Set a timeout to move to next courier if no response in 2 minutes
    setTimeout(async () => {
      try {
        const orderRef = db.collection("orders").doc(orderId);
        const orderDoc = await orderRef.get();

        if (orderDoc.exists) {
          const currentOrderData = orderDoc.data();

          // If order is still pending and hasn't been accepted
          if (currentOrderData.status === "pending_courier_acceptance" &&
              currentOrderData.currentCourierIndex === 0) {
            await tryNextCourier(orderId, couriers, 1);
          }
        }
      } catch (error) {
        logger.error("Error in courier timeout:", error);
      }
    }, 120000); // 2 minutes timeout
  } catch (error) {
    logger.error("Error notifying couriers about order:", error);
  }
}

/**
 * Helper function to try the next courier
 * @param {string} orderId The order ID
 * @param {Array} couriers Array of couriers
 * @param {number} courierIndex Current courier index
 */
async function tryNextCourier(orderId, couriers, courierIndex) {
  try {
    if (courierIndex >= couriers.length) {
      // No more couriers available, mark order as dismissed
      await db.collection("orders").doc(orderId).update({
        status: "dismissed",
        dismissedReason: "No courier accepted the order",
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      logger.info(`Order ${orderId} dismissed - no courier accepted`);
      return;
    }

    const courier = couriers[courierIndex];
    const title = "New Order Available";
    const body = `Order #${orderId.substring(0, 8)} - Available for delivery`;

    const notificationData = {
      type: "new_order_for_courier",
      orderId: orderId,
      action: "accept_decline",
    };

    // Send notification to current courier
    for (const pushToken of courier.pushTokens) {
      await sendPushNotification(pushToken, title, body, notificationData);
    }

    // Update order with current courier
    await db.collection("orders").doc(orderId).update({
      currentCourierIndex: courierIndex,
      courierNotificationSentAt:
          admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    logger.info(`Sent order ${orderId} to courier ${courier.uid} ` +
        `(index ${courierIndex})`);

    // Set timeout for next courier
    setTimeout(async () => {
      try {
        const orderRef = db.collection("orders").doc(orderId);
        const orderDoc = await orderRef.get();

        if (orderDoc.exists) {
          const currentOrderData = orderDoc.data();

          // If order is still pending and current courier hasn't responded
          if (currentOrderData.status === "pending_courier_acceptance" &&
              currentOrderData.currentCourierIndex === courierIndex) {
            await tryNextCourier(orderId, couriers, courierIndex + 1);
          }
        }
      } catch (error) {
        logger.error("Error in next courier timeout:", error);
      }
    }, 120000); // 2 minutes timeout
  } catch (error) {
    logger.error("Error trying next courier:", error);
  }
}

/**
 * Trigger when a new order is created
 */
exports.onOrderCreated = onDocumentCreated("orders/{orderId}",
    async (event) => {
      const orderId = event.params.orderId;
      const orderData = event.data.data();

      logger.info(`New order created: ${orderId}`, orderData);

      try {
        // Only process orders that need courier assignment
        if (orderData.deliveryType === "delivery" || !orderData.deliveryType) {
          await notifyCouriersAboutOrder(orderId, orderData);
        }
      } catch (error) {
        logger.error(`Error processing new order ${orderId}:`, error);
      }
    });

/**
 * HTTP function to accept/decline order by courier
 */
exports.courierOrderResponse = onRequest(async (req, res) => {
  // Enable CORS
  res.set("Access-Control-Allow-Origin", "*");
  res.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.set("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    res.status(204).send("");
    return;
  }

  if (req.method !== "POST") {
    res.status(405).json({error: "Method not allowed"});
    return;
  }

  try {
    const {orderId, courierId, action} = req.body;

    if (!orderId || !courierId || !action) {
      res.status(400).json({
        success: false,
        message: "Missing required fields: orderId, courierId, action",
      });
      return;
    }

    const orderRef = db.collection("orders").doc(orderId);
    const orderDoc = await orderRef.get();

    if (!orderDoc.exists) {
      res.status(404).json({
        success: false,
        message: "Order not found",
      });
      return;
    }

    const orderData = orderDoc.data();

    if (orderData.status !== "pending_courier_acceptance") {
      res.status(400).json({
        success: false,
        message: "Order is not pending courier acceptance",
      });
      return;
    }

    if (action === "accept") {
      // Courier accepted the order
      await orderRef.update({
        courierId: courierId,
        status: "accepted_by_courier",
        acceptedAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      logger.info(`Order ${orderId} accepted by courier ${courierId}`);

      res.json({
        success: true,
        message: "Order accepted successfully",
        orderId: orderId,
      });
    } else if (action === "decline") {
      // Courier declined, try next courier
      const availableCouriers = orderData.availableCouriers || [];
      const currentIndex = orderData.currentCourierIndex || 0;

      // Get all couriers again (in case the list has changed)
      const couriers = await getCourierUsersWithTokens();
      const activeCouriers = couriers
          .filter((c) => availableCouriers.includes(c.uid));

      logger.info(`Order ${orderId} declined by courier ${courierId}, ` +
          "trying next courier");

      await tryNextCourier(orderId, activeCouriers, currentIndex + 1);

      res.json({
        success: true,
        message: "Order declined, trying next courier",
      });
    } else {
      res.status(400).json({
        success: false,
        message: "Invalid action. Use \"accept\" or \"decline\"",
      });
    }
  } catch (error) {
    logger.error("Error in courier order response:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
});

// Create and deploy your first functions
// https://firebase.google.com/docs/functions/get-started

// exports.helloWorld = onRequest((request, response) => {
//   logger.info("Hello logs!", {structuredData: true});
//   response.send("Hello from Firebase!");
// });
