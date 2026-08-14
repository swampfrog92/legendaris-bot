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

export async function factionAutocomplete(req, res) {
    const focused = req.body.data.options.find(option => option.focused);

    const factions = await prisma.faction.findMany({
        where: {
            name: {
                contains: focused.value,
                mode: "insensitive"
            }
        },
        select: {
            id: true,
            name: true
        },
        take: 25
    });

    return res.send({
        type: 8,
        data: {
            choices: factions.map(faction => ({
                name: faction.name,
                value: faction.id
            }))
        }
    });
}

export async function ifValidFaction(factionId) {
    try{
        const faction = await prisma.faction.findUnique({
            where: {
                id: factionId
                }
        });
        if (faction) {
            return true;
        }
        return false;
    } catch (error) {
        console.error(error);
        return false;
    }
}