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
        console.log("Checking if user has joined community" + userId + communityId);
        const communityMember = await prisma.communityMember.findUnique({
            where: {
                userId_communityId: {
                    userId,
                    communityId
                }
            }
        });

        console.log(communityMember);
        if(communityMember){
            return true;
        }
        return false;

    } catch(err){
        console.error("Error while checking if user has joined community", err);
        return false;
    }
}