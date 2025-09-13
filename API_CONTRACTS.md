# Cargo360 API Contracts

## Base URL
- **Development**: `http://localhost:4000`
- **Production**: `https://your-domain.com`

## Authentication
All protected endpoints require a Bearer token in the Authorization header:
```
Authorization: Bearer <access_token>
```

## Common Response Format
```json
{
  "success": true,
  "message": "Operation description",
  "data": { ... }
}
```

## Error Response Format
```json
{
  "error": "Error message",
  "details": "Additional error details",
  "code": "ERROR_CODE"
}
```

---

# Authentication Endpoints

## 1. User Signup
**POST** `/auth/signup`

### Request Body
```json
{
  "name": "string (required, min: 2)",
  "email": "string (required, valid email)",
  "phone": "string (required, min: 6)",
  "password": "string (required, min: 6)",
  "role": "string (required, enum: ['customer', 'trucker', 'admin', 'driver'])"
}
```

### Response
**Status**: `201 Created`
```json
{
  "message": "Account created successfully. Please check your email to verify your account.",
  "user": {
    "id": 1,
    "name": "John Doe",
    "role": "customer",
    "isApproved": false,
    "isEmailVerified": false
  }
}
```

### Errors
- `400 Bad Request`: Validation errors, duplicate email/phone
- `500 Internal Server Error`: Server error

---

## 2. User Login
**POST** `/auth/login`

### Request Body
```json
{
  "email": "string (required, valid email)",
  "password": "string (required)"
}
```

### Response
**Status**: `200 OK`
```json
{
  "message": "Login successful",
  "user": {
    "id": 1,
    "name": "John Doe",
    "email": "john@example.com",
    "role": "customer",
    "isApproved": true,
    "isEmailVerified": true
  },
  "tokens": {
    "accessToken": "jwt_access_token",
    "refreshToken": "jwt_refresh_token"
  }
}
```

### Errors
- `400 Bad Request`: Invalid credentials, email not verified
- `401 Unauthorized`: Wrong password
- `404 Not Found`: User not found

---

## 3. Get User Profile
**GET** `/auth/me`

### Headers
```
Authorization: Bearer <access_token>
```

### Response
**Status**: `200 OK`
```json
{
  "user": {
    "id": 1,
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "1234567890",
    "role": "customer",
    "isApproved": true,
    "isEmailVerified": true
  }
}
```

### Errors
- `401 Unauthorized`: Invalid or missing token

---

## 4. Refresh Token
**POST** `/auth/refresh`

### Request Body
```json
{
  "refreshToken": "string (required)"
}
```

### Response
**Status**: `200 OK`
```json
{
  "accessToken": "new_jwt_access_token",
  "refreshToken": "new_jwt_refresh_token"
}
```

### Errors
- `401 Unauthorized`: Invalid refresh token

---

## 5. Verify Email
**GET** `/auth/verify-email?token=<verification_token>`

### Query Parameters
- `token`: Email verification token (required)

### Response
**Status**: `200 OK`
```json
{
  "message": "Email verified successfully"
}
```

### Errors
- `400 Bad Request`: Invalid or expired token

---

## 6. Resend Verification Email
**POST** `/auth/resend-verification`

### Request Body
```json
{
  "email": "string (required, valid email)"
}
```

### Response
**Status**: `200 OK`
```json
{
  "message": "Verification email sent"
}
```

### Errors
- `400 Bad Request`: Email already verified or not found

---

## 7. Forgot Password
**POST** `/auth/forgot-password`

### Request Body
```json
{
  "email": "string (required, valid email)"
}
```

### Response
**Status**: `200 OK`
```json
{
  "message": "Password reset email sent"
}
```

### Errors
- `404 Not Found`: Email not found

---

## 8. Reset Password
**POST** `/auth/reset-password`

### Request Body
```json
{
  "token": "string (required)",
  "password": "string (required, min: 6)"
}
```

### Response
**Status**: `200 OK`
```json
{
  "message": "Password reset successfully"
}
```

### Errors
- `400 Bad Request`: Invalid or expired token

---

# Shipment Endpoints

## 1. Create Shipment (Customer)
**POST** `/shipments`

### Headers
```
Authorization: Bearer <customer_token>
```

### Request Body
```json
{
  "pickupLocation": "string (required, min: 5, max: 500)",
  "dropLocation": "string (required, min: 5, max: 500)",
  "cargoType": "string (required, min: 2, max: 100)",
  "description": "string (required, min: 10, max: 1000)",
  "vehicleType": "string (required, enum: ['truck', 'van', 'pickup', 'trailer', 'container'])",
  "cargoWeight": "number (optional, min: 1)",
  "cargoSize": "string (optional, max: 50)",
  "budget": "number (optional, min: 0)"
}
```

### Response
**Status**: `201 Created`
```json
{
  "success": true,
  "message": "Shipment created successfully",
  "data": {
    "shipment": {
      "id": 1,
      "customerId": 1,
      "pickupLocation": "123 Main St, NY",
      "dropLocation": "456 Oak Ave, LA",
      "cargoType": "Electronics",
      "description": "Fragile equipment...",
      "vehicleType": "truck",
      "cargoWeight": 500,
      "cargoSize": "Large",
      "budget": 1200.50,
      "status": "pending",
      "truckerId": null,
      "createdAt": "2025-09-12T10:00:00Z",
      "updatedAt": "2025-09-12T10:00:00Z",
      "Customer": {
        "id": 1,
        "name": "John Doe",
        "email": "john@example.com"
      }
    }
  }
}
```

### Errors
- `400 Bad Request`: Validation errors
- `401 Unauthorized`: Invalid token
- `403 Forbidden`: Not a customer

---

## 2. Get Customer's Shipments
**GET** `/shipments/mine`

### Headers
```
Authorization: Bearer <customer_token>
```

### Query Parameters
- `status`: Filter by status (optional)

### Response
**Status**: `200 OK`
```json
{
  "success": true,
  "data": {
    "shipments": [
      {
        "id": 1,
        "customerId": 1,
        "pickupLocation": "123 Main St, NY",
        "dropLocation": "456 Oak Ave, LA",
        "cargoType": "Electronics",
        "description": "Fragile equipment...",
        "vehicleType": "truck",
        "status": "pending",
        "createdAt": "2025-09-12T10:00:00Z",
        "Trucker": null
      }
    ]
  }
}
```

---

## 3. Update Shipment (Customer)
**PUT** `/shipments/:id`

### Headers
```
Authorization: Bearer <customer_token>
```

### Request Body
```json
{
  "pickupLocation": "string (optional)",
  "dropLocation": "string (optional)",
  "cargoType": "string (optional)",
  "description": "string (optional)",
  "vehicleType": "string (optional)",
  "cargoWeight": "number (optional)",
  "cargoSize": "string (optional)",
  "budget": "number (optional)"
}
```

### Response
**Status**: `200 OK`
```json
{
  "success": true,
  "message": "Shipment updated successfully",
  "data": {
    "shipment": { /* updated shipment object */ }
  }
}
```

### Errors
- `400 Bad Request`: Cannot update (not pending or not owner)
- `404 Not Found`: Shipment not found

---

## 4. Cancel Shipment (Customer)
**PATCH** `/shipments/:id/cancel`

### Headers
```
Authorization: Bearer <customer_token>
```

### Response
**Status**: `200 OK`
```json
{
  "success": true,
  "message": "Shipment cancelled successfully",
  "data": {
    "shipment": { /* cancelled shipment object */ }
  }
}
```

### Errors
- `400 Bad Request`: Cannot cancel (already accepted)

---

## 5. Get Available Shipments (Trucker/Driver)
**GET** `/shipments/available`

### Headers
```
Authorization: Bearer <trucker_or_driver_token>
```

### Query Parameters
- `vehicleType`: Filter by vehicle type (optional)

### Response
**Status**: `200 OK`
```json
{
  "success": true,
  "data": {
    "shipments": [
      {
        "id": 1,
        "pickupLocation": "123 Main St, NY",
        "dropLocation": "456 Oak Ave, LA",
        "cargoType": "Electronics",
        "description": "Fragile equipment...",
        "vehicleType": "truck",
        "status": "pending",
        "Customer": {
          "id": 1,
          "name": "John Doe",
          "phone": "1234567890"
        }
      }
    ]
  }
}
```

---

## 6. Accept Shipment (Trucker/Driver)
**POST** `/shipments/:id/accept`

### Headers
```
Authorization: Bearer <trucker_or_driver_token>
```

### Response
**Status**: `200 OK`
```json
{
  "success": true,
  "message": "Shipment accepted successfully",
  "data": {
    "shipment": {
      "id": 1,
      "status": "accepted",
      "truckerId": 2,
      "Customer": { /* customer info */ },
      "Trucker": { /* trucker info */ }
    }
  }
}
```

### Errors
- `409 Conflict`: Shipment already accepted

---

## 7. Update Shipment Status (Trucker/Driver)
**PATCH** `/shipments/:id/status`

### Headers
```
Authorization: Bearer <trucker_or_driver_token>
```

### Request Body
```json
{
  "status": "string (required, enum: ['picked_up', 'in_transit', 'delivered', 'cancelled'])"
}
```

### Response
**Status**: `200 OK`
```json
{
  "success": true,
  "message": "Shipment status updated to delivered",
  "data": {
    "shipment": { /* updated shipment object */ }
  }
}
```

### Errors
- `400 Bad Request`: Invalid status
- `404 Not Found`: Shipment not found or unauthorized

---

## 8. Get Trucker's Shipments
**GET** `/shipments/mine-trucker`

### Headers
```
Authorization: Bearer <trucker_token>
```

### Query Parameters
- `status`: Filter by status (optional)

### Response
**Status**: `200 OK`
```json
{
  "success": true,
  "data": {
    "shipments": [
      {
        "id": 1,
        "status": "accepted",
        "truckerId": 2,
        "Customer": {
          "id": 1,
          "name": "John Doe",
          "phone": "1234567890"
        }
      }
    ]
  }
}
```

---

## 9. Get Single Shipment
**GET** `/shipments/:id`

### Headers
```
Authorization: Bearer <token>
```

### Response
**Status**: `200 OK`
```json
{
  "success": true,
  "data": {
    "shipment": {
      "id": 1,
      "customerId": 1,
      "truckerId": 2,
      "pickupLocation": "123 Main St, NY",
      "dropLocation": "456 Oak Ave, LA",
      "status": "accepted",
      "Customer": { /* customer info */ },
      "Trucker": { /* trucker info */ }
    }
  }
}
```

### Errors
- `403 Forbidden`: Unauthorized to view shipment
- `404 Not Found`: Shipment not found

---

## 10. Get All Shipments (Admin)
**GET** `/shipments`

### Headers
```
Authorization: Bearer <admin_token>
```

### Query Parameters
- `status`: Filter by status (optional)
- `vehicleType`: Filter by vehicle type (optional)

### Response
**Status**: `200 OK`
```json
{
  "success": true,
  "data": {
    "shipments": [
      {
        "id": 1,
        "customerId": 1,
        "truckerId": 2,
        "status": "delivered",
        "Customer": { /* customer info */ },
        "Trucker": { /* trucker info */ }
      }
    ]
  }
}
```

---

## 11. Delete Shipment (Admin)
**DELETE** `/shipments/:id`

### Headers
```
Authorization: Bearer <admin_token>
```

### Response
**Status**: `200 OK`
```json
{
  "success": true,
  "message": "Shipment deleted successfully"
}
```

### Errors
- `404 Not Found`: Shipment not found

---

# Status Codes

## Success Codes
- `200 OK`: Request successful
- `201 Created`: Resource created successfully

## Error Codes
- `400 Bad Request`: Invalid request data
- `401 Unauthorized`: Authentication required or invalid
- `403 Forbidden`: Access denied
- `404 Not Found`: Resource not found
- `409 Conflict`: Resource conflict (e.g., already accepted)
- `500 Internal Server Error`: Server error

---

# Shipment Status Flow
1. `pending` → Created by customer
2. `accepted` → Accepted by trucker/driver
3. `picked_up` → Cargo picked up
4. `in_transit` → In transit
5. `delivered` → Delivered successfully
6. `cancelled` → Cancelled by customer/admin

---

# Admin Endpoints

## 1. List All Users (Admin)
**GET** `/admin/users`

### Headers
```
Authorization: Bearer <admin_token>
```

### Response
**Status**: `200 OK`
```json
{
  "users": [
    {
      "id": 1,
      "name": "John Doe",
      "email": "john@example.com",
      "role": "customer",
      "isApproved": true,
      "createdAt": "2025-09-12T10:00:00Z"
    },
    {
      "id": 2,
      "name": "Mike Trucker",
      "email": "mike@example.com",
      "role": "trucker",
      "isApproved": false,
      "createdAt": "2025-09-12T11:00:00Z"
    },
    {
      "id": 3,
      "name": "Admin User",
      "email": "admin@cargo360.com",
      "role": "admin",
      "isApproved": true,
      "createdAt": "2025-09-12T09:00:00Z"
    }
  ]
}
```

### Errors
- `401 Unauthorized`: Invalid or missing token
- `403 Forbidden`: Not an admin user
- `500 Internal Server Error`: Server error

---

## 2. Approve Trucker (Admin)
**PATCH** `/admin/users/:id/approve`

### Headers
```
Authorization: Bearer <admin_token>
```

### Path Parameters
- `id`: User ID (integer, required)

### Response
**Status**: `200 OK`
```json
{
  "user": {
    "id": 2,
    "name": "Mike Trucker",
    "email": "mike@example.com",
    "role": "trucker",
    "isApproved": true,
    "createdAt": "2025-09-12T11:00:00Z",
    "updatedAt": "2025-09-12T12:00:00Z"
  }
}
```

### Errors
- `401 Unauthorized`: Invalid or missing token
- `403 Forbidden`: Not an admin user
- `404 Not Found`: User not found or not a trucker
- `500 Internal Server Error`: Server error

---

## 3. List All Shipments (Admin)
**GET** `/admin/shipments`

### Headers
```
Authorization: Bearer <admin_token>
```

### Response
**Status**: `200 OK`
```json
{
  "shipments": [
    {
      "id": 1,
      "customerId": 1,
      "truckerId": 2,
      "driverId": null,
      "pickupLocation": "123 Main St, NY",
      "dropLocation": "456 Oak Ave, LA",
      "cargoType": "Electronics",
      "description": "Fragile equipment...",
      "vehicleType": "truck",
      "cargoWeight": 500,
      "cargoSize": "Large",
      "budget": 1200.50,
      "status": "delivered",
      "createdAt": "2025-09-12T10:00:00Z",
      "updatedAt": "2025-09-12T15:00:00Z"
    }
  ]
}
```

### Errors
- `401 Unauthorized`: Invalid or missing token
- `403 Forbidden`: Not an admin user
- `500 Internal Server Error`: Server error

---

## 4. Assign Shipment to Trucker or Driver (Admin)
**PATCH** `/admin/shipments/:id/assign`

### Headers
```
Authorization: Bearer <admin_token>
```

### Path Parameters
- `id`: Shipment ID (integer, required)

### Request Body
```json
{
  "assignment": "string (required, enum: ['trucker', 'driver'])",
  "userId": "number (required, integer, min: 1)"
}
```

### Response
**Status**: `200 OK`
```json
{
  "success": true,
  "message": "Shipment assigned to trucker successfully",
  "data": {
    "shipment": {
      "id": 1,
      "customerId": 1,
      "truckerId": 2,
      "driverId": null,
      "pickupLocation": "123 Main St, NY",
      "dropLocation": "456 Oak Ave, LA",
      "cargoType": "Electronics",
      "description": "Fragile equipment...",
      "vehicleType": "truck",
      "cargoWeight": 500,
      "cargoSize": "Large",
      "budget": 1200.50,
      "status": "accepted",
      "createdAt": "2025-09-12T10:00:00Z",
      "updatedAt": "2025-09-12T12:00:00Z",
      "Customer": {
        "id": 1,
        "name": "John Doe",
        "email": "john@example.com",
        "phone": "1234567890"
      },
      "Trucker": {
        "id": 2,
        "name": "Mike Trucker",
        "email": "mike@example.com",
        "phone": "9876543210"
      },
      "Driver": {
        "id": 3,
        "name": "John Driver",
        "email": "john.driver@example.com",
        "phone": "5551234567"
      }
    }
  }
}
```

### Business Logic
- If `assignment` is `trucker`, sets `truckerId` (keeps existing `driverId` if any)
- If `assignment` is `driver`, sets `driverId` (keeps existing `truckerId` if any)
- Allows both trucker and driver to be assigned to the same shipment simultaneously
- Validates that the user has the correct role (trucker/driver)
- No approval check required - any trucker or driver can be assigned
- Automatically updates status from `pending` to `accepted`

### Errors
- `400 Bad Request`: User is not a trucker/driver, validation errors
- `401 Unauthorized`: Invalid or missing token
- `403 Forbidden`: Not an admin user
- `404 Not Found`: Shipment or user not found
- `500 Internal Server Error`: Server error

---

# User Roles
- `customer`: Can create, view, update, cancel own shipments
- `trucker`: Can view available shipments, accept, update status
- `driver`: Same as trucker (separate role for business logic)
- `admin`: Full access to all shipments and users
