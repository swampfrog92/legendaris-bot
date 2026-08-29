import {
  ButtonStyleTypes,
  InteractionResponseFlags,
  InteractionResponseType,
  InteractionType,
  MessageComponentTypes,
  verifyKeyMiddleware,
} from 'discord-interactions';

import { PrismaClient } from "./generated/prisma/client.js";

export async function createSeason(prisma, name, communityId){
    try{
        // Finds any active seasons and sets them to inactive
        await prisma.season.updateMany({ where: { communityId, isActive: true }, data: { isActive: false, endDate: new Date() } });
        const newSeason = await prisma.season.create({ data: { name, communityId, isActive: true, startDate: new Date() } });
        if (newSeason) return true;
        else return false;
        
    } catch(err){
        console.error("Error while creating season", err);
        return false;
    }
}

export async function getActiveSeason(prisma, communityId){
    try{
        const activeSeason = await prisma.season.findFirst({ where: { communityId, isActive: true } });
        return activeSeason;
    } catch(err){
        console.error("Error while getting active season", err);
        return null;
    }
}

export async function resetSeasonElo(prisma, communityId){
    try{
        await prisma.communityMember.updateMany({
            where: { communityId },
            data: { seasonElo: 1000, seasonWins: 0, seasonLosses: 0, seasonDraws: 0 }
        });
        return true;
    } catch(err){
        console.error("Error while resetting season Elo", err);
        return false;
    }
}

export async function createSeasonSnapshots(prisma, communityId){
    try{
        const activeSeason = await getActiveSeason(prisma, communityId);
        const community = await prisma.community.findMany({ where: { id: communityId}, inlcude: { members: true, }});

        if(activeSeason && community){
            community.members.map((member) => (
                await prisma.seasonSnapshot.create({
                    data: {
                        seasonId: activeSeason.id,
                        communityMemberId: member.id,
                        seasonElo: member.seasonElo
                    }
                })
            ));
        }

    }catch(err){
        console.error("Error while creating season snapshots", err);
    }
}
