# Role-Based Access Control - Visual Guide

## Navigation Comparison by Role

### 🔷 Product Manager View
```
┌─────────────────────────────────────────────────┐
│  Home | Products | My Orders                    │
│  📋 Moderate Comments                           │
│  📦 Manage Orders                               │
│  📊 Manage Stock                                │
│                                                  │
│  [Wishlist] [Checkout] [Profile] [Logout]      │
└─────────────────────────────────────────────────┘
```

**What They See:**
- ✅ Moderate Comments - Review and approve customer comments
- ✅ Manage Orders - View and update order status
- ✅ Manage Stock - Update product inventory

**What They DON'T See:**
- ❌ Support Chat
- ❌ Sales Analytics
- ❌ Manage Discounts

---

### 💰 Sales Manager View
```
┌─────────────────────────────────────────────────┐
│  Home | Products | My Orders                    │
│  📈 Sales Analytics                             │
│  🏷️  Manage Discounts                           │
│                                                  │
│  [Wishlist] [Checkout] [Profile] [Logout]      │
└─────────────────────────────────────────────────┘
```

**What They See:**
- ✅ Sales Analytics - Revenue, profit, charts
- ✅ Manage Discounts - Apply/remove product discounts

**What They DON'T See:**
- ❌ Moderate Comments
- ❌ Manage Orders
- ❌ Manage Stock
- ❌ Support Chat

---

### 💬 Support Agent View
```
┌─────────────────────────────────────────────────┐
│  Home | Products | My Orders                    │
│  💬 Support Chat                                │
│                                                  │
│  [Wishlist] [Checkout] [Profile] [Logout]      │
└─────────────────────────────────────────────────┘
```

**What They See:**
- ✅ Support Chat - Customer support interface ONLY

**What They DON'T See:**
- ❌ Moderate Comments
- ❌ Manage Orders
- ❌ Manage Stock
- ❌ Sales Analytics
- ❌ Manage Discounts

---

### ⭐ Admin View (is_staff=true)
```
┌─────────────────────────────────────────────────┐
│  Home | Products | My Orders                    │
│  📋 Moderate Comments                           │
│  📦 Manage Orders                               │
│  📊 Manage Stock                                │
│  💬 Support Chat                                │
│  📈 Sales Analytics                             │
│  🏷️  Manage Discounts                           │
│                                                  │
│  [Wishlist] [Checkout] [Profile] [Logout]      │
└─────────────────────────────────────────────────┘
```

**What They See:**
- ✅ EVERYTHING - Full system access

---

## Permission Matrix

| Feature | Product Manager | Sales Manager | Support Agent | Admin |
|---------|----------------|---------------|---------------|-------|
| **View Products** | ✅ | ✅ | ✅ | ✅ |
| **Make Orders** | ✅ | ✅ | ✅ | ✅ |
| **Moderate Comments** | ✅ | ❌ | ❌ | ✅ |
| **Manage Orders** | ✅ | ❌ | ❌ | ✅ |
| **Manage Stock** | ✅ | ❌ | ❌ | ✅ |
| **Support Chat** | ❌ | ❌ | ✅ | ✅ |
| **Sales Analytics** | ❌ | ✅ | ❌ | ✅ |
| **Manage Discounts** | ❌ | ✅ | ❌ | ✅ |

## Role Descriptions

### 🔷 Product Manager
**Responsibilities:**
- Moderate customer reviews and comments
- Process and manage customer orders
- Update product inventory and stock levels
- Handle product-related customer issues

**Use Case:**
"I need to approve new product reviews, fulfill customer orders, and ensure our inventory is accurate."

**Example Workflow:**
1. Check pending comments in Moderate Comments
2. Review order queue in Manage Orders
3. Update stock for low inventory items
4. Approve/reject customer reviews

---

### 💰 Sales Manager
**Responsibilities:**
- Monitor sales performance and revenue
- Analyze profit margins and trends
- Set product discounts and promotions
- Make pricing decisions based on data

**Use Case:**
"I need to see how our sales are performing and create promotions to boost revenue."

**Example Workflow:**
1. View daily revenue in Sales Analytics
2. Identify slow-moving products
3. Apply 30% discount to selected items
4. Monitor profit margin impact
5. Adjust pricing strategy based on data

---

### 💬 Support Agent
**Responsibilities:**
- Handle customer support inquiries
- Respond to chat messages
- Resolve customer issues
- Provide product assistance

**Use Case:**
"I only need to access the support chat to help customers with their questions."

**Example Workflow:**
1. Open Support Chat dashboard
2. See active customer conversations
3. Respond to inquiries
4. Mark issues as resolved
5. (No access to other admin features for security)

---

### ⭐ Admin
**Responsibilities:**
- Full system administration
- User management
- All role capabilities combined
- System configuration

**Use Case:**
"I need full access to manage the entire system and oversee all operations."

---

## Code Implementation

### Permission Check Examples

```javascript
// frontend/src/utils/admin.js

// Product Manager Check
export function isProductManager(user) {
  return user.is_staff === true || user.role === 'Product Manager';
}

// Sales Manager Check
export function isSalesManager(user) {
  return user.is_staff === true || user.role === 'Sales Manager';
}

// Support Agent Check
export function isSupportAgent(user) {
  return user.is_staff === true || user.role === 'Support Agent';
}

// Feature-specific checks
export function canAccessComments(user) {
  return isProductManager(user);
}

export function canAccessAnalytics(user) {
  return isSalesManager(user);
}

export function canAccessSupportChat(user) {
  return isSupportAgent(user);
}
```

### Navigation Rendering

```jsx
{/* Product Manager Features */}
{canAccessComments(user) &&
  <Link to="/admin/comments">Moderate Comments</Link>
}
{canAccessOrders(user) &&
  <Link to="/admin/orders">Manage Orders</Link>
}
{canAccessStock(user) &&
  <Link to="/admin/stock">Manage Stock</Link>
}

{/* Support Agent Feature */}
{canAccessSupportChat(user) &&
  <Link to="/admin/chat">Support Chat</Link>
}

{/* Sales Manager Features */}
{canAccessAnalytics(user) &&
  <Link to="/admin/analytics">Sales Analytics</Link>
}
{canAccessDiscounts(user) &&
  <Link to="/admin/discounts">Manage Discounts</Link>
}
```

---

## Demo Scenarios

### Scenario 1: Product Manager Daily Tasks
```
Time: 9:00 AM
Login: productmanager / pm123456

Tasks:
1. Check pending comments (5 new reviews)
2. Approve 4, reject 1 spam comment
3. View order queue (12 orders to process)
4. Update order statuses to "In Transit"
5. Check stock levels for best sellers
6. Update stock for 3 low-inventory items

Navigation used:
- Moderate Comments ✅
- Manage Orders ✅
- Manage Stock ✅
```

### Scenario 2: Sales Manager Weekly Review
```
Time: 2:00 PM Friday
Login: salesmanager / sm123456

Tasks:
1. Open Sales Analytics dashboard
2. Review weekly revenue: $15,342.50
3. Check profit margin: 47.3%
4. Identify slow-moving products
5. Apply 25% discount to 5 products
6. Send discount notification to wishlist users

Navigation used:
- Sales Analytics ✅
- Manage Discounts ✅
```

### Scenario 3: Support Agent Active Chat
```
Time: Throughout the day
Login: supportagent / support123

Tasks:
1. Monitor Support Chat for customer inquiries
2. Respond to questions about:
   - Product specifications
   - Order status (without ability to change it)
   - Return policy
3. Escalate complex issues to Product Manager

Navigation used:
- Support Chat ✅ (ONLY)

Note: Agent has no access to modify orders, stock,
or pricing - maintains security and clear responsibility
```

---

## Security Benefits

### 1. Principle of Least Privilege
- Each role has ONLY the permissions they need
- Reduces risk of accidental changes
- Limits potential damage from compromised accounts

### 2. Clear Responsibility
- Product Manager = Operations
- Sales Manager = Revenue
- Support Agent = Customer Service
- No overlap or confusion

### 3. Audit Trail
- Easy to track who did what
- Role-based logging possible
- Clear accountability

### 4. Professional Separation
- Matches real-world business structure
- Scalable for growth
- Easy to add new roles

---

**Visual Guide Complete** ✅
**Last Updated:** 2026-01-13
