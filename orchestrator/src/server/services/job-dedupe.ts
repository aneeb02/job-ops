type DedupeJob = {
  title: string;
  employer: string;
  location?: string | null;
};

const stateNames: Record<string, string> = {
  alabama: "al",
  alaska: "ak",
  arizona: "az",
  arkansas: "ar",
  california: "ca",
  colorado: "co",
  connecticut: "ct",
  delaware: "de",
  florida: "fl",
  georgia: "ga",
  hawaii: "hi",
  idaho: "id",
  illinois: "il",
  indiana: "in",
  iowa: "ia",
  kansas: "ks",
  kentucky: "ky",
  louisiana: "la",
  maine: "me",
  maryland: "md",
  massachusetts: "ma",
  michigan: "mi",
  minnesota: "mn",
  mississippi: "ms",
  missouri: "mo",
  montana: "mt",
  nebraska: "ne",
  nevada: "nv",
  "new hampshire": "nh",
  "new jersey": "nj",
  "new mexico": "nm",
  "new york": "ny",
  "north carolina": "nc",
  "north dakota": "nd",
  ohio: "oh",
  oklahoma: "ok",
  oregon: "or",
  pennsylvania: "pa",
  "rhode island": "ri",
  "south carolina": "sc",
  "south dakota": "sd",
  tennessee: "tn",
  texas: "tx",
  utah: "ut",
  vermont: "vt",
  virginia: "va",
  washington: "wa",
  "west virginia": "wv",
  wisconsin: "wi",
  wyoming: "wy",
};

function normalizeBasicText(value: string | null | undefined): string {
  return (value ?? "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeEmployer(value: string): string {
  return normalizeBasicText(value)
    .replace(/\bcorporation\b/g, "corp")
    .replace(/\bincorporated\b/g, "inc")
    .replace(/\blimited\b/g, "ltd")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeLocation(value: string | null | undefined): string {
  let normalized = normalizeBasicText(value);

  for (const [name, abbr] of Object.entries(stateNames)) {
    normalized = normalized.replace(new RegExp(`\\b${name}\\b`, "g"), abbr);
  }

  normalized = normalized
    .replace(/\bunited states of america\b/g, "us")
    .replace(/\bunited states\b/g, "us")
    .replace(/\busa\b/g, "us")
    .replace(/\s+/g, " ")
    .trim();

  const parts = normalized.split(" ").filter(Boolean);
  if (parts.at(-1) === "us") {
    parts.pop();
  }

  return parts.join(" ");
}

export function createJobDedupeKey(job: DedupeJob): string {
  return [
    normalizeBasicText(job.title),
    normalizeEmployer(job.employer),
    normalizeLocation(job.location),
  ].join("|");
}
