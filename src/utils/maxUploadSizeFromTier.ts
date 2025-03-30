import { GuildPremiumTier } from 'discord.js';

export function maxUploadSizeFromTier(tier: GuildPremiumTier) {
  switch (tier) {
    case GuildPremiumTier.Tier1:
      return 1e7; // 10mb
    case GuildPremiumTier.Tier2:
      return 5e7; // 50mb
    case GuildPremiumTier.Tier3:
      return 1e8; // 100mb

    default:
      return 1e7; // 10mb
  }
}
