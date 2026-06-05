import type { User, Booth, RecommendationResult, RoutePoint, VisitingRoute } from '../types';

export function recommendExhibitors(
  visitor: User,
  allExhibitors: User[],
  booths: Booth[]
): RecommendationResult[] {
  const preferences = visitor.preferences?.industries || [];
  const interests = visitor.preferences?.interests || [];

  return allExhibitors
    .filter((e) => e.role === 'exhibitor')
    .map((exhibitor) => {
      const booth = booths.find(
        (b) => (b.status === 'occupied' || b.status === 'locked') && b.exhibitorId === exhibitor.id
      );

      if (!booth) return null;

      let matchScore = 0;
      const reasons: string[] = [];

      const exhibitorIndustries = exhibitor.preferences?.industries || [];
      const industryMatches = preferences.filter((p) => exhibitorIndustries.includes(p));
      matchScore += industryMatches.length * 25;
      if (industryMatches.length > 0) {
        reasons.push(`匹配行业：${industryMatches.join('、')}`);
      }

      const exhibitorInterests = exhibitor.preferences?.interests || [];
      const interestMatches = interests.filter((i) => exhibitorInterests.includes(i));
      matchScore += interestMatches.length * 15;
      if (interestMatches.length > 0) {
        reasons.push(`匹配兴趣：${interestMatches.join('、')}`);
      }

      matchScore += (booth.popularityScore || 0) * 50;
      if (booth.popularityScore > 0.7) {
        reasons.push('高人气展位');
      }

      if (exhibitor.creditLevel && exhibitor.creditLevel >= 4) {
        matchScore += 10;
        reasons.push('优质展商');
      }

      return {
        exhibitor,
        booth,
        matchScore: Math.round(matchScore),
        reason: reasons.length > 0 ? reasons.join(' | ') : '为您推荐',
      };
    })
    .filter((item): item is RecommendationResult => item !== null && item.matchScore > 0)
    .sort((a, b) => b.matchScore - a.matchScore)
    .slice(0, 12);
}

export function generateVisitingRoute(
  visitor: User,
  recommendations: RecommendationResult[],
  _hallLayout: { width: number; height: number }
): VisitingRoute {
  const sortedByLocation = [...recommendations]
    .filter((r) => r.matchScore >= 30)
    .slice(0, 8)
    .sort((a, b) => {
      const distA = Math.sqrt(a.booth.location.x ** 2 + a.booth.location.y ** 2);
      const distB = Math.sqrt(b.booth.location.x ** 2 + b.booth.location.y ** 2);
      return distA - distB;
    });

  const points: RoutePoint[] = sortedByLocation.map((r, index) => ({
    boothId: r.booth.id,
    boothCode: r.booth.code,
    exhibitorName: r.exhibitor.company || r.exhibitor.name,
    industry: r.exhibitor.preferences?.industries?.[0] || '综合',
    estimatedTime: 15 + Math.floor(Math.random() * 15),
    order: index + 1,
  }));

  const totalDuration = points.reduce((sum, p) => sum + p.estimatedTime + 5, 0);

  return {
    id: `route-${Date.now()}`,
    visitorId: visitor.id,
    name: `智能参观路线-${new Date().toLocaleDateString('zh-CN')}`,
    points,
    totalDuration,
    createdAt: new Date().toISOString(),
  };
}

export function recommendForums(
  visitor: User,
  forums: Array<{ id: string; title: string; industry: string; availableSeats: number }>
): Array<{ id: string; title: string; matchScore: number; reason: string }> {
  const preferences = visitor.preferences?.industries || [];

  return forums
    .map((forum) => {
      let matchScore = 0;
      const reasons: string[] = [];

      if (preferences.includes(forum.industry)) {
        matchScore += 50;
        reasons.push(`匹配行业：${forum.industry}`);
      }

      if (forum.availableSeats > forum.availableSeats * 0.5) {
        matchScore += 20;
        reasons.push('座位充足');
      } else if (forum.availableSeats > 0) {
        matchScore += 10;
        reasons.push('座位紧张');
      }

      return {
        ...forum,
        matchScore,
        reason: reasons.join(' | '),
      };
    })
    .filter((f) => f.matchScore > 0 && f.availableSeats > 0)
    .sort((a, b) => b.matchScore - a.matchScore);
}
