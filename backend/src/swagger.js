const swaggerJSDoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'My Express API',
      version: '1.0.0',
      description: 'API documentation using Swagger',
    },
    servers: [
      {
        url: 'http://localhost:3000', // replace with your URL
      },
    ],
  },
  apis: ['./backend/src/routes/*.js'], // path to the API docs (adjust accordingly)
};

const swaggerSpec = swaggerJSDoc(options);

module.exports = swaggerSpec;