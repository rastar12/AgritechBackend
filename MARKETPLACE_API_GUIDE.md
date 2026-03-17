# Agritech Marketplace API Integration Guide

This guide provides instructions for frontend developers on how to integrate with the Agritech Backend APIs for the Marketplace.

## 1. Authentication & Authorization

The system uses **JWT (JSON Web Tokens)** for securing private routes.

### Google OAuth Login
To authenticate using Google:
- **Endpoint:** `POST /api/auth/google-oauth`
- **Body:**
  ```json
  {
    "email": "user@gmail.com",
    "name": "Full Name",
    "phone": "2547XXXXXXXX" (optional)
  }
  ```
- **Response:**
  ```json
  {
    "message": "...",
    "user": { "id": 1, "full_name": "...", "email": "...", "role": "Buyer" },
    "token": "eyJhbG..."
  }
  ```

### Using the Token
After a successful login (regular or Google), the server returns a `token`.
- **Where to store:** Store it in `localStorage` or a Secure Cookie on the frontend.
- **How to send:** For all **Private Routes**, you must include the token in the **`Authorization`** header using the **`Bearer`** scheme:

**Header Example:**
```http
Authorization: Bearer <your_token_here>
```

---

## 2. Marketplace APIs (Public)

These APIs do **not** require an Authorization header.

### Get All Active Crops
Use this to show the main categories in the marketplace.
- **Endpoint:** `GET /api/buyer/crops`
- **Returns:** List of crops (id, name, image_url, description).

### Get Items by Crop ID
When a user clicks a crop, fetch the available listings for that crop.
- **Endpoint:** `GET /api/buyer/crops/:id/items`
- **Returns:** List of marketplace items including farmer name, quantity, price, and expected harvest date.

### Get All Active Listings
- **Endpoint:** `GET /api/marketplace/active`
- **Returns:** All active items regardless of crop type.

---

## 3. Order & Payment APIs (Private)

Requires `Authorization: Bearer <token>`

### Place an Order (M-Pesa STK Push)
- **Endpoint:** `POST /api/buyer/orders/place`
- **Body:**
  ```json
  {
    "marketplace_item_id": 10,
    "quantity": 50,
    "phone_number": "254712345678"
  }
  ```
- **Process:**
  1. Frontend calls this API.
  2. Backend validates stock.
  3. Backend triggers M-Pesa STK Push to the `phone_number`.
  4. User enters PIN on their phone.
  5. Response includes `order_id` and M-Pesa status.

### Get My Orders
Fetch the order history for the logged-in buyer.
- **Endpoint:** `GET /api/buyer/orders`
- **Returns:** List of orders with crop info, total price, payment status (`escrow_status`), and harvest dates.

---

## 4. Key Data Models

### Order Status (`escrow_status`)
- `Pending`: Order created, payment not yet confirmed.
- `Paid`: Payment received via M-Pesa.
- `Delivered`: Goods received by buyer.

### Marketplace Item Status (`listing_status`)
- `Active`: Visible to buyers.
- `Hidden`: Only visible to the farmer.
- `Sold Out`: No quantity remaining.

---

## 5. Base URL
Development: `http://localhost:3000`
