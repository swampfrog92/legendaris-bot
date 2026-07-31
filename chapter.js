import {
  ButtonStyleTypes,
  InteractionResponseFlags,
  InteractionResponseType,
  InteractionType,
  MessageComponentTypes,
  verifyKeyMiddleware,
} from 'discord-interactions';

import { PrismaClient } from "./generated/prisma/client.js";

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
        }))?.communityId;

        return communityId;
    } catch(err){
        console.error("Error while retrieving CommunityId", error);
    }
}