# Mobile-Native Viral Discovery & Social Mechanics

**PRD ID**: VIR-001
**Priority**: P0 (Critical)
**Target Release**: Q3 2026
**Effort Estimate**: 12 weeks
**Owner**: Growth Team & Mobile Platform Team

## Executive Summary

Implement sophisticated mobile-first viral mechanics and content discovery systems that leverage mobile-native sharing patterns, social graph intelligence, and viral growth loops to rapidly expand Hearth Mobile's user base. This system will outperform Discord's mobile growth by creating compelling reasons for users to discover, share, and invite others through native mobile behaviors.

## Background & Context

Discord's mobile growth relies heavily on desktop-originated communities being accessed on mobile, missing opportunities for mobile-native viral growth. Mobile social apps grow fastest when they tap into natural mobile sharing behaviors and social discovery patterns that don't exist on desktop.

### Discord's Mobile Growth Limitations
- **Desktop Dependency**: Most servers discovered via desktop/web
- **Poor Mobile Sharing**: Difficult to share servers/content from mobile
- **Weak Social Graph**: Limited contact integration and friend discovery
- **No Viral Loops**: Missing mobile-native growth mechanics
- **Content Discovery**: Poor mobile content browsing experience
- **Invitation Friction**: Complex server joining process on mobile

### Mobile-First Growth Opportunities
- **Contact Integration**: Leverage mobile contact lists for discovery
- **Social Media Integration**: Native sharing to TikTok, Instagram Stories, etc.
- **Location-Based Discovery**: Find nearby communities and events
- **QR Code Mechanics**: Instant joining and sharing via camera
- **Mobile-Native Content**: Short-form content optimized for mobile consumption
- **Viral Mechanics**: Built-in growth loops that encourage sharing

## Success Metrics

### Primary Growth Metrics
- **Viral Coefficient**: 0.8+ (each user brings 0.8 new users)
- **Mobile-Originated Growth**: 60% of new users discover via mobile sharing
- **Contact Discovery**: 40% of users find friends through contact integration
- **Content Sharing Rate**: 25% of users share content monthly to external platforms

### Secondary Metrics
- **Time to First Share**: <3 days for 70% of new users
- **Server Discovery**: 80% of users discover new servers via mobile features
- **QR Code Usage**: 15% of server joins happen via QR codes
- **Social Platform Traffic**: 30% increase in inbound traffic from social media

### Business Impact
- 200% increase in mobile user acquisition rate
- 50% improvement in organic growth coefficient
- 75% of new servers created on mobile within 6 months
- Premium conversion rate increases by 35% for mobile-discovered users

## Core Features & Requirements

### 1. Intelligent Contact Integration & Discovery (VIR-001)
**Estimated Effort**: 3 weeks

#### Privacy-First Contact Discovery
```typescript
interface ContactDiscoverySystem {
  privacyModel: 'opt_in_only' | 'encrypted_matching' | 'anonymous_hashing';
  permissions: {
    readContacts: boolean;
    syncEnabled: boolean;
    findableByContacts: boolean;
  };
  matching: {
    phoneNumbers: boolean;
    emailAddresses: boolean;
    socialMediaHandles: boolean;
  };
}

interface FriendSuggestion {
  contactInfo: EncryptedContactInfo;
  mutualFriends: number;
  sharedServers: string[];
  suggestionReason: 'contact' | 'mutual_friend' | 'shared_server' | 'location';
  confidence: number; // 0-1
}
```

#### Implementation Features
- **Encrypted Contact Matching**: Hash-based contact discovery without exposing PII
- **Smart Suggestions**: ML-powered friend recommendations based on patterns
- **Mutual Friend Discovery**: "X mutual friends" suggestions with privacy controls
- **Batch Invitations**: Send invites to multiple contacts with personalized messages
- **Social Graph Building**: Automatically suggest relevant servers based on friend activity

### 2. Native Mobile Sharing & Content Virality (VIR-002)
**Estimated Effort**: 3 weeks

#### Multi-Platform Content Sharing
```typescript
interface ContentSharingOptions {
  platforms: {
    instagram_stories: InstagramStoriesConfig;
    tiktok: TikTokSharingConfig;
    snapchat: SnapchatSharingConfig;
    twitter: TwitterSharingConfig;
    generic_sharing: GenericShareConfig;
  };
  contentTypes: {
    server_invite: ServerInviteShare;
    message_screenshot: MessageScreenshotShare;
    voice_clip: VoiceClipShare;
    community_highlight: CommunityHighlightShare;
  };
}

interface ViralContentTemplate {
  id: string;
  name: string;
  platform: SocialPlatform;
  template: {
    backgroundImage?: string;
    overlays: UIElement[];
    animations: Animation[];
    branding: BrandingConfig;
  };
  callToAction: {
    text: string;
    action: 'join_server' | 'download_app' | 'view_content';
    deepLink: string;
  };
}
```

#### Mobile-Optimized Sharing Features
- **Story Templates**: Pre-designed templates for Instagram/Snapchat Stories
- **Auto-Generated Content**: AI-created shareable highlights from conversations
- **QR Code Integration**: Every server/channel gets a unique, shareable QR code
- **Voice Message Sharing**: Share voice messages as audio clips to social media
- **Community Highlights**: Shareable moment captures from server activities

### 3. Location-Based Community Discovery (VIR-003)
**Estimated Effort**: 2 weeks

#### Proximity-Based Server Discovery
```typescript
interface LocationDiscovery {
  discoverabilitySettings: {
    enabled: boolean;
    radius: number; // meters
    publicServersOnly: boolean;
    friendsOnly: boolean;
  };
  communityTypes: {
    local_events: LocalEventServer[];
    businesses: BusinessServer[];
    educational: SchoolUniversityServer[];
    gaming_cafes: GamingLocationServer[];
    meetups: MeetupServer[];
  };
  privacyControls: {
    shareLocation: boolean;
    anonymousDiscovery: boolean;
    locationHistoryEnabled: boolean;
  };
}
```

#### Location-Based Features
- **Nearby Communities**: Discover servers for local businesses, events, schools
- **Event Integration**: Servers tied to real-world events (concerts, conferences, meetups)
- **Campus Discovery**: Special integration for universities and schools
- **Business Partnerships**: Local businesses can create discoverable community servers
- **Privacy Controls**: Granular location sharing controls with anonymous options

### 4. Viral Mechanics & Growth Loops (VIR-004)
**Estimated Effort**: 2 weeks

#### Built-in Growth Incentives
```typescript
interface ViralMechanic {
  type: 'referral_reward' | 'content_unlock' | 'social_proof' | 'collaborative_unlock';
  triggers: GrowthTrigger[];
  rewards: {
    referrer: Reward;
    referee: Reward;
    community: CommunityReward;
  };
  viralCoefficient: number;
}

interface GrowthLoop {
  name: string;
  steps: GrowthStep[];
  targetAudience: UserSegment;
  expectedViralCoefficient: number;
  measurableOutcomes: Metric[];
}
```

#### Growth Loop Examples

**"Friends Unlock Features" Loop**
1. User joins server and enjoys content
2. Certain features locked until friends join
3. User shares invite to unlock premium features
4. Friends join and experience same loop
5. Network effect creates viral expansion

**"Content Creator Economy" Loop**
1. Creator posts engaging content in community
2. Content gets shared outside platform with attribution
3. New users discover platform through shared content
4. New users join to interact with creator
5. Creators earn rewards based on growth they generate

**"Local Event Discovery" Loop**
1. User discovers local event server
2. Attends event, meets people using same server
3. Real-world connections strengthen digital community
4. Users invite others from event to join server
5. Server becomes hub for local community activities

### 5. Mobile-Optimized Server Discovery (VIR-005)
**Estimated Effort**: 2 weeks

#### Intelligent Server Recommendations
```typescript
interface ServerDiscoveryEngine {
  algorithms: {
    collaborative_filtering: boolean; // "Users like you also joined..."
    content_based: boolean; // Based on interests, activity patterns
    social_graph: boolean; // Friends' servers and activities
    trending: boolean; // Popular servers with growth momentum
    location_based: boolean; // Nearby communities
  };
  personalization: {
    interests: string[];
    activityPatterns: ActivityPattern[];
    socialConnections: SocialConnection[];
    contentPreferences: ContentPreference[];
  };
}
```

#### Discovery Interface Features
- **Swipeable Server Browser**: Tinder-style server discovery with swipe actions
- **Category-Based Browsing**: Gaming, Study, Local, Hobbies, etc.
- **Trending Communities**: Real-time popular servers with join momentum
- **Friend Activity Feed**: See what servers friends are active in
- **Smart Notifications**: "Your friend just joined X server, interested?"

## Mobile-Specific Implementation Details

### iOS Implementation
```swift
class ViralMechanicsEngine {
    private let contactStore = CNContactStore()
    private let locationManager = CLLocationManager()

    func requestContactPermissions() -> Promise<Bool> {
        return Promise { seal in
            contactStore.requestAccess(for: .contacts) { granted, error in
                if granted {
                    self.syncContactsSecurely()
                }
                seal.fulfill(granted)
            }
        }
    }

    private func syncContactsSecurely() {
        // Implement privacy-preserving contact hashing
        let contacts = fetchContacts()
        let hashedContacts = contacts.map { hashContact($0) }
        ServerAPI.matchContacts(hashedContacts)
    }

    func shareToInstagramStories(content: SharableContent) {
        guard let url = content.generateInstagramURL() else { return }
        UIApplication.shared.open(url)
    }
}

// Location-based discovery
extension ViralMechanicsEngine: CLLocationManagerDelegate {
    func locationManager(_ manager: CLLocationManager, didUpdateLocations locations: [CLLocation]) {
        guard let location = locations.last else { return }
        discoverNearbyCommunities(location: location)
    }

    private func discoverNearbyCommunities(location: CLLocation) {
        ServerAPI.findNearbyServers(
            latitude: location.coordinate.latitude,
            longitude: location.coordinate.longitude,
            radius: 10000 // 10km
        )
    }
}
```

### Android Implementation
```kotlin
class ViralMechanicsManager(private val context: Context) {
    private val contentResolver = context.contentResolver
    private val fusedLocationClient = LocationServices.getFusedLocationProviderClient(context)

    fun syncContactsSecurely() {
        if (hasContactPermission()) {
            val contacts = fetchContactsSecurely()
            val hashedContacts = contacts.map { hashContact(it) }
            ApiClient.matchContacts(hashedContacts)
        }
    }

    fun shareToSocialMedia(content: SharableContent, platform: SocialPlatform) {
        when (platform) {
            SocialPlatform.INSTAGRAM_STORIES -> shareToInstagramStories(content)
            SocialPlatform.TIKTOK -> shareToTikTok(content)
            SocialPlatform.SNAPCHAT -> shareToSnapchat(content)
            else -> shareGeneric(content)
        }
    }

    private fun shareToInstagramStories(content: SharableContent) {
        val intent = Intent("com.instagram.share.ADD_TO_STORY").apply {
            putExtra("interactive_asset_uri", content.generateStickerUri())
            putExtra("content_url", content.deepLink)
            type = "image/*"
        }

        if (intent.resolveActivity(context.packageManager) != null) {
            context.startActivity(intent)
        }
    }

    fun requestLocationBasedDiscovery() {
        fusedLocationClient.lastLocation.addOnSuccessListener { location ->
            location?.let { discoverNearbyCommunities(it) }
        }
    }
}
```

### React Native Integration
```typescript
// Native bridge for viral mechanics
export class ViralMechanicsManager {
  static async requestContactPermissions(): Promise<boolean> {
    return await NativeModules.ViralMechanics.requestContactPermissions();
  }

  static async shareToSocialPlatform(
    content: SharableContent,
    platform: SocialPlatform
  ): Promise<boolean> {
    return await NativeModules.ViralMechanics.shareToSocialPlatform(content, platform);
  }

  static async discoverNearbyServers(radius: number = 10000): Promise<NearbyServer[]> {
    return await NativeModules.ViralMechanics.discoverNearbyServers(radius);
  }
}

// React component for viral server discovery
export const ServerDiscoveryScreen: React.FC = () => {
  const [nearbyServers, setNearbyServers] = useState<NearbyServer[]>([]);
  const [friendSuggestions, setFriendSuggestions] = useState<FriendSuggestion[]>([]);

  const handleSwipeRight = useCallback((server: Server) => {
    // Join server
    joinServer(server.id);
    trackViralAction('server_join_swipe', { serverId: server.id });
  }, []);

  const handleShare = useCallback((server: Server, platform: SocialPlatform) => {
    const shareContent = generateShareContent(server, platform);
    ViralMechanicsManager.shareToSocialPlatform(shareContent, platform);
    trackViralAction('server_share', { serverId: server.id, platform });
  }, []);

  return (
    <View style={styles.container}>
      <SwipeableCardStack
        data={nearbyServers}
        onSwipeRight={handleSwipeRight}
        renderCard={({ item: server }) => (
          <ServerCard
            server={server}
            onShare={(platform) => handleShare(server, platform)}
          />
        )}
      />

      <FriendSuggestions
        suggestions={friendSuggestions}
        onInvite={sendFriendInvite}
      />
    </View>
  );
};
```

## Privacy & Compliance

### Data Protection
- **Contact Hashing**: One-way hashing of contact information
- **Location Anonymization**: Approximate location for discovery, exact location never stored
- **Social Graph Privacy**: Users control what information is shareable
- **GDPR/CCPA Compliance**: Full data deletion and export capabilities

### User Controls
- **Granular Permissions**: Individual control over each viral mechanic
- **Discoverability Settings**: Control how others can find you
- **Sharing Controls**: Approve what content can be shared externally
- **Block Lists**: Prevent specific contacts from discovering your account

## Quality Assurance & Testing

### Growth Testing
- A/B testing different viral mechanics and incentive structures
- Cohort analysis to measure long-term viral coefficient impact
- Attribution tracking for mobile-originated growth
- Conversion rate optimization for each step of viral loops

### Privacy Testing
- Security audit of contact hashing and matching systems
- Location privacy verification and data minimization
- Social graph leak prevention testing
- User consent flow validation

### Platform Integration Testing
- Sharing functionality across all major social platforms
- Deep linking and attribution tracking verification
- QR code generation and scanning reliability
- Contact permission handling across iOS/Android versions

## Rollout Strategy

### Phase 1: Foundation (Weeks 1-4)
- Contact integration and friend discovery
- Basic sharing mechanics
- QR code system implementation

### Phase 2: Social Integration (Weeks 5-8)
- Social platform sharing integrations
- Location-based discovery
- Viral loop implementation

### Phase 3: Intelligence (Weeks 9-12)
- AI-powered discovery recommendations
- Growth optimization and analytics
- Advanced personalization features

### Growth Testing Framework
- 10% user rollout for initial viral mechanics testing
- A/B testing framework for different growth strategies
- Real-time analytics dashboard for viral coefficient tracking
- Progressive feature rollout based on engagement metrics

## Dependencies & Risks

### Technical Dependencies
- Social platform API integrations (Instagram, TikTok, Snapchat)
- Location services and mapping APIs
- Contact access and encryption systems
- Deep linking and attribution infrastructure

### Risk Mitigation
- **Privacy Concerns**: Comprehensive privacy controls and transparent data usage
- **Spam Prevention**: Rate limiting and abuse detection for viral mechanics
- **Platform Compliance**: Adherence to social platform sharing guidelines
- **Growth Sustainability**: Balanced incentives that don't compromise user experience

## Success Criteria

### Must-Have (P0)
- ✅ 0.6+ viral coefficient within 3 months of launch
- ✅ 40% of users enable contact discovery within first week
- ✅ 20% of users share content to external platforms monthly
- ✅ Full privacy compliance and user control systems

### Nice-to-Have (P1)
- 🎯 0.8+ viral coefficient (best-in-class for social apps)
- 🎯 50% of new servers discovered via mobile features
- 🎯 AI-powered personalized growth recommendations
- 🎯 Cross-platform viral mechanics (web, desktop integration)

This comprehensive viral growth system positions Hearth Mobile to achieve exponential user growth through mobile-native social mechanics, establishing market leadership through superior viral design rather than just feature parity.