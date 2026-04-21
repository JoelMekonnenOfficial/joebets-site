// Aggregates upcoming events from ESPN public scoreboards.
// Returns a uniform shape for the dashboard.

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

async function fetchLeague(league) {
  try {
    const res = await fetch(ESPN[league], { headers: { 'Accept': 'application/json' } });
    if (!res.ok) return [];
    const data = await res.json();
    const events = (data.events || []).map(ev => {
      const comp = ev.competitions && ev.competitions[0];
      const competitors = comp ? comp.competitors || [] : [];
      const names = competitors.map(c => c.athlete?.displayName || c.team?.displayName || c.displayName).filter(Boolean);
      const matchup = names.length >= 2 ? `${names[0]} vs. ${names[1]}` : ev.name || 'TBD';
      const venue = comp?.venue?.fullName;
      const card = comp?.notes?.[0]?.headline;
      return {
        league,
        leagueName: LEAGUE_NAMES[league],
        matchup,
        startTime: ev.date,
        venue,
        card,
        // Pick placeholder — real picks come from a separate picks source later
        pick: null,
      };
    });
    return events;
  } catch (e) {
    return [];
  }
}

exports.handler = async () => {
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

  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=300',
    },
    body: JSON.stringify({ events, updated: new Date().toISOString() }),
  };
};

function demoPick(ev) {
  // Placeholder demo pick so Gold users see something. Replace with real picks pipeline.
  const first = ev.matchup.split(' vs. ')[0] || 'Fighter A';
  if (ev.league === 'ufc' || ev.league === 'boxing') {
    return { text: `${first} by decision`, units: 2 };
  }
  return { text: `${first} moneyline`, units: 1 };
}
