const objectIdPattern = '[a-f\\d]{24}';
const markdownMention = new RegExp(`@\\[[^\\]]+]\\(user:(${objectIdPattern})\\)`, 'gi');
const plainMention = new RegExp(`@(${objectIdPattern})`, 'gi');

export const parseMentionedUserIds = (content: string): string[] => {
  const ids = new Set<string>();
  for (const match of content.matchAll(markdownMention)) {
    if (match[1]) ids.add(match[1]);
  }
  for (const match of content.matchAll(plainMention)) {
    if (match[1]) ids.add(match[1]);
  }
  return [...ids];
};
