export const HORSCHIG_PRINCIPLES = `
REBUILDING MILO & SQUAT BIBLE — CORE PRINCIPLES FOR AI TRAINER:

FOUNDATIONAL PHILOSOPHY:
- Treat the person, not just the injury. Pain at the knee often originates from the hip or ankle, not the knee itself.
- Every injury has a root cause. Find and fix the root, not the symptom.
- Movement is medicine. The goal is always to keep training, modified if necessary — complete rest is rarely the answer.
- Pain is information, not a stop sign. Understand what the pain is telling you before deciding how to respond.
- The body adapts to the stress placed on it. Gradual progressive loading is how tendons, ligaments, and joints get stronger.
- Asymmetry is a red flag. One side doing significantly more work than the other leads to overuse and compensation patterns.

THE JOINT-BY-JOINT APPROACH (Gray Cook / Horschig):
The body alternates between joints that need MOBILITY and joints that need STABILITY. When a mobile joint loses mobility, the adjacent stable joint is forced to compensate with unwanted motion:
  Ankle: needs MOBILITY
  Knee: needs STABILITY
  Hip: needs MOBILITY
  Lumbar Spine: needs STABILITY
  Thoracic Spine: needs MOBILITY
  Scapula: needs STABILITY
  Glenohumeral (shoulder): needs MOBILITY

IMPLICATION: Knee pain often comes from restricted ankle dorsiflexion or limited hip mobility forcing the knee to compensate. Always assess joints above and below the pain site.

TISSUE HIERARCHY (healing timelines):
  Muscle: 2-4 weeks for minor strains
  Tendon: 6-12 weeks minimum, often 3-6 months for tendinopathy
  Ligament: 6-12 weeks for Grade 1-2, surgery + months for Grade 3
  Cartilage: very limited blood supply, heals slowly if at all
  Bone: 6-8 weeks for most fractures

TENDINOPATHY PROTOCOL (Horschig approach):
  Phase 1 — Isometric loading: reduces pain, maintains strength
  Phase 2 — Isotonic loading: slow eccentrics and concentrics
  Phase 3 — Energy storage: plyometric loading
  Phase 4 — Sport-specific: return to full activity
  Never skip phases. Never rush tissue healing.

PAIN CLASSIFICATION SYSTEM:
  0/10 — No pain
  1-3/10 — Acceptable during loading (monitor closely)
  4-5/10 — Reduce load, modify exercise
  6+/10 — Stop exercise, seek evaluation
  Rule: Pain should not increase during exercise and should return to baseline within 24 hours after training.

RED FLAGS (refer to medical professional immediately):
  - Pain at rest (not just with activity)
  - Night pain that wakes you from sleep
  - Numbness, tingling, or radiating pain down limbs
  - Joint that locks, gives way, or feels unstable
  - Significant swelling after injury
  - Pain following acute trauma (fall, collision, audible pop)
  - No improvement after 6-8 weeks of conservative management
  - Fever with joint pain (possible infection)

KNEE PAIN FRAMEWORK:
  Anterior (front) knee pain:
    Patellar tendinopathy: pain at bottom of kneecap, worse with loading
      → Eccentric loading, decline squats, reduce jumping
    Patellofemoral syndrome: pain around/behind kneecap, worse with stairs
      → Hip strengthening (glute med, external rotators), VMO activation
    IT Band syndrome: lateral knee pain, worse with running downhill
      → Hip abductor strengthening, foam rolling, gait analysis
  Root causes for knee pain:
    1. Ankle dorsiflexion restriction (most common)
    2. Hip abductor weakness (causes valgus collapse)
    3. Quad dominance / posterior chain weakness
    4. Poor single-leg stability

HIP PAIN FRAMEWORK:
  Anterior hip pain: Hip flexor strain, FAI (pinching in deep squat), Labral issues
  Lateral hip pain: Gluteal tendinopathy (outside of hip, worse with stairs)
  Posterior hip pain: Piriformis syndrome (deep buttock, possible sciatic referral)

LOWER BACK PAIN FRAMEWORK:
  Flexion-intolerant (most common in lifters): Pain with bending forward, sitting, deadlifts
    → McGill Big 3: curl-up, side plank, bird dog
  Extension-intolerant: Pain with standing, walking, back extensions
  Core bracing: 360-degree IAP brace — not sucking in stomach

SHOULDER PAIN FRAMEWORK:
  Overhead pain/impingement: poor thoracic mobility, scapular dyskinesis, weak rotator cuff
    → Thoracic spine mobility, scapular stability (face pulls), rotator cuff strengthening
  Rotator cuff issues: painful arc 60-120 degrees → side-lying external rotation

ANKLE PAIN FRAMEWORK:
  Achilles tendinopathy: worse first steps in morning → eccentric calf raises (heel drops)
  Restricted dorsiflexion: primary cause of knee valgus and squat depth issues
    → Ankle mobilization, calf stretching (gastrocnemius and soleus separately)

SQUAT MOVEMENT ERRORS:
  Valgus collapse: weak glute med, restricted ankle dorsiflexion → band above knees
  Forward lean: ankle restriction, weak anterior core → heel elevation, ankle work
  Butt wink: hamstring tightness, hip structure → box squat to appropriate depth
  Shifting to one side: hip mobility asymmetry → single-leg work

PREHAB PRINCIPLES:
  - Prehab is simply rehab done before the injury occurs
  - Frequency beats intensity — daily light work beats weekly intense work
  - Prioritize: ankle mobility (daily), hip mobility (daily), thoracic mobility (daily)
  - The 5-minute warmup that prevents a 5-month injury is always worth it
`

export const JOINT_REGIONS = [
  'ankle', 'knee', 'hip', 'lower_back',
  'upper_back', 'shoulder', 'neck', 'elbow', 'wrist',
] as const

export type JointRegion = typeof JOINT_REGIONS[number]

export const JOINT_LABELS: Record<JointRegion, string> = {
  ankle: 'Ankle',
  knee: 'Knee',
  hip: 'Hip',
  lower_back: 'Lower Back',
  upper_back: 'Upper Back / Shoulders',
  shoulder: 'Shoulder',
  neck: 'Neck',
  elbow: 'Elbow',
  wrist: 'Wrist',
}

export interface PainScreeningResult {
  joint: JointRegion
  side: 'left' | 'right' | 'both' | 'center'
  pain_level: number
  pain_type: string[]
  when_painful: string[]
  movements_that_hurt: string[]
  duration_weeks: number
  has_red_flags: boolean
  red_flags_present: string[]
}

export interface PrehabilityExercise {
  name: string
  category: 'mobility' | 'stability' | 'strength' | 'activation'
  joint_target: JointRegion[]
  sets: number
  reps_or_duration: string
  frequency: 'daily' | 'every_other_day' | 'training_days_only'
  instructions: string[]
  coaching_cues: string[]
  progression: string
  regression: string
  video_search_term: string
}

export interface MovementAssessment {
  movement: string
  passed: boolean
  observations: string
  implications: string
  corrections: string[]
}

export const MOVEMENT_TOWARDS_WORSE: Record<JointRegion, string[]> = {
  knee: ['Squatting', 'Going down stairs', 'Running', 'Jumping', 'Sitting for long periods', 'Getting up from chair', 'Kneeling', 'Lunging'],
  ankle: ['Walking on uneven ground', 'Running', 'Jumping', 'Squatting', 'First steps in morning', 'Going up/down stairs', 'Pointing toes', 'Pulling toes up'],
  hip: ['Squatting deep', 'Hip hinge / deadlift', 'Sitting for long periods', 'Getting up from sitting', 'Single-leg stance', 'Climbing stairs', 'Crossing legs', 'Hip flexion under load'],
  lower_back: ['Bending forward', 'Sitting for long periods', 'Standing for long periods', 'Deadlifts / Romanian deadlifts', 'Morning stiffness', 'Twisting', 'Overhead lifting', 'Getting out of bed'],
  upper_back: ['Seated posture / desk work', 'Overhead pressing', 'Rows / pulling movements', 'Looking down at phone', 'Deep breathing', 'Rotating trunk'],
  shoulder: ['Overhead pressing', 'Reaching behind back', 'Bench press', 'Sleeping on that side', 'Reaching across body', 'Lateral raises', 'Internal rotation movements'],
  neck: ['Looking down at phone', 'Looking up', 'Turning head to one side', 'Sleeping position', 'Sitting at desk', 'Driving', 'Overhead movements'],
  elbow: ['Curling / bicep work', 'Pressing movements', 'Gripping', 'Extending arm fully', 'Wrist flexion/extension', 'Throwing'],
  wrist: ['Push-ups / pressing', 'Gripping heavy weight', 'Wrist extension', 'Wrist flexion', 'Typing / desk work', 'Rotating forearm'],
}

export const RED_FLAG_QUESTIONS = [
  'Pain that wakes you from sleep at night',
  'Pain that is present even completely at rest',
  'Numbness, tingling, or electric sensations down the limb',
  'The joint feels unstable or gives way unexpectedly',
  'Significant swelling appeared after an injury',
  'This started from a specific accident, fall, or trauma',
  'You have had a fever alongside this joint pain',
]

export const AI_DISCLAIMER = 'This assessment is for educational purposes and does not constitute medical advice. APEX is an AI fitness tool, not a medical device. For persistent, severe, or worsening symptoms always consult a qualified healthcare professional.'

export const ASSESSMENT_TYPES = {
  overhead_squat: {
    name: 'Overhead Squat Assessment',
    icon: '🏋️',
    description: 'Reveals ankle, hip, and thoracic restrictions',
    duration: '2 min',
    questions: [
      {
        id: 'heel_rise',
        prompt: 'Stand with feet shoulder-width, arms overhead. Squat as deep as comfortable. Do your heels stay flat on the ground?',
        options: [
          { value: 'pass', label: 'Yes — heels stay flat' },
          { value: 'fail', label: 'No — heels rise up' },
        ],
      },
      {
        id: 'knee_alignment',
        prompt: 'As you squat, do your knees stay in line with your toes?',
        options: [
          { value: 'pass', label: 'Yes — track over toes' },
          { value: 'partial', label: 'One side collapses inward' },
          { value: 'fail', label: 'Both knees cave inward' },
        ],
      },
      {
        id: 'torso_angle',
        prompt: 'How much does your torso lean forward during the squat?',
        options: [
          { value: 'pass', label: 'Stays relatively upright' },
          { value: 'fail', label: 'Leans significantly forward' },
        ],
      },
      {
        id: 'arm_position',
        prompt: 'Do your arms stay in line with your torso or fall forward?',
        options: [
          { value: 'pass', label: 'Stay overhead / in line' },
          { value: 'fail', label: 'Fall forward toward floor' },
        ],
      },
      {
        id: 'depth',
        prompt: 'How deep can you comfortably squat?',
        options: [
          { value: 'pass', label: 'Full depth (hip crease below knee)' },
          { value: 'partial', label: 'Parallel (hip crease at knee)' },
          { value: 'fail', label: 'Above parallel — feels restricted' },
        ],
      },
      {
        id: 'pain',
        prompt: 'Any pain during the movement?',
        options: [
          { value: 'pass', label: 'None' },
          { value: 'partial', label: 'Mild discomfort' },
          { value: 'fail', label: 'Pain stops me or changes movement' },
        ],
      },
    ],
  },
  single_leg: {
    name: 'Single-Leg Squat Assessment',
    icon: '🦵',
    description: 'Tests hip stability and knee alignment',
    duration: '2 min',
    questions: [
      {
        id: 'completion',
        prompt: 'Standing on one leg, perform 5 single-leg squats (to ~60° knee bend). Repeat both sides. Can you complete them?',
        options: [
          { value: 'pass', label: 'Yes, both sides easily' },
          { value: 'partial', label: 'Yes, but one side struggles' },
          { value: 'fail', label: 'Cannot complete 5 on one or both sides' },
        ],
      },
      {
        id: 'knee_alignment',
        prompt: 'Watch your knee in a mirror or video. Does it stay in line with your 2nd toe?',
        options: [
          { value: 'pass', label: 'Tracks over 2nd toe — in line' },
          { value: 'partial', label: 'Collapses slightly inward' },
          { value: 'fail', label: 'Collapses significantly inward (valgus)' },
        ],
      },
      {
        id: 'hip_level',
        prompt: 'Does your hip/pelvis stay level or does it drop on the unsupported side?',
        options: [
          { value: 'pass', label: 'Stays level throughout' },
          { value: 'fail', label: 'Drops noticeably on the unsupported side' },
        ],
      },
      {
        id: 'balance',
        prompt: 'How is your balance during the movement?',
        options: [
          { value: 'pass', label: 'Solid and controlled' },
          { value: 'partial', label: 'Some wobbling but recoverable' },
          { value: 'fail', label: 'Cannot maintain balance' },
        ],
      },
      {
        id: 'asymmetry',
        prompt: 'Is there a noticeable difference between left and right?',
        options: [
          { value: 'pass', label: 'Both sides feel equal' },
          { value: 'fail', label: 'One side is noticeably worse' },
        ],
      },
    ],
  },
  hip_hinge: {
    name: 'Hip Hinge Pattern',
    icon: '🔄',
    description: 'Assesses lower back safety for deadlifts and hinges',
    duration: '2 min',
    questions: [
      {
        id: 'toe_touch',
        prompt: 'Stand with feet hip-width. Try to touch your toes without bending your knees. How far can you reach?',
        options: [
          { value: 'pass', label: 'Touch toes comfortably' },
          { value: 'partial', label: 'Reach mid-shin' },
          { value: 'fail', label: 'Only reach knees — very tight' },
        ],
      },
      {
        id: 'hinge_feel',
        prompt: 'Hinge forward with a slight knee bend (hip hinge pattern). Where do you feel the load?',
        options: [
          { value: 'pass', label: 'Hamstrings and glutes — correct' },
          { value: 'fail', label: 'Lower back — compensating' },
          { value: 'partial', label: 'Mix of both' },
        ],
      },
      {
        id: 'spine_neutral',
        prompt: 'Can you maintain a neutral spine (not rounded) when you hinge forward?',
        options: [
          { value: 'pass', label: 'Yes — spine stays flat / neutral' },
          { value: 'fail', label: 'Spine rounds in the lower back' },
          { value: 'partial', label: 'Rounds slightly at end range' },
        ],
      },
      {
        id: 'single_leg_rdl',
        prompt: 'Try a single-leg RDL (reach one hand toward floor, hinge on one leg). How is your balance?',
        options: [
          { value: 'pass', label: 'Solid, both sides' },
          { value: 'partial', label: 'Moderate struggle — one side worse' },
          { value: 'fail', label: 'Cannot balance on one leg to hinge' },
        ],
      },
    ],
  },
  shoulder_mobility: {
    name: 'Shoulder Mobility Screen',
    icon: '🤸',
    description: 'Checks thoracic mobility and shoulder function',
    duration: '3 min',
    questions: [
      {
        id: 'overhead_reach',
        prompt: 'Raise both arms straight overhead. Can you reach fully without arching your lower back?',
        options: [
          { value: 'pass', label: 'Yes, both arms fully overhead' },
          { value: 'partial', label: 'One arm limited, or must arch back' },
          { value: 'fail', label: 'Both arms limited overhead' },
        ],
      },
      {
        id: 'internal_rotation',
        prompt: 'Reach one hand behind your head and down your back. How far can you reach?',
        options: [
          { value: 'pass', label: 'Touch shoulder blade area' },
          { value: 'partial', label: 'Reach mid-back' },
          { value: 'fail', label: 'Cannot comfortably reach behind head' },
        ],
      },
      {
        id: 'scratch_test',
        prompt: 'One arm reaches over (from top) and one from below. Try to clasp hands behind your back. How close do they get?',
        options: [
          { value: 'pass', label: 'Hands touch or overlap' },
          { value: 'partial', label: 'Within 2-3 inches' },
          { value: 'fail', label: 'More than 3 inches apart' },
        ],
      },
      {
        id: 'thoracic_extension',
        prompt: 'Sit on a chair edge. Clasp hands behind head. Try to extend your upper back backward over the chair. Do you feel thoracic (mid-back) extension?',
        options: [
          { value: 'pass', label: 'Yes — feel extension in mid-back' },
          { value: 'partial', label: 'Mostly extends in lower back instead' },
          { value: 'fail', label: 'Very stiff — minimal extension possible' },
        ],
      },
      {
        id: 'pain_overhead',
        prompt: 'Any pain when raising your arms overhead or reaching behind your back?',
        options: [
          { value: 'pass', label: 'No pain' },
          { value: 'partial', label: 'Mild discomfort / pinching' },
          { value: 'fail', label: 'Significant pain' },
        ],
      },
    ],
  },
} as const

export type AssessmentType = keyof typeof ASSESSMENT_TYPES

export const PREHAB_LIBRARY = [
  {
    id: 'daily_movement_prep',
    name: 'Daily Movement Prep',
    duration: 10,
    description: 'Essential daily mobility for everyone',
    target_joints: ['ankle', 'hip', 'upper_back'] as JointRegion[],
    color: '#00D4AA',
  },
  {
    id: 'ankle_mobility',
    name: 'Ankle Mobility Program',
    duration: 8,
    description: 'Improve squat depth and reduce knee pain',
    target_joints: ['ankle', 'knee'] as JointRegion[],
    color: '#6C63FF',
  },
  {
    id: 'hip_mobility',
    name: 'Hip Mobility Program',
    duration: 12,
    description: 'Unlock your hips for better movement quality',
    target_joints: ['hip', 'lower_back'] as JointRegion[],
    color: '#FF6B35',
  },
  {
    id: 'shoulder_health',
    name: 'Shoulder Health Protocol',
    duration: 10,
    description: 'For overhead athletes and pressing movements',
    target_joints: ['shoulder', 'upper_back'] as JointRegion[],
    color: '#6C63FF',
  },
  {
    id: 'lower_back_protection',
    name: 'Lower Back Protection',
    duration: 12,
    description: 'McGill-based core and spine protection',
    target_joints: ['lower_back'] as JointRegion[],
    color: '#FECB02',
  },
  {
    id: 'knee_resilience',
    name: 'Knee Resilience Program',
    duration: 10,
    description: 'For runners, jumpers, and lifters',
    target_joints: ['knee', 'ankle', 'hip'] as JointRegion[],
    color: '#00D4AA',
  },
] as const
