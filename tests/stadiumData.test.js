const { stadiumKB, retrieveRelevantLocations } = require("../api/stadiumData");

describe("stadiumKB", () => {
  test("contains at least one entry of every core facility type", () => {
    const types = new Set(stadiumKB.map((item) => item.type));
    expect(types.has("gate")).toBe(true);
    expect(types.has("restroom")).toBe(true);
    expect(types.has("medical")).toBe(true);
    expect(types.has("family_room")).toBe(true);
    expect(types.has("security_post")).toBe(true);
  });

  test("every entry has a unique id", () => {
    const ids = stadiumKB.map((item) => item.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });

  test("every entry has a name and a type", () => {
    for (const item of stadiumKB) {
      expect(typeof item.name).toBe("string");
      expect(item.name.length).toBeGreaterThan(0);
      expect(typeof item.type).toBe("string");
    }
  });
});

describe("retrieveRelevantLocations", () => {
  test("finds restroom facilities when asked about a restroom", () => {
    const results = retrieveRelevantLocations("Where is the nearest restroom?", stadiumKB);
    const hasRestroom = results.some((r) => r.type === "restroom");
    expect(hasRestroom).toBe(true);
  });

  test("prioritizes results near a mentioned section number", () => {
    const results = retrieveRelevantLocations("Fan needs a restroom near section 158", stadiumKB);
    const ids = results.map((r) => r.id);
    expect(ids).toContain("restroom_3");
  });

  test("surfaces the family assistance point for a lost child request", () => {
    const results = retrieveRelevantLocations("A child is lost and crying near the concourse", stadiumKB);
    const ids = results.map((r) => r.id);
    expect(ids).toContain("family_1");
  });

  test("surfaces medical stations for an injury-related request", () => {
    const results = retrieveRelevantLocations("Someone fainted and needs medical help", stadiumKB);
    const hasMedical = results.some((r) => r.type === "medical");
    expect(hasMedical).toBe(true);
  });

  test("surfaces accessibility-related entries for a wheelchair request", () => {
    const results = retrieveRelevantLocations("Fan in a wheelchair needs an accessible route", stadiumKB);
    const hasAccessibilityEntry = results.some(
      (r) => r.type === "accessibility_services" || r.type === "accessible_route" || r.accessible === true
    );
    expect(hasAccessibilityEntry).toBe(true);
  });

  test("returns a non-empty fallback list for a completely unrelated query", () => {
    const results = retrieveRelevantLocations("asdkjfh qwoeiru random gibberish", stadiumKB);
    expect(results.length).toBeGreaterThan(0);
  });

  test("never returns more results than the requested maxResults", () => {
    const results = retrieveRelevantLocations("restroom", stadiumKB, 3);
    expect(results.length).toBeLessThanOrEqual(3);
  });

  test("is case-insensitive", () => {
    const lower = retrieveRelevantLocations("restroom near gate a", stadiumKB);
    const upper = retrieveRelevantLocations("RESTROOM NEAR GATE A", stadiumKB);
    expect(lower.map((r) => r.id)).toEqual(upper.map((r) => r.id));
  });
});
