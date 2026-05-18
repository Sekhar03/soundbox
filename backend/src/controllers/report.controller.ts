import { Request, Response } from 'express';
import prisma from '../config/db';
import ExcelJS from 'exceljs';

export const generateInventoryReport = async (req: Request, res: Response) => {
  try {
    const indents = await prisma.indent.findMany({
      include: {
        merchant: true,
        bank: true,
        courierPartner: true,
      }
    });

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Inventory Report');

    worksheet.columns = [
      { header: 'Merchant Name', key: 'merchantName', width: 20 },
      { header: 'Mobile', key: 'mobile', width: 15 },
      { header: 'Bank', key: 'bank', width: 15 },
      { header: 'Delivery Type', key: 'type', width: 15 },
      { header: 'Current Status', key: 'status', width: 20 },
      { header: 'Courier Partner', key: 'courier', width: 15 },
      { header: 'Indent Date', key: 'date', width: 20 },
    ];

    indents.forEach(indent => {
      worksheet.addRow({
        merchantName: indent.merchant.name,
        mobile: indent.merchant.mobile,
        bank: indent.bank.name,
        type: indent.deliveryType,
        status: indent.currentStatus,
        courier: indent.courierPartner?.name || 'N/A',
        date: indent.indentDate.toLocaleString(),
      });
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=inventory_report.xlsx');

    await workbook.xlsx.write(res);
    res.status(200).end();
  } catch (error) {
    console.error('Error generating report:', error);
    res.status(500).json({ message: 'Error generating report' });
  }
};
