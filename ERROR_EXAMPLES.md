# Error Response Examples

This document shows examples of the new error responses from the Cargo360 API.

## Error Response Format

All errors now return a consistent format:
```json
{
  "error": "Human-readable error message",
  "code": 4001,
  "status": 400
}
```

## Error Codes Reference

### Validation Errors (4000-4099)
- `4000` - General validation error
- `4001` - Invalid email format
- `4002` - Invalid password (too short, missing, etc.)
- `4003` - Invalid phone number
- `4004` - Invalid name (too short, missing)
- `4005` - Invalid role (must be 'customer' or 'trucker')
- `4006` - Missing required field

### Authentication Errors (4100-4199)
- `4100` - Invalid credentials (wrong email/password)
- `4101` - Email not verified
- `4102` - Account not approved (trucker pending approval)
- `4103` - Token expired
- `4104` - Invalid token
- `4105` - Unauthorized access

### User Management Errors (4200-4299)
- `4200` - Email already exists
- `4201` - User not found
- `4202` - Email already verified

### System Errors (5000-5099)
- `5000` - Email send failed
- `5001` - Database error
- `5002` - Internal server error

## Example Error Responses

### Signup with Invalid Email
**Request:**
```json
{
  "name": "John Doe",
  "email": "invalid-email",
  "phone": "1234567890",
  "password": "password123",
  "role": "customer"
}
```

**Response:** `400 Bad Request`
```json
{
  "error": "Please provide a valid email address",
  "code": 4001,
  "status": 400
}
```

### Signup with Short Password
**Request:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "phone": "1234567890",
  "password": "123",
  "role": "customer"
}
```

**Response:** `400 Bad Request`
```json
{
  "error": "Password must be at least 6 characters long",
  "code": 4002,
  "status": 400
}
```

### Signup with Invalid Role
**Request:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "phone": "1234567890",
  "password": "password123",
  "role": "admin"
}
```

**Response:** `400 Bad Request`
```json
{
  "error": "Role must be either \"customer\" or \"trucker\"",
  "code": 4005,
  "status": 400
}
```

### Email Already Exists
**Response:** `409 Conflict`
```json
{
  "error": "An account with this email already exists",
  "code": 4200,
  "status": 409
}
```

### Login with Wrong Password
**Response:** `401 Unauthorized`
```json
{
  "error": "Invalid email or password",
  "code": 4100,
  "status": 401
}
```

### Login with Unverified Email
**Response:** `403 Forbidden`
```json
{
  "error": "Please verify your email address before logging in. Check your inbox for the verification link.",
  "code": 4101,
  "status": 403
}
```

### Trucker Account Not Approved
**Response:** `403 Forbidden`
```json
{
  "error": "Your trucker account is pending admin approval. Please wait for approval before logging in.",
  "code": 4102,
  "status": 403
}
```

### Invalid Verification Token
**Response:** `400 Bad Request`
```json
{
  "error": "Invalid or expired verification token. Please request a new verification email.",
  "code": 4104,
  "status": 400
}
```

### Email Already Verified
**Response:** `400 Bad Request`
```json
{
  "error": "This email address is already verified",
  "code": 4202,
  "status": 400
}
```

### User Not Found
**Response:** `404 Not Found`
```json
{
  "error": "No account found with this email address",
  "code": 4201,
  "status": 404
}
```

### Email Send Failed
**Response:** `500 Internal Server Error`
```json
{
  "error": "Failed to send verification email. Please try again later.",
  "code": 5000,
  "status": 500
}
```

### Invalid Password Reset Token
**Response:** `400 Bad Request`
```json
{
  "error": "Invalid or expired password reset token. Please request a new password reset.",
  "code": 4104,
  "status": 400
}
```

## Frontend Integration

You can now handle errors more effectively in your frontend:

```javascript
try {
  const response = await fetch('/auth/signup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(signupData)
  });
  
  if (!response.ok) {
    const error = await response.json();
    
    // Show user-friendly error message
    showError(error.error);
    
    // Handle specific error codes
    switch (error.code) {
      case 4001:
        // Highlight email field
        highlightField('email');
        break;
      case 4002:
        // Highlight password field
        highlightField('password');
        break;
      case 4200:
        // Redirect to login page
        redirectToLogin();
        break;
      // ... handle other codes
    }
  }
} catch (err) {
  console.error('Network error:', err);
}
```
