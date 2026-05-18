import app from './app';
import { PrismaClient } from '@prisma/client';
import { setupCronJobs } from './services/cron.service';

const prisma = new PrismaClient();
const PORT = process.env.PORT || 5000;

async function main() {
  try {
    await prisma.$connect();
    console.log('Connected to PostgreSQL Database via Prisma');
    
    setupCronJobs();

    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to connect to the database:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
