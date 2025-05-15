const englishBadWords = [
  'shit', 'fuck', 'bitch', 'cunt', 'asshole', 'damn', 'crap', 'dick', 'piss', 'bastard', 'douchebag', 'motherfucker', 'nigger', 'heil hitler', 'nigga', 'pussy'
];

const spanishBadWords = [
  'mierda', 'puta', 'cabron', 'pendejo', 'coño', 'joder', 'gilipollas', 'maricón', 'cabro', 'jodete', 'pincho', 'conchadetumadre', 'concha', 'vagina', 'pene', 'culo', 'puto', 'maricon', 'perra', 'cachera', 'malparido', 'prostituta', 'cachero',
];

const allBadWords = [...englishBadWords, ...spanishBadWords];

export function getProfaneWords(text: string): string[] {
  const lowerText = text.toLowerCase();
  return allBadWords.filter(word => lowerText.includes(word));
}
