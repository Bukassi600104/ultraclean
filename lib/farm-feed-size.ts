import {z} from 'zod';

export const catfishFeedSizes = [2, 3, 4, 6, 9] as const;
export const catfishFeedSize = z.number().refine(
  size => catfishFeedSizes.some(option => option === size),
  'Choose a feed size of 2, 3, 4, 6 or 9 mm.',
);
export const feedSizeWithoutFeeding = 'Clear the feed size when no feed was used.';
export const formatFeedSize = (size: number) => size + ' mm';
