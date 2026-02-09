import { Test, TestingModule } from '@nestjs/testing';
import { InvoicesController } from '../invoices.controller';
import { InvoicesService } from '../invoices.service';
import { Response } from 'express';

describe('InvoicesController', () => {
  let controller: InvoicesController;
  let invoicesService: jest.Mocked<InvoicesService>;

  const mockInvoice = {
    id: 'invoice-123',
    workspaceId: 'workspace-123',
    amount: 9900,
    currency: 'USD',
    status: 'PAID',
    number: 'INV-2024-001',
    periodStart: new Date(),
    periodEnd: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const mockInvoicesService = {
      findAllForUser: jest.fn(),
      findOne: jest.fn(),
      generatePdf: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [InvoicesController],
      providers: [
        { provide: InvoicesService, useValue: mockInvoicesService },
      ],
    }).compile();

    controller = module.get<InvoicesController>(InvoicesController);
    invoicesService = module.get(InvoicesService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findAll', () => {
    it('should return all invoices for a user', async () => {
      invoicesService.findAllForUser.mockResolvedValue([mockInvoice] as any);

      const result = await controller.findAll({ user: { id: 'user-123' } });

      expect(result).toHaveLength(1);
      expect(invoicesService.findAllForUser).toHaveBeenCalledWith('user-123');
    });
  });

  describe('findOne', () => {
    it('should return an invoice by id', async () => {
      invoicesService.findOne.mockResolvedValue(mockInvoice as any);

      const result = await controller.findOne(
        { user: { id: 'user-123' } },
        'invoice-123',
      );

      expect(result).toEqual(mockInvoice);
      expect(invoicesService.findOne).toHaveBeenCalledWith('user-123', 'invoice-123');
    });
  });

  describe('downloadPdf', () => {
    it('should return a PDF file', async () => {
      const mockPdf = Buffer.from('PDF content');
      invoicesService.generatePdf.mockResolvedValue(mockPdf);
      invoicesService.findOne.mockResolvedValue(mockInvoice as any);

      const mockRes = {
        set: jest.fn(),
        status: jest.fn().mockReturnThis(),
        send: jest.fn(),
      } as unknown as Response;

      await controller.downloadPdf(
        { user: { id: 'user-123' } },
        'invoice-123',
        mockRes,
      );

      expect(mockRes.set).toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.send).toHaveBeenCalledWith(mockPdf);
      expect(invoicesService.generatePdf).toHaveBeenCalledWith('user-123', 'invoice-123');
    });
  });
});
