import {
  ButtonStyleTypes,
  InteractionResponseFlags,
  InteractionResponseType,
  InteractionType,
  MessageComponentTypes,
  verifyKeyMiddleware,
} from 'discord-interactions';

import { PrismaClient } from "./generated/prisma/client.js";

export function adjustEloForVictory(winner, loser){
    const k = 32;
    let winner_elo = winner.lifetimeElo;
    let loser_elo = loser.lifetimeElo;
    let expected_winner = 1 / (1 + Math.pow(10, (loser_elo - winner_elo) / 400));
    return winner_elo + k * (1 - expected_winner);
}
export function adjustEloForDefeat(winner, loser){
    const k = 32;
    let winner_elo = winner.lifetimeElo;
    let loser_elo = loser.lifetimeElo;
    let expected_winner = 1 / (1 + Math.pow(10, (loser_elo - winner_elo) / 400));
    return loser_elo + k * (0 - expected_winner);
}
export function adjustEloForTie(winner, loser){
    const k = 32;
    let winner_elo = winner.lifetimeElo;
    let loser_elo = loser.lifetimeElo;
    let expected_winner = 1 / (1 + Math.pow(10, (loser_elo - winner_elo) / 400));
    return winner_elo + k * (0.5 - expected_winner);
}

export async function sortLeaderboard(res, req, prisma){
    const members = await prisma.communityMember.findMany({
        select: {
            displayName: true,
            elo: true
        },
        where:{
            communityId: 'cms6g007x0001lo0psadsm3w7'
        }
    });

    return members.sort((a, b) => b.lifetimeElo - a.lifetimeElo);
}

export function findRank (leaderboard, username){
    return leaderboard.findIndex(member => member.displayName === username) + 1;
}