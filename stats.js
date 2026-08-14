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
import { errorFactionStatsMessage } from './text.js';

export async function getFactionStats(res, req, prisma){
    try{
        const communityId = (await getChapter(req, prisma));
        const userId = (await prisma.user.findUnique({ where: { discordId: req.body.member?.user?.id ?? req.body.user?.id }, select: { id: true } }))?.id;
        const communityMember = (await prisma.communityMember.findUnique({ where: { userId_communityId: { userId, communityId } }, select: { id: true } }));
        const factionStats = (await prisma.playerFaction.findMany({ where: { communityMemberId: communityMember.id }, include: { faction: true } }));

        let msg = "*** Your faction stats: *** \n\n";

        for (let i = 0; i < factionStats.length; i++) {
            msg += "* " + factionStats[i].faction.name + ": " + factionStats[i].lifetimeElo + " Elo " + factionStats[i].lifetimeWins + "/" + factionStats[i].lifetimeLosses + "/" + factionStats[i].lifetimeDraws + "\n";
        }

        return msg;

    } catch(err){
        return errorFactionStatsMessage;
        console.error("Error while retrieving Faction Stats", err);
    }
}

export async function getSeasonStats(res, req, prisma){
    try{
        const communityId = (await getChapter(req, prisma));
        const userId = (await prisma.user.findUnique({ where: { discordId: req.body.member?.user?.id ?? req.body.user?.id }, select: { id: true } }))?.id;
        const communityMember = (await prisma.communityMember.findUnique({ where: { userId_communityId: { userId, communityId } }, select: { seasonElo: true, seasonWins: true, seasonLosses: true, seasonDraws: true } }));

        let msg = "\\*\\*\\* Your season stats: \\*\\*\\* \n\n";
        msg += "Your current Elo is " + communityMember.seasonElo + ".\n";
        msg += "Your record is " + communityMember.seasonWins + "/" + communityMember.seasonLosses + "/" + communityMember.seasonDraws + "\n";

        return msg;
    } catch(err){
        console.error("Error while retrieving Season Stats", err);
    }
}

// Takes one argument--the member of the community being requested. 
export function getRecord(member){
    const wins = member.seasonWins;
    const losses = member.seasonLosses;
    const draws = member.seasonDraws;

    return wins + '/' + losses + '/' + draws;
}