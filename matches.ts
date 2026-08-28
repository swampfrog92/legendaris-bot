import {
  ButtonStyleTypes,
  InteractionResponseFlags,
  InteractionResponseType,
  InteractionType,
  MessageComponentTypes,
  verifyKeyMiddleware,
} from 'discord-interactions';

import { PrismaClient } from "./generated/prisma/client.js";

export async function findRecentMatchesForDisplay(prisma: PrismaClient, userId: string): Promise<string> {
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
            take: 5
        });

        for(let i = 0; i < matches.length; i++){
            msg += `${i + 1}. <@${matches[i].playerOne.discordId}> vs <@${matches[i].playerTwo.discordId}>\n`;
        }
        return msg;
    } catch(err){
        console.log("Error while finding recent matches", err);
        return "Error while finding recent match history. Please contact our support team if problem persists";
    }

}