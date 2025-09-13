# Shipment API Endpoints

## Overview
Complete CRUD operations for shipments with proper validation, authorization, and REST best practices.

## Required Fields for Shipment Creation
- `pickupLocation` (TEXT, required)
- `dropLocation` (TEXT, required) 
- `cargoType` (STRING, required)
- `description` (TEXT, required) - NEW FIELD
- `vehicleType` (STRING, required) - truck, van, pickup, trailer, container

## Optional Fields
- `cargoWeight` (INTEGER, optional)
- `cargoSize` (STRING, optional)
- `budget` (DECIMAL, optional)

## Endpoints

### Admin Routes
- `GET /shipments` - Get all shipments (paginated, filterable)
- `DELETE /shipments/:id` - Soft delete shipment (sets status to cancelled)

### Customer Routes
- `POST /shipments` - Create new shipment
- `GET /shipments/mine` - Get customer's shipments (paginated)
- `PUT /shipments/:id` - Update shipment (only if status is 'pending')
- `PATCH /shipments/:id/cancel` - Cancel shipment (only if status is 'pending')

### Trucker Routes
- `GET /shipments/available` - Get available shipments (status: 'pending')
- `POST /shipments/:id/accept` - Accept shipment (atomic operation)
- `PATCH /shipments/:id/status` - Update shipment status
- `GET /shipments/mine-trucker` - Get trucker's accepted shipments

### Driver Routes (same as trucker)
- `GET /shipments/available-driver` - Get available shipments
- `POST /shipments/:id/accept-driver` - Accept shipment
- `PATCH /shipments/:id/status-driver` - Update status
- `GET /shipments/mine-driver` - Get driver's shipments

### Shared Routes
- `GET /shipments/:id` - Get single shipment (authorized users only)

## Query Parameters (for GET endpoints)
- `status` - pending, accepted, picked_up, in_transit, delivered, cancelled
- `vehicleType` - truck, van, pickup, trailer, container

## Response Format
All responses follow this structure:
```json
{
  "success": true,
  "message": "Operation description",
  "data": {
    "shipment": {...}
  }
}
```

For list endpoints:
```json
{
  "success": true,
  "data": {
    "shipments": [...]
  }
}
```

## Status Flow
1. `pending` - Created by customer
2. `accepted` - Accepted by trucker/driver
3. `picked_up` - Cargo picked up
4. `in_transit` - In transit
5. `delivered` - Delivered successfully
6. `cancelled` - Cancelled by customer or admin

## Example Create Request
```json
{
  "pickupLocation": "123 Main St, New York, NY",
  "dropLocation": "456 Oak Ave, Los Angeles, CA",
  "cargoType": "Electronics",
  "description": "Fragile electronic equipment requiring careful handling and temperature control",
  "vehicleType": "truck",
  "cargoWeight": 500,
  "budget": 1200.00
}
```
