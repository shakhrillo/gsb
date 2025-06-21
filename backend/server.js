// backend/server.js
const express = require('express');

exports.app = () => {
  const app = express();
  app.get('/', (req, res) => {
    res.send('Hello from SSR Express!');
  });
  return app;
};
