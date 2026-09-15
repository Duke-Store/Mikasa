function preprocess(answers) {
  const corpus = answers
    .map(a => a.answer)
    .join('\n')
    .replace(/\r\n/g, '\n')
    .replace(/\t/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return corpus;
}

module.exports = { preprocess };
