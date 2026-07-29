import 'dotenv/config';
import { capitalize, InstallGlobalCommands } from './utils.js';

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
      name: 'faction',
      description: 'Your faction',
      required: true,
      choices: [
        {
          name: 'Space Marines',
          value: '1',
        },
        {
          name: 'Orks',
          value: '2',
        }
      ]
    },
    {
      type: 3,
      name: 'opponent_faction',
      description: 'Your opponents faction',
      required: true,
      choices: [
        {
          name: 'Space Marines',
          value: '1',
        },
        {
          name: 'Orks',
          value: '2',
        }
      ]
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

const ALL_COMMANDS = [HELP_COMMAND, INFO_COMMAND, RANK_COMMAND, NOTIFY_COMMAND, RESULTS_COMMAND, CREATE_CHAPTER_COMMAND];

InstallGlobalCommands(process.env.APP_ID, ALL_COMMANDS);
