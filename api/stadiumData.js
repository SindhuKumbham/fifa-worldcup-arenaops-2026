// stadiumData.js — Stadium knowledge base + retrieval logic.
// Kept as a separate, pure module (no I/O, no side effects) so it can be
// easily unit-tested in isolation — see tests/stadiumData.test.js.

const stadiumKB = [
  { id: "gate_A", type: "gate", name: "Gate A", location: "North side, faces main plaza", sections_served: "101-115, 201-210" },
  { id: "gate_B", type: "gate", name: "Gate B", location: "Northeast side, near VIP drop-off", sections_served: "116-125, 211-220" },
  { id: "gate_C", type: "gate", name: "Gate C", location: "East side, near metro station exit", sections_served: "126-140, 221-230" },
  { id: "gate_D", type: "gate", name: "Gate D", location: "Southeast side, near press entrance", sections_served: "141-150, 231-240" },
  { id: "gate_E", type: "gate", name: "Gate E", location: "South side, family/accessible entrance", sections_served: "151-165, 241-250" },
  { id: "gate_F", type: "gate", name: "Gate F", location: "Southwest side, near bus parking", sections_served: "166-175, 251-260" },
  { id: "gate_G", type: "gate", name: "Gate G", location: "West side, near fan zone", sections_served: "176-190, 261-270" },
  { id: "gate_H", type: "gate", name: "Gate H", location: "Northwest side, staff/volunteer entrance", sections_served: "191-200, 271-280" },

  { id: "restroom_1", type: "restroom", name: "Restroom near Section 108", level: "Lower Bowl", near_gate: "Gate A", accessible: true },
  { id: "restroom_2", type: "restroom", name: "Restroom near Section 133", level: "Lower Bowl", near_gate: "Gate C", accessible: true },
  { id: "restroom_3", type: "restroom", name: "Restroom near Section 158", level: "Lower Bowl", near_gate: "Gate E", accessible: true },
  { id: "restroom_4", type: "restroom", name: "Restroom near Section 182", level: "Lower Bowl", near_gate: "Gate G", accessible: false },
  { id: "restroom_5", type: "restroom", name: "Restroom near Section 214", level: "Club Level", near_gate: "Gate B", accessible: true },
  { id: "restroom_6", type: "restroom", name: "Restroom near Section 265", level: "Upper Bowl", near_gate: "Gate F", accessible: false },

  { id: "medical_1", type: "medical", name: "Medical Station 1", level: "Lower Bowl", near_gate: "Gate A", near_sections: "101-115" },
  { id: "medical_2", type: "medical", name: "Medical Station 2", level: "Lower Bowl", near_gate: "Gate D", near_sections: "141-150" },
  { id: "medical_3", type: "medical", name: "Medical Station 3 (Main)", level: "Concourse", near_gate: "Gate E", near_sections: "all — main first aid hub, has ambulance bay" },
  { id: "medical_4", type: "medical", name: "Medical Station 4", level: "Upper Bowl", near_gate: "Gate H", near_sections: "191-200" },

  { id: "family_1", type: "family_room", name: "Family Assistance & Lost Child Point", level: "Concourse", near_gate: "Gate E", notes: "Primary lost-child reunification point, staffed at all times during matches" },
  { id: "family_2", type: "family_room", name: "Nursing/Quiet Room", level: "Club Level", near_gate: "Gate B", notes: "Quiet room for nursing parents or sensory breaks" },

  { id: "accessibility_1", type: "accessibility_services", name: "Accessibility Services Desk", level: "Concourse", near_gate: "Gate E", notes: "Wheelchair loans, companion seating changes, sensory kits, accessible shuttle info" },
  { id: "accessibility_2", type: "accessible_route", name: "Accessible elevator to Club/Upper levels", level: "all", near_gate: "Gate A, Gate E, Gate G", notes: "Only 3 gates have elevators; Gates B/C/D/F/H require using nearest of these three" },

  { id: "lost_found", type: "lost_and_found", name: "Lost & Found Office", level: "Concourse", near_gate: "Gate C", notes: "Open until 2 hours after final whistle" },

  { id: "security_1", type: "security_post", name: "Security Command Post North", level: "Concourse", near_gate: "Gate A", notes: "Escalation point for crowd incidents in North sections" },
  { id: "security_2", type: "security_post", name: "Security Command Post South", level: "Concourse", near_gate: "Gate E", notes: "Escalation point for crowd incidents in South sections" },

  { id: "food_1", type: "food_court", name: "North Food Court", level: "Lower Bowl", near_gate: "Gate A", notes: "Halal, vegetarian, and allergen-labeled options available" },
  { id: "food_2", type: "food_court", name: "South Food Court", level: "Lower Bowl", near_gate: "Gate E", notes: "Halal, vegetarian, and allergen-labeled options available" },

  { id: "prayer_room", type: "prayer_room", name: "Multi-Faith Quiet/Prayer Room", level: "Concourse", near_gate: "Gate C", notes: "Available for all faiths, ablution facilities included" },
];

const KEYWORD_MAP = {
  restroom: ["restroom", "toilet", "bathroom", "washroom"],
  medical: ["medical", "injury", "hurt", "sick", "first aid", "ambulance", "faint"],
  family_room: ["child", "kid", "family", "lost child", "nursing", "baby"],
  accessibility_services: ["wheelchair", "accessib", "disab", "mobility"],
  accessible_route: ["wheelchair", "accessib", "elevator", "disab", "mobility"],
  lost_and_found: ["lost and found", "lost item", "found item", "missing bag", "missing phone"],
  security_post: ["security", "fight", "incident", "unsafe", "threat", "aggressive"],
  food_court: ["food", "eat", "hungry", "snack", "drink", "halal", "vegetarian"],
  prayer_room: ["prayer", "pray", "faith", "worship", "quiet room", "meditation"],
  gate: ["gate", "entrance", "entry", "exit"],
};

/**
 * Retrieves the stadium facilities most relevant to a free-text staff query.
 * Pure function: no side effects, deterministic output for a given input —
 * this makes it straightforward to unit test (see tests/stadiumData.test.js).
 */
function retrieveRelevantLocations(query, kb, maxResults = 6) {
  const queryLower = query.toLowerCase();
  const scored = [];

  for (const item of kb) {
    let score = 0;

    for (const [typeKey, keywords] of Object.entries(KEYWORD_MAP)) {
      if (item.type === typeKey || item.type.includes(typeKey)) {
        if (keywords.some((kw) => queryLower.includes(kw))) {
          score += 3;
        }
      }
    }

    const sectionNumbers = query.match(/\b(1\d{2}|2\d{2})\b/g) || [];
    for (const sec of sectionNumbers) {
      const fields = ["sections_served", "near_sections"];
      for (const field of fields) {
        if (item[field] && String(item[field]).includes(sec)) {
          score += 5;
        }
      }
    }

    for (const gateLetter of "ABCDEFGH") {
      const gateToken = `gate ${gateLetter.toLowerCase()}`;
      if (queryLower.includes(gateToken) && (item.near_gate || "").toLowerCase().includes(gateToken)) {
        score += 4;
      }
    }

    if (score > 0) {
      scored.push({ score, item });
    }
  }

  scored.sort((a, b) => b.score - a.score);
  let results = scored.slice(0, maxResults).map((s) => s.item);

  if (results.length === 0) {
    results = kb.slice(0, 5);
  }

  return results;
}

module.exports = { stadiumKB, retrieveRelevantLocations, KEYWORD_MAP };
