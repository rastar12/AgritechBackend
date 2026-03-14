# Agritech Farmer API Documentation

This document provides the necessary details for frontend developers to integrate the Farmer application with the backend.

---

## 🔐 Authentication & Security

### **Authorization Header**
All protected routes require a JSON Web Token (JWT). The token must be sent in the `Authorization` header using the `Bearer` scheme.

**Example:**
```http
Authorization: Bearer <your_jwt_token_here>
```

---

## 1. Authentication Endpoints

### **Register / Login / Google Auth**
`POST /api/auth/register` | `POST /api/auth/login` | `POST /api/auth/google`

**Response Example:**
```json
{
  "message": "Login successful",
  "token": "eyJhbGciOiJIUzI1Ni...",
  "user": {
    "id": 1,
    "full_name": "John Doe",
    "email": "john@example.com",
    "phone_number": "0712345678",
    "role": "Farmer"
  }
}
```

---

## 2. Farmer Dashboard

### **Get Dashboard Summary**
`GET /api/farmer/dashboard` (Protected)

**Response Example:**
```json
{
  "data": {
    "summary": {
      "total_plantings": 12,
      "active_plantings": 4,
      "total_expected_yield": 24500.0
    },
    "upcoming_events": [
      {
        "stage_name": "Fertilizer Application",
        "event_date": "2026-03-18",
        "crop_name": "Wheat",
        "planting_id": 15,
        "days_remaining": 4
      }
    ]
  }
}
```

---

## 3. Crops & Planting

### **Get All Available Crops**
`GET /api/crops/all`

**Response Example:**
```json
{
  "data": [
    {
      "id": 1,
      "crop_name": "Maize",
      "baseline_yield_per_acre": 2500.00,
      "total_maturity_days": 120,
      "price_per_kg": 45.50,
      "image_url": "https://...",
      "description": "High yield yellow maize"
    }
  ]
}
```

### **Save New Planting Request**
`POST /api/planting/save` (Protected)

**Response Example:**
```json
{
  "message": "Planting request submitted and is currently Pending",
  "data": {
    "id": 10,
    "farmer_id": 1,
    "crop_id": 2,
    "land_size_acres": 2.5,
    "expected_yield_kg": 6250.0,
    "status": "Pending"
  }
}
```

### **Get Planting Details & Calendar**
`GET /api/planting/details/:id` (Protected)

**Response Example:**
```json
{
  "data": {
    "planting_info": {
      "id": 10,
      "farmer_id": 1,
      "crop_id": 2,
      "land_size_acres": 2.5,
      "expected_yield_kg": 6250.0,
      "status": "Planted",
      "planting_date": "2026-03-01",
      "expected_harvest_date": "2026-06-30"
    },
    "calendar": [
      {
        "stage_name": "Germination",
        "start_day": 0,
        "end_day": 7,
        "duration_days": 7,
        "start_date": "2026-03-01",
        "end_date": "2026-03-08"
      },
      {
        "stage_name": "First Weeding",
        "start_day": 7,
        "end_day": 21,
        "duration_days": 14,
        "start_date": "2026-03-08",
        "end_date": "2026-03-22"
      }
    ]
  }
}
```

---

## 4. Marketplace Management

### **Get My Marketplace Listings**
`GET /api/marketplace/my-listings` (Protected)

**Response Example:**
```json
{
  "data": [
    {
      "id": 5,
      "planting_request_id": 10,
      "available_quantity_kg": 6250.0,
      "price_per_kg": 45.50,
      "listing_status": "Hidden",
      "crop_name": "Maize",
      "planting_status": "Planted"
    }
  ]
}
```

### **Public Marketplace (Buyer View)**
`GET /api/marketplace/active`

**Response Example:**
```json
{
  "data": [
    {
      "id": 5,
      "crop_name": "Maize",
      "farmer_name": "John Doe",
      "available_quantity_kg": 6250.0,
      "price_per_kg": 48.00,
      "region_name": "Nakuru",
      "expected_harvest_date": "2026-06-30",
      "image_url": "https://..."
    }
  ]
}
```

---

## 🛠 Error Handling
All error responses follow this format:
```json
{ "message": "Description of the error" }
```
