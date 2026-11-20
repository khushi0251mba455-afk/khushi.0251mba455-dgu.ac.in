export type StageId =
  | 'competition-positioning'
  | 'revenue-pricing'
  | 'market-size-demand'
  | 'go-to-market';

export type StageStatus = 'active' | 'coming_next';

export interface StudioStage {
  id: StageId;
  order: number;
  title: string;
  mission?: string;
  status: StageStatus;
}

export type GeographyGroup = 'all' | 'dehradun' | 'campuses' | 'india-regional';

export interface Venture {
  id: string;
  number: number;
  name: string;
  targetCustomer: string;
  problem: string;
  geography: string;
  offer: string;
  geographyGroup: Exclude<GeographyGroup, 'all'>;
}

export type AlternativeType =
  | 'Direct Competitor'
  | 'Indirect Competitor'
  | 'Substitute'
  | 'Do Nothing';

export type EvidenceSourceType =
  | 'Website URL'
  | 'Product Page'
  | 'Menu / Price Page'
  | 'App Listing'
  | 'Review Source'
  | 'Observation Note'
  | 'Other Relevant Evidence';

export type EvidenceQuality = 'Strong' | 'Moderate' | 'Weak';

export interface CompetitorAlternative {
  id: string;
  name: string;
  type: AlternativeType | '';
  priceCost: string;
  priceNotApplicable: boolean;
  mainOffer: string;
  mainStrength: string;
  mainWeakness: string;
  evidenceSourceType: EvidenceSourceType | '';
  evidenceSource: string;
  evidenceQuality: EvidenceQuality | '';
}

export type StudioView = 'bank' | 'competition-lab';

export type CompetitionLabTab =
  | 'research'
  | 'market-battlefield'
  | 'positioning-statement'
  | 'ai-strategy-challenge';

export interface PositioningAxes {
  xName: string;
  xLeftLabel: string;
  xRightLabel: string;
  yName: string;
  yBottomLabel: string;
  yTopLabel: string;
}

export interface PositioningScore {
  x: number | null;
  y: number | null;
}

export interface MarketBattlefieldState {
  axes: PositioningAxes;
  ventureScore: PositioningScore;
  alternativeScores: Record<string, PositioningScore>;
}

export interface PositioningStatementState {
  targetCustomer: string;
  category: string;
  primaryBenefit: string;
  mainAlternativeId: string;
  reasonToBelieve: string;
  manualStatement: string | null;
  savedStatement: string | null;
  savedAt: string | null;
}

export type PositioningCheckRating = 'Strong' | 'Needs Improvement' | 'Weak';

export interface PositioningCheckItem {
  dimension:
    | 'Target Customer Clarity'
    | 'Primary Benefit Clarity'
    | 'Differentiation'
    | 'Evidence / Reason to Believe'
    | 'Consistency with the Positioning Map';
  rating: PositioningCheckRating;
  explanation: string;
  needsEvidence?: boolean;
}

export interface ChallengeQuestion {
  id: string;
  focusArea: string;
  question: string;
}

export interface ChallengeFeedback {
  supported: string;
  assumption: string;
  nextEvidenceNeeded: string;
}

export interface StrategyChallengeReview {
  strongestPart: string;
  biggestAssumption: string;
  nextValidationPriority: string;
}

export interface StrategyChallengeState {
  questions: ChallengeQuestion[];
  responses: Record<string, string>;
  feedbacks: Record<string, ChallengeFeedback>;
  currentIndex: number;
  finalReview: StrategyChallengeReview | null;
  completedAt: string | null;
}
