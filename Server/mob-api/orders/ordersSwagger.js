'use strict';
module.exports = {
  "/mob-api/orders/my": {
    "get": {
      "tags": [
        "orders"
      ],
      "summary": "My orders",
      "security": [
        {
          "bearerAuth": []
        }
      ],
      "parameters": [],
      "responses": {
        "200": {
          "description": "Successful response using the existing customer API response format"
        },
        "400": {
          "description": "Invalid request",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        },
        "401": {
          "description": "Missing, invalid, expired, or inactive customer token",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        },
        "403": {
          "description": "Operation not permitted",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        },
        "404": {
          "description": "Resource not found or not owned by this customer",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        },
        "409": {
          "description": "Operation conflicts with current state",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        },
        "500": {
          "description": "Internal server error",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        }
      }
    }
  },
  "/mob-api/orders/my/{id}": {
    "get": {
      "tags": [
        "orders"
      ],
      "summary": "My order details and tracking",
      "security": [
        {
          "bearerAuth": []
        }
      ],
      "parameters": [
        {
          "name": "id",
          "in": "path",
          "required": true,
          "schema": {
            "type": "string"
          }
        }
      ],
      "responses": {
        "200": {
          "description": "Successful response using the existing customer API response format"
        },
        "400": {
          "description": "Invalid request",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        },
        "401": {
          "description": "Missing, invalid, expired, or inactive customer token",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        },
        "403": {
          "description": "Operation not permitted",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        },
        "404": {
          "description": "Resource not found or not owned by this customer",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        },
        "409": {
          "description": "Operation conflicts with current state",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        },
        "500": {
          "description": "Internal server error",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        }
      }
    }
  },
  "/mob-api/orders/my/{id}/cancel": {
    "post": {
      "tags": [
        "orders"
      ],
      "summary": "Cancel my order",
      "security": [
        {
          "bearerAuth": []
        }
      ],
      "parameters": [
        {
          "name": "id",
          "in": "path",
          "required": true,
          "schema": {
            "type": "string"
          }
        }
      ],
      "responses": {
        "200": {
          "description": "Successful response using the existing customer API response format"
        },
        "400": {
          "description": "Invalid request",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        },
        "401": {
          "description": "Missing, invalid, expired, or inactive customer token",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        },
        "403": {
          "description": "Operation not permitted",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        },
        "404": {
          "description": "Resource not found or not owned by this customer",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        },
        "409": {
          "description": "Operation conflicts with current state",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        },
        "500": {
          "description": "Internal server error",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        }
      },
      "requestBody": {
        "required": true,
        "content": {
          "application/json": {
            "schema": {
              "type": "object",
              "properties": {
                "reason": {
                  "type": "string"
                }
              },
              "required": [
                "reason"
              ]
            }
          }
        }
      }
    }
  },
  "/mob-api/orders": {
    "post": {
      "tags": [
        "orders"
      ],
      "summary": "Place an order for my account",
      "security": [
        {
          "bearerAuth": []
        }
      ],
      "parameters": [],
      "responses": {
        "200": {
          "description": "Successful response using the existing customer API response format"
        },
        "201": {
          "description": "Created successfully"
        },
        "400": {
          "description": "Invalid request",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        },
        "401": {
          "description": "Missing, invalid, expired, or inactive customer token",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        },
        "403": {
          "description": "Operation not permitted",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        },
        "404": {
          "description": "Resource not found or not owned by this customer",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        },
        "409": {
          "description": "Operation conflicts with current state",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        },
        "500": {
          "description": "Internal server error",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        }
      },
      "requestBody": {
        "required": true,
        "content": {
          "application/json": {
            "schema": {
              "type": "object",
              "properties": {
                "shippingAddress": {
                  "type": "object",
                  "properties": {
                    "name": {
                      "type": "string"
                    },
                    "email": {
                      "type": "string"
                    },
                    "phone": {
                      "type": "string"
                    },
                    "address": {
                      "type": "string"
                    },
                    "city": {
                      "type": "string"
                    },
                    "state": {
                      "type": "string"
                    },
                    "pincode": {
                      "type": "string"
                    },
                    "country": {
                      "type": "string"
                    }
                  },
                  "required": []
                },
                "billingAddress": {
                  "type": "object",
                  "properties": {
                    "name": {
                      "type": "string"
                    },
                    "email": {
                      "type": "string"
                    },
                    "phone": {
                      "type": "string"
                    },
                    "address": {
                      "type": "string"
                    },
                    "city": {
                      "type": "string"
                    },
                    "state": {
                      "type": "string"
                    },
                    "pincode": {
                      "type": "string"
                    },
                    "country": {
                      "type": "string"
                    }
                  },
                  "required": []
                },
                "paymentMethod": {
                  "type": "string"
                },
                "couponCode": {
                  "type": "string"
                },
                "referralCode": {
                  "type": "string"
                },
                "redeemPoints": {
                  "type": "number"
                },
                "isGiftWrap": {
                  "type": "boolean"
                },
                "giftMessage": {
                  "type": "string"
                },
                "notes": {
                  "type": "string"
                },
                "requestedCurrency": {
                  "type": "string",
                  "enum": [
                    "INR",
                    "AED"
                  ]
                },
                "geoCountry": {
                  "type": "string"
                },
                "isBuyNow": {
                  "type": "boolean"
                },
                "buyNowItem": {
                  "type": "object",
                  "properties": {
                    "productId": {
                      "type": "integer",
                      "minimum": 1
                    },
                    "variantId": {
                      "type": "integer",
                      "minimum": 1
                    },
                    "quantity": {
                      "type": "integer",
                      "minimum": 1
                    }
                  },
                  "required": [
                    "productId",
                    "quantity"
                  ]
                }
              },
              "required": [
                "shippingAddress",
                "paymentMethod"
              ]
            }
          }
        }
      }
    }
  },
  "/mob-api/orders/track/{identifier}": {
    "get": {
      "summary": "Track my order by ID or order number",
      "security": [
        {
          "bearerAuth": []
        }
      ],
      "parameters": [
        {
          "name": "identifier",
          "in": "path",
          "required": true,
          "schema": {
            "type": "string"
          }
        }
      ],
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
        "orders"
      ]
    }
  }
};
