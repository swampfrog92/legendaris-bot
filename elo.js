import {
  ButtonStyleTypes,
  InteractionResponseFlags,
  InteractionResponseType,
  InteractionType,
  MessageComponentTypes,
  verifyKeyMiddleware,
} from 'discord-interactions';

import { PrismaClient } from "./generated/prisma/client.js";
import { getChapter } from './chapter.js';
import { getActiveSeason } from './season.js';

// Takes two ints as an argument, and returns the new elo for the player.
export function adjustEloForVictory(playerOneElo, playerTwoElo){
    const k = 32;
    let expectedWinner = 1 / (1 + Math.pow(10, (playerTwoElo - playerOneElo) / 400));
    return playerOneElo + k * (1 - expectedWinner);
}

// Takes two ints as an argument, and returns the new elo for the player.
export function adjustEloForDefeat(playerOneElo, playerTwoElo){
    const k = 32;
    let expectedWinner = 1 / (1 + Math.pow(10, (playerTwoElo - playerOneElo) / 400));
    return playerOneElo + k * (0 - expectedWinner);
}

// Takes two ints as an argument, and returns the new elo for the player.
export function adjustEloForTie(playerOneElo, playerTwoElo){
    const k = 32;
    let expectedWinner = 1 / (1 + Math.pow(10, (playerTwoElo - playerOneElo) / 400));
    return playerOneElo + k * (0.5 - expectedWinner);
}

export async function sortLeaderboard(community){
    return community.members.sort((a, b) => b.lifetimeElo - a.lifetimeElo);
}

export function findRank (leaderboard, userId){
    return leaderboard.members.findIndex(member => member.userId === userId) + 1;
}

export function findElo (leaderboard, userId){
    return leaderboard.members.find(member => member.userId === userId).seasonElo;
}

export async function updateFactionElo(prisma, playerOne, playerTwo, playerVP, oppVP, playerFactionId, oppFactionId){
    try{

        // Checks if a player has a ranking in this faction, if not, creates it. Returns the row.
        const playerOneFaction = await prisma.playerFaction.upsert({
            where: {
                communityMemberId_factionId: {
                    communityMemberId: playerOne.id,
                    factionId: playerFactionId
                }
            },
            update: {},
            create: {
                communityMemberId: playerOne.id,
                factionId: playerFactionId,
                lifetimeElo: 1000
            }
        });

        // Checks if a player has a ranking in this faction, if not, creates it. Returns the row.
        const playerTwoFaction = await prisma.playerFaction.upsert({
            where: {
                communityMemberId_factionId: {
                    communityMemberId: playerTwo.id,
                    factionId: oppFactionId
                }
            },
            update: {},
            create: {
                communityMemberId: playerTwo.id,
                factionId: oppFactionId,
                lifetimeElo: 1000
            }
        });

        // Updates the lifetime wins/loss/tie for both players.
        const playerOneMatchDelta = {
            winsDelta: playerVP > oppVP ? 1 : 0,
            lossesDelta: playerVP < oppVP ? 1 : 0,
            drawsDelta: playerVP === oppVP ? 1 : 0,
        }
        const playerTwoMatchDelta = {
            winsDelta: playerVP < oppVP ? 1 : 0,
            lossesDelta: playerVP > oppVP ? 1 : 0,
            drawsDelta: playerVP === oppVP ? 1 : 0,
        }

        // Calculates new elo for both players.
        const playerOneNewFactionElo = playerVP > oppVP ? adjustEloForVictory(playerOneFaction.lifetimeElo, playerTwoFaction.lifetimeElo) : playerVP < oppVP ? adjustEloForDefeat(playerOneFaction.lifetimeElo, playerTwoFaction.lifetimeElo) : adjustEloForTie(playerOneFaction.lifetimeElo, playerTwoFaction.lifetimeElo);
        const playerTwoNewFactionElo = playerVP < oppVP ? adjustEloForVictory(playerTwoFaction.lifetimeElo, playerOneFaction.lifetimeElo) : playerVP > oppVP ? adjustEloForDefeat(playerTwoFaction.lifetimeElo, playerOneFaction.lifetimeElo) : adjustEloForTie(playerTwoFaction.lifetimeElo, playerOneFaction.lifetimeElo);

        // Updates the database.
        await prisma.playerFaction.update({
            where: {
                id: playerOneFaction.id
            },
            data: {
                lifetimeElo: playerOneNewFactionElo,
                lifetimeWins: {
                    increment: playerOneMatchDelta.winsDelta
                },
                lifetimeLosses: {
                    increment: playerOneMatchDelta.lossesDelta
                },
                lifetimeDraws: {
                    increment: playerOneMatchDelta.drawsDelta
                }
            }
        });
        
            await prisma.playerFaction.update({
            where: {
                id: playerTwoFaction.id
            },
            data: {
                lifetimeElo: playerTwoNewFactionElo,
                lifetimeWins: {
                    increment: playerTwoMatchDelta.winsDelta
                },
                lifetimeLosses: {
                    increment: playerTwoMatchDelta.lossesDelta
                },
                lifetimeDraws: {
                    increment: playerTwoMatchDelta.drawsDelta
                }
            }
        });
        return {playerOneFactionEloBefore: playerOneFaction.lifetimeElo, playerTwoFactionEloBefore: playerTwoFaction.lifetimeElo, playerOneFactionEloAfter: playerOneNewFactionElo, playerTwoFactionEloAfter: playerTwoNewFactionElo};    
    } catch(err){
        console.error('Error while updating faction Elo', err);
    }
}

// Updates the community elo after a match. Takes five arguments: the prisma client, playerOne and playerTwo (both rows from communityMember), and the victory points for each player. Updates the lifetimeElo for both players in the community, and creates a new matchCommunity entry.
export async function updateElo(prisma, playerOne, playerTwo, playerVP, oppVP, matchId, factionEloUpdate, req){
    try{
        // Calculates the new lifetime Elo for the players.
        const playerOneNewElo = playerVP > oppVP ? adjustEloForVictory(playerOne.lifetimeElo, playerTwo.lifetimeElo) : playerVP < oppVP ? adjustEloForDefeat(playerOne.lifetimeElo, playerTwo.lifetimeElo) : adjustEloForTie(playerOne.lifetimeElo, playerTwo.lifetimeElo);
        const playerTwoNewElo = playerVP < oppVP ? adjustEloForVictory(playerTwo.lifetimeElo, playerOne.lifetimeElo) : playerVP > oppVP ? adjustEloForDefeat(playerTwo.lifetimeElo, playerOne.lifetimeElo) : adjustEloForTie(playerTwo.lifetimeElo, playerOne.lifetimeElo);
        
        // Calculates the new season Elo for the players.
        const playerOneNewSeasonElo = playerVP > oppVP ? adjustEloForVictory(playerOne.seasonElo, playerTwo.seasonElo) : playerVP < oppVP ? adjustEloForDefeat(playerOne.seasonElo, playerTwo.seasonElo) : adjustEloForTie(playerOne.seasonElo, playerTwo.seasonElo);
        const playerTwoNewSeasonElo = playerVP < oppVP ? adjustEloForVictory(playerTwo.seasonElo, playerOne.seasonElo) : playerVP > oppVP ? adjustEloForDefeat(playerTwo.seasonElo, playerOne.seasonElo) : adjustEloForTie(playerTwo.seasonElo, playerOne.seasonElo);
        
        const communityId = (await getChapter(req, prisma));

        const activeSeason = await getActiveSeason(prisma, communityId);

        // Creates a new matchCommunity entry.
        await prisma.matchCommunity.create({
            data: {
                matchId,
                communityId,
                playerOneEloBefore: playerOne.lifetimeElo,
                playerTwoEloBefore: playerTwo.lifetimeElo,
                playerOneEloAfter: playerOneNewElo,
                playerTwoEloAfter: playerTwoNewElo,
                playerOneSeasonEloBefore: playerOne.seasonElo,
                playerTwoSeasonEloBefore: playerTwo.seasonElo,
                playerOneSeasonEloAfter: playerOneNewSeasonElo,
                playerTwoSeasonEloAfter: playerTwoNewSeasonElo,
                playerOneFactionEloBefore: factionEloUpdate.playerOneFactionEloBefore,
                playerTwoFactionEloBefore: factionEloUpdate.playerTwoFactionEloBefore,
                playerOneFactionEloAfter: factionEloUpdate.playerOneFactionEloAfter,
                playerTwoFactionEloAfter: factionEloUpdate.playerTwoFactionEloAfter,
                seasonId: activeSeason.id,
            }
        });
        // Updates the lifetime wins/loss/tie for both players.
        const playerOneMatchDelta = {
            winsDelta: playerVP > oppVP ? 1 : 0,
            lossesDelta: playerVP < oppVP ? 1 : 0,
            drawsDelta: playerVP === oppVP ? 1 : 0,
        }
        const playerTwoMatchDelta = {
            winsDelta: playerVP < oppVP ? 1 : 0,
            lossesDelta: playerVP > oppVP ? 1 : 0,
            drawsDelta: playerVP === oppVP ? 1 : 0,
        }
        
        // Updates the Elo in the specific community.
        await prisma.communityMember.update({
            where: {
                id: playerOne.id
            },
            data: {
                lifetimeElo: playerOneNewElo,
                lifetimeWins: {
                    increment: playerOneMatchDelta.winsDelta
                },
                lifetimeLosses: {
                    increment: playerOneMatchDelta.lossesDelta
                },
                lifetimeDraws: {
                    increment: playerOneMatchDelta.drawsDelta
                },
                seasonElo: playerOneNewSeasonElo,
                seasonWins: {
                    increment: playerOneMatchDelta.winsDelta
                },
                seasonLosses: {
                    increment: playerOneMatchDelta.lossesDelta
                },
                seasonDraws: {
                    increment: playerOneMatchDelta.drawsDelta
                }
            }
        });

        await prisma.communityMember.update({
            where: {
                id: playerTwo.id
            },
            data: {
                lifetimeElo: playerTwoNewElo,
                lifetimeWins: {
                    increment: playerTwoMatchDelta.winsDelta
                },
                lifetimeLosses: {
                    increment: playerTwoMatchDelta.lossesDelta
                },
                lifetimeDraws: {
                    increment: playerTwoMatchDelta.drawsDelta
                },
                seasonElo: playerTwoNewSeasonElo,
                seasonWins: {
                    increment: playerTwoMatchDelta.winsDelta
                },
                seasonLosses: {
                    increment: playerTwoMatchDelta.lossesDelta
                },
                seasonDraws: {
                    increment: playerTwoMatchDelta.drawsDelta
                }
            }
        });
        return {p1: playerOneNewElo, p2: playerTwoNewElo};
    } catch(err){
        console.error('Error while updating Elo', err);
    }
}

export async function createMatch(res, req, prisma){
    try{
        const userId = req.body.member?.user?.id ?? req.body.user?.id;
        const oppUserId = req.body.data.options?.find(opt => opt.name === 'opponent')?.value;
        const yourVP = req.body.data.options?.find(opt => opt.name === 'your_vp')?.value;
        const oppVP = req.body.data.options?.find(opt => opt.name === 'opponent_vp')?.value;
        const yourFaction = req.body.data.options?.find(opt => opt.name === 'faction')?.value;
        const oppFaction = req.body.data.options?.find(opt => opt.name === 'opponent_faction')?.value;
        const gameSystemPlayed = req.body.data.options?.find(opt => opt.name === 'game_system')?.value;
        const communityId = (await getChapter(req, prisma));
        const winner = yourVP > oppVP ? userId : oppVP > yourVP ? oppUserId : '-1';

        // Searches the database to find the unique ID of the player
        const userDbId = (await prisma.user.findUnique({ where: { discordId: userId }, select: { id: true }}))?.id;

        // Searches the database to find the unique ID of the opponent
        const oppUserDbId = (await prisma.user.findUnique({ where: { discordId: oppUserId},select: {id: true}}))?.id;

        // Searches the database to find the unique ID of the winner. If no winner is found, it is submitted as '-1'
        const winnerDbId = (await prisma.user.findUnique({where: { discordId: winner }, select: { id: true }}))?.id ?? '-1';    

        // submit to DB
        const matchId = (await prisma.match.create({
            data: {
                gameSystemId: gameSystemPlayed,
                submittedById: userDbId,
                playerOneId: userDbId,
                playerTwoId: oppUserDbId,
                winnerId: winnerDbId,
                playerOneFactionId: yourFaction,
                playerTwoFactionId: oppFaction,
                playedAt: new Date(),
            }
        }))?.id;

        const playerOne = (await prisma.communityMember.findFirst({ where: { userId: userDbId, communityId}}));
        const playerTwo = (await prisma.communityMember.findFirst({where: {userId: oppUserDbId, communityId}}));

        // Updates the specific Elo for the faction played. 
        const factionEloUpdate = updateFactionElo(prisma, playerOne, playerTwo, yourVP, oppVP, yourFaction, oppFaction);

        // Updates the community Elo for the players.
        updateElo(prisma, playerOne, playerTwo, yourVP, oppVP, matchId, factionEloUpdate, req);
    } catch(err){
        console.error('Error while creating match', err);
    }
}
