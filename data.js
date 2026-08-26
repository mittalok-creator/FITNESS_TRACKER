// Static reference data extracted from the coaching program & diet plan.
// This never changes at runtime — user-entered data lives in localStorage (see app.js).

// Curated locally so the "quote of the day" always works offline and never depends on a
// third-party API being up — the pick still rotates automatically once per day (see app.js).
const MOTIVATION_QUOTES = [
  "Discipline is choosing between what you want now and what you want most.",
  "You don't have to be extreme, just consistent.",
  "Every workout you show up for is a vote for the person you're becoming.",
  "Progress is progress, no matter how slow it feels today.",
  "The body achieves what the mind believes.",
  "Small daily improvements are the key to staggering long-term results.",
  "You didn't come this far to only come this far.",
  "Fat loss isn't a straight line — trust the average, not the daily number.",
  "Some days it's hard, and that's exactly the day it counts most.",
  "Your only competition is who you were yesterday.",
  "Motivation gets you started. Habit keeps you going.",
  "One more rep, one more rep — that's how strength is built.",
  "The plan works if you work the plan.",
  "You are not starting over, you are starting from experience.",
  "Consistency is what transforms average into excellence.",
  "The hardest lift is getting off the couch — you've already done it.",
  "Sore today, strong tomorrow.",
  "Nobody who ever gave their best regretted it.",
  "Results happen over months, not workouts. Keep going.",
  "The pain of discipline weighs ounces; the pain of regret weighs tons.",
  "Show up for yourself the way you show up for everyone else.",
  "A little progress each day adds up to big results.",
  "Your future self is watching you right now through memories.",
  "It never gets easier, you just get stronger.",
  "Don't wish it were easier, wish you were better.",
  "The only bad workout is the one that didn't happen.",
  "Success is the sum of small efforts, repeated daily.",
  "Trust the process — the scale isn't the only proof of progress.",
  "You are one decision away from a totally different life.",
  "Energy and persistence conquer all things.",
  "Slow progress is still progress. Don't quit.",
  "Champions keep playing until they get it right.",
  "Difficult roads often lead to beautiful destinations.",
  "What seems impossible today will one day be your warm-up.",
  "Take care of your body — it's the only place you have to live.",
  "Strength doesn't come from what you can do, it comes from overcoming what you thought you couldn't.",
  "Every meal, every step, every set — it's all building the new you.",
  "Focus on your goal. Don't look in any direction but ahead.",
  "You are stronger than you think and more capable than you know.",
  "Push yourself, because no one else is going to do it for you."
];

const CARDIO_CIRCUIT = {
  title: "30-Min Low-Impact Cardio Circuit",
  note: "Every single day — bodyweight only, no machine needed. 5 rounds of the 5 moves below, 40 sec work / 20 sec rest. Keep effort conversational.",
  exercises: [
    { name: "March in Place (High Knees, Low Impact)", sets: "5 rounds", reps: "40 sec", rest: "20 sec", cue: "Land softly on the balls of the feet, pump the arms, keep the pace low-impact — no jumping." },
    { name: "Standing Shadow Boxing (Alternating Punches)", sets: "5 rounds", reps: "40 sec", rest: "20 sec", cue: "Stay light on the feet, rotate through the core with each punch, keep shoulders relaxed." },
    { name: "Side-to-Side Step Touch", sets: "5 rounds", reps: "40 sec", rest: "20 sec", cue: "Soft knees, glide the weight side to side, no jumping — just a smooth low-impact shuffle." },
    { name: "Standing Alternating Front Knee Raises", sets: "5 rounds", reps: "40 sec", rest: "20 sec", cue: "Lift the knee to hip height under control, tap down softly, avoid slamming the foot." },
    { name: "Standing Torso Twist with Arm Swing", sets: "5 rounds", reps: "40 sec", rest: "20 sec", cue: "Rotate from the core, let the arms swing loosely across the body, hips stay facing forward." }
  ]
};

const WARMUPS = {
  upper: {
    title: "Warm-Up — Upper Body",
    note: "Before every Push, Pull & Upper session. Max. 10 minutes. Never skip it.",
    exercises: [
      { name: "Neck rotations", sets: 1, reps: "12", rest: "Nil", cue: "Slow, controlled full circles — do not force range of motion." },
      { name: "Shoulder rotations", sets: 1, reps: "12", rest: "Nil", cue: "Roll shoulders up, back, and down in a full slow circle." },
      { name: "Arm circles", sets: 1, reps: "12", rest: "Nil", cue: "Small circles growing larger to prime the shoulder joint." },
      { name: "Wrist rotations", sets: 1, reps: "12", rest: "Nil", cue: "Slow full circles each direction to prep the wrist joint." }
    ]
  },
  lower: {
    title: "Warm-Up — Lower Body",
    note: "Before every Legs & Lower session. Max. 10 minutes. Never skip it.",
    exercises: [
      { name: "Knee hugs", sets: 1, reps: "12 each side", rest: "Nil", cue: "Hug knee to chest, brace core, alternate sides." },
      { name: "Leg swings", sets: 1, reps: "12 each side", rest: "Nil", cue: "Hold a support, swing leg in a controlled arc." },
      { name: "Hip openers", sets: 1, reps: "10 each side", rest: "Nil", cue: "Slow, controlled hip circles to mobilise the joint." },
      { name: "Alternate toe touches", sets: 1, reps: "12", rest: "Nil", cue: "Controlled reach to opposite toe, engage the core." },
      { name: "Ankle rotations", sets: 1, reps: "20 each side", rest: "Nil", cue: "Slow full circles each direction to prep the ankle joint." }
    ]
  }
};

// Program is keyed by JS getDay() index: 0=Sun ... 6=Sat
const PROGRAM = {
  1: { // Monday
    label: "Push", sub: "Chest · Shoulders · Triceps", warmup: "upper", rest: false,
    exercises: [
      { name: "Flat Dumbbell Press", sets: 3, reps: "8-10", rest: "2-3 mins", cue: "Elbows ~45° from torso, press up and slightly in, control the descent." },
      { name: "Machine Pec Dec Fly", sets: 3, reps: "10-15", rest: "60-90 secs", cue: "Slight bend in elbows, squeeze chest at the front, control the stretch back." },
      { name: "Seated DB Shoulder Press", sets: 3, reps: "8-10", rest: "2-3 mins", cue: "Bench upright, press dumbbells overhead without flaring elbows out, brace the core." },
      { name: "DB Lateral Raises", sets: 3, reps: "10-15", rest: "60-90 secs", cue: "Raise from the shoulder, lead with the elbow, slight bend in the arm, control the descent." },
      { name: "High Pulley Tricep Pushdown", sets: 3, reps: "10-15", rest: "60-90 secs", cue: "Elbows locked at sides, extend fully, squeeze triceps at the bottom." },
      { name: "Ab Crunches", sets: 3, reps: "10-15", rest: "60-90 secs", cue: "Feet grounded, core engaged. Lift shoulders slightly, squeeze abs, return slowly without pulling the neck." }
    ]
  },
  2: { // Tuesday
    label: "Pull", sub: "Back · Rear Delts · Biceps", warmup: "upper", rest: false,
    exercises: [
      { name: "Close Grip Lat Pulldown", sets: 3, reps: "8-10", rest: "2-3 mins", cue: "Pull elbows down to ribs, drive with the lats, avoid leaning back excessively." },
      { name: "Seated Cable Row", sets: 3, reps: "8-10", rest: "2-3 mins", cue: "Chest up, pull handles to torso, squeeze shoulder blades without shrugging." },
      { name: "Machine Rear Delt Fly", sets: 3, reps: "10-15", rest: "60-90 secs", cue: "Lead with the elbows, squeeze rear delts, slight bend in the arms." },
      { name: "DB Bicep Curls", sets: 3, reps: "10-15", rest: "60-90 secs", cue: "Elbows pinned to sides, curl without swinging the torso." },
      { name: "Machine Preacher Curl", sets: 3, reps: "10-15", rest: "60-90 secs", cue: "Full extension at the bottom, curl without lifting off the pad." },
      { name: "Flutter Kicks", sets: 3, reps: "10-15", rest: "60-90 secs", cue: "Core tight, lower back pressed to floor. Alternate legs up/down in small controlled movements." }
    ]
  },
  3: { // Wednesday
    label: "Legs", sub: "Quads · Hamstrings · Calves · Glutes", warmup: "lower", rest: false,
    exercises: [
      { name: "DB Goblet Squat", sets: 3, reps: "8-10", rest: "2-3 mins", cue: "Hold one dumbbell at chest, sit hips back, chest tall, knees track over toes." },
      { name: "DB Romanian Deadlift", sets: 3, reps: "8-10", rest: "2-3 mins", cue: "Push hips back, soft knees, feel a hamstring stretch, keep weight close to legs." },
      { name: "Machine Leg Extension", sets: 3, reps: "10-15", rest: "60-90 secs", cue: "Squeeze quads hard at the top for 1 second, control the negative." },
      { name: "Machine Leg Curl", sets: 3, reps: "10-15", rest: "60-90 secs", cue: "Curl heels toward glutes under control, avoid hips lifting off the pad." },
      { name: "DB Walking Lunges", sets: 3, reps: "10-15 each leg", rest: "60-90 secs", cue: "Step out, drop the back knee under control, drive through the front heel to stand." },
      { name: "DB Standing Calf Raise", sets: 3, reps: "10-15", rest: "60-90 secs", cue: "Full stretch at the bottom, pause and squeeze hard at the top of each rep." },
      { name: "Machine Cable Crunches", sets: 3, reps: "10-15", rest: "60-90 secs", cue: "Round the spine and crunch down from the ribcage, not just the hips." }
    ]
  },
  4: { // Thursday
    label: "Rest", sub: "Active Recovery", warmup: null, rest: true,
    exercises: [
      { name: "15,000 Steps — Easy Walking", sets: "—", reps: "Throughout the day", rest: "—", cue: "No lifting today. Spread steps across the day at an easy, conversational pace." },
      { name: "Optional: Light stretching / mobility", sets: "—", reps: "10-15 mins", rest: "—", cue: "Fully optional. Gentle full-body stretch or slow walk-through of warm-up moves if stiff." }
    ]
  },
  5: { // Friday
    label: "Upper", sub: "Chest · Back · Shoulders · Arms (2nd dose)", warmup: "upper", rest: false,
    exercises: [
      { name: "Incline DB Press", sets: 3, reps: "8-10", rest: "2-3 mins", cue: "Bench at 30-45°, press up and slightly back, keep shoulder blades pinned." },
      { name: "Standing Low Pulley Chest Fly", sets: 3, reps: "10-15", rest: "60-90 secs", cue: "Low pulley set low, sweep hands up and in, squeeze the upper/mid chest." },
      { name: "Wide Grip Lat Pulldown", sets: 3, reps: "8-10", rest: "2-3 mins", cue: "Lead with the elbows down and back, avoid excessive body swing." },
      { name: "Wide Grip Seated Row", sets: 3, reps: "8-10", rest: "2-3 mins", cue: "Drive elbows back wide, squeeze shoulder blades together at the finish." },
      { name: "DB Arnold Press", sets: 3, reps: "8-10", rest: "2-3 mins", cue: "Rotate palms from facing you to facing forward as you press, keep core braced." },
      { name: "DB Shrugs", sets: 3, reps: "10-15", rest: "60-90 secs", cue: "Shrug straight up toward the ears, pause, lower with full control — no rolling." },
      { name: "Incline Dumbbell Curl", sets: 3, reps: "10-15", rest: "60-90 secs", cue: "~60° incline, curl with arm slightly behind torso for a deep stretch and peak contraction." },
      { name: "High Pulley Overhead Tricep Extension", sets: 3, reps: "10-15", rest: "60-90 secs", cue: "Elbows tucked and stationary, extend fully overhead, feel the stretch." }
    ]
  },
  6: { // Saturday
    label: "Lower", sub: "Quads · Hamstrings · Calves · Glutes (2nd leg session)", warmup: "lower", rest: false,
    exercises: [
      { name: "DB Bulgarian Split Squat", sets: 3, reps: "8-10 each leg", rest: "2-3 mins", cue: "Rear foot on the bench, drop straight down, front knee tracks over the toes." },
      { name: "Machine Leg Extension", sets: 3, reps: "10-15", rest: "60-90 secs", cue: "Squeeze quads hard at the top for 1 second, control the negative." },
      { name: "Machine Leg Curl", sets: 3, reps: "10-15", rest: "60-90 secs", cue: "Curl heels toward glutes under control, avoid hips lifting off the pad." },
      { name: "DB Single-Leg Calf Raise", sets: 3, reps: "10-15 each leg", rest: "60-90 secs", cue: "Hold a support for balance, full stretch at the bottom, pause and squeeze at the top." },
      { name: "DB Lateral Lunge", sets: 3, reps: "10-15 each leg", rest: "60-90 secs", cue: "Step wide to one side, sit the hips back over the bent knee, push back to start." },
      { name: "Machine Cable Crunches", sets: 3, reps: "10-15", rest: "60-90 secs", cue: "Round the spine and crunch down from the ribcage, not just the hips." }
    ]
  },
  0: { // Sunday
    label: "Rest", sub: "Active Recovery (cycle repeats from Push on Monday)", warmup: null, rest: true,
    exercises: [
      { name: "15,000 Steps — Easy Walking", sets: "—", reps: "Throughout the day", rest: "—", cue: "No lifting today. Spread steps across the day at an easy, conversational pace." },
      { name: "Optional: Light stretching / mobility", sets: "—", reps: "10-15 mins", rest: "—", cue: "Fully optional. Gentle full-body stretch or slow walk-through of warm-up moves if stiff." }
    ]
  }
};

const DIET = {
  water_goal_l: 4,
  daily_totals: { calories: 1870, protein: 126, carbs: 190, fats: 56 },
  meals: [
    { key: "waking", title: "Upon Waking Up", items: [
      { name: "Water", qty: "500 ml" }
    ]},
    { key: "preworkout", title: "Pre-Workout (25 min before training)", items: [
      { name: "Caffeine (tab) — optional", qty: "" },
      { name: "Apple or Papaya", qty: "100 gms" }
    ]},
    { key: "breakfast", title: "Breakfast", items: [
      { name: "Rolled Oats", qty: "35 gms" },
      { name: "Whey protein isolate/concentrate", qty: "1 scoop" },
      { name: "Apple", qty: "70 gms" },
      { name: "Skim Milk", qty: "150 ml" }
    ], note: "Soak oats + whey in skim milk overnight in the fridge, add apple in the morning. Take 1000-1500 mcg Vitamin B12 daily, post-breakfast." },
    { key: "brunch", title: "Brunch", items: [
      { name: "Papaya / any seasonal fruit", qty: "150 gms" }
    ]},
    { key: "lunch", title: "Lunch", items: [
      { name: "White rice (raw)", qty: "70 gms" },
      { name: "Low Fat Paneer", qty: "100 gms" },
      { name: "Oil for Paneer (olive oil)", qty: "15 ml" },
      { name: "Beetroot (salad)", qty: "100 gms" },
      { name: "Cucumber (salad)", qty: "100 gms" }
    ], note: "70g raw rice = 210g cooked. Take 60,000 IU Vitamin D3 once a week + 1 capsule Omega-3 (~1000mg) daily, both post-breakfast. Paneer pulao or paneer curry both work." },
    { key: "evening_snack", title: "Evening Snack", items: [
      { name: "Whey protein isolate/concentrate", qty: "1 scoop" }
    ]},
    { key: "dinner", title: "Dinner", items: [
      { name: "Whole wheat flour / Ragi (raw) / Rice", qty: "60 gms" },
      { name: "Mixed vegetables (mushroom, capsicum, carrot, onion, green beans, bell pepper etc)", qty: "200 gms" },
      { name: "Oil for vegetable (ghee/olive oil)", qty: "15 ml" },
      { name: "Curd / Greek yoghurt", qty: "150 gms" }
    ], note: "60g raw rice = 180g cooked. 60g wheat flour = 2 medium roti. Can substitute vegetables with 300ml cooked dal." }
  ],
  tips: [
    "Complete the macros for the day.",
    "Eat the mentioned vegetables & salads daily for fibre/micronutrients. If constipated, add 5–10g isabgol with water.",
    "No restriction on salt/spices — cook with half an onion and/or tomato, no issues.",
    "All food items must be weighed uncooked/raw.",
    "Weight may fluctuate day to day (water weight) — don't worry, it comes down.",
    "Weigh yourself first thing in the morning, after the washroom, before eating/drinking.",
    "Weigh yourself every day and log it — share before scheduled weekly calls.",
    "Consume the full diet daily, even on non-training days."
  ],
  travel_tips: [
    "Carry whey protein",
    "Eat grilled food cooked in minimal oil — paneer, eggs, fish, chicken",
    "Avoid sugar/sweets",
    "Avoid alcohol",
    "Control portion sizes",
    "Workout at the hotel/room — squats, lunges, push-ups, planks, mountain climbers, jump rope, ab exercises"
  ]
};

const DEFAULT_PROFILE = {
  name: "Alok Mittal",
  programStartDate: "2026-08-24",
  goalWeight: 100,
  startWeight: 121,
  stepGoal: 10000,
  heightCm: null
};

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
