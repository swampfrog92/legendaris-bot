import {
  ButtonStyleTypes,
  InteractionResponseFlags,
  InteractionResponseType,
  InteractionType,
  MessageComponentTypes,
  verifyKeyMiddleware,
} from 'discord-interactions';

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