import cron from 'node-cron';
import prisma from '../config/db';
import nodemailer from 'nodemailer';
import ExcelJS from 'exceljs';

export const setupCronJobs = () => {
  // Run every day at 10:00 AM
  cron.schedule('0 10 * * *', async () => {
    console.log('Running daily inventory report cron job...');
    
    try {
      const indents = await prisma.indent.findMany({
        include: {
          merchant: true,
          bank: true,
        }
      });

      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Daily Report');
      
      worksheet.columns = [
        { header: 'Merchant', key: 'merchant', width: 20 },
        { header: 'Bank', key: 'bank', width: 15 },
        { header: 'Status', key: 'status', width: 20 },
        { header: 'Date', key: 'date', width: 15 },
      ];

      indents.forEach(indent => {
        worksheet.addRow({
          merchant: indent.merchant.name,
          bank: indent.bank.name,
          status: indent.currentStatus,
          date: indent.indentDate.toLocaleDateString(),
        });
      });

      const buffer = await workbook.xlsx.writeBuffer();

      // Configure your email transporter here
      const transporter = nodemailer.createTransport({
        host: process.env.EMAIL_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.EMAIL_PORT || '587'),
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS,
        },
      });

      await transporter.sendMail({
        from: '"Sound Box System" <no-reply@soundbox.com>',
        to: process.env.REPORT_RECIPIENTS || 'manager@soundbox.com',
        subject: `Daily Inventory Report - ${new Date().toLocaleDateString()}`,
        text: 'Please find the attached daily inventory report.',
        attachments: [
          {
            filename: 'daily_report.xlsx',
            content: buffer as any,
          },
        ],
      });

      console.log('Daily report email sent successfully');
    } catch (error) {
      console.error('Error in daily report cron job:', error);
    }
  });
};
