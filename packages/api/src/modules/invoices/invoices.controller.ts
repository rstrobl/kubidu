import {
  Controller,
  Get,
  Param,
  Req,
  Res,
  UseGuards,
  HttpStatus,
  Query,
} from '@nestjs/common';
import { Response } from 'express';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { InvoicesService } from './invoices.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('invoices')
@Controller('invoices')
export class InvoicesController {
  constructor(private readonly invoicesService: InvoicesService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all invoices for the current user' })
  @ApiResponse({ status: 200, description: 'List of invoices' })
  async findAll(@Req() req) {
    return this.invoicesService.findAllForUser(req.user.id);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get invoice details' })
  @ApiResponse({ status: 200, description: 'Invoice details' })
  async findOne(@Req() req, @Param('id') id: string) {
    return this.invoicesService.findOne(req.user.id, id);
  }

  @Get(':id/pdf')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Download invoice as PDF' })
  @ApiResponse({ status: 200, description: 'PDF file' })
  @ApiQuery({ name: 'token', required: false, description: 'JWT token for direct download links' })
  async downloadPdf(
    @Req() req,
    @Param('id') id: string,
    @Res() res: Response,
  ) {
    const pdfBuffer = await this.invoicesService.generatePdf(req.user.id, id);
    const invoice = await this.invoicesService.findOne(req.user.id, id);

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${invoice.number}.pdf"`,
      'Content-Length': pdfBuffer.length,
    });

    res.status(HttpStatus.OK).send(pdfBuffer);
  }
}
