from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import letter
import io

def generate_invoice_pdf(order):
    buffer = io.BytesIO()
    p = canvas.Canvas(buffer, pagesize=letter)

    p.setFont("Helvetica-Bold", 16)
    p.drawString(100, 750, "Order Invoice")

    p.setFont("Helvetica", 12)
    p.drawString(100, 720, f"Order ID: {order.id}")
    p.drawString(100, 700, f"User: {order.user.email}")
    p.drawString(100, 680, f"Total Price: {order.total_price}")

    y = 650
    for item in order.items.all():
        p.drawString(100, y, f"{item.product.name} x {item.quantity} - {item.unit_price}")
        y -= 20

    p.showPage()
    p.save()

    buffer.seek(0)
    return buffer
