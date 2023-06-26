const { PrismaClient } = require('@prisma/client')
const debug = require('debug')('app:server')

const prisma = new PrismaClient();

async function initPrisma() {
    await prisma.$connect().then(() => {
        debug("Prisma connected successfully!");
    }).catch(async (e) => {
        appLog.error(e);
        await prisma.$disconnect();
        process.exit(1);
    });
}

module.exports = {
    initPrisma,
    prisma
}