require('dotenv').config();
const { App } = require('@slack/bolt');
const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, 'counts.json');

// matches "claude" as its own word, so "claudeboard" doesn't count
const CLAUDE_RE = /\bclaude\b/gi;

// milestones worth announcing publicly
const MILESTONES = [10, 25, 50, 100, 250, 500, 1000];

const SERMONS = [
  'Blessed are those who prompt, for they shall inherit the merge conflicts.',
  'Ask not what your codebase does. Ask Claude.',
  'In the beginning there was the prompt, and the prompt was vague, and the code compiled anyway.',
  'He who reads the diff before merging may cast the first stone.',
  'Give a dev a function and they ship for a day. Teach a dev to prompt and they never read code again.',
  'And lo, the tests passed, and no one knew why, and it was good enough.',
  'Do not ask for whom the context window scrolls. It scrolls for thee.',
];

function loadCounts() {
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  } catch {
    return {};
  }
}

function saveCounts(counts) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(counts, null, 2));
}

function ordinal(n) {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

function lastMonthName() {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() - 1);
  return d.toLocaleString('en-US', { month: 'long' });
}

// username lookups are cached for the life of the process
const NAME_CACHE = {};
async function username(client, userId) {
  if (NAME_CACHE[userId]) return NAME_CACHE[userId];
  try {
    const { user } = await client.users.info({ user: userId });
    NAME_CACHE[userId] = user.name;
    return user.name;
  } catch {
    return userId;
  }
}

async function buildLeaderboard(client, counts) {
  const entries = Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);
  if (entries.length === 0) {
    return 'Nobody has said claude yet. A workspace of unbelievable restraint.';
  }
  const total = Object.values(counts).reduce((sum, n) => sum + n, 0);
  const names = await Promise.all(entries.map(([id]) => username(client, id)));
  const rows = entries.map(([, n], i) => {
    const rank = String(i + 1).padStart(2);
    const name = names[i].slice(0, 24).padEnd(24);
    const count = String(n).padStart(7);
    return `${rank}  ${name}${count}`;
  });
  const header = ` #  ${'USERNAME'.padEnd(24)}${'CLAUDES'.padStart(7)}`;
  return [
    '*The Vibe Coding Hall of Slop*',
    `_${total} total invocations of our lord and savior. nobody here has read a line of code since last ${lastMonthName()}_`,
    '```',
    header,
    ...rows,
    '```',
    `Reigning Chief Claude Officer: *${names[0]}*`,
  ].join('\n');
}

const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  appToken: process.env.SLACK_APP_TOKEN,
  socketMode: true,
});

// function 1: tally every mention of claude and reply with the running count
app.message(CLAUDE_RE, async ({ message, say }) => {
  // skip bots, edits, joins, and other message subtypes
  if (message.subtype || message.bot_id) return;

  const mentions = (message.text.match(CLAUDE_RE) || []).length;
  if (mentions === 0) return;

  const counts = loadCounts();
  const before = counts[message.user] || 0;
  const after = before + mentions;
  counts[message.user] = after;
  saveCounts(counts);

  let text = `<@${message.user}> has mentioned our lord and savior Claude for the ${ordinal(after)} time.`;

  // append the milestone proclamation only when one was crossed
  const crossed = MILESTONES.find((m) => before < m && after >= m);
  if (crossed) {
    text += ` A MILESTONE OF ${crossed} MENTIONS OF CLAUDE HAS BEEN REACHED! Few walk this path. May their context window never overflow, and their API credits never run dry.`;
  }

  await say({ thread_ts: message.ts, text });
});

// post the leaderboard when someone says "claudeboard"
app.message(/\bclaudeboard\b/i, async ({ say, client }) => {
  await say(await buildLeaderboard(client, loadCounts()));
});

// function 2: the leaderboard
app.command('/claude-counter-board', async ({ ack, respond, client }) => {
  await ack();
  await respond({
    response_type: 'in_channel',
    text: await buildLeaderboard(client, loadCounts()),
  });
});

// function 3: your own count and rank, shown only to you
app.command('/claude-counter-me', async ({ ack, respond, command }) => {
  await ack();
  const counts = loadCounts();
  const n = counts[command.user_id] || 0;
  if (n === 0) {
    await respond('You have never spoken His name. Suspicious.');
    return;
  }
  const rank =
    Object.values(counts).filter((c) => c > n).length + 1;
  await respond(
    `You have invoked our lord and savior Claude ${n} times. You are rank ${rank} in the Hall of Slop.`
  );
});

// function 4: a randomly chosen vibe coding proverb
app.command('/claude-counter-sermon', async ({ ack, respond }) => {
  await ack();
  const sermon = SERMONS[Math.floor(Math.random() * SERMONS.length)];
  await respond({ response_type: 'in_channel', text: `_${sermon}_` });
});

(async () => {
  await app.start();
  console.log('claude-counter is running');
})();
