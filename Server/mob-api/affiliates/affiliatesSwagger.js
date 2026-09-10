'use strict';
module.exports = {
  "/mob-api/affiliates": {
    "get": {
      "summary": "Storefront affiliates",
      "security": [
        {
          "bearerAuth": []
        }
      ],
      "parameters": [],
      "responses": {
        "200": {
          "description": "Success"
        },
        "400": {
          "description": "Invalid request"
        },
        "401": {
          "description": "Customer login required"
        },
        "404": {
          "description": "Resource not found"
        }
      },
      "tags": [
        "affiliates"
      ]
    }
  },
  "/mob-api/affiliates/track": {
    "get": {
      "summary": "Track affiliate referral",
      "security": [
        {
          "bearerAuth": []
        }
      ],
      "parameters": [],
      "responses": {
        "200": {
          "description": "Success"
        },
        "400": {
          "description": "Invalid request"
        },
        "401": {
          "description": "Customer login required"
        },
        "404": {
          "description": "Resource not found"
        }
      },
      "tags": [
        "affiliates"
      ]
    }
  }
};
