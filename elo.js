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
    return leaderboard.members.find(member => member.userId === userId).lifetimeElo;
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
                lifetimeElo: plyaerOneNewFactionElo,
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
    } catch(err){
        console.error('Error while updating faction Elo', err);
    }
}

// Updates the community elo after a match. Takes five arguments: the prisma client, playerOne and playerTwo (both rows from communityMember), and the victory points for each player. Updates the lifetimeElo for both players in the community, and creates a new matchCommunity entry.
export async function updateElo(prisma, playerOne, playerTwo, playerVP, oppVP, matchId, req){
    try{
        // Calculates the new lifetime Elo for the players.
        const playerOneNewElo = playerVP > oppVP ? adjustEloForVictory(playerOne.lifetimeElo, playerTwo.lifetimeElo) : playerVP < oppVP ? adjustEloForDefeat(playerOne.lifetimeElo, playerTwo.lifetimeElo) : adjustEloForTie(playerOne.lifetimeElo, playerTwo.lifetimeElo);
        const playerTwoNewElo = playerVP < oppVP ? adjustEloForVictory(playerTwo.lifetimeElo, playerOne.lifetimeElo) : playerVP > oppVP ? adjustEloForDefeat(playerTwo.lifetimeElo, playerOne.lifetimeElo) : adjustEloForTie(playerTwo.lifetimeElo, playerOne.lifetimeElo);
        
        const communityId = (await getChapter(req, prisma));

        // Creates a new matchCommunity entry.
        await prisma.matchCommunity.create({
            data: {
                matchId,
                communityId, // Hardcoded for testing purposes
                playerOneEloBefore: playerOne.lifetimeElo,
                playerTwoEloBefore: playerTwo.lifetimeElo,
                playerOneEloAfter: playerOneNewElo,
                playerTwoEloAfter: playerTwoNewElo,
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
                }
            }
        });
        return {p1: playerOneNewElo, p2: playerTwoNewElo};
    } catch(err){
        console.error('Error while updating Elo', err);
    }
}