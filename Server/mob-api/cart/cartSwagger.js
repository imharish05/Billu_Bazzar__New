'use strict';
module.exports = {
  "/mob-api/cart": {
    "get": {
      "tags": [
        "cart"
      ],
      "summary": "My cart",
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
  "/mob-api/cart/add": {
    "post": {
      "tags": [
        "cart"
      ],
      "summary": "Add to my cart",
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
      },
      "requestBody": {
        "required": true,
        "content": {
          "application/json": {
            "schema": {
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
          }
        }
      }
    }
  },
  "/mob-api/cart/sync": {
    "post": {
      "tags": [
        "cart"
      ],
      "summary": "Sync my cart",
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
      },
      "requestBody": {
        "required": true,
        "content": {
          "application/json": {
            "schema": {
              "type": "object",
              "properties": {
                "items": {
                  "type": "array",
                  "items": {
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
                }
              },
              "required": [
                "items"
              ]
            }
          }
        }
      }
    }
  },
  "/mob-api/cart/item/{itemId}": {
    "put": {
      "tags": [
        "cart"
      ],
      "summary": "Update my cart item",
      "security": [
        {
          "bearerAuth": []
        }
      ],
      "parameters": [
        {
          "name": "itemId",
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
                "quantity": {
                  "type": "integer",
                  "minimum": 1
                }
              },
              "required": [
                "quantity"
              ]
            }
          }
        }
      }
    },
    "delete": {
      "tags": [
        "cart"
      ],
      "summary": "Remove my cart item",
      "security": [
        {
          "bearerAuth": []
        }
      ],
      "parameters": [
        {
          "name": "itemId",
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
  "/mob-api/cart/clear": {
    "delete": {
      "tags": [
        "cart"
      ],
      "summary": "Clear my cart",
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
  }
};
