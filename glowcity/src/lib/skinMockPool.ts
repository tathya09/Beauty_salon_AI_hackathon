/**
 * Dynamic skin analysis fallback pool.
 * Every call to randomMockResult() independently randomises each dimension
 * (skin type, score, concerns, summary, glow tip, all 4 recommendation types)
 * giving thousands of unique combinations.
 */

export interface MockRecommendation {
  type: 'natural' | 'ayurvedic' | 'chemical' | 'dermat'
  label: string
  reason: string
  services: string[]
}

export interface MockSkinResult {
  skinType: string
  concerns: string[]
  overallScore: number
  confidence: number
  analysisSummary: string
  glowTip: string
  recommendations: MockRecommendation[]
}

// ── RNG helpers ───────────────────────────────────────────────
function rand<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}
function randN<T>(arr: T[], n: number): T[] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5)
  return shuffled.slice(0, n)
}
function randInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}
function randFloat(min: number, max: number, dp = 2) {
  return parseFloat((Math.random() * (max - min) + min).toFixed(dp))
}

// ── Skin types ────────────────────────────────────────────────
const SKIN_TYPES = [
  'Dry', 'Oily', 'Combination', 'Normal', 'Sensitive',
  'Dehydrated', 'Acne-Prone', 'Mature', 'Dull',
  'Hyperpigmented', 'Rosacea-Prone', 'Balanced',
]

// ── Concern pool (pick 2–4 at random) ────────────────────────
const ALL_CONCERNS = [
  'Mild dehydration', 'Uneven skin tone', 'T-zone oiliness',
  'Acne breakouts', 'Enlarged pores', 'Post-acne marks',
  'Dark circles', 'Puffiness', 'Fine lines under eyes',
  'Hyperpigmentation', 'Sun damage', 'Dull complexion',
  'Dryness', 'Flakiness', 'Product sensitivity',
  'Blackheads', 'Whiteheads', 'Congested pores',
  'Redness', 'Capillary visibility', 'Flushing',
  'Forehead lines', 'Smile lines', 'Loss of elasticity',
  'Excessive shine', 'Makeup not lasting', 'Oily nose',
  'Tan lines', 'Dark patches', 'Uneven complexion',
  'Acne scars', 'Textured skin', 'Bumpy forehead',
  'Tight feeling', 'Rough texture', 'Dehydration lines',
  'Sebaceous filaments', 'Open pores on nose',
  'Patchy redness', 'Dry cheeks', 'Melasma patches',
  'Hormonal breakouts', 'Jawline acne', 'Cystic acne',
  'Sagging skin', 'Deep wrinkles', 'Volume loss',
  'Sun spots', 'Freckles', 'Liver spots',
]

// ── Analysis summaries (pick 1 at random) ────────────────────
const SUMMARIES = [
  'Skin shows visible dehydration markers with active sebum in the T-zone. The overall tone is manageable with a consistent routine.',
  'Active breakouts with post-inflammatory marks are visible. Pores appear enlarged, particularly on the nose and chin.',
  'Under-eye fatigue signs are present. Fine lines are minimal but starting to show. Skin tone is relatively even elsewhere.',
  'Noticeable pigmentation across the cheeks and forehead with UV-related spotting. Underlying skin texture looks healthy.',
  'Very sensitive presentation — visible capillary redness around the nose and cheeks. Skin reacts easily to external triggers.',
  'Congested pores throughout the T-zone. Blackhead buildup visible on the nose bridge and chin.',
  'Rosacea-like flushing detected. Skin appears reactive and would benefit from calming, barrier-focused treatments.',
  'Mature skin with fine lines around the eyes and forehead. Skin remains reasonably hydrated for its type.',
  'Combination skin with a clearly defined oily central panel and drier outer zones visible.',
  'Melasma-pattern pigmentation along the upper lip and cheeks. Likely hormonal in origin.',
  'Post-acne scarring with surface textural irregularities visible. Underlying skin is healthy and responds well to treatment.',
  'Tight, dehydrated skin lacking plumpness and bounce. Hydration is the primary need here.',
  'Normal skin with isolated minor blemishes. Consistent routine will maintain this naturally good condition.',
  'Sun-damaged skin with visible texture change and discrete pigmented spots on the cheek region.',
  'Oily skin with prominent shine — sebaceous activity is high but skin is otherwise clear and healthy.',
  'Sensitivity-prone with eczema-like dry patches on the cheeks. Minimal barrier disruption is key.',
  'Jawline-concentrated cystic pattern suggests hormonal influence. Internal and topical treatment recommended.',
  'Overall healthy skin with good hydration but minor congestion. Very responsive to treatment.',
  'Mature skin with noticeable firmness loss and deepening expression lines. Collagen-targeting treatments advised.',
  'Dry skin with visible fine flaking and rough texture. Lipid-rich moisturisers will show rapid improvement.',
  'Clear skin with mild uneven tone and occasional breakouts. Low-maintenance type responding well to actives.',
  'Well-hydrated skin with a natural glow — minor pigmentation is the only visible concern.',
]

// ── Glow tips ─────────────────────────────────────────────────
const GLOW_TIPS = [
  'Apply a hydrating toner immediately after cleansing (within 30 seconds) to lock in moisture.',
  'Use a gentle BHA serum 3× a week at night — your pores will look visibly smaller in 4 weeks.',
  'Vitamin C serum every morning + retinol at night is the gold standard for fading scars and spots.',
  'SPF 50 PA+++ applied to dry skin 15 minutes before sun exposure is your single best anti-aging step.',
  'Double-cleanse every night with an oil cleanser followed by a gentle foam — your skin will thank you.',
  'Switch all products to fragrance-free for 2 weeks and watch redness and sensitivity drop significantly.',
  'Ice-rolling for 5 minutes each morning depuffs the under-eye area and tightens pores naturally.',
  'Niacinamide 5–10% used consistently over 8 weeks is clinically proven to reduce pigmentation.',
  'A silk pillowcase prevents friction wrinkles and hair breakage — small change, big difference.',
  'Drink 500ml water before your morning coffee — dehydration shows on skin within hours.',
  'Apply your moisturiser while skin is still damp from toner to trap 3× more hydration.',
  'Green tea-based toners and centella asiatica gel are the fastest calming agents for reactive skin.',
  'Spearmint tea twice daily has shown meaningful hormonal acne reduction in peer-reviewed studies.',
  'Wear a wide-brimmed hat outdoors — physical protection beats SPF alone for sensitive skin.',
  'Retinol 0.025% twice a week at night can reverse early aging signs within 3 months of consistent use.',
  'Lactic acid 5% is the gentlest exfoliant for dry and sensitive types — use it once a week.',
  'Facial massage with a gua sha tool for 5 minutes nightly improves circulation and firms over time.',
  'Tranexamic acid is the safest, most effective ingredient currently available for melasma.',
  'Clay mask on T-zone once weekly + hydrating mask on cheeks gives perfect combo-skin balance.',
  'Sleep 7–8 hours consistently — cortisol spikes from poor sleep directly worsen acne and sensitivity.',
  'A ceramide moisturiser rebuilds your skin barrier faster than any other ingredient category.',
  'Slugging (petroleum jelly as final step) once a week overnight transforms dry, cracked skin.',
  'Azelaic acid 10% addresses both redness and pigmentation simultaneously — perfect for sensitive types.',
  'Use mineral sunscreen if chemical SPF causes stinging — zinc oxide is the most tolerated option.',
  'Layer from thinnest to thickest consistency — toner → serum → moisturiser → SPF. Never reverse this.',
]

// ── Service pools ─────────────────────────────────────────────
const NATURAL_SERVICES_POOL = [
  'Rose Water Facial', 'Aloe Vera Cleanup', 'Green Tea Face Pack', 'Cucumber Eye Treatment',
  'Neem Face Pack', 'Turmeric Glow Facial', 'Charcoal Cleanup', 'Sandalwood Massage',
  'Papaya Enzyme Facial', 'Honey & Oat Scrub', 'Chamomile Soothing Treatment', 'Lavender Hydration Pack',
  'Licorice Brightening Facial', 'Vitamin C Fruit Facial', 'Kojic Acid Treatment', 'Multani Mitti Pack',
  'Oat Soothing Facial', 'Calendula Calming Cleanup', 'Almond Oil Massage', 'Rose Hip Brightening',
  'Tea Tree Acne Facial', 'Salicylic Herb Cleanup', 'Neem & Tulsi Pack', 'Zinc Clarifying Treatment',
  'Pomegranate Antioxidant Pack', 'Berry Glow Facial', 'Lemon Brightening Cleanup', 'Banana Firming Facial',
  'Mattifying Green Clay Mask', 'Oil-Control Citrus Facial', 'Licorice De-tan Facial', 'Papaya De-pigmentation Pack',
]

const AYURVEDIC_SERVICES_POOL = [
  'Kumkumadi Facial', 'Neem & Turmeric Cleanup', 'Brahmi Hair Spa', 'Ubtan Body Polish',
  'Panchakarma Facial', 'Triphala Cleanup', 'Ashwagandha Glow Treatment', 'Neem Purifying Pack',
  'Saffron Brightening Facial', 'Chandan Cooling Pack', 'Vetiver Eye Treatment', 'Mulethi Facial',
  'Haritaki Brightening Pack', 'Kashmiri Saffron Treatment', 'Nalpamaradi Oil Massage',
  'Nimba Soothing Facial', 'Chandanadi Calming Pack', 'Brahmi Stress Relief', 'Bilva Leaf Cleanup',
  'Rose & Sandalwood Facial', 'Kesar Glow Pack', 'Kumari (Aloe) Treatment', 'Padmaka Calming Facial',
  'Ksheera Dhara Anti-Aging', 'Draksha Rejuvenating Pack', 'Amalaki Vitamin C Pack',
  'Lodhra Oil-Control Facial', 'Vacha Clarifying Treatment', 'Nalpamaradi De-tan', 'Eladi Brightening Facial',
  'Manjistha Glow Pack', 'Ushira Cooling Cleanup', 'Navarakizhi Facial', 'Kottamchukkadi Massage',
]

const CHEMICAL_SERVICES_POOL = [
  'AHA Glow Facial', 'Salicylic Acid Cleanup', 'Vitamin C Brightening', 'Keratin Smoothing',
  'BHA Deep Pore Peel', 'Glycolic Acid Facial', 'Niacinamide Infusion', 'Benzoyl Peroxide Treatment',
  'Retinol Eye Treatment', 'Peptide Collagen Facial', 'Hyaluronic Acid Boost', 'EGF Serum Treatment',
  'Azelaic Acid Brightening Peel', 'Alpha Arbutin Treatment', 'Kojic Acid Facial', 'Lactic Acid Exfoliation',
  'Ceramide Barrier Repair', 'Centella Asiatica Treatment', 'Madecassoside Calming Peel', 'PHA Gentle Exfoliation',
  'Mandelic Acid Peel', 'Pyruvic Acid Treatment', 'Zinc + Niacinamide Infusion', 'Tranexamic Acid Treatment',
  'Retinoic Acid Resurfacing', 'Argireline Firming', 'CoQ10 Anti-Aging Infusion', 'Lactic Brightening Peel',
  'Phytic Acid De-tan Facial', 'Alpha Arbutin De-pigmentation', 'Salicylic + Niacinamide', 'Oil-Control Glycolic',
  'Peptide Eye Complex', 'Bakuchiol Retinol Alternative', 'Ascorbic Acid 20% Treatment',
]

const DERMAT_SERVICES_POOL = [
  'HydraFacial MD', 'Medical-Grade Chemical Peel', 'LED Light Therapy', 'Microdermabrasion',
  'Medical Acne Peel', 'IPL Acne Treatment', 'Blue LED Therapy', 'Medical Comedone Extraction',
  'Mesotherapy Under-Eye', 'PRP Eye Rejuvenation', 'Radiofrequency Eye Lift', 'Filler Tear Trough',
  'Q-Switch Laser Pigmentation', 'IPL Photorejuvenation', 'Tranexamic IV Drip', 'Chemical Resurfacing',
  'Barrier Repair IV Infusion', 'Dermat Calming Facial', 'Steroidal Spot Treatment', 'Patch Test Panel',
  'Fractional CO2 Laser', 'Microneedling RF', 'Salicylic Medical Peel', 'Nano-Needling',
  'Vascular Laser Rosacea', 'PDL Pulsed Dye Laser', 'Medical Anti-Redness Peel', 'Intense Pulsed Light',
  'Ultherapy Skin Tightening', 'HIFU Lifting', 'Filler Volumisation', 'Botox Anti-Wrinkle',
  'Nd:YAG De-tan Laser', 'IV Glutathione Drip', 'Medical Brightening Peel', 'Laser Toning',
  'Oxygen Infusion Facial', 'Carbon Laser Peel', 'TCA Cross for Scars', 'Subcision Scar Treatment',
]

// ── Reason pools ──────────────────────────────────────────────
const NATURAL_REASONS = [
  'Gentle plant-based ingredients balance your skin without triggering sensitivity or over-stripping.',
  'Your skin barrier is compromised — botanical extracts soothe and rebuild it effectively.',
  'Natural antioxidants from plants address your pigmentation concerns with minimal irritation risk.',
  'Plant-based enzymes and trace minerals restore balance to your combination skin pattern.',
  'Herbal anti-inflammatories are ideal for calming the reactive pattern visible in your skin.',
  'Neem, tulsi and tea tree have proven antibacterial action well-suited to your acne-prone type.',
  'Rosehip and pomegranate antioxidants directly counteract the sun damage visible in your skin.',
  'Natural peptide-rich ingredients support collagen production without over-stimulating your skin.',
  'Clay and zinc from natural sources absorb excess oil gently and reduce congestion effectively.',
  'Licorice and papaya are among the best-proven natural brighteners for your pigmentation pattern.',
  'Plant-based ceramides rebuild your dry, compromised barrier without clogging pores.',
  'Oat and calendula extracts are clinically shown to reduce sensitivity reactions in skin like yours.',
]

const AYURVEDIC_REASONS = [
  'Your Pitta-Vata skin dosha benefits from Kumkumadi and sandalwood balancing formulations.',
  'Kapha-dominant oily skin responds best to neem, tulsi and astringent Ayurvedic herbs.',
  'Ayurvedic cooling herbs like vetiver and chandan soothe your reactive, heat-prone skin.',
  'Mulethi and Haritaki address deep-seated pigmentation through the Ayurvedic approach.',
  'Nimba and bilva have centuries of proven efficacy for sensitive and reactive skin presentations.',
  'Neem-based Ayurvedic treatments are the classical gold standard for Pitta-type acne patterns.',
  'Rose and saffron Ayurvedic formulations bring natural luminosity to dull, tired skin.',
  'Ksheera Dhara and Draksha reverse Vata-driven aging and dryness beautifully.',
  'Lodhra and Haritaki are the classical Ayurvedic oil-control herbs for your skin type.',
  'Nalpamaradi oil is the traditional Ayurvedic answer to de-tanning and pigmentation.',
  'Kumkumadi oil has over 15 bioactive ingredients that collectively target your specific concerns.',
  'Ashwagandha-based treatments reduce stress-induced skin deterioration at a cellular level.',
]

const CHEMICAL_REASONS = [
  'AHAs and BHAs address your surface texture and congestion concerns with precise, targeted action.',
  'Benzoyl peroxide and salicylic acid are the most clinically validated ingredients for your acne type.',
  'Retinol and peptides are the evidence-backed gold standard for eye area and aging concerns.',
  'Kojic acid and azelaic acid address your pigmentation pattern more reliably than alternatives.',
  'Ceramide and PHA treatments gently rebuild your compromised barrier without causing irritation.',
  'BHA-based treatments are specifically designed for congested pore presentations like yours.',
  'Azelaic acid uniquely addresses both redness and pigmentation simultaneously for your skin.',
  'Retinoids and peptides have the most robust clinical evidence of any anti-aging intervention.',
  'Niacinamide + salicylic acid is the proven dual-action combination for oily, acne-prone skin.',
  'Lactic acid and phytic acid brighten tan and pigmentation without over-sensitising your skin.',
  'Tranexamic acid is currently the most effective, best-tolerated ingredient for your melasma.',
  'Hyaluronic acid + ceramides repair your dehydrated skin barrier at multiple molecular levels.',
]

const DERMAT_REASONS = [
  'Clinical treatments provide measurable, faster results for your concerns under expert supervision.',
  'Medical-grade procedures are the most effective option for your level of acne severity.',
  'Mesotherapy and PRP deliver targeted nutrients directly to the dermis of your under-eye area.',
  'Laser technology is the only proven method for your depth of pigmentation and melasma.',
  'Patch testing and medical barrier repair is the safest path for your allergy-prone skin type.',
  'Medical extraction and microneedling provide the long-term pore reduction your skin needs.',
  'Vascular lasers are the only clinically proven treatment for the visible rosacea vessels in your skin.',
  'HIFU and radiofrequency provide the firmness restoration your mature skin requires.',
  'Laser toning and radiofrequency treat sebaceous hyperactivity for lasting oil control.',
  'Nd:YAG laser safely addresses stubborn tan and pigmentation in darker Indian skin tones.',
  'Fractional CO2 resurfaces your acne scars at a depth no topical product can reach.',
  'IV glutathione combined with LED therapy accelerates brightening results for your skin type.',
]

// ── Main export: returns a fresh random result every call ─────
export function randomMockResult(preferredType?: string): MockSkinResult {
  const skinType  = rand(SKIN_TYPES)
  const concerns  = randN(ALL_CONCERNS, randInt(2, 4))
  const score     = randInt(4, 9)
  const confidence = randFloat(0.60, 0.88)
  const summary   = rand(SUMMARIES)
  const tip       = rand(GLOW_TIPS)

  const naturalReason   = rand(NATURAL_REASONS)
  const ayurvedicReason = rand(AYURVEDIC_REASONS)
  const chemicalReason  = rand(CHEMICAL_REASONS)
  const dermatReason    = rand(DERMAT_REASONS)

  const naturalSvcs   = randN(NATURAL_SERVICES_POOL, 4)
  const ayurvedicSvcs = randN(AYURVEDIC_SERVICES_POOL, 4)
  const chemicalSvcs  = randN(CHEMICAL_SERVICES_POOL, 4)
  const dermatSvcs    = randN(DERMAT_SERVICES_POOL, 4)

  const recs: MockRecommendation[] = [
    { type: 'natural',   label: 'Natural Treatments',           reason: naturalReason,   services: naturalSvcs },
    { type: 'ayurvedic', label: 'Ayurvedic Treatments',         reason: ayurvedicReason, services: ayurvedicSvcs },
    { type: 'chemical',  label: 'Advanced Chemical Treatments', reason: chemicalReason,  services: chemicalSvcs },
    { type: 'dermat',    label: 'Dermatologist-Recommended',    reason: dermatReason,    services: dermatSvcs },
  ]

  // Put preferred type first if specified
  if (preferredType) {
    recs.sort((a, b) =>
      a.type === preferredType ? -1 : b.type === preferredType ? 1 : 0
    )
  }

  return { skinType, concerns, overallScore: score, confidence, analysisSummary: summary, glowTip: tip, recommendations: recs }
}

/** @deprecated — kept for any existing import, calls randomMockResult */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function pickMockResult(_?: string): MockSkinResult {
  return randomMockResult()
}
