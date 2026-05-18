import { Request, Response } from 'express';
import prisma from '../config/db';
import ExcelJS from 'exceljs';
import path from 'path';
import fs from 'fs';

export const bulkUploadIndents = async (req: Request, res: Response) => {
  if (!req.file) {
    return res.status(400).json({ message: 'No file uploaded' });
  }

  const { bankId } = req.body;
  if (!bankId) {
    return res.status(400).json({ message: 'Bank ID is required' });
  }

  try {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(req.file.path);
    const worksheet = workbook.getWorksheet(1);

    if (!worksheet) {
      return res.status(400).json({ message: 'Invalid excel file' });
    }

    const indentsToCreate: any[] = [];
    
    // Assuming columns: Merchant Name, Mobile, Delivery Type (CAPEX/OPEX), Remarks
    worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
      if (rowNumber === 1) return; // Skip header

      const merchantName = row.getCell(1).text;
      const mobile = row.getCell(2).text;
      const deliveryType = row.getCell(3).text.toUpperCase() as 'CAPEX' | 'OPEX';
      const remarks = row.getCell(4).text;

      if (merchantName && mobile && (deliveryType === 'CAPEX' || deliveryType === 'OPEX')) {
        indentsToCreate.push({
          merchantName,
          mobile,
          deliveryType,
          remarks
        });
      }
    });

    // Process in transaction
    const results = await prisma.$transaction(async (tx) => {
      const createdIndents = [];
      for (const data of indentsToCreate) {
        const merchant = await tx.merchant.create({
          data: {
            name: data.merchantName,
            mobile: data.mobile,
          }
        });

        const indent = await tx.indent.create({
          data: {
            merchantId: merchant.id,
            bankId,
            deliveryType: data.deliveryType,
            remarks: data.remarks,
            currentStatus: 'PENDING'
          }
        });
        createdIndents.push(indent);
      }
      return createdIndents;
    });

    // Clean up uploaded file
    fs.unlinkSync(req.file.path);

    res.json({
      message: `Successfully uploaded ${results.length} indents`,
      count: results.length
    });
  } catch (error) {
    console.error('Error in bulk upload:', error);
    if (req.file) fs.unlinkSync(req.file.path);
    res.status(500).json({ message: 'Error processing bulk upload' });
  }
};
