export const CHARACTERS = [
  { index: 0, name: 'Astronaute', seed: 'Felix',  style: 'adventurer' },
  { index: 1, name: 'Pirate',     seed: 'Orion',  style: 'adventurer' },
  { index: 2, name: 'Ninja',      seed: 'Titan',  style: 'bottts-neutral' },
  { index: 3, name: 'Robot',      seed: 'Bolt',   style: 'bottts-neutral' },
  { index: 4, name: 'Sorcière',   seed: 'Luna',   style: 'fun-emoji' },
  { index: 5, name: 'Viking',     seed: 'Thor',   style: 'adventurer' },
  { index: 6, name: 'Alien',      seed: 'Nova',   style: 'fun-emoji' },
  { index: 7, name: 'Chevalier',  seed: 'Arthur', style: 'adventurer' },
  { index: 8, name: 'Hacker',     seed: 'Pixel',  style: 'bottts-neutral' },
  { index: 9, name: 'Reine',      seed: 'Aurora', style: 'adventurer' },
];

export function getAvatarUrl(characterIndex, size = 80) {
  const char = CHARACTERS[characterIndex] ?? CHARACTERS[0];
  return `https://api.dicebear.com/9.x/${char.style}/svg?seed=${char.seed}&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf`;
}
