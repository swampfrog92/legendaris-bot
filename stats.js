import {
  ButtonStyleTypes,
  InteractionResponseFlags,
  InteractionResponseType,
  InteractionType,
  MessageComponentTypes,
  verifyKeyMiddleware,
} from 'discord-interactions';

import { PrismaClient } from "./generated/prisma/client.js";
import { getChapter } from './chapter.js';

export async function getFactionStats(res, req, prisma){
    try{
        const communityId = (await getChapter(req, prisma));
        console.log(communityId);
        const userId = (await prisma.user.findUnique({ where: { discordId: req.body.member?.user?.id ?? req.body.user?.id }, select: { id: true } }))?.id;
        console.log(userId);
        const communityMember = (await prisma.communityMember.findUnique({ where: { userId_communityId: { userId, communityId } }, select: { id: true } }));
        console.log(communityMember);
        const factionStats = (await prisma.playerFaction.findMany({ where: { communityMemberId: communityMember.id }, include: { faction: true } }));
        console.log(factionStats);

        let msg = "Your faction stats: \n\n";

        for (let i = 0; i < factionStats.length; i++) {
            msg += factionStats[i].faction.name + ": " + factionStats[i].lifetimeElo + " Elo " + factionStats[i].lifetimeWins + "/" + factionStats[i].lifetimeLosses + "/" + factionStats[i].lifetimeDraws + "\n";
        }

        return msg;

    } catch(err){
        console.error("Error while retrieving Faction Stats", err);
    }
}

// Takes one argument--the member of the community being requested. 
export async function getRecord(member){
    const wins = member.lifetimeWins;
    const losses = member.lifetimeLosses;
    const draws = member.lifetimeDraws;

    return wins + '/' + losses + '/' + draws;
}