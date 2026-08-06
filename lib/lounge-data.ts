import { z } from 'zod';
import loungeData from '@/data/lounge-networks.json';

const AirportSchema = z.object({
  city: z.string(),
  note: z.string().optional(),
});

const NetworkSchema = z.object({
  id: z.string(),
  name: z.string(),
  shortName: z.string(),
  summary: z.string(),
  steps: z.array(z.string()),
  airports: z.array(AirportSchema),
  airportsNote: z.string().optional(),
});

const LoungeDataSchema = z.object({
  commonCapabilities: z.array(z.string()),
  networks: z.array(NetworkSchema),
});

export type LoungeNetwork = z.infer<typeof NetworkSchema>;
export type LoungeData = z.infer<typeof LoungeDataSchema>;

export function getLoungeData(): LoungeData {
  return LoungeDataSchema.parse(loungeData);
}
