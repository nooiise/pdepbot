import {
  ChatInputCommandInteraction,
  ChannelType,
  PermissionFlagsBits,
  TextChannel,
  VoiceChannel,
} from "discord.js";
import { GuildConfig } from "../config";

export async function handleCreateGroup(
  interaction: ChatInputCommandInteraction,
  config: GuildConfig,
) {
  const groupName = interaction.options.getString("name", true);
  const membersInput = interaction.options.getString("members", true);

  await interaction.deferReply();

  try {
    const guild = interaction.guild!;
    const roleName = `Grupo ${groupName}`;
    const channelName = `grupo-${groupName.toLowerCase().replace(/\s+/g, "-")}`;

    let categoryId = config.categoryChannelId;
    if (categoryId) {
      const category = guild.channels.cache.get(categoryId);
      if (!category || category.type !== ChannelType.GuildCategory) {
        categoryId = undefined; 
      }
    }

    let role = guild.roles.cache.find((r) => r.name === roleName);
    if (!role) {
      role = await guild.roles.create({
        name: roleName,
        reason: `Group creation: ${groupName}`,
      });
    }

    let textChannel = guild.channels.cache.find(
      (c) => c.name === channelName && c.type === ChannelType.GuildText,
    ) as TextChannel;
    if (!textChannel) {
      textChannel = await guild.channels.create({
        name: channelName,
        type: ChannelType.GuildText,
        parent: categoryId,
        permissionOverwrites: [
          {
            id: guild.id,
            deny: [PermissionFlagsBits.ViewChannel],
          },
          {
            id: role.id,
            allow: [
              PermissionFlagsBits.ViewChannel,
              PermissionFlagsBits.SendMessages,
            ],
          },
        ],
      });
    } else {
      await textChannel.permissionOverwrites.edit(role.id, {
        ViewChannel: true,
        SendMessages: true,
      });
      if (categoryId && textChannel.parentId !== categoryId) {
        await textChannel.setParent(categoryId);
      }
    }

    let voiceChannel: VoiceChannel | null = null;
    if (config.createVoiceChannel) {
      voiceChannel = guild.channels.cache.find(
        (c) => c.name === channelName && c.type === ChannelType.GuildVoice,
      ) as VoiceChannel;
      if (!voiceChannel) {
        voiceChannel = await guild.channels.create({
          name: channelName,
          type: ChannelType.GuildVoice,
          parent: categoryId,
          permissionOverwrites: [
            {
              id: guild.id,
              deny: [PermissionFlagsBits.ViewChannel],
            },
            {
              id: role.id,
              allow: [
                PermissionFlagsBits.ViewChannel,
                PermissionFlagsBits.Connect,
                PermissionFlagsBits.Speak,
              ],
            },
          ],
        });
      } else {
        await voiceChannel.permissionOverwrites.edit(role.id, {
          ViewChannel: true,
          Connect: true,
          Speak: true,
        });
        if (categoryId && voiceChannel.parentId !== categoryId) {
          await voiceChannel.setParent(categoryId);
        }
      }
    }

    const memberIds = membersInput.match(/\d+/g) || [];
    const addedMembers: string[] = [];
    const failedMembers: string[] = [];

    for (const id of memberIds) {
      try {
        const member = await guild.members.fetch(id);
        await member.roles.add(role);
        addedMembers.push(member.displayName);
      } catch (e) {
        failedMembers.push(id);
      }
    }

    let response = `Grupo **${groupName}** procesado.
- Rol: ${role.name}
- Canal de texto: <#${textChannel.id}>`;

    if (voiceChannel) {
      response += `\n- Canal de voz: <#${voiceChannel.id}>`;
    }

    response += `\n- Integrantes: ${addedMembers.join(", ") || "None"}`;

    if (failedMembers.length > 0) {
      response += `\n- Error al agregar integrante (verifica IDs): ${failedMembers.join(", ")}`;
    }

    await interaction.editReply(response);
  } catch (error) {
    console.error(error);
    await interaction.editReply(
      "Un error ocurrio al crear el grupo. Verifica la consola.",
    );
  }
}

export async function handleDeleteGroup(
  interaction: ChatInputCommandInteraction,
  config: GuildConfig,
) {
  const groupName = interaction.options.getString("name", true);
  const roleName = `Grupo ${groupName}`;
  const channelName = `grupo-${groupName.toLowerCase().replace(/\s+/g, "-")}`;

  await interaction.deferReply();

  try {
    const guild = interaction.guild!;
    let deletedCount = 0;

    const channelsToDelete = guild.channels.cache.filter(
      (c) =>
        c.name === channelName &&
        (c.type === ChannelType.GuildText || c.type === ChannelType.GuildVoice),
    );

    for (const channel of channelsToDelete.values()) {
      await channel.delete(`Group deletion: ${groupName}`);
      deletedCount++;
    }

    const role = guild.roles.cache.find((r) => r.name === roleName);
    if (role) {
      await role.delete(`Group deletion: ${groupName}`);
      deletedCount++;
    }

    if (deletedCount === 0) {
      await interaction.editReply(
        `No se encontraron canales o roles para el grupo **${groupName}**.`,
      );
    } else {
      await interaction.editReply(
        `Grupo **${groupName}** eliminado correctamente (canales y rol).`,
      );
    }
  } catch (error) {
    console.error(error);
    await interaction.editReply("Ocurrió un error al intentar eliminar el grupo.");
  }
}
