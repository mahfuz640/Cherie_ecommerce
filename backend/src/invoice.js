import PDFDocument from 'pdfkit';
export function createInvoice(res, order) {
  const doc = new PDFDocument({ margin: 48 });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename=Cherie-Invoice-${order._id}.pdf`);
  doc.pipe(res); doc.fillColor('#ed5c98').fontSize(28).font('Times-Bold').text('Chérie');
  doc.fillColor('#555').fontSize(10).text('BELOVED ALWAYS').moveDown();
  doc.fontSize(18).fillColor('#222').text('Order invoice', { align: 'right' });
  doc.fontSize(10).fillColor('#555').text(`Invoice: ${order._id}`, { align: 'right' }).text(`Date: ${new Date(order.createdAt).toLocaleDateString()}`, { align: 'right' }).moveDown();
  doc.fillColor('#222').fontSize(12).text('Deliver to').fontSize(10).fillColor('#555').text(`${order.customer.name}\n${order.customer.address}\n${order.customer.phone}\n${order.customer.email}`).moveDown();
  doc.fillColor('#ed5c98').fontSize(11).text('ITEM', 48, doc.y).text('QTY', 350, doc.y - 13).text('TOTAL', 450, doc.y - 13); doc.moveTo(48, doc.y + 4).lineTo(547, doc.y + 4).stroke('#ed5c98').moveDown();
  order.items.forEach(item => { doc.fillColor('#222').fontSize(10).text(item.name, 48, doc.y).text(String(item.quantity), 350, doc.y - 12).text(`৳${(item.price * item.quantity).toLocaleString()}`, 450, doc.y - 12); doc.moveDown(0.6); });
  doc.moveTo(48, doc.y).lineTo(547, doc.y).stroke('#ddd').moveDown(); doc.fillColor('#222').fontSize(14).text(`Total: ৳${order.subtotal.toLocaleString()}`, { align: 'right' }).moveDown(2);
  doc.fillColor('#777').fontSize(10).text('Thank you for choosing Chérie.', { align: 'center' }); doc.end();
}
