import { describe, test, expect } from "bun:test";
import { capitalizeName } from "./name";

describe("capitalizeName", () => {
  test("handles simple names correctly", () => {
    expect(capitalizeName("john")).toBe("John");
    expect(capitalizeName("SMITH")).toBe("Smith");
    expect(capitalizeName("jessica")).toBe("Jessica");
  });

  test("preserves already correctly formatted names", () => {
    expect(capitalizeName("John")).toBe("John");
    expect(capitalizeName("McDonald")).toBe("McDonald");
  });

  test("capitalizes multi-word names", () => {
    expect(capitalizeName("john smith")).toBe("John Smith");
    expect(capitalizeName("MARY JANE")).toBe("Mary Jane");
  });

  test("handles special prefixes correctly", () => {
    expect(capitalizeName("de silva")).toBe("de Silva");
    expect(capitalizeName("van houten")).toBe("van Houten");
    expect(capitalizeName("von trapp")).toBe("von Trapp");
    expect(capitalizeName("da vinci")).toBe("da Vinci");
    expect(capitalizeName("du pont")).toBe("du Pont");

    // When writing all uppercase, we make no assumption on the correct casing
    expect(capitalizeName("DE silva")).toBe("De Silva");
    expect(capitalizeName("VAN houten")).toBe("Van Houten");
    expect(capitalizeName("VON trapp")).toBe("Von Trapp");
    expect(capitalizeName("DA vinci")).toBe("Da Vinci");
    expect(capitalizeName("DU pont")).toBe("Du Pont");
  });

  test("handles Mc and Mac prefixes correctly", () => {
    expect(capitalizeName("mcdonald")).toBe("McDonald");
    expect(capitalizeName("mccarthy")).toBe("McCarthy");
    expect(capitalizeName("macdonald")).toBe("MacDonald");
    expect(capitalizeName("macarthur")).toBe("MacArthur");
  });

  test("mac exceptions", () => {
    // Short macs
    expect(capitalizeName("mac")).toBe("Mac");
    expect(capitalizeName("mace")).toBe("Mace");
    expect(capitalizeName("macky")).toBe("Macky");

    // polish
    expect(capitalizeName("maciej")).toBe("Maciej");
    expect(capitalizeName("maciejczyk")).toBe("Maciejczyk");

    // italian
    expect(capitalizeName("macario")).toBe("Macario");

    // Known Mac exceptions
    expect(capitalizeName("macklem")).toBe("Macklem");
    expect(capitalizeName("mackintosh")).toBe("Mackintosh");
    expect(capitalizeName("mackay")).toBe("Mackay");
    expect(capitalizeName("mackenzie")).toBe("Mackenzie");
    expect(capitalizeName("MACKENZIE")).toBe("Mackenzie");
    expect(capitalizeName("macmurdo")).toBe("MacMurdo");
  });

  test("handles apostrophes correctly", () => {
    // Don't force uppercase
    expect(capitalizeName("o'neill")).toBe("o'Neill");
    expect(capitalizeName("o'brian")).toBe("o'Brian");
    expect(capitalizeName("d'artagnan")).toBe("d'Artagnan");

    expect(capitalizeName("O'neill")).toBe("O'Neill");
    expect(capitalizeName("O'brian")).toBe("O'Brian");
    expect(capitalizeName("D'artagnan")).toBe("D'Artagnan");
  });

  test("handles hyphenated names correctly", () => {
    expect(capitalizeName("smith-jones")).toBe("Smith-Jones");
    expect(capitalizeName("garcia-lopez")).toBe("Garcia-Lopez");
    expect(capitalizeName("james-von-trapp")).toBe("James-von-Trapp");
  });

  test("handles complex names correctly", () => {
    expect(capitalizeName("jean-claude van damme")).toBe(
      "Jean-Claude van Damme",
    );
    expect(capitalizeName("ludwig von der rohe")).toBe("Ludwig von der Rohe");
    expect(capitalizeName("LUDWIG VON DER ROHE")).toBe("Ludwig Von Der Rohe");
    expect(capitalizeName("catherine zeta-jones")).toBe("Catherine Zeta-Jones");
    expect(capitalizeName("neil o'donnell-smith")).toBe("Neil o'Donnell-Smith");
  });

  // Greek names
  test("handles Greek names correctly", () => {
    expect(capitalizeName("αριστοτέλης")).toBe("Αριστοτέλης");
    expect(capitalizeName("γιάννης αντετοκούνμπο")).toBe(
      "Γιάννης Αντετοκούνμπο",
    );
  });

  // Cyrillic names
  test("handles Cyrillic names correctly", () => {
    expect(capitalizeName("иван петров")).toBe("Иван Петров");
    expect(capitalizeName("АННА КАРЕНИНА")).toBe("Анна Каренина");
  });

  test("ignores names that contain extra characters", () => {
    expect(capitalizeName("john123")).toBe("john123");
    expect(capitalizeName("李")).toBe("李");
    expect(capitalizeName("jo李hn")).toBe("jo李hn");
  });

  // Special case with mixed scripts (should return unchanged)
  test("handles mixed scripts correctly", () => {
    expect(capitalizeName("john иванов")).toBe("john иванов");
  });
});
