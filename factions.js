import { PrismaClient } from "./generated/prisma/client.js";

export const prisma = new PrismaClient();

export async function createFactionChoices(){
    const factions = (await prisma.faction.findMany({
        select: {
            id: true,
            name: true
        }
    })).map(val => ({value: val.id, name: val.name}));

    return factions;
}