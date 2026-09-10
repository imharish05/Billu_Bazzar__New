'use strict';
module.exports = {
  "/mob-api/checkout/send-otp": {
    "post": {
      "summary": "Send checkout verification OTP",
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
        "checkout"
      ],
      "requestBody": {
        "required": true,
        "content": {
          "application/json": {
            "schema": {
              "type": "object",
              "properties": {
                "email": {
                  "type": "string"
                },
                "name": {
                  "type": "string"
                }
              },
              "required": [
                "email"
              ]
            }
          }
        }
      }
    }
  },
  "/mob-api/checkout/verify-otp": {
    "post": {
      "summary": "Verify checkout OTP",
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
        "checkout"
      ],
      "requestBody": {
        "required": true,
        "content": {
          "application/json": {
            "schema": {
              "type": "object",
              "properties": {
                "email": {
                  "type": "string"
                },
                "otp": {
                  "type": "string"
                }
              },
              "required": [
                "email",
                "otp"
              ]
            }
          }
        }
      }
    }
  },
  "/mob-api/auth/send-checkout-otp": {
    "post": {
      "summary": "Send checkout verification OTP",
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
        "checkout"
      ],
      "requestBody": {
        "required": true,
        "content": {
          "application/json": {
            "schema": {
              "type": "object",
              "properties": {
                "email": {
                  "type": "string"
                },
                "name": {
                  "type": "string"
                }
              },
              "required": [
                "email"
              ]
            }
          }
        }
      }
    }
  },
  "/mob-api/auth/verify-checkout-otp": {
    "post": {
      "summary": "Verify checkout OTP",
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
        "checkout"
      ],
      "requestBody": {
        "required": true,
        "content": {
          "application/json": {
            "schema": {
              "type": "object",
              "properties": {
                "email": {
                  "type": "string"
                },
                "otp": {
                  "type": "string"
                }
              },
              "required": [
                "email",
                "otp"
              ]
            }
          }
        }
      }
    }
  }
};
