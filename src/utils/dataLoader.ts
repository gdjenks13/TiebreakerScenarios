import aacCsv from "../data/aac.csv?raw";
import accCsv from "../data/acc.csv?raw";
import big10Csv from "../data/big10.csv?raw";
import big12Csv from "../data/big12.csv?raw";
import secCsv from "../data/sec.csv?raw";

export const conferenceRawMap: Record<string, string> = {
  AAC: aacCsv,
  ACC: accCsv,
  Big10: big10Csv,
  Big12: big12Csv,
  SEC: secCsv,
};

import ratingsJson from "../data/ratings.json";
export const ratings: Record<string, number> = ratingsJson;
