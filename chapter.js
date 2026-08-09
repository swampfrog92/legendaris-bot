import {
  ButtonStyleTypes,
  InteractionResponseFlags,
  InteractionResponseType,
  InteractionType,
  MessageComponentTypes,
  verifyKeyMiddleware,
} from 'discord-interactions';

import { PrismaClient } from "./generated/prisma/client.js";

// Takes one argument--the request object from the discord interaction. Returns the communityId of the chapter that the interaction was sent from.
export async function getChapter(req, prisma){
    try{
        const discordId = req.body.guild_id;

        const communityId = (await prisma.discordChapter.findUnique({
            where:{
                id: discordId
            },
            select: {
                communityId: true
            }
        })).communityId;

        return communityId;
    } catch(err){
        console.error("Error while retrieving CommunityId", error);
    }
}