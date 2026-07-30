import { PrismaClient } from "./generated/prisma/client.js";

export const prisma = new PrismaClient();

export const factionChoices = [
        {
          name: 'Space Marines',
          value: 'SM',
        },
        {
          name: 'Orks',
          value: 'OK',
        },
        {
          name: 'Adeptus Mechanicus',
          value: 'AM',
        },
        {
          name: 'Imperial Guard',
          value: 'IG',
        },
        {
          name: 'Sisters of Battle',
          value: 'SB',
        },
        {
          name: 'Necrons',
          value: 'NC',
        },
        {
          name: 'Chaos Space Marines',
          value: 'CM',
        },
        {
          name: 'Thousand Sons',
          value: 'TS',
        },
]

export async function createFactionChoices(){
    const factions = (await prisma.faction.findMany({
        select: {
            id: true,
            name: true
        }
    }).map(val => ({value: val.id, name: val.name})));

    return factions;
}