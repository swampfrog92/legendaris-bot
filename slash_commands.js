import { PrismaClient } from "./generated/prisma/client.js";
import 'dotenv/config';
import {
  ButtonStyleTypes,
  InteractionResponseFlags,
  InteractionResponseType,
  InteractionType,
  MessageComponentTypes,
  verifyKeyMiddleware,
} from 'discord-interactions';
export const prisma = new PrismaClient();

export function rank_request(res) {
    return res.send({
    type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
    data: {
      flags: InteractionResponseFlags.IS_COMPONENTS_V2 | InteractionResponseFlags.EPHEMERAL,
      components: [
        {
          type: MessageComponentTypes.TEXT_DISPLAY,
          content: `This will display the user's rank for: ${userId}`
        }
      ]
    },
  });
}

export async function create_chapter_request(res, req){
      const chapterName = req.body.data.options?.find(opt => opt.name === 'name')?.value;
  try{
    await prisma.community.create({
      data: {
        name: chapterName,
        slug: slugify(chapterName),
        gameSystemId: '1',

      }
    });
    return res.send({
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      flags: InteractionResponseFlags.IS_COMPONENTS_V2,
      data: {
        content: 'Chapter created!',
      },
    });
  } catch (err){
  console.error('Database error while creating chapter: ', err);
  return res.send({
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      flags: InteractionResponseFlags.IS_COMPONENTS_V2,
      data: {
        content: 'Error while creating chapter. Please try again later. Contact support team if problem persists.',
      },
    });
  
  }
}

export function info_request(res) {
    return res.send({
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
        flags: InteractionResponseFlags.IS_COMPONENTS_V2 | InteractionResponseFlags.EPHEMERAL,
          components: [
            {
              type: MessageComponentTypes.TEXT_DISPLAY,
              content: `This will be a message explaining the information regarding the league status`
            }
          ]
        },
    });
}

export function help_request(res) {
    
    return res.send({
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
        flags: InteractionResponseFlags.IS_COMPONENTS_V2 | InteractionResponseFlags.EPHEMERAL,
          components: [
            {
              type: MessageComponentTypes.TEXT_DISPLAY,
              content: `This will be a message explaining the instructions on how to use this bot.`
            }
          ]
        },
    });
}