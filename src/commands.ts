import { SlashCommandBuilder, ChannelType } from "discord.js";

export const commands = [
  new SlashCommandBuilder()
    .setName("setup")
    .setDescription("Configurar canal y rol admin.")
    .addChannelOption((option) =>
      option
        .setName("channel")
        .setDescription("El canal de admin.")
        .setRequired(true)
        .addChannelTypes(ChannelType.GuildText),
    )
    .addRoleOption((option) =>
      option
        .setName("role")
        .setDescription("El rol de admin.")
        .setRequired(true),
    )
    .addBooleanOption((option) =>
      option
        .setName("create_voice")
        .setDescription("Deberia el bot crear un canal de voz para cada grupo?")
        .setRequired(true),
    )
    .addChannelOption((option) =>
      option
        .setName("category")
        .setDescription("La categoría donde se crearán los canales de grupo")
        .setRequired(false)
        .addChannelTypes(ChannelType.GuildCategory),
    ),
  new SlashCommandBuilder()
    .setName("create-group")
    .setDescription("Crear un grupo con roles y canales.")
    .addStringOption((option) =>
      option
        .setName("name")
        .setDescription("Nombre del grupo.")
        .setRequired(true),
    )
    .addStringOption((option) =>
      option
        .setName("members")
        .setDescription(
          "Lista de miembros separada por espacios. Pueden ser menciones (@noise1) o ID.",
        )
        .setRequired(true),
    ),
].map((command) => command.toJSON());
