import { Request, Response } from 'express';
import prisma from '../config/db';

export const getIndents = async (req: Request, res: Response) => {
  try {
    const { bankId, status, search } = req.query;

    const where: any = {
      deliveryStatus: { not: 'RTO_DELIVERED' }
    };
    if (bankId) where.bankId = bankId as string;
    if (status) where.currentStatus = status as string;
    if (search) {
      where.OR = [
        { merchant: { name: { contains: search as string } } },
        { merchant: { mobile: { contains: search as string } } },
      ];
    }

    const indents = await prisma.indent.findMany({
      where,
      include: {
        merchant: true,
        bank: true,
        courierPartner: true,
        callingLogs: { orderBy: { attemptDate: 'desc' }, take: 1 },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(indents);
  } catch (error) {
    console.error('Error fetching indents:', error);
    res.status(500).json({ message: 'Error fetching indents' });
  }
};

export const createIndent = async (req: Request, res: Response) => {
  const { 
    merchantName, 
    mobile, 
    bankId, 
    deliveryType, 
    remarks 
  } = req.body;

  try {
    const result = await prisma.$transaction(async (tx) => {
      // 1. Create Merchant
      const merchant = await tx.merchant.create({
        data: {
          name: merchantName,
          mobile: mobile,
        },
      });

      // 2. Create Indent
      const indent = await tx.indent.create({
        data: {
          merchantId: merchant.id,
          bankId,
          deliveryType,
          remarks,
          currentStatus: 'PENDING',
        },
      });

      return indent;
    });

    res.status(201).json(result);
  } catch (error) {
    console.error('Error creating indent:', error);
    res.status(500).json({ message: 'Error creating indent' });
  }
};

export const updateIndentStatus = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { 
    type, // 'CALLING', 'MAPPING', 'DELIVERY', 'INSTALLATION', 'ACTIVATION'
    status, 
    remarks,
    courierPartnerId,
    agentName
  } = req.body;

  try {
    const updateData: any = { updatedAt: new Date() };
    
    if (type === 'CALLING') {
      updateData.merchantAcceptDeny = status;
      updateData.currentStatus = `CALLING_${status}`;
      await prisma.callingLog.create({
        data: { indentId: id, status, remarks }
      });
    } else if (type === 'MAPPING') {
      updateData.mappingStatus = status;
      updateData.currentStatus = `MAPPING_${status}`;
      await prisma.mappingLog.create({
        data: { indentId: id, remarks }
      });
    } else if (type === 'DELIVERY') {
      updateData.deliveryStatus = status;
      updateData.currentStatus = `DELIVERY_${status}`;
      if (courierPartnerId) updateData.courierPartnerId = courierPartnerId;
      
      // Bank-specific logic: Canara Bank
      const indent = await prisma.indent.findUnique({ 
        where: { id },
        include: { bank: true }
      });
      if (indent?.bank.name === 'Canara Bank' && status === 'DELIVERED') {
        updateData.installationStatus = 'INSTALLED';
        updateData.currentStatus = 'INSTALLED';
      }

      await prisma.deliveryLog.create({
        data: { indentId: id, status, remarks }
      });
    } else if (type === 'INSTALLATION') {
      const indent = await prisma.indent.findUnique({ 
        where: { id },
        include: { bank: true }
      });

      if (status === 'INSTALLED') {
        if (indent?.bank.name === 'Bank of Baroda' && !(indent as any).jobSheetUploaded) {
          return res.status(400).json({ message: 'Installation cannot be completed without Job Sheet for Bank of Baroda' });
        }
        if (indent?.bank.name === 'CBoI' && !(indent as any).firstTransactionDate) {
          return res.status(400).json({ message: 'Installation cannot be completed without First Transaction for CBoI' });
        }
      }

      updateData.installationStatus = status;
      updateData.currentStatus = status === 'INSTALLED' ? 'INSTALLED' : `INSTALLATION_${status}`;
      if (agentName) updateData.agentName = agentName;
    } else if (type === 'ACTIVATION') {
      updateData.activationStatus = status;
      updateData.currentStatus = `ACTIVATION_${status}`;
    }

    const updatedIndent = await prisma.indent.update({
      where: { id },
      data: updateData,
    });

    res.json(updatedIndent);
  } catch (error) {
    console.error('Error updating indent status:', error);
    res.status(500).json({ message: 'Error updating indent status' });
  }
};

export const getIndentById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const indent = await prisma.indent.findUnique({
      where: { id },
      include: {
        merchant: true,
        bank: true,
        courierPartner: true,
        callingLogs: true,
        mappingLogs: true,
        deliveryLogs: true,
      },
    });

    if (!indent) {
      return res.status(404).json({ message: 'Indent not found' });
    }

    res.json(indent);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching indent details' });
  }
};
