import {
  ButtonStyleTypes,
  InteractionResponseFlags,
  InteractionResponseType,
  InteractionType,
  MessageComponentTypes,
  verifyKeyMiddleware,
} from 'discord-interactions';

import { PrismaClient } from "./generated/prisma/client.js";

export async function ifJoined(prisma, userId, communityId){
    try{
        const communityMember = await prisma.communityMember.findUnique({
            where: {
                userId_communityId: {
                    userId,
                    communityId
                }
            }
        });

        if(communityMember){
            return true;
        }
        return false;
        
    } catch(err){
        return false;
        console.error("Error while checking if user has joined community", err);
    }
}