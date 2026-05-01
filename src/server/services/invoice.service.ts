import PDFDocument from "pdfkit";
import type { Order, OrderItem, User } from "@prisma/client";
import { formatDecimal } from "@/server/serialize";

export type OrderForInvoice = Order & {
  items: OrderItem[];
  user?: Pick<User, "id" | "name" | "email"> | null;
};

function lineLabel(item: OrderItem): string {
  const size = item.sizeSnapshot?.trim();
  if (size) return `${item.productName} (${size})`;
  return item.productName;
}

export function buildInvoicePdf(order: OrderForInvoice): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50, size: "A4" });
    const chunks: Buffer[] = [];
    doc.on("data", (c: Buffer) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    doc.fontSize(20).text("Invoice", { align: "center" });
    doc.moveDown();
    doc.fontSize(10);
    doc.text(`Order ID: ${order.id}`);
    doc.text(`Date: ${order.createdAt.toISOString().slice(0, 10)}`);
    const customerLabel = order.user
      ? `${order.user.name} (${order.user.email})`
      : `${order.customerName} (${order.customerEmail})`;
    doc.text(`Customer: ${customerLabel}`);
    doc.text(`Business: ${order.customerBusinessName}`);
    doc.text(`Phone: ${order.customerPhone}`);
    doc.text(`City: ${order.customerCity}`);
    doc.text(`Status: ${order.status}`);
    doc.moveDown();

    doc.fontSize(12).text("Line items", { underline: true });
    doc.moveDown(0.5);
    doc.fontSize(9);

    let y = doc.y;
    const colDesc = 50;
    const colQty = 300;
    const colPrice = 360;
    const colTotal = 430;

    doc.font("Helvetica-Bold");
    doc.text("Product / size", colDesc, y);
    doc.text("Qty", colQty, y);
    doc.text("Price", colPrice, y);
    doc.text("Total", colTotal, y);
    y += 18;
    doc.font("Helvetica");

    for (const item of order.items) {
      if (y > 700) {
        doc.addPage();
        y = 50;
      }
      const label = lineLabel(item);
      doc.text(label, colDesc, y, { width: 230 });
      doc.text(String(item.quantity), colQty, y);
      doc.text(formatDecimal(item.price), colPrice, y);
      doc.text(formatDecimal(item.total), colTotal, y);
      y += Math.max(18, doc.heightOfString(label, { width: 230 }) + 4);
    }

    doc.moveDown(2);
    doc.font("Helvetica-Bold").fontSize(10).text(`Total amount: ${formatDecimal(order.totalAmount)}`, { align: "right" });
    doc.font("Helvetica").fontSize(8).text("Payment: offline — reference this order ID when paying.", 50, doc.page.height - 80, {
      align: "center",
      width: doc.page.width - 100,
    });

    doc.end();
  });
}
