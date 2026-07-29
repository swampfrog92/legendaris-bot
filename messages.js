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
    await user.send('You have a pending match submission in the community ' + communityName + '. Please use your community web portal to approve or dispute the results.');
}