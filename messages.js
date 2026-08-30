import {
  ButtonStyleTypes,
  InteractionResponseFlags,
  InteractionResponseType,
  InteractionType,
  MessageComponentTypes,
  verifyKeyMiddleware,
} from 'discord-interactions';

export async function notify_user_of_match(oppUserId, communityName, client){
    const user = await client.users.fetch(oppUserId, {force:true});
    await user.send('A match has been submitted in ' + communityName + '. Please review on the community portal.');
}