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
        const userId = (await prisma.user.findUnique({ where: { discordId: req.body.member?.user?.id ?? req.body.user?.id }, select: { id: true } }))?.id;
        const communityMemberId = await prisma.communityMember.findUnique({ where: { communityId_userId: { communityId, userId } }, select: { id: true } });
        const factionStats = await prisma.playerFaction.findMany({ where: { communityMemberId: communityMemberId.id } });

        let msg = "Your faction stats: \n\n";

        for (let i = 0; i < factionStats.length; i++) {
            msg += factionStats[i].faction.name + ": " + factionStats[i].lifetimeElo + " ELO\n";
        }

        return msg;
        
    } catch(err){
        console.error("Error while retrieving Faction Stats", error);
    }
}