import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function clearDatabase() {
  try {
    console.log('Clearing database...');
    
    // Delete all data in reverse order of dependencies
    await prisma.session.deleteMany();
    await prisma.verificationCode.deleteMany();
    await prisma.reaction.deleteMany();
    await prisma.track.deleteMany();
    await prisma.user.deleteMany();
    await prisma.member.deleteMany();
    
    console.log('Database cleared successfully!');
  } catch (error) {
    console.error('Error clearing database:', error);
  } finally {
    await prisma.$disconnect();
  }
}

clearDatabase();
