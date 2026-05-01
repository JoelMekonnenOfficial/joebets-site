const ESPN = {
  ufc: 'https://site.api.espn.com/apis/site/v2/sports/mma/ufc/scoreboard',
  boxing: 'https://site.api.espn.com/apis/site/v2/sports/mma/boxing/scoreboard',
  nba: 'https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard',
  nfl: 'https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard',
};

const LEAGUE_NAMES = {
  ufc: 'UFC',
  boxing: 'Boxing',
  nba: 'NBA',
  nfl: 'NFL',
};

// Pick the headline competition from an ESPN event.
// ESPN orders MMA/boxing competitions earliest -> latest (prelims -> main event).
// The main event is reliably:
//   1. The last 5-round bout on the card (UFC main events are 5 rounds), or
//   2. The last competition in the array (always true for Fight Night cards).
// For NBA/NFL there is only one competition, so the result is unchanged.
function pickMainCompetition(ev) {
  const comps = (ev && ev.competitions) || [];
  if (!comps.length) return null;
  const fiveRound = [...comps].reverse().find(
    c => c && c.format && c.format.regulation && c.format.regulation.periods === 5
  );
  return fiveRound || comps[comps.length - 1];
}

async function fetchLeague(league) {
  try {
    const res = await fetch(ESPN[league], { headers: { 'Accept': 'application/json' } });
    if (!res.ok) return [];
    const data = await res.json();
    const events = (data.events || []).map(ev => {
      const comp = pickMainCompetition(ev);
      const competitors = comp ? comp.competitors || [] : [];
      const names = competitors
        .map(c => c.athlete?.displayName || c.team?.displayName || c.displayName)
        .filter(Boolean);
      const matchup = names.length >= 2 ? `${names[0]} vs. ${names[1]}` : ev.name || 'TBD';
      const venue = comp?.venue?.fullName;
      // For combat sports, ESPN's ev.name already has the card label
      // (e.g. "UFC Fight Night: Sterling vs. Zalal"). Use that as the card
      // when no per-competition headline note is set.
      const card = comp?.notes?.[0]?.headline || (league === 'ufc' || league === 'boxing' ? ev.name : undefined);
      return {
        league,
        leagueName: LEAGUE_NAMES[league],
        matchup,
        startTime: comp?.date || ev.date,
        venue,
        card,
        // Pick placeholder; real picks come from a separate picks source later.
        pick: null,
      };
    });
    return events;
  } catch (e) {
    return [];
  }
}

export async function onRequest({ request }) {
  if (request.method !== 'GET') {
    return json(405, { error: 'GET only' }, { Allow: 'GET' });
  }

  const results = await Promise.all(Object.keys(ESPN).map(fetchLeague));
  let events = results.flat();

  // Sort by startTime ascending, keep only upcoming + currently-happening
  const now = Date.now();
  events = events
    .filter(e => !e.startTime || new Date(e.startTime).getTime() > now - 6 * 3600_000)
    .sort((a, b) => new Date(a.startTime || 0) - new Date(b.startTime || 0))
    .slice(0, 40);

  // Attach sample picks for the top event of each league as a demo (remove when real picks are wired)
  const seen = new Set();
  for (const ev of events) {
    if (!seen.has(ev.league)) {
      seen.add(ev.league);
      ev.pick = demoPick(ev);
    }
  }

  return json(200, { events, updated: new Date().toISOString() }, {
    'Cache-Control': 'public, max-age=300',
  });
}

function demoPick(ev) {
  // Placeholder demo pick so Gold users see something. Replace with real picks pipeline.
  const first = ev.matchup.split(' vs. ')[0] || 'Fighter A';
  if (ev.league === 'ufc' || ev.league === 'boxing') {
    return { text: `${first} by decision`, units: 2 };
  }
  return { text: `${first} moneyline`, units: 1 };
}

function json(status, data, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      ...headers,
    },
  });
}
