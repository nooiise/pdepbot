import { ChatInputCommandInteraction, PermissionFlagsBits } from "discord.js";
import { saveGuildConfig } from "../config";

export async function handleSetup(interaction: ChatInputCommandInteraction) {
  const { guildId } = interaction;
  if (!guildId) return;

  if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
    await interaction.reply({
      content: "Solo administradores pueden ejecutar este comando.",
      ephemeral: true,
    });
    return;
  }

  const channel = interaction.options.getChannel("channel", true);
  const role = interaction.options.getRole("role", true);
  const createVoice = interaction.options.getBoolean("create_voice", true);
  const category = interaction.options.getChannel("category");

  saveGuildConfig(guildId, {
    adminChannelId: channel.id,
    adminRoleId: role.id,
    createVoiceChannel: createVoice,
    categoryChannelId: category?.id,
  });

  await interaction.reply({
    content: `Configuracion completada! 
- Canal admin: <#${channel.id}>
- Rol admin: <@&${role.id}>
- Crear canales de voz para grupos?: ${createVoice ? "Si" : "No"}${category ? `\n- Categoría: <#${category.id}>` : ""}`,
    ephemeral: true,
  });
}
