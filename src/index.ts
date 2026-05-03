import {
  Client,
  GatewayIntentBits,
  Events,
  REST,
  Routes,
  GuildMember,
} from "discord.js";
import dotenv from "dotenv";
import { getGuildConfig } from "./config";
import { commands } from "./commands";
import { handleSetup } from "./handlers/setupHandler";
import { handleCreateGroup } from "./handlers/groupHandler";

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

client.once(Events.ClientReady, (c) => {
  console.log(`Ready! Logged in as ${c.user.tag}`);
});

client.on(Events.GuildCreate, (guild) => {
  registerCommands(guild.id);
});

client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const { commandName, guildId } = interaction;
  if (!guildId) return;

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

  if (commandName === "create-group") {
    await handleCreateGroup(interaction, config);
  }
});

client.login(token);
