const SPECIAL_NAMES = [
  "af", // af Klint
  "al", // al-Sabah, al-Mansour
  "ap", // welsh: Rhys ap Dafydd
  "auf", // auf der Heide
  "ben", // ben-Gurion
  "bin", // bin Salman
  "d", // d'Artagnan
  "da", // da Vinci
  "das", // das Neves
  "de", // de Gaulle
  "del", // del Toro
  "della", // della Robbia
  "delle", // delle Rose
  "dem", // dem Beauvais
  "der", // der Bingle
  "des", // des Moines
  "di", // di Caprio
  "do", // do Brasil
  "dos", // dos Santos
  "du", // du Pont
  "e", // Teller e Silva
  "el", // el Greco
  "ibn", // ibn Saud
  "la", // la Cruz
  "le", // le Pen
  "lo", // lo Duca
  "o", // o'Neill
  "ten", // ten Boom
  "ter", // ter Horst
  "van", // van Gogh
  "von", // von Trapp
  "y", // Pérez y López
  "zu", // zu Gutenberg
  "zum", // zum Schwarzenegger
  "zur", // zur Mühlen
];

const KNOWN_MACS = [
  "Macevicius",
  "Machar",
  "Machell",
  "Machen",
  "Machiel",
  "Machin",
  "Machlin",
  "Machon",
  "Macias",
  "Macin",
  "Maciol",
  "MacIsaac",
  "Maciulis",
  "Mackay",
  "Mackell",
  "Macken",
  "Mackey",
  "Mackie",
  "Mackintosh",
  "Mackle",
  "Macklem",
  "Mackley",
  "Macklin",
  "Mackrell",
  "Maclin",
  "MacMurdo",
  "Macomber",
  "Macquarie",
];

export function capitalizeName(name: string) {
  if (name.trim().length === 0) {
    return name;
  }

  // Determine the alphabet used. We only work if the name is entirely composed of letters from a single alphabet, either Latin Cyrillic or Greek.
  const isLatin = /^[\p{Script=Latin}\s'-]*$/u.test(name);
  const isGreek = /^[\p{Script=Greek}\s'-]*$/u.test(name);
  const isCyrillic = /^[\p{Script=Cyrillic}\s'-]*$/u.test(name);

  if (isGreek || isCyrillic) {
    // Very easy, just capitalize the first letter of each word
    return name
      .split(" ")
      .map((word) => word[0].toUpperCase() + word.slice(1).toLowerCase())
      .join(" ");
  } else if (isLatin) {
    // More exceptions, edge cases, and rules
    return name
      .split(" ")
      .map((word) => {
        return handleName(word);
      })
      .join(" ");
  }

  return name;
}

const handleName = (word: string) => {
  return handleApostropheName(word);
};

const handleApostropheName = (word: string) => {
  if (word.includes("'")) {
    const parts = word.split("'");
    return (
      handleWord(parts[0]) +
      "'" +
      (parts[1] ? handleHyphenatedName(parts[1]) : "")
    );
  }

  return handleHyphenatedName(word);
};

const handleHyphenatedName = (word: string) => {
  if (word.includes("-")) {
    return word
      .split("-")
      .map((part) => handleWord(part))
      .join("-");
  }
  return handleWord(word);
};

const handleWord = (word: string) => {
  if (!word) return "";

  // Skip already mixed case words (assumed to be correctly formatted)
  if (word !== word.toLowerCase() && word !== word.toUpperCase()) {
    return word;
  }

  // Handle special cases
  if (SPECIAL_NAMES.includes(word.toLowerCase())) {
    // leave the first letter untouched, lowercase the rest
    return word[0] + word.slice(1).toLowerCase();
  } else if (word.toLowerCase().startsWith("mc") && word.length > 2) {
    return "Mc" + word[2].toUpperCase() + word.slice(3).toLowerCase();
  } else if (word.toLowerCase().startsWith("mac") && word.length > 5) {
    // Mac is hard.
    word = word.toLocaleLowerCase();

    for (const mac of KNOWN_MACS) {
      if (word.startsWith(mac.toLowerCase())) {
        return mac + word.slice(mac.length).toLowerCase();
      }
    }

    // if the word ends with a, c, i, j, o, z, or includes cz, ignore
    if (
      ["a", "c", "i", "j", "o", "z"].includes(word[word.length - 1]) ||
      word.includes("cz")
    ) {
      return "M" + word.slice(1).toLowerCase();
    }

    return "Mac" + word[3].toUpperCase() + word.slice(4).toLowerCase();
  } else {
    return word[0].toUpperCase() + word.slice(1).toLowerCase();
  }
};
