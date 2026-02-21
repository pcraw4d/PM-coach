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