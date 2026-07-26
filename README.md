# picu-bot

A community media bot for Discord.
Intended for one bot per guild, otherwise media is shared.

![image](https://github.com/user-attachments/assets/8dfb43b5-c04e-4ec3-9ccf-f5266a61e71b)

## Environment variables

Users with any of the role ids in `SAVE_ROLES` env can save media. (e.g. moderators)
Users with any of the role ids in `DELETE_ROLES` env can delete media. (e.g. admins)
Certain commands, such as `/import`, which require access to the bot can only be used by users with any of the user ids in `ADMIN_USERS` env.

The folder where media is saved can be customized by changing the `MEDIA_SAVE_PATH` env, defaults to `/picu-media`.

PostgreSQL is required as database, set the full connection string in the `DATABASE_URL` env.
Use the `DISCORD_TOKEN` env to set the bot token.

The `PORT` env can be used to customize the port the server will make the `/healthcheck` endpoint available on.

## Commands

The bot uses slash commands, so invite it with the `applications.commands` scope.
Commands are registered globally on startup and may take up to an hour to appear the first time.

Discord's command picker documents every command and option, or use `/help` for the same list in one message.

To save media someone else posted, right click (or long press) their message and pick **Apps → Save media**.
`/save` takes the file directly, for media you are uploading yourself.
