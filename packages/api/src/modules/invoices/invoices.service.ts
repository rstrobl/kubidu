import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

export interface InvoiceItem {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface InvoiceDetails {
  id: string;
  number: string;
  date: string;
  dueDate: string;
  status: 'paid' | 'pending' | 'overdue';
  items: InvoiceItem[];
  subtotal: number;
  tax: number;
  total: number;
  currency: string;
  co2Saved: number;
  billingAddress: {
    name: string;
    company?: string;
    street: string;
    city: string;
    country: string;
  };
}

@Injectable()
export class InvoicesService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get all invoices for a user's workspaces
   */
  async findAllForUser(userId: string): Promise<InvoiceDetails[]> {
    // Get all workspaces the user belongs to
    const memberships = await this.prisma.workspaceMember.findMany({
      where: { userId },
      select: { workspaceId: true },
    });

    const workspaceIds = memberships.map((m) => m.workspaceId);

    // Get all invoices for those workspaces
    const invoices = await this.prisma.invoice.findMany({
      where: { workspaceId: { in: workspaceIds } },
      include: {
        workspace: {
          include: {
            members: {
              where: { userId },
              include: { user: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return invoices.map((inv) => this.mapInvoiceToDetails(inv));
  }

  /**
   * Get a single invoice by ID
   */
  async findOne(userId: string, invoiceId: string): Promise<InvoiceDetails> {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: {
        workspace: {
          include: {
            members: {
              where: { userId },
              include: { user: true },
            },
          },
        },
      },
    });

    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    // Check user has access to this workspace
    if (invoice.workspace.members.length === 0) {
      throw new ForbiddenException('Access denied');
    }

    return this.mapInvoiceToDetails(invoice);
  }

  /**
   * Generate PDF for an invoice
   */
  async generatePdf(userId: string, invoiceId: string): Promise<Buffer> {
    const invoice = await this.findOne(userId, invoiceId);
    return this.createPdfDocument(invoice);
  }

  /**
   * Map database invoice to detailed invoice format
   */
  private mapInvoiceToDetails(invoice: any): InvoiceDetails {
    const user = invoice.workspace.members[0]?.user;
    const createdDate = new Date(invoice.createdAt);
    const dueDate = invoice.dueDate ? new Date(invoice.dueDate) : new Date(createdDate.getTime() + 14 * 24 * 60 * 60 * 1000);

    // Calculate status
    let status: 'paid' | 'pending' | 'overdue' = 'pending';
    if (invoice.paidAt || invoice.status === 'paid') {
      status = 'paid';
    } else if (dueDate < new Date()) {
      status = 'overdue';
    }

    // Calculate tax and subtotal
    const subtotal = invoice.amount / 1.19; // Assuming 19% VAT
    const tax = invoice.amount - subtotal;

    // Estimate CO2 saved based on amount (rough calculation)
    const co2Saved = invoice.amount * 0.8; // ~0.8kg per EUR

    return {
      id: invoice.id,
      number: `INV-${createdDate.getFullYear()}-${String(Math.abs(invoice.id.charCodeAt(0) * 100 + invoice.id.charCodeAt(1))).padStart(4, '0')}`,
      date: this.formatGermanDate(createdDate),
      dueDate: this.formatGermanDate(dueDate),
      status,
      currency: invoice.currency?.toUpperCase() || 'EUR',
      subtotal: Math.round(subtotal * 100) / 100,
      tax: Math.round(tax * 100) / 100,
      total: invoice.amount,
      co2Saved: Math.round(co2Saved * 10) / 10,
      items: [
        {
          description: 'Kubidu Cloud Hosting - Monatliche Nutzung',
          quantity: 1,
          unitPrice: Math.round(subtotal * 100) / 100,
          total: Math.round(subtotal * 100) / 100,
        },
      ],
      billingAddress: {
        name: user?.name || 'Kunde',
        company: invoice.workspace.name,
        street: 'Kundenadresse',
        city: 'Deutschland',
        country: 'Deutschland',
      },
    };
  }

  private formatGermanDate(date: Date): string {
    const months = [
      'Januar', 'Februar', 'Maerz', 'April', 'Mai', 'Juni',
      'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember',
    ];
    return `${date.getDate()}. ${months[date.getMonth()]} ${date.getFullYear()}`;
  }

  /**
   * Create PDF document for invoice
   */
  private async createPdfDocument(invoice: InvoiceDetails): Promise<Buffer> {
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595, 842]); // A4 size
    const { width, height } = page.getSize();

    const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    const margin = 50;
    let y = height - margin;

    // Colors
    const primary = rgb(0.2, 0.4, 0.8);
    const green = rgb(0.1, 0.6, 0.3);
    const gray = rgb(0.4, 0.4, 0.4);
    const black = rgb(0, 0, 0);

    // Header - Kubidu Logo Area
    page.drawRectangle({
      x: margin,
      y: y - 60,
      width: 150,
      height: 50,
      color: primary,
    });
    page.drawText('KUBIDU', {
      x: margin + 20,
      y: y - 42,
      size: 24,
      font: helveticaBold,
      color: rgb(1, 1, 1),
    });

    // 100% Green Energy Badge
    page.drawRectangle({
      x: width - margin - 120,
      y: y - 50,
      width: 120,
      height: 35,
      color: green,
    });
    page.drawText('100% GREEN ENERGY', {
      x: width - margin - 110,
      y: y - 38,
      size: 10,
      font: helveticaBold,
      color: rgb(1, 1, 1),
    });

    y -= 100;

    // Company Info
    page.drawText('Kubidu GmbH', { x: margin, y, size: 10, font: helveticaBold, color: black });
    y -= 14;
    page.drawText('Musterstrasse 1, 60313 Frankfurt', { x: margin, y, size: 9, font: helvetica, color: gray });
    y -= 12;
    page.drawText('Deutschland', { x: margin, y, size: 9, font: helvetica, color: gray });
    y -= 12;
    page.drawText('USt-IdNr.: DE123456789', { x: margin, y, size: 9, font: helvetica, color: gray });

    // Invoice Title and Details (right side)
    const rightX = width - margin - 150;
    page.drawText('RECHNUNG', { x: rightX, y: height - 140, size: 24, font: helveticaBold, color: black });
    page.drawText(`Nr.: ${invoice.number}`, { x: rightX, y: height - 165, size: 10, font: helvetica, color: gray });
    page.drawText(`Datum: ${invoice.date}`, { x: rightX, y: height - 180, size: 10, font: helvetica, color: gray });
    page.drawText(`Faellig: ${invoice.dueDate}`, { x: rightX, y: height - 195, size: 10, font: helvetica, color: gray });

    // Status Badge
    const statusColors = {
      paid: green,
      pending: rgb(0.8, 0.6, 0.1),
      overdue: rgb(0.8, 0.2, 0.2),
    };
    const statusLabels = { paid: 'BEZAHLT', pending: 'AUSSTEHEND', overdue: 'ÜBERFÄLLIG' };
    page.drawRectangle({
      x: rightX,
      y: height - 225,
      width: 80,
      height: 20,
      color: statusColors[invoice.status],
    });
    page.drawText(statusLabels[invoice.status], {
      x: rightX + 10,
      y: height - 218,
      size: 9,
      font: helveticaBold,
      color: rgb(1, 1, 1),
    });

    y -= 60;

    // Billing Address
    page.drawText('Rechnungsadresse:', { x: margin, y, size: 10, font: helveticaBold, color: black });
    y -= 15;
    page.drawText(invoice.billingAddress.name, { x: margin, y, size: 10, font: helvetica, color: black });
    y -= 12;
    if (invoice.billingAddress.company) {
      page.drawText(invoice.billingAddress.company, { x: margin, y, size: 10, font: helvetica, color: gray });
      y -= 12;
    }
    page.drawText(invoice.billingAddress.street, { x: margin, y, size: 10, font: helvetica, color: gray });
    y -= 12;
    page.drawText(`${invoice.billingAddress.city}, ${invoice.billingAddress.country}`, {
      x: margin,
      y,
      size: 10,
      font: helvetica,
      color: gray,
    });

    y -= 50;

    // Items Table Header
    page.drawRectangle({
      x: margin,
      y: y - 5,
      width: width - 2 * margin,
      height: 25,
      color: rgb(0.95, 0.95, 0.95),
    });
    page.drawText('Beschreibung', { x: margin + 10, y: y + 5, size: 10, font: helveticaBold, color: black });
    page.drawText('Menge', { x: 350, y: y + 5, size: 10, font: helveticaBold, color: black });
    page.drawText('Einzelpreis', { x: 400, y: y + 5, size: 10, font: helveticaBold, color: black });
    page.drawText('Gesamt', { x: 480, y: y + 5, size: 10, font: helveticaBold, color: black });

    y -= 30;

    // Items
    for (const item of invoice.items) {
      page.drawText(item.description, { x: margin + 10, y, size: 10, font: helvetica, color: black });
      page.drawText(String(item.quantity), { x: 360, y, size: 10, font: helvetica, color: gray });
      page.drawText(this.formatCurrency(item.unitPrice, invoice.currency), {
        x: 400,
        y,
        size: 10,
        font: helvetica,
        color: gray,
      });
      page.drawText(this.formatCurrency(item.total, invoice.currency), {
        x: 480,
        y,
        size: 10,
        font: helveticaBold,
        color: black,
      });
      y -= 20;
    }

    y -= 20;

    // Totals
    const totalsX = 380;
    page.drawLine({
      start: { x: totalsX, y: y + 10 },
      end: { x: width - margin, y: y + 10 },
      thickness: 1,
      color: rgb(0.8, 0.8, 0.8),
    });
    page.drawText('Zwischensumme:', { x: totalsX, y, size: 10, font: helvetica, color: gray });
    page.drawText(this.formatCurrency(invoice.subtotal, invoice.currency), {
      x: 480,
      y,
      size: 10,
      font: helvetica,
      color: gray,
    });
    y -= 15;
    page.drawText('MwSt. (19%):', { x: totalsX, y, size: 10, font: helvetica, color: gray });
    page.drawText(this.formatCurrency(invoice.tax, invoice.currency), {
      x: 480,
      y,
      size: 10,
      font: helvetica,
      color: gray,
    });
    y -= 20;
    page.drawLine({
      start: { x: totalsX, y: y + 10 },
      end: { x: width - margin, y: y + 10 },
      thickness: 2,
      color: black,
    });
    page.drawText('Gesamt:', { x: totalsX, y, size: 12, font: helveticaBold, color: black });
    page.drawText(this.formatCurrency(invoice.total, invoice.currency), {
      x: 480,
      y,
      size: 12,
      font: helveticaBold,
      color: black,
    });

    y -= 50;

    // Green Energy Certificate
    page.drawRectangle({
      x: margin,
      y: y - 60,
      width: width - 2 * margin,
      height: 70,
      color: rgb(0.9, 0.98, 0.9),
      borderColor: green,
      borderWidth: 1,
    });
    page.drawText('[ECO] Klimaneutrale Rechnung', {
      x: margin + 15,
      y: y - 20,
      size: 12,
      font: helveticaBold,
      color: green,
    });
    page.drawText(`Diese Services wurden mit 100% erneuerbarer Energie betrieben.`, {
      x: margin + 15,
      y: y - 38,
      size: 10,
      font: helvetica,
      color: gray,
    });
    page.drawText(`CO2-Einsparung: ${invoice.co2Saved} kg gegenueber herkoemmlichem Hosting`, {
      x: margin + 15,
      y: y - 52,
      size: 10,
      font: helveticaBold,
      color: green,
    });

    y -= 90;

    // Bank Details
    page.drawText('Bankverbindung:', { x: margin, y, size: 10, font: helveticaBold, color: black });
    y -= 15;
    page.drawText('Bank: Deutsche Bank', { x: margin, y, size: 9, font: helvetica, color: gray });
    y -= 12;
    page.drawText('IBAN: DE89 3704 0044 0532 0130 00', { x: margin, y, size: 9, font: helvetica, color: gray });
    y -= 12;
    page.drawText('BIC: COBADEFFXXX', { x: margin, y, size: 9, font: helvetica, color: gray });

    // Payment Note
    page.drawText('Hinweis:', { x: 300, y: y + 24, size: 10, font: helveticaBold, color: black });
    page.drawText(`Bitte geben Sie bei der Überweisung die`, { x: 300, y: y + 10, size: 9, font: helvetica, color: gray });
    page.drawText(`Rechnungsnummer ${invoice.number} als`, { x: 300, y: y - 2, size: 9, font: helvetica, color: gray });
    page.drawText(`Verwendungszweck an.`, { x: 300, y: y - 14, size: 9, font: helvetica, color: gray });

    const pdfBytes = await pdfDoc.save();
    return Buffer.from(pdfBytes);
  }

  private formatCurrency(amount: number, currency: string): string {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: currency,
    }).format(amount);
  }

  /**
   * Seed demo invoices for a user
   */
  async seedDemoInvoices(userEmail: string): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { email: userEmail },
      include: {
        workspaceMemberships: {
          include: { workspace: true },
        },
      },
    });

    if (!user || user.workspaceMemberships.length === 0) {
      console.log(`User ${userEmail} not found or has no workspaces`);
      return;
    }

    const workspaceId = user.workspaceMemberships[0].workspaceId;

    // Create demo invoices
    const demoInvoices = [
      {
        workspaceId,
        amount: 40.46,
        currency: 'eur',
        status: 'paid',
        paidAt: new Date('2026-02-05'),
        createdAt: new Date('2026-02-01'),
        dueDate: new Date('2026-02-15'),
      },
      {
        workspaceId,
        amount: 38.92,
        currency: 'eur',
        status: 'paid',
        paidAt: new Date('2026-01-10'),
        createdAt: new Date('2026-01-01'),
        dueDate: new Date('2026-01-15'),
      },
      {
        workspaceId,
        amount: 35.70,
        currency: 'eur',
        status: 'paid',
        paidAt: new Date('2025-12-12'),
        createdAt: new Date('2025-12-01'),
        dueDate: new Date('2025-12-15'),
      },
    ];

    for (const invoiceData of demoInvoices) {
      await this.prisma.invoice.create({
        data: invoiceData,
      });
    }

    console.log(`Created ${demoInvoices.length} demo invoices for ${userEmail}`);
  }
}
