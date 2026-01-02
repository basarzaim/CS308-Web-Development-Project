# Categories API (CT6-52)

Base URL:
- `/api/categories/`

Auth rules:
- **GET list / GET retrieve**: Public (no auth)
- **POST / PATCH / DELETE**: Admin only (JWT Bearer)

## Endpoints

### List (Public)
GET `/api/categories/`

### Retrieve by slug (Public)
GET `/api/categories/<slug>/`

### Create (Admin)
POST `/api/categories/`
Body:
```json
{
  "name": "Smart Home",
  "slug": "smart-home",
  "is_active": true
}