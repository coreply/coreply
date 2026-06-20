export const PUNCTUATIONS = new Set([
    '!',
    '"',
    ')',
    ',',
    '.',
    ':',
    ';',
    '?',
    ']',
    '~',
    '，',
    '。',
    '：',
    '；',
    '？',
    '）',
    '】',
    '！',
    '、',
    '」',
]);

export const PUNCTUATION_SPLIT_REGEX = /(?=[!"),.:;?~\]，。：；？）】！、「])/;