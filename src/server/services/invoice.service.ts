import PDFDocument from "pdfkit";
import type { Order, OrderItem, User } from "@prisma/client";
import { formatDecimal } from "@/server/serialize";
import { COMPANY_LETTERHEAD } from "@/lib/site";

export type OrderForInvoice = Order & {
  items: OrderItem[];
  user?: Pick<User, "id" | "name" | "email"> | null;
};

function lineLabel(item: OrderItem): string {
  const size = item.sizeSnapshot?.trim();
  if (size) return `${item.productName} (${size})`;
  return item.productName;
}

const FOOTER_HEIGHT = 70;

function drawLetterhead(doc: PDFKit.PDFDocument): void {
  const left = doc.page.margins.left;
  const right = doc.page.width - doc.page.margins.right;
  const top = doc.page.margins.top;

  doc.font("Helvetica-Bold").fontSize(18).text(COMPANY_LETTERHEAD.name, left, top, { align: "left" });
  doc
    .font("Helvetica")
    .fontSize(8)
    .text(
      [...COMPANY_LETTERHEAD.addressLines, COMPANY_LETTERHEAD.phone, COMPANY_LETTERHEAD.email].join("\n"),
      { align: "right", width: right - left }
    );

  const ruleY = doc.y + 6;
  doc.moveTo(left, ruleY).lineTo(right, ruleY).lineWidth(1).strokeColor("#999999").stroke();
  doc.strokeColor("black");
  doc.y = ruleY + 14;

  doc.font("Helvetica-Bold").fontSize(16).text("Invoice", left, doc.y, { align: "center", width: right - left });
  doc.moveDown();
  doc.font("Helvetica").fontSize(10);
}

function drawFooter(doc: PDFKit.PDFDocument): void {
  const left = doc.page.margins.left;
  const width = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const y = doc.page.height - FOOTER_HEIGHT;

  doc.moveTo(left, y).lineTo(left + width, y).lineWidth(1).strokeColor("#999999").stroke();
  doc.strokeColor("black");

  doc
    .font("Helvetica")
    .fontSize(7)
    .text(
      `${COMPANY_LETTERHEAD.name} | Reg. No. ${COMPANY_LETTERHEAD.registrationNumber} | VAT No. ${COMPANY_LETTERHEAD.vatNumber}`,
      left,
      y + 8,
      { align: "center", width }
    );
  doc.text(`Bank details: ${COMPANY_LETTERHEAD.bankDetails}`, left, doc.y, { align: "center", width });
  doc.text("Payment: offline — reference this order ID when paying.", left, doc.y, {
    align: "center",
    width,
  });
}

export function buildInvoicePdf(order: OrderForInvoice): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50, size: "A4", bufferPages: true });
    const chunks: Buffer[] = [];
    doc.on("data", (c: Buffer) => chunks.push(c));
    doc.on("end", () => {
      const range = doc.bufferedPageRange();
      for (let i = range.start; i < range.start + range.count; i++) {
        doc.switchToPage(i);
        drawFooter(doc);
      }
      resolve(Buffer.concat(chunks));
    });
    doc.on("error", reject);

    drawLetterhead(doc);
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

    const contentBottom = doc.page.height - FOOTER_HEIGHT - 30;

    for (const item of order.items) {
      if (y > contentBottom) {
        doc.addPage();
        drawLetterhead(doc);
        y = doc.y;
      }
      const label = lineLabel(item);
      doc.text(label, colDesc, y, { width: 230 });
      doc.text(String(item.quantity), colQty, y);
      doc.text(formatDecimal(item.price), colPrice, y);
      doc.text(formatDecimal(item.total), colTotal, y);
      y += Math.max(18, doc.heightOfString(label, { width: 230 }) + 4);
    }

    if (y + 40 > contentBottom) {
      doc.addPage();
      drawLetterhead(doc);
      y = doc.y;
    }
    doc.y = y;
    doc.moveDown(2);
    doc.font("Helvetica-Bold").fontSize(10).text(`Total amount: ${formatDecimal(order.totalAmount)}`, { align: "right" });

    doc.end();
  });
}
