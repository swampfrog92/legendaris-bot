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
import { DiscordRequest } from './utils.js';
import { Client, GatewayIntentBits } from 'discord.js';
import { Pool } from 'pg';
import { faction_id } from './utils.js';
import { slugify } from './utils.js';
import { rank_request, create_chapter_request, info_request, help_request, results_request, notify_request, join_request, leaderboard_request, link_request, stats_request, create_season_request } from './slash_commands.js';
import { factionAutocomplete } from './factions.js';

const app = express();

// Client login
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


// This is the endpoint that Discord will send interaction data to
app.post('/interactions', verifyKeyMiddleware(process.env.PUBLIC_KEY), async function (req, res) {

  const { id, type, data } = req.body;

  if (type === InteractionType.PING) {
    return res.send({ type: InteractionResponseType.PONG });
  }

  // Autocomplete interactiosn are handled here.
  if (type === 4) {
    const { name, options } = data;

    if (focused.name === 'faction' || focused.name === 'opponent_faction') {
      return factionAutocomplete(req, res);
  }
}

  // All slash commands are handled here. Each slash command must be defined in ./commands.js. Functions are located in ./slash_commands.js.
  if (type === InteractionType.APPLICATION_COMMAND) {
    const { name } = data;

    if (name === 'help') {
      return help_request(res);
    }
    else if (name === 'info') {
      return info_request(res, req);
    }

    else if (name === 'rank') {
      return rank_request(res, req);
    }

    else if (name === 'stats') {
      return stats_request(res, req);
    }

    else if (name === 'create_chapter'){
      return create_chapter_request(res, req);
    } 

    else if (name === 'notify') {
      return notify_request(res, req);
    }

    else if (name === 'leaderboard'){
      return leaderboard_request(res, req);
    }
    else if (name === 'link'){
      return link_request(res, req);
    }

    else if (name === 'results') {
      return results_request(res, req, client);
    }
    
    else if (name === 'join') {
      return join_request(res, req);
    }

    else if (name === 'create_season') {
      return create_season_request(res, req);
    }

    // End of slash command handling

    console.error(`unknown command: ${name}`);
    return res.status(400).json({ error: 'unknown command' });
  }

console.error('unknown interaction type', type);
  return res.status(400).json({ error: 'unknown interaction type' });
});

app.listen(PORT, () => {
  console.log('Listening on port', PORT);
});
