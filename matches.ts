import {
  ButtonStyleTypes,
  InteractionResponseFlags,
  InteractionResponseType,
  InteractionType,
  MessageComponentTypes,
  verifyKeyMiddleware,
} from 'discord-interactions';

import { PrismaClient } from "./generated/prisma/client.js";
import { findUserIdFromDiscordId } from "./search.js";

export async function findRecentMatchesForDisplay(prisma: PrismaClient, userId: string, numMatches: number): Promise<string> {
    try{
        let msg = "";
        const matches = await prisma.match.findMany({
            where: {
                OR: [
                    {playerOneId: userId},
                    {playerTwoId: userId}
                ]
            },
            include: {
                playerOne: true,
                playerTwo: true,
            },
            orderBy: {
                createdAt: 'desc'
            },
            take: numMatches
        });

        console.log(matches);
        for(let i = 0; i < matches.length; i++){
            msg += `${i + 1}. <@${matches[i]!.playerOne.discordId}> vs <@${matches[i]!.playerTwo.discordId}>\n\n` +
                   `Played on: ${matches[i]!.createdAt.toLocaleDateString()}\n\n` +
                   `Winner: ` + (matches[i]!.winnerId === matches[i]!.playerOne.id ? `<@${matches[i]!.playerOne.discordId}>` : matches[i]!.winnerId === matches[i]!.playerTwo.id ? `<@${matches[i]!.playerTwo.discordId}>` : "It's a draw!") + `\n` + 
                   `--------------------\n\n`;
        }
        return msg;
    } catch(err){
        console.log("Error while finding recent matches", err);
        return "Error while finding recent match history. Please contact our support team if problem persists";
    }

}

export async function setMatchAsDisputed(prisma: PrismaClient, matchId: string, note: string): Promise<boolean> {
    try{
        await prisma.match.update({
            where: {
                id: matchId
            },
            data: {
                status: "DISPUTED",
                disputeReason: note
            }
        });
        return true;
    } catch(err){
        console.log("Error while setting match as disputed", err);
        return false;
    }
}

export async function findRecentMatchesForAutocomplete(req: any, res: any, prisma: PrismaClient) {

    const focused = req.body.data.options.find((option: { name: string; value: string; focused?: boolean }) => option.focused);
    const userId = await findUserIdFromDiscordId(prisma, req.body.member?.user?.id ?? req.body.user?.id);

    const matches = await prisma.match.findMany({
        where: {
            OR: [
                {playerOneId: userId},
                {playerTwoId: userId}
            ]
        },
        select: {
            playerOneId: true,
            playerTwoId: true,
            createdAt: true,
            id: true
        },
        take: 25
    });

    return res.send({
        type: 8,
        data: {
            choices: matches.map(match => ({
                name: `<@${match.playerOneId}> vs <@${match.playerTwoId}> on ${match.createdAt.toLocaleDateString()}`,
                value: match.id
            }))
        }
    });
}