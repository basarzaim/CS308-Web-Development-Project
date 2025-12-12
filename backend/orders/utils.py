from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import letter, A4
from reportlab.lib import colors
from reportlab.lib.units import inch
from reportlab.platypus import Table, TableStyle
import io
from datetime import datetime
from decimal import Decimal


def generate_invoice_pdf(order):
    """
    Generate a professional PDF invoice with customer information.

    Includes:
    - Company header
    - Customer details (name, email, shipping address)
    - Order information (ID, date, status)
    - Itemized product list
    - Pricing breakdown (subtotal, discount, total)
    - Footer
    """
    buffer = io.BytesIO()
    p = canvas.Canvas(buffer, pagesize=letter)
    width, height = letter

    # Starting Y position
    y = height - 50

    # ========== HEADER ==========
    p.setFillColorRGB(0.2, 0.2, 0.8)  # Dark blue
    p.rect(0, y, width, 60, fill=True, stroke=False)

    p.setFillColorRGB(1, 1, 1)  # White text
    p.setFont("Helvetica-Bold", 24)
    p.drawString(50, y + 25, "CS308 E-Commerce")

    p.setFont("Helvetica", 10)
    p.drawString(50, y + 10, "123 Tech Street, Istanbul, Turkey")

    # Invoice title on right
    p.setFont("Helvetica-Bold", 20)
    p.drawRightString(width - 50, y + 25, "INVOICE")

    y -= 80

    # ========== INVOICE INFO (Left) & CUSTOMER INFO (Right) ==========
    p.setFillColorRGB(0, 0, 0)  # Black text

    # Left column - Invoice Details
    p.setFont("Helvetica-Bold", 11)
    p.drawString(50, y, "Invoice Details")

    p.setFont("Helvetica", 10)
    y -= 20
    p.drawString(50, y, f"Invoice #: {order.id}")
    y -= 15
    p.drawString(50, y, f"Date: {order.created_at.strftime('%B %d, %Y')}")
    y -= 15
    p.drawString(50, y, f"Status: {order.get_status_display()}")

    # Right column - Customer Details
    y_customer = height - 130
    p.setFont("Helvetica-Bold", 11)
    p.drawString(width / 2 + 20, y_customer, "Customer Information")

    p.setFont("Helvetica", 10)
    y_customer -= 20

    # Customer name
    customer_name = order.shipping_name or f"{order.user.first_name} {order.user.last_name}".strip() or order.user.username
    p.drawString(width / 2 + 20, y_customer, f"Name: {customer_name}")
    y_customer -= 15

    # Customer email
    p.drawString(width / 2 + 20, y_customer, f"Email: {order.user.email}")
    y_customer -= 15

    # Customer phone
    if order.shipping_phone:
        p.drawString(width / 2 + 20, y_customer, f"Phone: {order.shipping_phone}")
        y_customer -= 15

    # Shipping Address
    if order.shipping_address:
        p.setFont("Helvetica-Bold", 10)
        p.drawString(width / 2 + 20, y_customer, "Shipping Address:")
        p.setFont("Helvetica", 10)
        y_customer -= 15

        # Address (wrap if too long)
        address_text = order.shipping_address
        if len(address_text) > 40:
            # Split long address
            words = address_text.split()
            line1 = []
            line2 = []
            current = line1
            for word in words:
                if len(' '.join(current + [word])) > 40:
                    current = line2
                current.append(word)

            p.drawString(width / 2 + 20, y_customer, ' '.join(line1))
            if line2:
                y_customer -= 15
                p.drawString(width / 2 + 20, y_customer, ' '.join(line2))
        else:
            p.drawString(width / 2 + 20, y_customer, address_text)
        y_customer -= 15

        # City
        if order.shipping_city:
            p.drawString(width / 2 + 20, y_customer, f"City: {order.shipping_city}")

    # Move y down to match lower of the two columns
    y = min(y - 15, y_customer) - 30

    # ========== LINE SEPARATOR ==========
    p.setStrokeColorRGB(0.7, 0.7, 0.7)
    p.setLineWidth(1)
    p.line(50, y, width - 50, y)
    y -= 30

    # ========== ITEMS TABLE ==========
    p.setFont("Helvetica-Bold", 11)
    p.drawString(50, y, "Order Items")
    y -= 25

    # Table header
    p.setFillColorRGB(0.9, 0.9, 0.9)  # Light gray background
    p.rect(50, y - 15, width - 100, 20, fill=True, stroke=False)

    p.setFillColorRGB(0, 0, 0)
    p.setFont("Helvetica-Bold", 10)
    p.drawString(60, y - 5, "Product")
    p.drawString(300, y - 5, "Quantity")
    p.drawString(380, y - 5, "Unit Price")
    p.drawRightString(width - 60, y - 5, "Subtotal")

    y -= 30

    # Table rows
    p.setFont("Helvetica", 10)
    items = order.items.all()

    for item in items:
        # Product name (truncate if too long)
        product_name = item.product.name
        if len(product_name) > 35:
            product_name = product_name[:32] + "..."

        p.drawString(60, y, product_name)
        p.drawString(315, y, str(item.quantity))
        p.drawString(380, y, f"${item.unit_price:.2f}")

        subtotal = item.unit_price * item.quantity
        p.drawRightString(width - 60, y, f"${subtotal:.2f}")

        y -= 20

        # Check if we need a new page
        if y < 150:
            p.showPage()
            y = height - 50
            p.setFont("Helvetica", 10)

    # ========== TOTALS SECTION ==========
    y -= 20

    # Line separator before totals
    p.setStrokeColorRGB(0.7, 0.7, 0.7)
    p.setLineWidth(0.5)
    p.line(width - 250, y, width - 50, y)
    y -= 25

    # Subtotal
    p.setFont("Helvetica", 10)
    p.drawString(width - 250, y, "Subtotal:")
    p.drawRightString(width - 60, y, f"${order.total_price:.2f}")
    y -= 20

    # Discount (if any)
    if order.discount_percentage and order.discount_percentage > 0:
        discount_amount = (order.total_price * order.discount_percentage) / Decimal("100")
        p.drawString(width - 250, y, f"Discount ({order.discount_percentage}%):")
        p.drawRightString(width - 60, y, f"-${discount_amount:.2f}")
        y -= 20

    # Total (bold and larger)
    p.setFont("Helvetica-Bold", 12)
    p.setFillColorRGB(0.2, 0.2, 0.8)  # Blue
    p.drawString(width - 250, y, "Total:")

    final_total = order.discounted_total_price()
    p.drawRightString(width - 60, y, f"${final_total:.2f}")

    # ========== FOOTER ==========
    p.setFillColorRGB(0.5, 0.5, 0.5)  # Gray
    p.setFont("Helvetica", 8)
    footer_y = 50
    p.drawCentredString(width / 2, footer_y, "Thank you for your business!")
    p.drawCentredString(width / 2, footer_y - 12, "For questions, contact support@cs308ecommerce.com")

    # Page number
    p.drawRightString(width - 50, footer_y, f"Page 1")

    # ========== FINALIZE PDF ==========
    p.showPage()
    p.save()

    buffer.seek(0)
    return buffer
