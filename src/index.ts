import {
  Client,
  GatewayIntentBits,
  Events,
  REST,
  Routes,
  GuildMember,
  ChatInputCommandInteraction,
} from "discord.js";
import dotenv from "dotenv";
import { getGuildConfig, GuildConfig } from "./config";
import { commands } from "./commands";
import { handleSetup } from "./handlers/setupHandler";
import {
  handleCreateGroup,
  handleDeleteGroup,
  handleSyncGroupChannels,
  handleSyncGroupsBulk,
} from "./handlers/groupHandler";

dotenv.config();

const token = process.env.DISCORD_TOKEN;
const clientId = process.env.CLIENT_ID;

if (!token || !clientId) {
  console.error("Missing DISCORD_TOKEN or CLIENT_ID in .env file");
  process.exit(1);
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMembers,
  ],
});

const rest = new REST({ version: "10" }).setToken(token);

async function registerCommands(guildId: string) {
  try {
    await rest.put(Routes.applicationGuildCommands(clientId!, guildId), {
      body: commands,
    });
    console.log(
      `Successfully registered application commands for guild ${guildId}`,
    );
  } catch (error) {
    console.error(error);
  }
}

client.once(Events.ClientReady, async (c) => {
  console.log(`Ready! Logged in as ${c.user.tag}`);

  for (const guild of c.guilds.cache.values()) {
    await registerCommands(guild.id);
  }
});

client.on(Events.GuildCreate, (guild) => {
  registerCommands(guild.id);
});

type CommandTable = {
  [key: string]: (
    interaction: ChatInputCommandInteraction,
    config: GuildConfig
  ) => Promise<void>;
};

const commandTable: CommandTable = {
  "create-group": handleCreateGroup,
  "delete-group": handleDeleteGroup,
  "sync-group-channels": handleSyncGroupChannels,
  "sync-groups-bulk": handleSyncGroupsBulk,
};

client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const { commandName, guildId } = interaction;
  if (!guildId) return;

  // Setup is a special case as it defines the config
  if (commandName === "setup") {
    await handleSetup(interaction);
    return;
  }

  const config = getGuildConfig(guildId);

  if (!config.adminChannelId || !config.adminRoleId) {
    await interaction.reply({
      content: "Bot no configurado. Por favor, corre /setup first.",
      ephemeral: true,
    });
    return;
  }

  if (interaction.channelId !== config.adminChannelId) {
    await interaction.reply({
      content: `Este comando solo puede ser usado en <#${config.adminChannelId}>`,
      ephemeral: true,
    });
    return;
  }

  const member = interaction.member as GuildMember;
  if (!member.roles.cache.has(config.adminRoleId)) {
    await interaction.reply({
      content: `Debes tener <@&${config.adminRoleId}> rol para usar este comando.`,
      ephemeral: true,
    });
    return;
  }

  const handler = commandTable[commandName];
  if (handler) {
    await handler(interaction, config);
  }
});

client.login(token);
