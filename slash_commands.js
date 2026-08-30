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
import { adjustEloForVictory, adjustEloForDefeat, adjustEloForTie, sortLeaderboard, findRank, findElo, updateFactionElo, updateElo, createMatch } from './elo.js';
import { notify_user_of_match } from './messages.js';
import { helpMessage, errorUpdatingEloMessage, infoErrorMessage, newSeasonMessage, userNotJoinedMessage, } from './text.js';
import { getChapter } from './chapter.js';
import { getFactionStats, getRecord, getSeasonStats } from './stats.js';
import { ifJoined, findUserIdFromDiscordId } from './search.js';
import { createSeason, getActiveSeason, resetSeasonElo, createSeasonSnapshots } from './season.js';
import { ifValidFaction } from './factions.js';
import { findRecentMatchesForDisplay } from './matches.js';

export const prisma = new PrismaClient();


// These commands are called when the system receives a slash command. See ./app.js. 
export async function rank_request(res, req) {

    try{
        const communityId = (await getChapter(req, prisma));
        const userId = (await prisma.user.findUnique({ where: { discordId: req.body.member?.user?.id ?? req.body.user?.id }, select: { id: true } }))?.id;
        let community = (await prisma.community.findUnique({
            where: {
                id: communityId,
            },
            select: {
                members: {
                    orderBy: {
                        seasonElo: "desc"
                    }
                }
            }
        }));

        const userRank = findRank(community, userId);
        const currentElo = findElo(community, userId);

        // returns current record as a string
        const currentRecord = getRecord(community.members.find(member => member.userId === userId));

        return res.send({
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: {
            flags: InteractionResponseFlags.IS_COMPONENTS_V2 | InteractionResponseFlags.EPHEMERAL,
            components: [{
                type: MessageComponentTypes.TEXT_DISPLAY,
                content: '\\~\\~\\~\\~\\~\\~\\~\\~\\~\\~\\~\\~\\~\\~\\~\\~\nYour current rank is ' + userRank + ' out of ' + community.members.length + ' members.\n Your current Elo is ' + currentElo + '.\n Your record is ' + currentRecord + '\n\\~\\~\\~\\~\\~\\~\\~\\~\\~\\~\\~\\~\\~\\~\\~\\~'
            }]
        },
    });
    } catch (err){
        console.error('Database error while fetching rank: ', err);
    }
}

// These commands are called when the system receives a slash command. See ./app.js. 
export async function stats_request(res, req) {

    try{
        if(!ifJoined(prisma, req.body.member?.user?.id ?? req.body.user?.id, (await getChapter(req, prisma)))){
            return res.send({
                type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
                data: {
                flags: InteractionResponseFlags.IS_COMPONENTS_V2 | InteractionResponseFlags.EPHEMERAL,
                components: [{
                    type: MessageComponentTypes.TEXT_DISPLAY,
                    content: userNotJoinedMessage
                    }]
            },
        });
    }
        const factionStats = await getFactionStats(res, req, prisma);

        return res.send({
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: {
            flags: InteractionResponseFlags.IS_COMPONENTS_V2 | InteractionResponseFlags.EPHEMERAL,
            components: [{
                type: MessageComponentTypes.TEXT_DISPLAY,
                content: factionStats
            }]
        },
    });
    } catch (err){
        console.error('Database error while fetching stats: ', err);
    }
}

// These commands are called when the system receives a slash command. See ./app.js. 
export async function season_stats_request(res, req) {

    try{
        if(!ifJoined(prisma, req.body.member?.user?.id ?? req.body.user?.id, (await getChapter(req, prisma)))){
            return res.send({
                type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
                flags: InteractionResponseFlags.IS_COMPONENTS_V2 | InteractionResponseFlags.EPHEMERAL,
                data: {
                    content: "You must join this chapter before you can view your stats. Please use the /join command to join this chapter.",
               },
            });
        }
        const seasonStats = await getSeasonStats(res, req, prisma);

        return res.send({
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
        flags: InteractionResponseFlags.IS_COMPONENTS_V2 | InteractionResponseFlags.EPHEMERAL,
          components: [
            {
              type: MessageComponentTypes.TEXT_DISPLAY,
              content: seasonStats
            }
          ]
        },
    });
    } catch (err){
        console.error('Database error while fetching stats: ', err);
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

export async function info_request(res, req) {
    try{
        const communityId = (await getChapter(req, prisma));
        const season = (await getActiveSeason(prisma, communityId));
        let community = await prisma.community.findUnique({
            where: {
                id: communityId,
            },
            select: {
                members: {
                    select: {
                        displayName: true,
                        lifetimeElo: true,
                        userId: true
                    }
                },
                name: true,
                description: true,
            }
        });

        const msg = 'This is the ' + community.name + ' community. ' + (community.description ?? '') + 
                    (season ? '\n\n The current season is ' + season.name + ', which started on ' + season.startDate.toLocaleDateString() + '.' : '') +
                    ' \n\n This community currently has ' + community.members.length + ' members.';

        return res.send({
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: {
            flags: InteractionResponseFlags.IS_COMPONENTS_V2 | InteractionResponseFlags.EPHEMERAL,
            components: [
                {
                type: MessageComponentTypes.TEXT_DISPLAY,
                content: msg
                }
            ]
            },
        });
    }
    catch(err){
            console.error("Error while retrieving community info", err);
            return res.send({
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: {
            flags: InteractionResponseFlags.IS_COMPONENTS_V2 | InteractionResponseFlags.EPHEMERAL,
            components: [{
                type: MessageComponentTypes.TEXT_DISPLAY,
                content: infoErrorMessage
            }]
            },
        });
    }
}

// This function returns the top-n leaderboard. Default is 10. 
export async function leaderboard_request(res, req){
    try{
        let requestedLength = req.body.data.options?.find(opt => opt.name === 'length')?.value ?? 10;
        
        if (requestedLength < 1){
            requestedLength = 1;
        }

        let msg = "Current Leaderboard: \n";
        const communityId = (await getChapter(req, prisma));
        let community = await prisma.community.findUnique({
            where: {
                id: communityId,
            },
            select: {
                members: {
                    select: {
                        displayName: true,
                        seasonElo: true,
                        userId: true
                    },
                    include: {
                        user: true
                    },
                    orderBy: {
                        seasonElo: "desc"
                    }
                }
            }
        });
        const leaderboardLength = community.members.length > requestedLength ? requestedLength : community.members.length;
        for(let i = 0; i < leaderboardLength; i++){
            msg += `${i + 1}. ${community.members[i].displayName ?? community.members[i].user.discordUsername} --- ${community.members[i].seasonElo}\n`;
        }

        return res.send({
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
        flags: InteractionResponseFlags.IS_COMPONENTS_V2,
          components: [
            {
              type: MessageComponentTypes.TEXT_DISPLAY,
              content: msg
            }
          ]
        },
    });
    } catch(err){
        console.error('Error while creating leaderboard', err);
    }
}

export function help_request(res) {
    
    return res.send({
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
        flags: InteractionResponseFlags.IS_COMPONENTS_V2 | InteractionResponseFlags.EPHEMERAL,
          components: [
            {
              type: MessageComponentTypes.TEXT_DISPLAY,
              content: helpMessage
            }
          ]
        },
    });
}

export async function history_request(res, req) {
    const userId = await findUserIdFromDiscordId(prisma, req.body.member?.user?.id ?? req.body.user?.id);
    const numMatches = req.body.data.options?.find(opt => opt.name === 'length')?.value && req.body.data.options?.find(opt => opt.name === 'length')?.value > 0 && req.body.data.options?.find(opt => opt.name === 'length')?.value < 25 ? req.body.data.options?.find(opt => opt.name === 'length')?.value : 5;
    const msg = await findRecentMatchesForDisplay(prisma, userId, numMatches);
    return res.send({
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
        flags: InteractionResponseFlags.IS_COMPONENTS_V2 | InteractionResponseFlags.EPHEMERAL,
          components: [
            {
              type: MessageComponentTypes.TEXT_DISPLAY,
              content: msg
            }
          ]
        },
    });
}

export async function link_request(res, req) {
    
    try{
        const communityId = req.body.data.options?.find(opt => opt.name === 'community_id')?.value;
        const guildId = req.body.guild_id;

        await prisma.discordChapter.upsert({
            where: {
                id: guildId
            },
            update: {
                id: guildId,
                communityId
            },
            create: {
                id: guildId,
                communityId
            }
        });

        return res.send({
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: {
            flags: InteractionResponseFlags.IS_COMPONENTS_V2,
            components: [
                {
                type: MessageComponentTypes.TEXT_DISPLAY,
                content: "Congratulations on joining the chapter!"
                }
            ]
            },
        });
    } catch(err){
        console.error("Error while linking chapter to Discord guild", err);
    }
}

export async function results_request(res, req, client) {
    const userId = req.body.member?.user?.id ?? req.body.user?.id;
    const oppUserId = req.body.data.options?.find(opt => opt.name === 'opponent')?.value;
    const yourVP = req.body.data.options?.find(opt => opt.name === 'your_vp')?.value;
    const oppVP = req.body.data.options?.find(opt => opt.name === 'opponent_vp')?.value;
    const yourFaction = req.body.data.options?.find(opt => opt.name === 'faction')?.value;
    const oppFaction = req.body.data.options?.find(opt => opt.name === 'opponent_faction')?.value;
    const communityId = (await getChapter(req, prisma));

    // Checks if victory points are a valid number. TODO: this is only valid for Warhammer 40k. Need to add a dynamic check when other game systems are added.
    if(yourVP < 0 || oppVP < 0 || isNaN(yourVP) || isNaN(oppVP) || yourVP > 100 || oppVP > 100){
        return res.send({
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            flags: InteractionResponseFlags.IS_COMPONENTS_V2 | InteractionResponseFlags.EPHEMERAL,
            data: {
                content: "Please enter valid victory points. Victory points must be a number between 0 and 100.",
           },
        });
    }

    if(!(await ifValidFaction(yourFaction)) || !(await ifValidFaction(oppFaction))){
        return res.send({
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: {
                flags: InteractionResponseFlags.IS_COMPONENTS_V2 | InteractionResponseFlags.EPHEMERAL,
                content: "Please enter valid factions. If you believe this is an error, please contact the support team.",
           },
        });
    }

    // If the user has not joined the chapter, returns error message to user.
    if(!(await ifJoined(prisma, userId, communityId))){
        return res.send({
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: {
                flags: InteractionResponseFlags.IS_COMPONENTS_V2 | InteractionResponseFlags.EPHEMERAL,
                content: "You must join this chapter before you can submit results. Please use the /join command to join this chapter.",
           },
        });
    }

    // If the opponent has not joined the chapter, returns error message to user.
    if(!(await ifJoined(prisma, oppUserId, communityId))){
        return res.send({
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: {
                flags: InteractionResponseFlags.IS_COMPONENTS_V2 | InteractionResponseFlags.EPHEMERAL,
                content: "Your opponent must join this chapter before you can submit results. Please ask them to use the /join command to join this chapter.",
           },
        });
    }
        
    // Determines the winner. In case of a tie, '-1'
    const winner = yourVP > oppVP ? userId : oppVP > yourVP ? oppUserId : '-1';

    try{
        createMatch(res, req, prisma);

        // Sends a DM to the opponent to notify them of the match submission.
        try{
            notify_user_of_match(oppUserId, (await prisma.community.findUnique({ where: { id: communityId}}))?.name, client);
        } catch(err){
            console.error("Error while notifying opponent", err);
        }
        
        // Upon success, display the results on the guild server. 
        return res.send({
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
            flags: InteractionResponseFlags.IS_COMPONENTS_V2,
            components: [
            {
                type: MessageComponentTypes.TEXT_DISPLAY,
                content: `New match submission! \n\n <@${userId}> - ${yourVP} versus <@${oppUserId}> - ${oppVP}.`
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
                content: errorUpdatingEloMessage,
            }
            ]
        }
        })
    }
}

// Currently unused function
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

    // Chooses which display name to use. Starts with most specific to most general.
    const displayName = req.body.member?.nick ?? req.body.member?.user?.global_name ?? req.body.member?.user?.username;

    // Retrieves avatar URL, if available. 
    const avatarUrl = req.body.member?.avatar
        ? `https://cdn.discordapp.com/guilds/${req.body.guild_id}/users/${req.body.member.user.id}/avatars/${req.body.member.avatar}.png`
        : req.body.member?.user?.avatar
        ? `https://cdn.discordapp.com/avatars/${req.body.member.user.id}/${req.body.member.user.avatar}.png`
        : null;

    // Chooses which username to use. Starts with most specific to most general. 
    const discordUsername = req.body.member?.nick ?? req.body.member?.user?.global_name ?? req.body.member?.user?.username ?? req.body.user?.global_name ?? req.body.user?.username;
    try{
        if (await prisma.user.findUnique({ where: { discordId: userId } })) {
            userDbId = (await prisma.user.findUnique({ where: { discordId: userId }, select: { id: true } })).id;
        }
        else{
            userDbId = (await prisma.user.create({
                data: {
                    discordId: userId,
                    discordUsername: req.body.member?.user?.username ?? req.body.user?.username,
                    displayName: displayName,
                    avatarUrl: avatarUrl,
                }
            }))?.id;
        }

        const communityId = (await getChapter(req, prisma));
        if ((await prisma.communityMember.findFirst({ where: { userId: userDbId, communityId }, select : {id : true} }))?.id) {
            userDbId = (await prisma.communityMember.findFirst({ where: { userId: userDbId, communityId }, select: { id: true } })).id;
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
                    communityId,
                    displayName,
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

export async function create_season_request(res, req) {

    await createSeasonSnapshots(prisma, (await getChapter(req, prisma)));
    await resetSeasonElo(prisma, (await getChapter(req, prisma)));

    if (createSeason(prisma, req.body.data.options?.find(opt => opt.name === 'season_name')?.value, (await getChapter(req, prisma)))){
        return res.send({
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: {
            flags: InteractionResponseFlags.IS_COMPONENTS_V2,
            components: [
                {
                type: MessageComponentTypes.TEXT_DISPLAY,
                content: newSeasonMessage
                }
            ]
            },
        });
    }

    else{
            return res.send({
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: {
            flags: InteractionResponseFlags.IS_COMPONENTS_V2,
            components: [
                {
                type: MessageComponentTypes.TEXT_DISPLAY,
                content: `Error while creating season. Please try again later. Contact support team if problem persists.`
                }
            ]
            },
        });
    }
}