import {
  ButtonStyleTypes,
  InteractionResponseFlags,
  InteractionResponseType,
  InteractionType,
  MessageComponentTypes,
  verifyKeyMiddleware,
} from 'discord-interactions';

import { PrismaClient } from "./generated/prisma/client.js";

// Takes two ints as an argument, and returns the new elo for the player.
export function adjustEloForVictory(playerOneElo, playerTwoElo){
    const k = 32;
    let expectedWinner = 1 / (1 + Math.pow(10, (playerTwoElo - playerOneElo) / 400));
    return winnerElo + k * (1 - expectedWinner);
}

// Takes two ints as an argument, and returns the new elo for the player.
export function adjustEloForDefeat(playerOneElo, playerTwoElo){
    const k = 32;
    let expectedWinner = 1 / (1 + Math.pow(10, (playerTwoElo - playerOneElo) / 400));
    return loserElo + k * (0 - expectedWinner);
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

    const playerOneFaction = await prisma.playerFaction.upsert({
        where: {
            communityMemberId: playerOne.id,
            factionId:
            playerFactionId
        },
        update: {},
        create: {
            communityMemberId: playerOne.id,
            factionId: playerFactionId,
            lifetimeElo: 1000
        }
    });

    const playerTwoFaction = await prisma.playerFaction.upsert({
        where: {
            communityMemberId: playerTwo.id,
            factionId: oppFactionId
        },
        update: {},
        create: {
            communityMemberId: playerTwo.id,
            factionId: oppFactionId,
            lifetimeElo: 1000
        }
    });

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

    playerOneFaction.lifetimeElo += playerVP > oppVP ? adjustEloForVictory(playerOneFaction.lifetimeElo, playerTwoFaction.lifetimeElo) : playerVP < oppVP ? adjustEloForDefeat(playerOneFaction.lifetimeElo, playerTwoFaction.lifetimeElo) : adjustEloForTie(playerOneFaction.lifetimeElo, playerTwoFaction.lifetimeElo);
    playerTwoFaction.lifetimeElo += playerVP < oppVP ? adjustEloForVictory(playerTwoFaction.lifetimeElo, playerOneFaction.lifetimeElo) : playerVP > oppVP ? adjustEloForDefeat(playerTwoFaction.lifetimeElo, playerOneFaction.lifetimeElo) : adjustEloForTie(playerTwoFaction.lifetimeElo, playerOneFaction.lifetimeElo);

    await prisma.playerFaction.update({
        where: {
            id: playerOneFaction.id
        },
        data: {
            lifetimeElo: playerOneFaction.lifetimeElo,
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
            lifetimeElo: playerTwoFaction.lifetimeElo,
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

}