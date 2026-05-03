import {
  ChatInputCommandInteraction,
  ChannelType,
  PermissionFlagsBits,
  TextChannel,
  VoiceChannel,
  Role,
  Guild,
} from "discord.js";
import { GuildConfig } from "../config";

/**
 * Common logic to create/sync channels for a group role.
 */
async function syncChannels(
  guild: Guild,
  role: Role,
  groupName: string,
  config: GuildConfig
): Promise<{ textChannel: TextChannel; voiceChannel: VoiceChannel | null }> {
  const channelName = `grupo-${groupName.toLowerCase().replace(/\s+/g, "-")}`;

  // Verify if category still exists
  let categoryId = config.categoryChannelId;
  if (categoryId) {
    const category = guild.channels.cache.get(categoryId);
    if (!category || category.type !== ChannelType.GuildCategory) {
      categoryId = undefined;
    }
  }

  // 1. Text Channel
  let textChannel = guild.channels.cache.find(
    (c) => c.name === channelName && c.type === ChannelType.GuildText
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
          allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages],
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

  // 2. Voice Channel
  let voiceChannel: VoiceChannel | null = null;
  if (config.createVoiceChannel) {
    voiceChannel = guild.channels.cache.find(
      (c) => c.name === channelName && c.type === ChannelType.GuildVoice
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
            allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.Connect, PermissionFlagsBits.Speak],
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

  return { textChannel, voiceChannel };
}

export async function handleCreateGroup(
  interaction: ChatInputCommandInteraction,
  config: GuildConfig
) {
  const groupName = interaction.options.getString("name", true);
  const membersInput = interaction.options.getString("members", false);

  await interaction.deferReply();

  try {
    const guild = interaction.guild!;
    const roleName = `Grupo ${groupName}`;

    let role = guild.roles.cache.find((r) => r.name === roleName);
    if (!role) {
      role = await guild.roles.create({
        name: roleName,
        reason: `Group creation: ${groupName}`,
      });
    }

    const { textChannel, voiceChannel } = await syncChannels(guild, role, groupName, config);

    // Handle Members if provided
    const addedMembers: string[] = [];
    const failedMembers: string[] = [];

    if (membersInput) {
      const memberIds = membersInput.match(/\d+/g) || [];
      for (const id of memberIds) {
        try {
          const member = await guild.members.fetch(id);
          await member.roles.add(role);
          addedMembers.push(member.displayName);
        } catch (e) {
          failedMembers.push(id);
        }
      }
    }

    let response = `Grupo **${groupName}** procesado.
- Rol: ${role.name}
- Canal de texto: <#${textChannel.id}>`;

    if (voiceChannel) {
      response += `\n- Canal de voz: <#${voiceChannel.id}>`;
    }

    if (addedMembers.length > 0) {
      response += `\n- Integrantes agregados: ${addedMembers.join(", ")}`;
    }

    if (failedMembers.length > 0) {
      response += `\n- Error al agregar integrante (verifica IDs): ${failedMembers.join(", ")}`;
    }

    await interaction.editReply(response);
  } catch (error) {
    console.error(error);
    await interaction.editReply("Un error ocurrió al crear el grupo.");
  }
}

export async function handleSyncGroupChannels(
  interaction: ChatInputCommandInteraction,
  config: GuildConfig
) {
  const role = interaction.options.getRole("role", true) as Role;

  if (!role.name.startsWith("Grupo ")) {
    await interaction.reply({
      content: "El rol seleccionado debe empezar con 'Grupo '.",
      ephemeral: true,
    });
    return;
  }

  await interaction.deferReply();

  try {
    const guild = interaction.guild!;
    const groupName = role.name.replace("Grupo ", "");

    const { textChannel, voiceChannel } = await syncChannels(guild, role, groupName, config);

    let response = `Sincronización completada para el rol **${role.name}**.
- Canal de texto: <#${textChannel.id}>`;

    if (voiceChannel) {
      response += `\n- Canal de voz: <#${voiceChannel.id}>`;
    }

    await interaction.editReply(response);
  } catch (error) {
    console.error(error);
    await interaction.editReply("Ocurrió un error al sincronizar los canales.");
  }
}

export async function handleSyncGroupsBulk(
  interaction: ChatInputCommandInteraction,
  config: GuildConfig
) {
  const rolesInput = interaction.options.getString("roles", true);

  await interaction.deferReply();

  try {
    const guild = interaction.guild!;
    const roleIds = Array.from(new Set(rolesInput.match(/\d+/g) || []));
    const results: string[] = [];

    for (const id of roleIds) {
      const role = guild.roles.cache.get(id);
      if (!role) {
        results.push(`- ❌ ID \`${id}\`: Rol no encontrado.`);
        continue;
      }

      if (!role.name.startsWith("Grupo ")) {
        results.push(`- ❌ ${role.name}: No empieza con 'Grupo '.`);
        continue;
      }

      const groupName = role.name.replace("Grupo ", "");
      const { textChannel } = await syncChannels(guild, role, groupName, config);
      results.push(`- ✅ **${role.name}**: Sincronizado (<#${textChannel.id}>).`);
    }

    if (results.length === 0) {
      await interaction.editReply("No se encontraron IDs de roles válidos.");
    } else {
      const responseText = `**Resultados de sincronización masiva:**\n${results.join("\n")}`;
      // Discord has a 2000 character limit, if it's too long we might need to truncate or split
      if (responseText.length > 2000) {
        await interaction.editReply("Proceso completado, pero la lista es demasiado larga para mostrarla completa.");
      } else {
        await interaction.editReply(responseText);
      }
    }
  } catch (error) {
    console.error(error);
    await interaction.editReply("Ocurrió un error durante la sincronización masiva.");
  }
}

export async function handleDeleteGroup(
  interaction: ChatInputCommandInteraction,
  config: GuildConfig
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
        (c.type === ChannelType.GuildText || c.type === ChannelType.GuildVoice)
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
      await interaction.editReply(`No se encontraron canales o roles para el grupo **${groupName}**.`);
    } else {
      await interaction.editReply(`Grupo **${groupName}** eliminado correctamente.`);
    }
  } catch (error) {
    console.error(error);
    await interaction.editReply("Ocurrió un error al intentar eliminar el grupo.");
  }
}
