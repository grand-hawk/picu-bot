# picu-bot

A community media bot for Discord.
Intended for one bot per guild, otherwise media is shared.

![image](https://github.com/user-attachments/assets/8dfb43b5-c04e-4ec3-9ccf-f5266a61e71b)

## Environment variables

Users with any of the role ids in `SAVE_ROLES` env can save media. (e.g. moderators)
Users with any of the role ids in `DELETE_ROLES` env can delete media. (e.g. admins)
Certain commands, such as `?import`, which require access to the bot can only be used by users with any of the role ids in `ADMIN_USERS` env.

Command prefix can be customized by changing the `COMMAND_PREFIX` env, but defaults to `?`.

The folder where media is saved can be customized by changing the `MEDIA_SAVE_PATH` env, defaults to `/picu-media`.

PostgreSQL is required as database, set the full connection string in the `DATABASE_URL` env.
Use the `DISCORD_TOKEN` env to set the bot token.

The `PORT` env can be used to customize the port the server will make the `/healthcheck` endpoint available on.

## Commands

Use `?help` to get a list of commands and their arguments.
