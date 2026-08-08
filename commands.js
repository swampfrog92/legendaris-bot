import 'dotenv/config';
import { createFactionChoices } from './factions.js';
import { createGameSystemChoices } from './gameSystems.js';
import { capitalize, InstallGlobalCommands } from './utils.js';

async function createCommands(){
  const HELP_COMMAND = {
    name: 'help',
    description: 'Receive an ephemeral message explaining how to use this bot',
    type: 1,
    integration_types: [0, 1],
    contexts: [0, 1, 2],
  };

  const INFO_COMMAND = {
    name: 'info',
    description: 'Receive an ephemeral message about the current league and its status',
    type: 1,
    integration_types: [0, 1],
    contexts: [0, 1, 2],
  };

  const RANK_COMMAND = {
    name: 'rank',
    description: 'Receive an ephemeral message about your current rank and Elo',
    type: 1,
    integration_types: [0,1],
    contexts: [0,1,2],
  };

  const STATS_COMMAND = {
    name: 'stats',
    description: 'Receive a message about your stats with each faction you have played with in this community',
    type: 1,
    integration_types: [0,1],
    contexts: [0,1,2],
  };

  const NOTIFY_COMMAND = {
    name: 'notify',
    description: 'send a dm',
    type: 1,
    integration_types: [0,1],
    contexts: [0,1,2]
  };

  const RESULTS_COMMAND = {
    name: 'results',
    description: 'Submit and publish the results of a recent game',
    type: 1,
    integration_types: [0,1],
    contexts: [0,1,2],
    options: [
      {
        type: 6,
        name: 'opponent',
        description: 'Your opponent in the game',
        required: true
      },
      {
        type: 4,
        name: 'your_vp',
        description: 'Your victory points',
        required: true
      },
      {
        type: 4,
        name: 'opponent_vp',
        description: 'Your opponents victory points',
        required: true
      },
      {
        type: 3,
        name: 'game_system',
        description: 'The game system played',
        required: true,
        choices: await createGameSystemChoices()
      },
      {
        type: 3,
        name: 'faction',
        description: 'Your faction',
        required: true,
        choices: await createFactionChoices()
      },
      {
        type: 3,
        name: 'opponent_faction',
        description: 'Your opponents faction',
        required: true,
        choices: await createFactionChoices()
      }

    ]
  };

  const CREATE_CHAPTER_COMMAND = {
    name: 'create_chapter',
    description: 'Create a new chapter for your faction',
    type: 1,
    integration_types: [0,1],
    contexts: [0,1,2],
    options: 
      [{
      name: "name",
      description: "Name of your chapter, between 3 and 32 characters",
      type: 3, // STRING
      required: true,
      min_length: 3,
      max_length: 32
      }]
  };

  const JOIN_COMMAND = {
    name: 'join',
    description: 'Join this chapter!',
    type: 1,
    integration_types: [0, 1],
    contexts: [0, 1, 2],
  };

  const LEADERBOARD_COMMAND = {
    name: 'leaderboard',
    description: 'Display the Top 10 in this Chapter',
    type: 1,
    integration_types: [0, 1],
    contexts: [0, 1, 2],
  } 

const LINK_COMMAND = {
    name: 'link',
    description: 'The admin should use this command to link this Discord guild with a Legendaris Chapter',
    type: 1,
    integration_types: [0, 1],
    contexts: [0, 1, 2],
    options: [
      {
        type: 3,
        name: 'community_id',
        description: 'Enter the Community ID provided by the website',
        required: true
      }
    ]
  } 

  const ALL_COMMANDS = [HELP_COMMAND, RANK_COMMAND, RESULTS_COMMAND, JOIN_COMMAND, LEADERBOARD_COMMAND, LINK_COMMAND, INFO_COMMAND, STATS_COMMAND];

  InstallGlobalCommands(process.env.APP_ID, ALL_COMMANDS);
}

createCommands();