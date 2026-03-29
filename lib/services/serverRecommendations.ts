/**
 * Server Recommendations Service
 *
 * Interest-based server recommendation engine for onboarding.
 * Phase 1: Static category mapping. Phase 3 will add ML-based matching.
 */

export interface ServerRecommendation {
  id: string;
  name: string;
  description: string;
  category: string;
  memberCount: number;
  iconUrl?: string;
  tags: string[];
}

const INTEREST_CATEGORY_MAP: Record<string, string[]> = {
  gaming: ["fps", "moba", "rpg", "strategy", "indie", "retro"],
  music: ["production", "listening", "instruments", "genres", "live"],
  tech: ["programming", "hardware", "ai", "web-dev", "mobile-dev", "devops"],
  art: ["digital-art", "illustration", "photography", "3d-modeling", "animation"],
  sports: ["football", "basketball", "esports", "fitness", "outdoors"],
  education: ["study-groups", "tutoring", "languages", "science", "math"],
  entertainment: ["movies", "tv-shows", "anime", "books", "podcasts"],
  social: ["hangout", "events", "dating", "networking", "local"],
};

const MOCK_SERVERS: ServerRecommendation[] = [
  { id: "srv_gaming_1", name: "Hearth Gaming Hub", description: "The largest gaming community on Hearth", category: "gaming", memberCount: 125000, tags: ["gaming", "fps", "moba"] },
  { id: "srv_gaming_2", name: "Indie Game Devs", description: "Share and discuss indie game development", category: "gaming", memberCount: 45000, tags: ["gaming", "indie", "development"] },
  { id: "srv_music_1", name: "Music Producers Unite", description: "Collaborate on music production", category: "music", memberCount: 78000, tags: ["music", "production", "daw"] },
  { id: "srv_tech_1", name: "Dev Community", description: "Programming discussions and help", category: "tech", memberCount: 200000, tags: ["tech", "programming", "web-dev"] },
  { id: "srv_tech_2", name: "AI & ML Enthusiasts", description: "Explore artificial intelligence together", category: "tech", memberCount: 92000, tags: ["tech", "ai", "machine-learning"] },
  { id: "srv_art_1", name: "Digital Artists Collective", description: "Share your artwork and get feedback", category: "art", memberCount: 67000, tags: ["art", "digital-art", "illustration"] },
  { id: "srv_sports_1", name: "Sports Talk", description: "All sports, all the time", category: "sports", memberCount: 150000, tags: ["sports", "football", "basketball"] },
  { id: "srv_edu_1", name: "Study Together", description: "Virtual study rooms and tutoring", category: "education", memberCount: 55000, tags: ["education", "study-groups", "tutoring"] },
  { id: "srv_ent_1", name: "Anime & Manga", description: "Discuss your favorite anime and manga", category: "entertainment", memberCount: 180000, tags: ["entertainment", "anime", "manga"] },
  { id: "srv_social_1", name: "Hearth Hangout", description: "Meet new people and make friends", category: "social", memberCount: 95000, tags: ["social", "hangout", "events"] },
];

class ServerRecommendationService {
  getCategories(): string[] {
    return Object.keys(INTEREST_CATEGORY_MAP);
  }

  getSubcategories(category: string): string[] {
    return INTEREST_CATEGORY_MAP[category] ?? [];
  }

  getRecommendations(
    interests: string[],
    limit: number = 5
  ): ServerRecommendation[] {
    if (interests.length === 0) {
      return MOCK_SERVERS.sort((a, b) => b.memberCount - a.memberCount).slice(0, limit);
    }

    const scored = MOCK_SERVERS.map((server) => {
      let score = 0;
      for (const interest of interests) {
        if (server.category === interest) score += 3;
        if (server.tags.includes(interest)) score += 2;
        const subcategories = INTEREST_CATEGORY_MAP[interest] ?? [];
        for (const tag of server.tags) {
          if (subcategories.includes(tag)) score += 1;
        }
      }
      return { server, score };
    });

    return scored
      .filter((s) => s.score > 0)
      .sort((a, b) => b.score - a.score || b.server.memberCount - a.server.memberCount)
      .slice(0, limit)
      .map((s) => s.server);
  }

  getRecommendationsByCategory(
    categories: string[],
    limit: number = 5
  ): ServerRecommendation[] {
    return MOCK_SERVERS
      .filter((server) => categories.includes(server.category))
      .sort((a, b) => b.memberCount - a.memberCount)
      .slice(0, limit);
  }
}

export const serverRecommendations = new ServerRecommendationService();
