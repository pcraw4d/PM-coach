import React from 'react';
import { InterviewType, Question } from './types.ts';

export const QUESTIONS: Question[] = [
  // --- PRODUCT SENSE ---
  { id: 'ps-homework', type: InterviewType.PRODUCT_SENSE, text: "Design a product to help students with homework.", hint: "Identify specific pain points: is it motivation, understanding complex concepts, or time management?" },
  { id: 'ps-maps-better', type: InterviewType.PRODUCT_SENSE, text: "You are the PM at Google Maps. How would you make it better?", hint: "Think beyond navigation. Consider local discovery, social features, or specific transit modes." },
  { id: 'ps-gardening', type: InterviewType.PRODUCT_SENSE, text: "Design a product for gardening.", hint: "Target a specific persona: urban apartment dwellers vs. rural experts. Focus on sustainability or community." },
  { id: 'ps-group-travel', type: InterviewType.PRODUCT_SENSE, text: "Build a product for Group Travel.", hint: "Solve for the coordination headache: splitting costs, voting on itineraries, or real-time location sharing." },
  { id: 'ps-musical-instr', type: InterviewType.PRODUCT_SENSE, text: "Design a product to help people learn to play a musical instrument.", hint: "Consider the feedback loop: how does the user know they are playing correctly? Think about AR/AI or peer review." },
  { id: 'ps-la-2028', type: InterviewType.PRODUCT_SENSE, text: "Build a product for the 2028 LA Olympics.", hint: "Think about the visitor experience: transportation, event discovery, or athlete-fan interactions." },
  { id: 'ps-fundraising', type: InterviewType.PRODUCT_SENSE, text: "Design a product to help raise funds for causes.", hint: "Focus on trust, transparency, and reducing the friction of small, recurring donations." },
  { id: 'ps-farm-workers', type: InterviewType.PRODUCT_SENSE, text: "Build a product for farm workers.", hint: "Consider connectivity constraints, language barriers, and physical environment (sun, gloves, outdoor use)." },
  { id: 'ps-fav-improve', type: InterviewType.PRODUCT_SENSE, text: "What is your favorite product and how would you improve it?", hint: "Pick a product you use daily. State the goal, the users, and a specific friction point you've personally felt." },
  { id: 'ps-parking', type: InterviewType.PRODUCT_SENSE, text: "Design a parking solution for Google Maps.", hint: "Consider the 'last mile' problem—finding a spot is often harder than driving to the destination." },
  { id: 'ps-art-connect', type: InterviewType.PRODUCT_SENSE, text: "Build a product for people to enjoy and connect over art.", hint: "Think about virtual galleries, social curation, or supporting emerging artists." },
  { id: 'ps-healthcare-consumers', type: InterviewType.PRODUCT_SENSE, text: "Design a product to connect consumers to health care professionals.", hint: "Focus on accessibility, scheduling transparency, and the patient-doctor trust factor." },
  { id: 'ps-meta-homes', type: InterviewType.PRODUCT_SENSE, text: "Design a product for Meta that helps you buy homes.", hint: "Leverage social signals. How could your network help verify a neighborhood or a seller?" },
  { id: 'ps-handy-person', type: InterviewType.PRODUCT_SENSE, text: "Build a product to help people find a handy person.", hint: "Focus on the 'vetted' aspect. How do you ensure quality and safety for in-home services?" },
  { id: 'ps-blind-grocery', type: InterviewType.PRODUCT_SENSE, text: "Design a grocery purchase experience for blind people.", hint: "Think about haptic feedback, voice UI, and the logistics of item placement in a physical store." },
  { id: 'ps-vending-machine', type: InterviewType.PRODUCT_SENSE, text: "Design a vending machine for a hotel.", hint: "What unique needs do travelers have at 2 AM? Think beyond snacks—chargers, toiletries, or local souvenirs." },
  { id: 'ps-tesla-fitness', type: InterviewType.PRODUCT_SENSE, text: "You are a PM at Tesla, explore a fitness product.", hint: "How does this fit the brand? Think high-performance, engineering excellence, or integration with the car/energy ecosystem." },
  { id: 'ps-emergency-home', type: InterviewType.PRODUCT_SENSE, text: "Build a META product to help people in emergency at home.", hint: "Speed of response is key. How do you leverage existing hardware like Portal or smart speakers?" },
  { id: 'ps-antiques', type: InterviewType.PRODUCT_SENSE, text: "Design a product to buy/sell antiques.", hint: "Authentication and condition reporting are the biggest hurdles in this market." },
  { id: 'ps-year-review', type: InterviewType.PRODUCT_SENSE, text: "Imagine you are the PM for Google Photos, Design the Year-in-review feature for it.", hint: "Focus on emotional storytelling and sharing capabilities." },
  { id: 'ps-etsy-revenue', type: InterviewType.PRODUCT_SENSE, text: "You're hired as a PM at Etsy to 3X revenue in the next 5 years. What's your strategy?", hint: "Analyze current monetization levers: listing fees, seller services, or buyer-side premium features." },
  { id: 'ps-rideshare-seniors', type: InterviewType.PRODUCT_SENSE, text: "Design a ride-sharing app for senior citizens.", hint: "Accessibility, simple UI, and trust/safety features are paramount." },
  { id: 'ps-waymo-velocity', type: InterviewType.PRODUCT_SENSE, text: "You are a PM for Waymo. Design a solution to improve the development velocity.", hint: "Think about simulation efficiency, edge case labeling, or engineer tooling." },
  { id: 'ps-zillow-rentals', type: InterviewType.PRODUCT_SENSE, text: "Should Zillow build a rental management product? How do you design it?", hint: "Evaluate the supply side (landlords) versus the demand side (renters)." },
  { id: 'ps-disney-wait', type: InterviewType.PRODUCT_SENSE, text: "If you were the PM at Disney World, how would you design a product to reduce the wait times for the rides?", hint: "Virtual queuing, dynamic pricing, or distraction-based entertainment during waits." },
  { id: 'ps-animal-ai', type: InterviewType.PRODUCT_SENSE, text: "OpenAI has created an AI that lets humans talk to animals. What would you build and why?", hint: "Think about specific use cases: veterinary care, pet training, or wildlife conservation." },
  { id: 'ps-alarm-clock-apple', type: InterviewType.PRODUCT_SENSE, text: "You are PM at Apple. If Tim Cook asks you to build an alarm clock, would you say yes and what would you build?", hint: "Think about holistic sleep health—not just waking up, but the entire wind-down and sleep cycle." },
  { id: 'ps-vending-hotel', type: InterviewType.PRODUCT_SENSE, text: "Design a vending machine for a hotel lobby.", hint: "What do travelers need at 3 AM? Adapt for high-end versus budget travelers." },

  // --- ANALYTICAL THINKING ---
  { id: 'at-meta-events', type: InterviewType.ANALYTICAL_THINKING, text: "Why would Meta build events and measure success for it?", hint: "Think about user retention, data on real-world intent, and competing with platforms like Eventbrite." },
  { id: 'at-zoom-business', type: InterviewType.ANALYTICAL_THINKING, text: "You are the PM for Zoom for Business. How do you set goals and measure success?", hint: "Focus on B2B metrics: churn rate, seat expansion, and meeting quality vs. volume." },
  { id: 'at-meta-live', type: InterviewType.ANALYTICAL_THINKING, text: "Build a product for Meta Live. What are the goals, success criteria, and metrics?", hint: "Distinguish between viewer engagement (watch time) and creator sustainability (tips/subscriptions)." },
  { id: 'at-bad-content', type: InterviewType.ANALYTICAL_THINKING, text: "What are the goals of a product that flags bad content?", hint: "Balance precision (not flagging good stuff) and recall (catching all bad stuff). Think about user safety." },
  { id: 'at-netflix-podcasts', type: InterviewType.ANALYTICAL_THINKING, text: "Set goals and metrics for Netflix Podcasts.", hint: "Is the goal to drive video watch time or to create a standalone audio revenue stream?" },
  { id: 'at-meta-verified', type: InterviewType.ANALYTICAL_THINKING, text: "Define goals and success metrics for Meta Verified.", hint: "Consider revenue growth vs. potential negative impact on the feeling of 'authenticity' for non-paying users." },
  { id: 'at-reels-goals', type: InterviewType.ANALYTICAL_THINKING, text: "You are the PM for Reels. How do you set goals and measure success?", hint: "Balance consumption (views) with content density. Watch out for cannibalization of the main feed." },
  { id: 'at-meta-pay-goals', type: InterviewType.ANALYTICAL_THINKING, text: "Define the success metrics and goals for Meta Pay.", hint: "Think about ecosystem lock-in. Does Meta Pay increase the conversion rate of ads on the platform?" },
  { id: 'at-venmo-drop', type: InterviewType.ANALYTICAL_THINKING, text: "Venmo sign-up rate dropped 2% after rolling out a new UX. What would you do?", hint: "Standard root cause analysis. Is it the whole funnel? A specific platform? A specific geo?" },
  { id: 'at-north-star', type: InterviewType.ANALYTICAL_THINKING, text: "What is the North Star Metric for a product of your choice (e.g., Airbnb, Spotify)?", hint: "The metric should reflect the core value delivered to the user, not just business revenue." },
  { id: 'at-jira-success', type: InterviewType.ANALYTICAL_THINKING, text: "Success metrics for JIRA.", hint: "Focus on 'Time to resolution' or 'Daily active collaborators'." },
  { id: 'at-notification-fb', type: InterviewType.ANALYTICAL_THINKING, text: "You are a PM for Notification in Facebook App. Why do you think it's needed and how will you measure success?", hint: "Consider the balance between re-engagement and user fatigue (opt-out rates)." },
  { id: 'at-local-ads', type: InterviewType.ANALYTICAL_THINKING, text: "How would you define success for Local Ads?", hint: "Measure 'Offline Conversions' like store visits or calls." },
  { id: 'at-chrome-metrics', type: InterviewType.ANALYTICAL_THINKING, text: "Metrics for Google Chrome.", hint: "Focus on speed (LCP) and market share, or search queries initiated from the omnibox." },
  { id: 'at-faire-commission', type: InterviewType.ANALYTICAL_THINKING, text: "How would you calculate the impact if Faire’s commission structure changed?", hint: "Analyze incremental revenue versus potential seller churn or price increases to buyers." },
  { id: 'at-reels-vs-stories', type: InterviewType.ANALYTICAL_THINKING, text: "Decide if Stories should be replaced by Reels at the top of the Facebook landing page.", hint: "Analyze user habits, engagement density, and the long-term strategic value of short-form video versus ephemeral photos." }
];

export const RUBRICS = {
  [InterviewType.PRODUCT_SENSE]: [
    "Clarify: Mission & Constraints",
    "Identify: User Segments & Personas",
    "Prioritize: Strategic Pain Points",
    "Brainstorm: Visionary Solutions",
    "Refine: Trade-offs & North Star Metrics"
  ],
  [InterviewType.ANALYTICAL_THINKING]: [
    "Structured Framework (MECE)",
    "Metric Definition (Goals/Counters)",
    "Root Cause Investigation",
    "Data-Driven Prioritization",
    "Trade-off Analysis & Action"
  ]
};

export const GOLDEN_PATH_PRODUCT_SENSE = [
  {
    title: "Define the Business Goal",
    content: "State the primary business objective before touching users or features. Tie it to the company's strategic moat and current growth stage.",
    why: "Staff PMs lead with business context. Jumping to users first signals junior thinking.",
    strategicTradeOffs: "Skipping this step means your entire solution optimizes for the wrong outcome."
  },
  {
    title: "Identify and Segment Users",
    content: "Name 2-3 distinct user segments by behavior or pain point, not demographics. Explicitly choose one to focus on and state why.",
    why: "Behavioral segmentation shows analytical depth. Demographic segmentation is table stakes.",
    strategicTradeOffs: "Targeting everyone means your solution is optimized for no one."
  },
  {
    title: "Prioritize the Hair-on-Fire Problem",
    content: "Identify the single most critical unmet need for your chosen segment. Justify the prioritization using impact and frequency.",
    why: "Staff PMs solve the right problem. The most common failure mode is solving a real but low-leverage problem.",
    strategicTradeOffs: "Picking a nice-to-have over a hair-on-fire problem produces solutions users appreciate but do not need."
  },
  {
    title: "Design a 10x Solution with Magic Moment",
    content: "Propose a solution that is an order of magnitude better than the status quo, not an incremental improvement. Describe the exact moment the user experiences the core value.",
    why: "Incremental solutions get incremental adoption. Staff PMs think about step-change improvements.",
    strategicTradeOffs: "A safe, obvious solution signals you are optimizing for not being wrong rather than being right."
  },
  {
    title: "Define a Ruthless MVP",
    content: "Scope the smallest possible version that tests the riskiest assumption. Name the assumption explicitly. Describe what a failed MVP looks like.",
    why: "MVP definition reveals whether a PM can separate learning objectives from feature completeness.",
    strategicTradeOffs: "An MVP that is just a smaller version of the full product tests nothing and wastes runway."
  },
  {
    title: "Establish Metric Funnel",
    content: "Define a precise North Star metric tied to the business goal. Add at least one guardrail metric that would trigger a rollback.",
    why: "North Star without guardrails invites dark patterns. Staff PMs define what success looks like AND what would constitute a false positive.",
    strategicTradeOffs: "Vanity metrics make launches look successful while the business erodes."
  },
  {
    title: "Address Second-Order Effects",
    content: "Name at least one way this solution could cannibalize an existing product line or create ecosystem risk. Propose a mitigation.",
    why: "Staff PMs are responsible for the ecosystem, not just their feature. Ignoring second-order effects is the most common senior-to-staff gap.",
    strategicTradeOffs: "A solution that wins its metric while damaging the broader product is a net negative."
  }
];

export const GOLDEN_PATH_ANALYTICAL = [
  {
    title: "Establish MECE Diagnostic Framework",
    content: "Before hypothesizing, build a complete diagnostic tree that is Mutually Exclusive and Collectively Exhaustive. Separate internal factors from external factors.",
    why: "A non-MECE framework guarantees you will miss the root cause. The tree must be complete before you descend into any branch.",
    strategicTradeOffs: "Starting with a hypothesis before building the framework anchors you to the wrong branch."
  },
  {
    title: "Rule Out Data Artifacts First",
    content: "Before analyzing user behavior, verify the data is trustworthy. Check for tracking bugs, instrumentation changes, or dashboard misconfiguration.",
    why: "The fastest root cause is a measurement error. Staff PMs check the ruler before measuring.",
    strategicTradeOffs: "Spending two weeks analyzing a metric drop caused by a tracking bug is a career-limiting move."
  },
  {
    title: "Generate Ranked Hypotheses",
    content: "Produce 3-4 specific, falsifiable hypotheses ranked by prior probability. Each hypothesis must name the affected user segment and the mechanism.",
    why: "Hypotheses must be falsifiable or they are not hypotheses. Ranking them prevents you from pursuing low-probability causes.",
    strategicTradeOffs: "Unranked hypotheses lead to random investigation order and wasted analyst time."
  },
  {
    title: "Design Low-Cost Validation",
    content: "For each hypothesis, propose the cheapest possible test. Data queries before A/B tests. Cohort analysis before experiments. Manual checks before automated pipelines.",
    why: "A/B tests are expensive and slow. Staff PMs exhaust cheap validation methods first.",
    strategicTradeOffs: "Defaulting to A/B tests signals you do not know how to do exploratory analysis."
  },
  {
    title: "Define North Star and Guardrails",
    content: "State the single metric that best represents the value delivered to users. Add 1-2 guardrail metrics that would indicate harm to adjacent areas.",
    why: "A North Star without guardrails will be gamed. The guardrail is what keeps optimization honest.",
    strategicTradeOffs: "Optimizing a single metric without guardrails is how engagement features become addictive dark patterns."
  },
  {
    title: "Measure Incremental Lift, Not Absolute Change",
    content: "Design a holdout group or difference-in-differences analysis to isolate true incremental impact from baseline trends or cannibalization.",
    why: "Absolute change conflates your impact with external trends. Incremental lift is the only honest measure of a feature's contribution.",
    strategicTradeOffs: "Reporting absolute growth without a holdout group overstates impact and leads to bad prioritization decisions."
  },
  {
    title: "Make a Definitive Go/No-Go Recommendation",
    content: "State a clear recommendation with the specific threshold that drove the decision. Acknowledge the strongest counterargument and explain why you are overriding it.",
    why: "Staff PMs make decisions under uncertainty. Presenting options without a recommendation delegates the hard work upward.",
    strategicTradeOffs: "Hedging the recommendation signals you do not trust your own analysis."
  }
];

export const RUBRIC_DEFINITIONS: Record<string, {
  standard: string;
  promptDescription: string;
  levels: Array<{
    range: string;
    description: string;
    example: string;
  }>;
}> = {
  'Goal Definition': {
    standard: 'Business objective prioritized before personas.',
    promptDescription: `- < 60 (Needs Work): Jumps straight to features or personas without defining a business goal.\n- 60-79 (Senior): Defines a valid business goal but fails to tie it to the company's core mission.\n- 80-100 (Staff): Prioritizes a high-leverage business objective before personas and explicitly ties it to the company's strategic moat.`,
    levels: [
      { range: '< 60 (Needs Work)', description: 'Jumps straight to features or personas without defining a business goal.', example: 'I would build a dashboard for managers to see team velocity.' },
      { range: '60-79 (Senior)', description: 'Defines a valid business goal but fails to tie it to the company\'s core mission.', example: 'The goal is to increase engagement by 10% so we can drive more ad revenue.' },
      { range: '80-100 (Staff)', description: 'Prioritizes a high-leverage business objective before personas and explicitly ties it to the company\'s strategic moat.', example: 'Before discussing features, our primary business objective must be B2B seat expansion. Given our enterprise moat, we should target the procurement persona first to reduce churn.' }
    ]
  },
  'User Problem Prioritization': {
    standard: 'Identifies a critical, unmet user need and prioritizes it based on impact and frequency.',
    promptDescription: `- < 60 (Needs Work): Fails to identify a critical user need or relies on superficial demographics.\n- 60-79 (Senior): Identifies valid pain points but struggles to prioritize them based on impact and frequency.\n- 80-100 (Staff): Segments users by behavior/pain point and identifies a "hair-on-fire" problem aligning with the business goal.`,
    levels: [
      { range: '< 60 (Needs Work)', description: 'Fails to identify a critical user need or relies on superficial demographics.', example: 'We should target millennials because they use phones a lot.' },
      { range: '60-79 (Senior)', description: 'Identifies valid pain points but struggles to prioritize them based on impact and frequency.', example: 'Users find the checkout process too long, so we should shorten it.' },
      { range: '80-100 (Staff)', description: 'Segments users by behavior/pain point and identifies a "hair-on-fire" problem aligning with the business goal.', example: 'Instead of targeting all small businesses, we should focus specifically on high-volume merchants who experience a 30% drop-off during the payment reconciliation step, as solving this directly impacts our retention goal.' }
    ]
  },
  'Solution Creativity & Design': {
    standard: 'Innovative, feasible, and directly addresses the prioritized problem.',
    promptDescription: `- < 60 (Needs Work): Proposes generic, incremental, or unfeasible solutions.\n- 60-79 (Senior): Proposes solid, logical solutions but lacks innovation or a "magic moment".\n- 80-100 (Staff): Proposes a 10x better, innovative solution that creates a "magic moment" while remaining technically grounded.`,
    levels: [
      { range: '< 60 (Needs Work)', description: 'Proposes generic, incremental, or unfeasible solutions.', example: 'Let\'s just add a button that does it automatically using AI.' },
      { range: '60-79 (Senior)', description: 'Proposes solid, logical solutions but lacks innovation or a "magic moment".', example: 'We can build a dashboard that aggregates all their transactions in one place.' },
      { range: '80-100 (Staff)', description: 'Proposes a 10x better, innovative solution that creates a "magic moment" while remaining technically grounded.', example: 'Rather than building another dashboard they have to check, we can use webhooks to push reconciliation anomalies directly into their existing Slack workflow, creating a zero-friction "magic moment".' }
    ]
  },
  'Execution & Sequencing (MVP)': {
    standard: 'Breaks down a grand vision into a testable, high-ROI first release.',
    promptDescription: `- < 60 (Needs Work): Struggles to define an MVP or just proposes building a smaller version of the final product.\n- 60-79 (Senior): Defines a reasonable V1 but doesn't explicitly isolate the riskiest assumptions.\n- 80-100 (Staff): Defines a ruthless MVP that specifically isolates and tests the riskiest assumption with high ROI.`,
    levels: [
      { range: '< 60 (Needs Work)', description: 'Struggles to define an MVP or just proposes building a smaller version of the final product.', example: 'For the MVP, we will just build the app with fewer features.' },
      { range: '60-79 (Senior)', description: 'Defines a reasonable V1 but doesn\'t explicitly isolate the riskiest assumptions.', example: 'Our MVP will be a basic version of the Slack integration that only supports one type of alert.' },
      { range: '80-100 (Staff)', description: 'Defines a ruthless MVP that specifically isolates and tests the riskiest assumption with high ROI.', example: 'Our riskiest assumption isn\'t technical feasibility, it\'s whether merchants will actually act on these alerts. Our MVP should be a simple daily email digest generated manually by ops; if open rates exceed 40%, we invest in the automated Slack integration.' }
    ]
  },
  'Strategic Moat': {
    standard: 'Unique company leverage.',
    promptDescription: `- < 60 (Needs Work): Ignores the company's unique advantages or proposes generic solutions.\n- 60-79 (Senior): Acknowledges the company's strengths but doesn't fully leverage them in the solution.\n- 80-100 (Staff): Deeply integrates the company's unique leverage and ecosystem into the core of the strategy.`,
    levels: [
      { range: '< 60 (Needs Work)', description: 'Ignores the company\'s unique advantages or proposes generic solutions.', example: 'We should add a generic AI chatbot to help users find things faster.' },
      { range: '60-79 (Senior)', description: 'Acknowledges the company\'s strengths but doesn\'t fully leverage them in the solution.', example: 'Since we have a lot of user data, we can personalize the feed.' },
      { range: '80-100 (Staff)', description: 'Deeply integrates the company\'s unique leverage and ecosystem into the core of the strategy.', example: 'Our proprietary distribution network is our moat. We shouldn\'t just build a new app; we should embed this functionality directly into the existing partner portal where we already have 90% market penetration.' }
    ]
  },
  'Second-Order Effects': {
    standard: 'Long-term ecosystem impact.',
    promptDescription: `- < 60 (Needs Work): Fails to consider long-term consequences or ecosystem impacts.\n- 60-79 (Senior): Identifies basic risks but lacks a comprehensive mitigation strategy.\n- 80-100 (Staff): Proactively addresses long-term ecosystem impact, cannibalization, and complex trade-offs.`,
    levels: [
      { range: '< 60 (Needs Work)', description: 'Fails to consider long-term consequences or ecosystem impacts.', example: 'Let\'s just make the button bigger so more people click it.' },
      { range: '60-79 (Senior)', description: 'Identifies basic risks but lacks a comprehensive mitigation strategy.', example: 'If we increase notifications, users might get annoyed and turn them off.' },
      { range: '80-100 (Staff)', description: 'Proactively addresses long-term ecosystem impact, cannibalization, and complex trade-offs.', example: 'Introducing a freemium tier will likely cannibalize our low-end paid plans by 15% in Q1. However, by gating the enterprise SSO feature, we create a forced upgrade path that will offset this loss by Q3 through higher ACV.' }
    ]
  },
  'Root Cause Analysis (Debugging)': {
    standard: 'Systematically isolates variables when a metric drops unexpectedly.',
    promptDescription: `- < 60 (Needs Work): Jumps to conclusions without a structured approach to isolate variables.\n- 60-79 (Senior): Uses a basic structure to investigate but misses edge cases or external factors.\n- 80-100 (Staff): Uses a MECE framework to systematically isolate internal (bugs, tracking) vs. external (seasonality, competitors) factors.`,
    levels: [
      { range: '< 60 (Needs Work)', description: 'Jumps to conclusions without a structured approach to isolate variables.', example: 'Traffic dropped because our new feature is confusing.' },
      { range: '60-79 (Senior)', description: 'Uses a basic structure to investigate but misses edge cases or external factors.', example: 'I would check if there are any bugs, and then look at the funnel drop-off.' },
      { range: '80-100 (Staff)', description: 'Uses a MECE framework to systematically isolate internal (bugs, tracking) vs. external (seasonality, competitors) factors.', example: 'Before looking at user behavior, I would establish a MECE tree: First, is this a data artifact (tracking bug)? Second, is it internal (a bad release)? Third, is it external (seasonality, competitor launch)?' }
    ]
  },
  'Hypothesis Generation': {
    standard: 'Formulates data-backed hypotheses and proposes specific, low-cost ways to validate them.',
    promptDescription: `- < 60 (Needs Work): Proposes random guesses without data backing or validation plans.\n- 60-79 (Senior): Formulates reasonable hypotheses but relies on expensive A/B tests to validate everything.\n- 80-100 (Staff): Formulates data-backed hypotheses and proposes specific, low-cost ways to validate them (e.g., querying a specific cohort).`,
    levels: [
      { range: '< 60 (Needs Work)', description: 'Proposes random guesses without data backing or validation plans.', example: 'Maybe users just don\'t like the new color.' },
      { range: '60-79 (Senior)', description: 'Formulates reasonable hypotheses but relies on expensive A/B tests to validate everything.', example: 'I think the new onboarding is too long. Let\'s run an A/B test with a shorter version.' },
      { range: '80-100 (Staff)', description: 'Formulates data-backed hypotheses and proposes specific, low-cost ways to validate them.', example: 'My hypothesis is that the drop in conversion is isolated to Android users on older OS versions. Before building a fix, we can validate this cheaply by querying the conversion rate grouped by OS version and device age.' }
    ]
  },
  'Metric Funnel': {
    standard: 'North Star + Guardrails.',
    promptDescription: `- < 60 (Needs Work): Selects vanity metrics or fails to define a clear North Star.\n- 60-79 (Senior): Defines a solid North Star but lacks comprehensive guardrail metrics.\n- 80-100 (Staff): Establishes a robust metric funnel with a precise North Star and critical guardrails.`,
    levels: [
      { range: '< 60 (Needs Work)', description: 'Selects vanity metrics or fails to define a clear North Star.', example: 'We should track total registered users and page views.' },
      { range: '60-79 (Senior)', description: 'Defines a solid North Star but lacks comprehensive guardrail metrics.', example: 'Our North Star is Weekly Active Users (WAU). We will measure success by how much WAU increases.' },
      { range: '80-100 (Staff)', description: 'Establishes a robust metric funnel with a precise North Star and critical guardrails.', example: 'Our North Star is Weekly Paid Active Users. Our primary guardrail is Customer Support Tickets per 1k Users to ensure we aren\'t driving engagement through confusing dark patterns.' }
    ]
  },
  'Unintended Consequences': {
    standard: 'How success in X hurts Y.',
    promptDescription: `- < 60 (Needs Work): Ignores how optimizing for the primary metric might harm other areas.\n- 60-79 (Senior): Acknowledges potential harm but dismisses it without deep analysis.\n- 80-100 (Staff): Deeply analyzes how success in X hurts Y and proposes sophisticated mitigations.`,
    levels: [
      { range: '< 60 (Needs Work)', description: 'Ignores how optimizing for the primary metric might harm other areas.', example: 'If we send more emails, open rates will go up.' },
      { range: '60-79 (Senior)', description: 'Acknowledges potential harm but dismisses it without deep analysis.', example: 'We might see some unsubscribes, but the increased conversion rate is worth it.' },
      { range: '80-100 (Staff)', description: 'Deeply analyzes how success in X hurts Y and proposes sophisticated mitigations.', example: 'Optimizing for Time Spent on the feed will inevitably cannibalize Messages Sent. We must establish a threshold: if messaging drops by more than 5%, we roll back, as messaging is our core retention driver.' }
    ]
  },
  'Incremental Lift': {
    standard: 'Absolute growth vs cannibalization.',
    promptDescription: `- < 60 (Needs Work): Confuses absolute growth with incremental lift or ignores cannibalization.\n- 60-79 (Senior): Understands incremental lift but struggles to design a mechanism to measure it accurately.\n- 80-100 (Staff): Perfectly distinguishes absolute growth from cannibalization and designs precise measurement mechanisms.`,
    levels: [
      { range: '< 60 (Needs Work)', description: 'Confuses absolute growth with incremental lift or ignores cannibalization.', example: 'The new feature got 10,000 clicks, so it\'s a huge success!' },
      { range: '60-79 (Senior)', description: 'Understands incremental lift but struggles to design a mechanism to measure it accurately.', example: 'We need to run an A/B test to see if the new feature actually drives more total revenue.' },
      { range: '80-100 (Staff)', description: 'Perfectly distinguishes absolute growth from cannibalization and designs precise measurement mechanisms.', example: 'To measure true incremental lift, we will use a holdout group. We aren\'t just looking at the $50k generated by the new widget; we need to verify that the control group didn\'t generate $45k through the old flow anyway, meaning our true lift is only $5k.' }
    ]
  },
  'Trade-off Decision Making': {
    standard: 'Handles conflicting data with a clear framework and makes a definitive recommendation.',
    promptDescription: `- < 60 (Needs Work): Freezes when metrics conflict or makes a gut-based decision without a framework.\n- 60-79 (Senior): Acknowledges the conflict but struggles to make a definitive recommendation.\n- 80-100 (Staff): Establishes a clear framework for breaking ties (e.g., LTV vs. CAC, strategic alignment) and makes a definitive "go/no-go" recommendation.`,
    levels: [
      { range: '< 60 (Needs Work)', description: 'Freezes when metrics conflict or makes a gut-based decision without a framework.', example: 'Since engagement is up, we should just launch it.' },
      { range: '60-79 (Senior)', description: 'Acknowledges the conflict but struggles to make a definitive recommendation.', example: 'Engagement is up but revenue is down, so we should probably discuss this with leadership to decide.' },
      { range: '80-100 (Staff)', description: 'Establishes a clear framework for breaking ties and makes a definitive "go/no-go" recommendation.', example: 'While engagement increased by 5%, the 2% drop in revenue breaks our primary guardrail. Given our current company OKR is profitability over growth, my recommendation is a definitive no-go until we patch the monetization leak.' }
    ]
  }
};