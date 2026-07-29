import 'dotenv/config';
import express from 'express';
import {
  ButtonStyleTypes,
  InteractionResponseFlags,
  InteractionResponseType,
  InteractionType,
  MessageComponentTypes,
  verifyKeyMiddleware,
} from 'discord-interactions';
import { getRandomEmoji, DiscordRequest } from './utils.js';
import { Client, GatewayIntentBits } from 'discord.js';
import { Pool } from 'pg';
import { faction_id } from './utils.js';
import { slugify } from './utils.js';

import { PrismaClient } from "./generated/prisma/client.js";

export const prisma = new PrismaClient();

const app = express();

const PORT = process.env.PORT || 3000

  const client = new Client({
  intents: [GatewayIntentBits.Guilds],
  });

  client.login(process.env.DISCORD_TOKEN);

  client.once('ready', () => {
  console.log('Logged in: ${client.user.tag}');
});

client.on('error', (err) => console.error('Client error:', err));
client.on('shardError', (err) => console.error('Shard error:', err));

client.login(process.env.DISCORD_TOKEN)
  .then(() => console.log('login() resolved'))
  .catch((err) => console.error('Login failed: ', err));

app.post('/interactions', verifyKeyMiddleware(process.env.PUBLIC_KEY), async function (req, res) {

  const { id, type, data } = req.body;

  if (type === InteractionType.PING) {
    return res.send({ type: InteractionResponseType.PONG });
  }

  if (type === InteractionType.APPLICATION_COMMAND) {
    const { name } = data;
    const userId = req.body.member?.user?.id ?? req.body.user?.id;

    if (name === 'help') {
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
        else if (name === 'info') {
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
else if (name === 'rank') {
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
else if (name === 'create_chapter'){
  const chapterName = req.body.data.options?.find(opt => opt.name === 'chapter_name')?.value;
  try{
    await prisma.community.create({
      data: {
        name: chapterName,
        slug: slugify(chapterName),
        gameSystemId: 1,

      }
    });
  } catch (err){
  console.error('Database error while creating chapter: ', err);
  }
} 

else if (name === 'notify') {

  try {

    const user = await client.users.fetch(userId, {force:true});
    await user.send('This is a DM from the bot!');

    return res.send({
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      flags: InteractionResponseFlags.IS_COMPONENTS_V2 | InteractionResponseFlags.EPHEMERAL,
      data: {
        content: 'Check your DMs!',
      },
    });
  } catch (err) {
    console.error('Failed to send DM:', err);
    return res.send({
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: {
        flags: InteractionResponseFlags.EPHEMERAL,
        content: "I couldn't DM you — you might have DMs disabled for this server.",
      },
    });
  }
}

else if (name === 'results') {
  const oppUserId = req.body.data.options?.find(opt => opt.name === 'opponent')?.value;
  const yourVP = req.body.data.options?.find(opt => opt.name === 'your_vp')?.value;
  const oppVP = req.body.data.options?.find(opt => opt.name === 'opponent_vp')?.value;
  const yourFaction = req.body.data.options?.find(opt => opt.name === 'faction')?.value;
  const oppFaction = req.body.data.options?.find(opt => opt.name === 'opponent_faction')?.value;
  const victoryMessage = yourVP > oppVP ? userId : yourVP < oppVP ? oppUserId : `It's a tie!`;

  // Determines the winner. In case of a tie, '-1'
  const winner = yourVP > oppVP ? userId : oppVP > yourVP ? oppUserId : '-1';

  try{
    // Searches the database to find the unique ID of the player
      const userDbId = (await prisma.user.findUnique({
      where: {
        discordId: userId
      },
      select: {
        id: true
      }
    }))?.id;

    // Searches the database to find the unique ID of the opponent
    const oppUserDbId = (await prisma.user.findUnique({
      where: {
        discordId: oppUserId
      },
      select: {
        id: true
      }
    }))?.id;

    // Searches the database to find the unique ID of the winner. If no winner is found, it is submitted as '-1'
    const winnerDbId = (await prisma.user.findUnique({
      where: {
        discordId: winner
      },
      select: {
        id: true
      }
    }))?.id ?? '-1';    

    // submit to DB
    await prisma.match.create({
      data: {
        gameSystemId: '1',
        submittedById: userDbId,
        playerOneId: userDbId,
        playerTwoId: oppUserDbId,
        winnerId: winnerDbId,
        playerOneFactionId: yourFaction,
        playerTwoFactionId: oppFaction,
        playedAt: new Date(),
      }
    });

    // Upon success, display the results on the guild server. 
    return res.send({
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: {
        flags: InteractionResponseFlags.IS_COMPONENTS_V2,
        components: [
          {
            type: MessageComponentTypes.TEXT_DISPLAY,
            content: `This will display the result: <@${userId}> - ${yourVP} --- <@${oppUserId}> - ${oppVP}. The winner is: <@${victoryMessage}>`
          }
        ]
      },
    });
  } catch (err){
    console.error('Database error while submitting results: ', err);
    return res.send({
      type: InteractionResponseFlags.CHANNEL_MESSAGE_WITH_SOURCE,
      data: {
        flags: InteractionResponseFlags.IS_COMPONENTS_V2,
        components: [
          {
            type: MessageComponentTypes.TEXT_DISPLAY,
            content: 'Error while submitting your results. Please try again later. Contact support team if problem persists.'
          }
        ]
      }
    })
  }
}

    console.error(`unknown command: ${name}`);
    return res.status(400).json({ error: 'unknown command' });
  }

  console.error('unknown interaction type', type);
  return res.status(400).json({ error: 'unknown interaction type' });
});

app.listen(PORT, () => {
  console.log('Listening on port', PORT);
});
