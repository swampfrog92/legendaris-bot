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
import { adjustEloForVictory, adjustEloForDefeat, adjustEloForTie, sortLeaderboard } from './elo.js';
import { notify_user_of_match } from './messages.js';

export const prisma = new PrismaClient();

export async function rank_request(res) {

    try{
        let community = await prisma.community.findUnique({
            where: {
                id: 'cms6g007x0001lo0psadsm3w7',
            },
            select: {
                members: {
                    select: {
                        displayName: true,
                        lifetimeElo: true
                    }
                }
            }
        });

        community = sortLeaderboard(community);
        const userRank = findRank(community, req.body.member?.user?.username ?? req.body.user?.username) ?? 'Cannot find username';


        return res.send({
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            flags: InteractionResponseFlags.IS_COMPONENTS_V2,
            data: {
            content: 'Your current rank is ${userRank}',
        },
        });
    } catch (err){
        console.error('Database error while fetching rank: ', err);
    }
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

export async function results_request(res, req, client) {
    const userId = req.body.member?.user?.id ?? req.body.user?.id;
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
        const userDbId = (await prisma.user.findUnique({ where: { discordId: userId }, select: { id: true }}))?.id;

        // Searches the database to find the unique ID of the opponent
        const oppUserDbId = (await prisma.user.findUnique({ where: { discordId: oppUserId},select: {id: true}}))?.id;

        // Searches the database to find the unique ID of the winner. If no winner is found, it is submitted as '-1'
        const winnerDbId = (await prisma.user.findUnique({where: { discordId: winner }, select: { id: true }}))?.id ?? '-1';    

        // submit to DB
        const matchId = (await prisma.match.create({
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
        }))?.id;

        // Community ID is hardcoded for testing purposes.
        const playerOne = (await prisma.communityMember.findFirst({ where: { userId: userDbId, communityId: 'cms6g007x0001lo0psadsm3w7'}}));
        const playerTwo = (await prisma.communityMember.findFirst({where: {userId: oppUserDbId, communityId: 'cms6g007x0001lo0psadsm3w7'}}));

        const playerOneNewElo = yourVP > oppVP ? adjustEloForVictory(playerOne, playerTwo) : yourVP < oppVP ? adjustEloForDefeat(playerOne, playerTwo) : adjustEloForTie(playerOne, playerTwo);
        const playerTwoNewElo = yourVP < oppVP ? adjustEloForVictory(playerTwo, playerOne) : yourVP > oppVP ? adjustEloForDefeat(playerTwo, playerOne) : adjustEloForTie(playerTwo, playerOne);
        await prisma.matchCommunity.create({
            data: {
                matchId: matchId,
                communityId: 'cms6g007x0001lo0psadsm3w7', // Hardcoded for testing purposes
                playerOneEloBefore: playerOne.lifetimeElo,
                playerTwoEloBefore: playerTwo.lifetimeElo,
                playerOneEloAfter: playerOneNewElo,
                playerTwoEloAfter: playerTwoNewElo,
            }
        });

        await prisma.communityMember.update({
            where: {
                id: playerOne.id
            },
            data: {
                lifetimeElo: playerOneNewElo
            }
        });

        await prisma.communityMember.update({
            where: {
                id: playerTwo.id
            },
            data: {
                lifetimeElo: playerTwoNewElo
            }
        });

        const communityName = (await prisma.community.findUnique({ where: { id: 'cms6g007x0001lo0psadsm3w7'}}))?.name;
        notify_user_of_match(oppUserId, communityName, client);

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

export async function notify_request(res, req) {
    const userId = req.body.member?.user?.id ?? req.body.user?.id;
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

export async function join_request(res, req) {
    const userId = req.body.member?.user?.id ?? req.body.user?.id;
    let userDbId;
    try{
        if (await prisma.user.findUnique({ where: { discordId: userId } })) {
            userDbId = (await prisma.user.findUnique({ where: { discordId: userId }, select: { id: true } })).id;
        }
        else{
            userDbId = (await prisma.user.create({
                data: {
                    discordId: userId,
                    discordUsername: req.body.member?.user?.username ?? req.body.user?.username,
                }
            }))?.id;
        }
        // TODO: THIS IS HARD CODED INTO THE TEST CHAPTER.
        if ((await prisma.communityMember.findFirst({ where: { userId: userId, communityId: 'cms6g007x0001lo0psadsm3w7' } }))?.id) {
            userDbId = (await prisma.communityMember.findFirst({ where: { userId: userId, communityId: 'cms6g007x0001lo0psadsm3w7' }, select: { id: true } })).id;
                        return res.send({
                type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
                data: {
                flags: InteractionResponseFlags.IS_COMPONENTS_V2,
                components: [
                    {
                    type: MessageComponentTypes.TEXT_DISPLAY,
                    content: `You are already a member of this chapter, <@${userId}>!`
                    }
                ]
                },
            });
        }
        else{
            await prisma.communityMember.create({
                data: {
                    userId: userDbId,
                    // TODO: THIS IS HARD CODED INTO THE TEST CHAPTER.
                    communityId: 'cms6g007x0001lo0psadsm3w7',
                    displayName: req.body.member?.user?.username ?? req.body.user?.username,
                }
            });
            return res.send({
                type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
                data: {
                flags: InteractionResponseFlags.IS_COMPONENTS_V2,
                components: [
                    {
                    type: MessageComponentTypes.TEXT_DISPLAY,
                    content: `You have successfully joined the chapter! Welcome aboard, <@${userId}>!`
                    }
                ]
                },
            });
        }
    } catch (err){
        console.error('Database error while joining chapter: ', err);
        return res.send({
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
            flags: InteractionResponseFlags.EPHEMERAL,
            content: "Error while joining the chapter. Please try again later. Contact support team if problem persists.",
        },
        });
    }
}