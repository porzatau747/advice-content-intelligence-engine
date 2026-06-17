import { PrismaClient } from "../generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import path from "path";

const globalForPrisma = global as unknown as { prisma: PrismaClient | undefined };

// Resolve db path. Needs file: prefix for PrismaBetterSqlite3 adapter
const dbPath = "file:" + path.join(process.cwd(), "prisma", "dev.db");

let prismaInstance: PrismaClient;

if (process.env.NODE_ENV === "production") {
  const adapter = new PrismaBetterSqlite3({ url: dbPath });
  prismaInstance = new PrismaClient({ adapter });
} else {
  if (!globalForPrisma.prisma) {
    const adapter = new PrismaBetterSqlite3({ url: dbPath });
    globalForPrisma.prisma = new PrismaClient({ adapter });
  }
  prismaInstance = globalForPrisma.prisma;
}

export const prisma = prismaInstance;
export default prisma;
