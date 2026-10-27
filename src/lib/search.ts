/** Client-side text search for pickers. */

/** Lower-cased, without diacritics and Uzbek apostrophe variants, for matching. */
export function searchKey(text: string): string {
  return text
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[\u2018\u2019\u02bb\u02bc`']/g, "'")
    .toLowerCase()
    .trim();
}

/** Options whose text contains every word of the query. */
export function filterOptions<O extends { text: string }>(
  options: ReadonlyArray<O>,
  query: string,
): ReadonlyArray<O> {
  const words = searchKey(query).split(/\s+/).filter(Boolean);
  if (words.length === 0) return options;
  return options.filter((option) => {
    const haystack = searchKey(option.text);
    return words.every((word) => haystack.includes(word));
  });
}
