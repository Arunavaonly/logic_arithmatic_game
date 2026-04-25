// i18n.js — English + Bengali string tables
const I18N = {
  en: {
    gameTitle: "Puzzle Parthenon",
    gameSubtitle: "A Journey of Intellectual Mastery",
    levelSelect: "Choose Your Trial",
    levelLocked: "Locked",
    bestScore: "Best",
    questionOf: (n, t) => `${n} of ${t}`,
    score: "Score",
    hint: "💡 Hint",
    hintUsed: "💡 Hint Used",
    skip: "⏭ Skip",
    submit: "Submit",
    placeholder: "Type your answer…",
    pressEnter: "press Enter to submit",
    correct: ["Excellent! By Euclid!", "Splendid!", "Outstanding!", "Brilliant deduction!", "Precisely right!", "Magnificent!", "You are on fire!"],
    wrong: ["Hmm, reconsider...", "Not quite. Think again.", "Almost — review your steps.", "A small misstep. Try once more."],
    hintIntro: ["Listen closely, Scholar…", "Here is my guidance…", "Consider this carefully…"],
    levelStart: (name) => `The trial of ${name} begins. Focus your mind, Scholar.`,
    levelComplete: "Level Complete!",
    archiCelebrate: ["EUREKA! You have proven yourself, Scholar!", "Magnificent! A true mind at work!", "By the gods of Olympus — superb!", "You honour the spirit of mathematics!"],
    archiDisappoint: ["Even the great Euclid stumbled. Shall we try again?", "The mind that persists always prevails. Try again.", "Failure is the first step to mastery."],
    yourReward: "Your Reward",
    accuracy: "Accuracy",
    timeTaken: "Time",
    strengths: "Your Intellectual Profile",
    loreUnlocked: "📜 Lore Unlocked",
    nextLevel: "Next Level →",
    tryAgain: "Try Again",
    home: "🏠 Home",
    streakLabel: (n) => `🔥 Streak: ${n}`,
    timerLabel: "Time",
    skipConfirm: "Skip this question? (-50 pts)",
    masteredIn: "Mastered in",
    weakIn: "Needs work in",
    solidIn: "Solid in",
    passMessage: "You may advance to the next trial.",
    failMessage: "Score at least 60% to unlock the next level.",
    soundOn: "🔊",
    soundOff: "🔇",
    darkMode: "🌙",
    lightMode: "☀️",
    lang: "বাং",
    seconds: "s",
    noTimer: "—",
    oracleCardBadge: "AI-Powered",
    oracleTrialPrompt: "The Oracle awaits. Do you dare enter?",
    rewardOracleTrial: "⚡ The Oracle's Trial",
    rewardNextLevel: "Next level →",
    rfEvaluating: "🔮 Archimedes is evaluating your reasoning…",
    startGame: "Start game",
    homeWelcomeBack:
      "Welcome back, Scholar! Choose your trial from the levels below — or return to the Oracle's Trial if you have unlocked it.",

    introGameLongEn:
      "Welcome, Scholar, to Puzzle Parthenon — a hall of logic, arithmetic, and deduction.\n\n"
      + "Trials I through IV each give you ten problems from different categories. Read carefully, type your answer, and press Submit. You may ask me for a Hint when you are stuck; Skips exist but cost points. Many trials use a per-question timer — watch it. Your Accuracy earns stars; each trial has a minimum score to count as conquered for this session.\n\n"
      + "At the beginning only Trial I is unlocked. After you complete it, you may either continue Trial II in order, or jump to Level V — The Oracle's Trial: infinite AI-written reasoning puzzles where one wrong answer ends the round — explain your thinking, not only a final number.\n\n"
      + "When my introduction ends, tap Start game — then your trials will appear in this space. Take your time and read well.",

    postLevel1ChoiceLongEn:
      "Splendid — Trial I is yours!\n\n"
      + "Two paths now open. First, the classical climb: Trial II, then III, then IV — ten puzzles each, timers on many stages, deeper ideas as you rise.\n\n"
      + "Second, Level V — The Oracle's Trial: endless AI-crafted reasoning challenges. One incorrect submission ends the round; write two to four sentences of real reasoning.\n\n"
      + "Below you will see your scores and buttons to continue Trial II or enter the Oracle. Choose boldly, Scholar.",
  },
  bn: {
    gameTitle: "আর্কিমিডিসের গণিত অভিযান",
    gameSubtitle: "মেধার পথে এক অসাধারণ যাত্রা",
    levelSelect: "তোমার পরীক্ষা বেছে নাও",
    levelLocked: "বন্ধ",
    bestScore: "সেরা",
    questionOf: (n, t) => `${n} / ${t}`,
    score: "স্কোর",
    hint: "💡 সাহায্য",
    hintUsed: "💡 সাহায্য নেওয়া হয়েছে",
    skip: "⏭ বাদ দাও",
    submit: "জমা দাও",
    placeholder: "তোমার উত্তর লেখো…",
    pressEnter: "Enter চাপো",
    correct: ["দারুণ! একদম ঠিক!", "অসাধারণ!", "চমৎকার!", "বাহ, মাথা খাটিয়েছ!", "নিখুঁত উত্তর!", "অপূর্ব!", "তুমি দুর্দান্ত!"],
    wrong: ["একটু ভুল হয়েছে, আবার ভাবো।", "ঠিক না, আরেকবার চেষ্টা করো।", "প্রায় হয়েছিল — আবার ভাবো।", "ছোট্ট ভুল। আরেকবার দেখো।"],
    hintIntro: ["মনোযোগ দিয়ে শোনো…", "এই সাহায্যটা নাও…", "এইটা একটু ভেবে দেখো…"],
    levelStart: (name) => `${name}-এর পরীক্ষা শুরু হচ্ছে। মনোযোগ দাও।`,
    levelComplete: "স্তর সম্পন্ন!",
    archiCelebrate: ["ইউরেকা! তুমি সত্যিই অসাধারণ!", "বাহ! এই মেধাই তোমাকে এগিয়ে নেবে!", "দেবতারাও খুশি হতেন!", "গণিতের মর্যাদা রক্ষা করেছ তুমি!"],
    archiDisappoint: ["মহান ইউক্লিডও হোঁচট খেয়েছিলেন। আবার চেষ্টা করো।", "যে হাল ছাড়ে না, সে-ই জেতে। আবার যাও।", "ব্যর্থতাই সাফল্যের প্রথম ধাপ।"],
    yourReward: "তোমার পুরস্কার",
    accuracy: "নির্ভুলতা",
    timeTaken: "সময়",
    strengths: "তোমার মেধার প্রোফাইল",
    loreUnlocked: "📜 জ্ঞান অর্জিত",
    nextLevel: "পরের স্তর →",
    tryAgain: "আবার চেষ্টা",
    home: "🏠 হোম",
    streakLabel: (n) => `🔥 ধারা: ${n}`,
    timerLabel: "সময়",
    skipConfirm: "এই প্রশ্ন বাদ দেবে? (-৫০ পয়েন্ট)",
    masteredIn: "দক্ষ",
    weakIn: "আরও চর্চা দরকার",
    solidIn: "ভালো",
    passMessage: "তুমি পরের স্তরে যেতে পারবে।",
    failMessage: "পরের স্তর খুলতে ৬০% স্কোর করতে হবে।",
    soundOn: "🔊",
    soundOff: "🔇",
    darkMode: "🌙",
    lightMode: "☀️",
    lang: "ENG",
    seconds: "সে",
    noTimer: "—",
    oracleCardBadge: "এআই-চালিত",
    oracleTrialPrompt: "ওরাকল অপেক্ষা করছেন। তুমি কি সাহস করবে?",
    rewardOracleTrial: "⚡ ওরাকলের পরীক্ষা",
    rewardNextLevel: "পরের স্তর →",
    rfEvaluating: "🔮 আর্কিমিডিস তোমার উত্তর বিশ্লেষণ করছেন…",
    startGame: "খেলা শুরু করো",
    homeWelcomeBack:
      "আবার স্বাগতম, পণ্ডিত! নিচের স্তরগুলো থেকে পরীক্ষা বেছে নাও — অথবা ওরাকলের পরীক্ষায় ফিরে যাও যদি তা খোলা থাকে।",

    introGameLongBn:
      "স্বাগতম, পণ্ডিত! এটা পাজল পার্থেনন — যেখানে যুক্তি, গণিত আর অনুমানের পরীক্ষা হবে।\n\n"
      + "প্রথম চারটি স্তরে (I–IV) দশটি করে প্রশ্ন থাকে। ভালো করে পড়ো, উত্তর লিখে Submit চাপো। দরকার হলে আমার কাছ থেকে Hint নাও; Skip আছে কিন্তু স্কোর কাটে। অনেক স্তরে প্রতি প্রশ্নে সময়সীমা আছে। নির্ভুলতায় তারা জুটবে; প্রতিটি স্তরে ন্যূনতম স্কোর পেলে সেটা এই সেশনে জয় হিসেবে গণ্য হবে।\n\n"
      + "শুরুতে শুধু স্তর I খোলা। সেটি শেষ করলে দুটো পথ খুলবে: ক্রমে স্তর II চালিয়ে যাও, অথবা স্তর V — ওরাকলের পরীক্ষায় লাফ দাও — সেখানে AI (Groq Llama 3.3 70B Versatile) লাইভ প্রশ্ন দেয়; এক ভুলেই রাউন্ড শেষ; শুধু সংখ্যা নয়, যুক্তি লিখতে হবে।\n\n"
      + "AI সম্পর্কে: Llama 3.3 আগের সব প্রশ্ন মনে রাখে না। প্রতিটি প্রশ্ন আলাদা API কল; গেম শুধু সাম্প্রতিক ইংরেজি প্রশ্নের ছোট তালিকা পাঠায় যাতে একই ধাঁচ বার বার না আসে। মডেলের প্রশিক্ষনভিত্তিক সাধারণ জ্ঞান আছে, কিন্তু তোমার পুরো সেভ ফাইল সে দেখে না — শুধু ওই প্রম্পটে যা দেওয়া হয়।\n\n"
      + "আমার বক্তব্য শেষ হলে «খেলা শুরু করো» চাপো — তারপর এই জায়গায় স্তরগুলো দেখা যাবে। মনোযোগ দিয়ে পড়ো।",

    postLevel1ChoiceLongBn:
      "চমৎকার — স্তর I তুমি জিতলে!\n\n"
      + "এখন দুই রাস্তা। এক: ক্রমে স্তর II, তারপর III, IV — প্রতিটিতে দশটি প্রশ্ন, অনেক জায়গায় টাইমার, ধারণা কঠিন হতে থাকবে।\n\n"
      + "দুই: স্তর V — ওরাকলের পরীক্ষা: AI (Llama 3.3 70B Versatile) লাইভ প্রশ্ন; এক ভুলেই শেষ; ২–৪ বাক্যে যুক্তি লেখো।\n\n"
      + "মনে রেখো: Llama তোমার পুরো খেলা মনে রাখে না। প্রতিটি প্রশ্ন নতুন অনুরোধ; আমরা শুধু সাম্প্রতিক ইংরেজি প্রশ্নের ছোট তালিকা যোগ করি যাতে একই ধরনের প্রশ্ন কম আসে।\n\n"
      + "নিচে স্কোর আর বাটন দেখবে — পরের স্তর বা ওরাকল। সাহস করে বেছে নাও।",
  }
};

let currentLang = 'en';
function t(key, ...args) {
  const val = I18N[currentLang][key];
  return typeof val === 'function' ? val(...args) : (val ?? I18N['en'][key] ?? key);
}
function setLang(lang) { currentLang = lang; }
function getLang() { return currentLang; }
