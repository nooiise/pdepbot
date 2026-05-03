import fs from "fs";
import path from "path";

const CONFIG_PATH = path.join(__dirname, "../data/config.json");

export interface GuildConfig {
  adminChannelId?: string;
  adminRoleId?: string;
  createVoiceChannel: boolean;
}

interface ConfigStore {
  [guildId: string]: GuildConfig;
}

export function getGuildConfig(guildId: string): GuildConfig {
  const store = getAllConfigs();
  return store[guildId] || { createVoiceChannel: true };
}

function getAllConfigs(): ConfigStore {
  if (!fs.existsSync(CONFIG_PATH)) return {};

  try {
    const data = fs.readFileSync(CONFIG_PATH, "utf-8");
    return JSON.parse(data);
  } catch (error) {
    console.error("Error reading config:", error);
    return {};
  }
}

export function saveGuildConfig(guildId: string, config: GuildConfig): void {
  const store = getAllConfigs();
  store[guildId] = config;

  const dataDir = path.dirname(CONFIG_PATH);
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

  fs.writeFileSync(CONFIG_PATH, JSON.stringify(store, null, 2));
}
