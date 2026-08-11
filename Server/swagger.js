'use strict';

const swaggerAutogen = require('swagger-autogen')({ openapi: '3.0.0' });

const doc = {
  info: {
    title: 'Billu Bazaar API',
    description: 'Automatically generated OpenAPI / Swagger documentation for all backend API endpoints.',
    version: '1.0.0',
  },
  host: process.env.SWAGGER_HOST || 'localhost:5000',
  basePath: '/',
  schemes: ['http', 'https'],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT'
      }
    }
  }
};

const outputFile = './swagger-output.json';
const endpointsFiles = ['./app.js'];

swaggerAutogen(outputFile, endpointsFiles, doc).then(() => {
  console.log('✅ Swagger documentation generated successfully into swagger-output.json');
});
