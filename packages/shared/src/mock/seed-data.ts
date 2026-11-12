import type { Amenity, Province, Sport, Surface } from "../types";

export interface FieldSeed {
  sport: Sport;
  name: string;
  position: string;
  surface: Surface;
  indoor: boolean;
  format: string;
  maxPlayers: number;
  price: number;
  peak: number;
}
export interface VenueSeed {
  slug: string;
  name: string;
  nameKm: string;
  description: string;
  descriptionKm: string;
  province: Province;
  district: string;
  address: string;
  lat: number;
  lng: number;
  owner: "sophea" | "piseth" | "sreyneang";
  hours: [open: string, close: string];
  amenities: Amenity[];
  verified: boolean;
  featured: boolean;
  status: "approved" | "pending" | "rejected";
  moderationNote?: string;
  fields: FieldSeed[];
}

const f = (sport: Sport, name: string, position: string, surface: Surface, indoor: boolean, format: string, maxPlayers: number, price: number, peak: number): FieldSeed => ({
  sport, name, position, surface, indoor, format, maxPlayers, price, peak,
});

export const VENUE_SEEDS: VenueSeed[] = [
  {
    slug: "bkk-sports-club",
    name: "BKK Sports Club",
    nameKm: "ក្លឹបកីឡា បឹងកេងកង",
    description: "Two pitches and two tennis courts a short ride from Independence Monument. The indoor futsal court stays cool and dry through the rainy season, and the 7-a-side turf was relaid this year.",
    descriptionKm: "ទីលានបាល់ទាត់ពីរ និងទីលានតេនីសពីរ នៅជិតវិមានឯករាជ្យ។ ទីលានហ្វូតសាលក្នុងអគារត្រជាក់ និងមិនទទឹកភ្លៀង ហើយស្មៅសិប្បនិម្មិតទើបប្តូរថ្មីក្នុងឆ្នាំនេះ។",
    province: "phnom_penh", district: "Boeung Keng Kang", address: "St 322, Sangkat Boeung Keng Kang 1", lat: 11.5515, lng: 104.9215,
    owner: "sophea", hours: ["06:00", "23:00"],
    amenities: ["parking", "showers", "changing_rooms", "floodlights", "cafe", "wifi", "equipment_rental", "drinking_water", "lockers"],
    verified: true, featured: true, status: "approved",
    fields: [
      f("football", "Field A", "Indoor hall", "futsal_court", true, "5v5", 12, 18, 25),
      f("football", "Field B", "Outdoor, street side", "artificial_turf", false, "7v7", 16, 25, 35),
      f("tennis", "Court 1", "Hard court, east", "hard_court", false, "Singles/Doubles", 4, 10, 14),
      f("tennis", "Court 2", "Clay court, west", "clay", false, "Singles/Doubles", 4, 12, 16),
    ],
  },
  {
    slug: "toul-kork-arena",
    name: "Toul Kork Arena",
    nameKm: "តូលគោក អារីណា",
    description: "The biggest evening football spot in Toul Kork: three turf pitches under floodlights and two indoor volleyball halls with sprung floors. Busy after 5pm, so book early.",
    descriptionKm: "កន្លែងលេងបាល់ពេលល្ងាចធំជាងគេនៅទួលគោក៖ ទីលានស្មៅសិប្បនិម្មិតបី មានភ្លើងបំភ្លឺ និងសាលបាល់ទះក្នុងអគារពីរ។ មមាញឹកក្រោយម៉ោង ៥ ល្ងាច សូមកក់ទុកមុន។",
    province: "phnom_penh", district: "Toul Kork", address: "St 315, Sangkat Boeung Kak 2", lat: 11.5795, lng: 104.8985,
    owner: "sophea", hours: ["06:00", "23:00"],
    amenities: ["parking", "showers", "changing_rooms", "floodlights", "cafe", "spectator_seating", "first_aid", "drinking_water"],
    verified: true, featured: true, status: "approved",
    fields: [
      f("football", "Field 1", "Outdoor, main gate", "artificial_turf", false, "7v7", 16, 22, 32),
      f("football", "Field 2", "Outdoor, centre", "artificial_turf", false, "7v7", 16, 22, 32),
      f("football", "Field 3", "Covered, back row", "artificial_turf", true, "5v5", 12, 16, 24),
      f("volleyball", "Hall A", "Indoor, ground floor", "parquet", true, "6v6", 14, 12, 18),
      f("volleyball", "Hall B", "Indoor, ground floor", "parquet", true, "6v6", 14, 12, 18),
    ],
  },
  {
    slug: "koh-pich-football-park",
    name: "Koh Pich Football Park",
    nameKm: "សួនបាល់ទាត់ កោះពេជ្រ",
    description: "Football only, done properly. A full-size natural grass pitch for 11-a-side plus three turf pitches on Diamond Island, with a river breeze most evenings.",
    descriptionKm: "សម្រាប់បាល់ទាត់តែប៉ុណ្ណោះ។ ទីលានស្មៅធម្មជាតិទំហំពេញសម្រាប់ ១១ នាក់ និងទីលានស្មៅសិប្បនិម្មិតបី នៅកោះពេជ្រ មានខ្យល់ទន្លេបក់ត្រជាក់ពេលល្ងាច។",
    province: "phnom_penh", district: "Chamkar Mon", address: "Koh Pich St, Sangkat Tonle Bassac", lat: 11.549, lng: 104.942,
    owner: "piseth", hours: ["06:00", "23:00"],
    amenities: ["parking", "showers", "changing_rooms", "floodlights", "spectator_seating", "first_aid", "drinking_water", "equipment_rental"],
    verified: true, featured: true, status: "approved",
    fields: [
      f("football", "Pitch 1", "Full size, riverside", "natural_grass", false, "11v11", 30, 60, 85),
      f("football", "Pitch 2", "North row", "artificial_turf", false, "7v7", 16, 28, 38),
      f("football", "Pitch 3", "North row", "artificial_turf", false, "7v7", 16, 28, 38),
      f("football", "Pitch 4", "By the clubhouse", "artificial_turf", false, "5v5", 12, 20, 28),
    ],
  },
  {
    slug: "sen-sok-sports-hub",
    name: "Sen Sok Sports Hub",
    nameKm: "មជ្ឈមណ្ឌលកីឡា សែនសុខ",
    description: "One address for all three sports. Turf football, a sand court and an indoor hall for volleyball, and two hard tennis courts, five minutes from AEON Sen Sok.",
    descriptionKm: "កីឡាទាំងបីនៅកន្លែងតែមួយ។ ទីលានបាល់ទាត់ ទីលានបាល់ទះខ្សាច់ និងក្នុងអគារ ព្រមទាំងទីលានតេនីសពីរ ចម្ងាយ ៥ នាទីពីអ៊ីអន សែនសុខ។",
    province: "phnom_penh", district: "Sen Sok", address: "St 1003, Sangkat Phnom Penh Thmey", lat: 11.599, lng: 104.879,
    owner: "sophea", hours: ["06:00", "22:00"],
    amenities: ["parking", "showers", "changing_rooms", "floodlights", "cafe", "wifi", "equipment_rental", "drinking_water", "air_conditioning"],
    verified: true, featured: false, status: "approved",
    fields: [
      f("football", "Field A", "Outdoor, front", "artificial_turf", false, "7v7", 16, 20, 30),
      f("football", "Field B", "Indoor hall", "futsal_court", true, "5v5", 12, 15, 22),
      f("volleyball", "Sand Court", "Outdoor, garden side", "sand", false, "4v4", 10, 8, 12),
      f("volleyball", "Hall Court", "Indoor hall", "parquet", true, "6v6", 14, 11, 16),
      f("tennis", "Court 1", "Hard court, covered", "hard_court", true, "Singles/Doubles", 4, 11, 15),
      f("tennis", "Court 2", "Hard court, open", "hard_court", false, "Singles/Doubles", 4, 9, 13),
    ],
  },
  {
    slug: "chroy-changvar-riverside-courts",
    name: "Chroy Changvar Riverside Courts",
    nameKm: "ទីលានមាត់ទន្លេ ជ្រោយចង្វារ",
    description: "Three tennis courts and a volleyball court facing the Tonle Sap. Quiet mornings, coaching on request, and sunset sets on the clay.",
    descriptionKm: "ទីលានតេនីសបី និងទីលានបាល់ទះមួយ បែរមុខទៅទន្លេសាប។ ព្រឹកស្ងាត់ល្អ មានគ្រូបង្វឹកតាមការស្នើសុំ។",
    province: "phnom_penh", district: "Chroy Changvar", address: "National Road 6A, Sangkat Chroy Changvar", lat: 11.59, lng: 104.937,
    owner: "sreyneang", hours: ["06:00", "21:00"],
    amenities: ["parking", "showers", "changing_rooms", "floodlights", "equipment_rental", "drinking_water", "lockers"],
    verified: true, featured: false, status: "approved",
    fields: [
      f("tennis", "Court 1", "Clay, riverside", "clay", false, "Singles/Doubles", 4, 13, 17),
      f("tennis", "Court 2", "Clay, riverside", "clay", false, "Singles/Doubles", 4, 13, 17),
      f("tennis", "Court 3", "Hard court, covered", "hard_court", true, "Singles/Doubles", 4, 12, 16),
      f("volleyball", "Court V", "Outdoor, hard floor", "hard_court", false, "6v6", 14, 9, 13),
    ],
  },
  {
    slug: "russey-keo-futsal",
    name: "Russey Keo Futsal",
    nameKm: "ហ្វូតសាល ឫស្សីកែវ",
    description: "A no-frills neighbourhood futsal centre with two covered courts. The cheapest hour in the north of the city, and open late.",
    descriptionKm: "មជ្ឈមណ្ឌលហ្វូតសាលក្នុងសង្កាត់ មានទីលានមានដំបូលពីរ។ តម្លៃថោកជាងគេនៅភាគខាងជើងទីក្រុង និងបើកដល់យប់។",
    province: "phnom_penh", district: "Russey Keo", address: "National Road 5, Sangkat Kilometre 6", lat: 11.615, lng: 104.91,
    owner: "piseth", hours: ["07:00", "23:00"],
    amenities: ["parking", "floodlights", "drinking_water", "equipment_rental"],
    verified: false, featured: false, status: "approved",
    fields: [
      f("football", "Court 1", "Covered, left", "futsal_court", true, "5v5", 12, 10, 15),
      f("football", "Court 2", "Covered, right", "futsal_court", true, "5v5", 12, 10, 15),
    ],
  },
  {
    slug: "meanchey-community-pitch",
    name: "Meanchey Community Pitch",
    nameKm: "ទីលានសហគមន៍ មានជ័យ",
    description: "Run by a local youth club. One 7-a-side turf pitch and an outdoor volleyball court, with every weekend booking helping fund free kids' training.",
    descriptionKm: "គ្រប់គ្រងដោយក្លឹបយុវជនក្នុងតំបន់។ ទីលានបាល់ទាត់ ៧ នាក់មួយ និងទីលានបាល់ទះខាងក្រៅមួយ។ ការកក់ចុងសប្តាហ៍ជួយឧបត្ថម្ភការហ្វឹកហាត់កុមារដោយឥតគិតថ្លៃ។",
    province: "phnom_penh", district: "Meanchey", address: "St 271, Sangkat Boeung Tumpun", lat: 11.52, lng: 104.93,
    owner: "sreyneang", hours: ["06:00", "22:00"],
    amenities: ["parking", "floodlights", "drinking_water", "spectator_seating", "first_aid"],
    verified: true, featured: false, status: "approved",
    fields: [
      f("football", "Main Pitch", "Outdoor", "artificial_turf", false, "7v7", 16, 14, 20),
      f("volleyball", "Open Court", "Outdoor, beside the pitch", "hard_court", false, "6v6", 14, 6, 9),
    ],
  },
  {
    slug: "angkor-sports-village",
    name: "Angkor Sports Village",
    nameKm: "ភូមិកីឡា អង្គរ",
    description: "Siem Reap's main multi-sport ground, ten minutes from Pub Street. Two turf pitches ringed by sugar palms and two tennis courts popular with visitors.",
    descriptionKm: "ទីលានកីឡាចម្រុះធំជាងគេនៅសៀមរាប ចម្ងាយ ១០ នាទីពីផាប់ស្ទ្រីត។ ទីលានបាល់ទាត់ពីរព័ទ្ធដោយដើមត្នោត និងទីលានតេនីសពីរ។",
    province: "siem_reap", district: "Svay Dangkum", address: "Sok San Rd, Sangkat Svay Dangkum", lat: 13.3525, lng: 103.846,
    owner: "piseth", hours: ["06:00", "22:00"],
    amenities: ["parking", "showers", "changing_rooms", "floodlights", "cafe", "wifi", "equipment_rental", "drinking_water"],
    verified: true, featured: true, status: "approved",
    fields: [
      f("football", "Palm Pitch", "Outdoor, north", "artificial_turf", false, "7v7", 16, 18, 26),
      f("football", "Temple Pitch", "Outdoor, south", "artificial_turf", false, "5v5", 12, 14, 20),
      f("tennis", "Court 1", "Hard court", "hard_court", false, "Singles/Doubles", 4, 9, 12),
      f("tennis", "Court 2", "Hard court", "hard_court", false, "Singles/Doubles", 4, 9, 12),
    ],
  },
  {
    slug: "siem-reap-volley-garden",
    name: "Siem Reap Volley Garden",
    nameKm: "សួនបាល់ទះ សៀមរាប",
    description: "Three sand courts in a mango garden. Evening leagues run Tuesday and Thursday; every other night the courts are open to book.",
    descriptionKm: "ទីលានបាល់ទះខ្សាច់បីក្នុងសួនស្វាយ។ មានលីកពេលល្ងាចថ្ងៃអង្គារ និងព្រហស្បតិ៍ យប់ផ្សេងទៀតអាចកក់បាន។",
    province: "siem_reap", district: "Sla Kram", address: "Road 60, Sangkat Sla Kram", lat: 13.381, lng: 103.872,
    owner: "sreyneang", hours: ["07:00", "22:00"],
    amenities: ["parking", "showers", "floodlights", "cafe", "drinking_water"],
    verified: false, featured: false, status: "approved",
    fields: [
      f("volleyball", "Sand 1", "Garden, left", "sand", false, "4v4", 10, 7, 10),
      f("volleyball", "Sand 2", "Garden, centre", "sand", false, "4v4", 10, 7, 10),
      f("volleyball", "Sand 3", "Garden, right", "sand", false, "6v6", 14, 8, 11),
    ],
  },
  {
    slug: "sangkae-football-centre",
    name: "Sangkae Football Centre",
    nameKm: "មជ្ឈមណ្ឌលបាល់ទាត់ សង្កែ",
    description: "Battambang's league ground beside the Sangkae river: a full-size grass pitch and two small-sided turf pitches with proper changing rooms.",
    descriptionKm: "ទីលានលីករបស់បាត់ដំបងក្បែរស្ទឹងសង្កែ៖ ទីលានស្មៅទំហំពេញមួយ និងទីលានតូចពីរ មានបន្ទប់ផ្លាស់សម្លៀកបំពាក់។",
    province: "battambang", district: "Battambang City", address: "St 1, Sangkat Svay Por", lat: 13.1005, lng: 103.2005,
    owner: "piseth", hours: ["06:00", "22:00"],
    amenities: ["parking", "showers", "changing_rooms", "floodlights", "spectator_seating", "first_aid", "drinking_water"],
    verified: true, featured: false, status: "approved",
    fields: [
      f("football", "River Pitch", "Full size", "natural_grass", false, "11v11", 30, 40, 55),
      f("football", "Turf 1", "Behind the stand", "artificial_turf", false, "7v7", 16, 15, 22),
      f("football", "Turf 2", "Behind the stand", "artificial_turf", false, "5v5", 12, 12, 17),
    ],
  },
  {
    slug: "battambang-racquet-club",
    name: "Battambang Racquet Club",
    nameKm: "ក្លឹបតេនីស បាត់ដំបង",
    description: "A small members-style tennis club that welcomes walk-ins. Two shaded hard courts, racquet hire and cold coconut at the bar.",
    descriptionKm: "ក្លឹបតេនីសតូចមួយដែលស្វាគមន៍អ្នកលេងទូទៅ។ ទីលានរឹងមានម្លប់ពីរ មានជួលរ៉ាកែត និងដូងត្រជាក់។",
    province: "battambang", district: "Battambang City", address: "St 3, Sangkat Rattanak", lat: 13.092, lng: 103.207,
    owner: "sreyneang", hours: ["06:00", "21:00"],
    amenities: ["parking", "showers", "cafe", "equipment_rental", "drinking_water", "lockers"],
    verified: false, featured: false, status: "approved",
    fields: [
      f("tennis", "Court A", "Shaded, front", "hard_court", false, "Singles/Doubles", 4, 7, 10),
      f("tennis", "Court B", "Shaded, back", "hard_court", false, "Singles/Doubles", 4, 7, 10),
    ],
  },
  {
    slug: "otres-beach-arena",
    name: "Otres Beach Arena",
    nameKm: "អូត្រេស ប៊ិច អារីណា",
    description: "Beach volleyball fifty metres from the water and a floodlit 5-a-side cage behind it. Play at sunset, swim after.",
    descriptionKm: "បាល់ទះឆ្នេរខ្សាច់ចម្ងាយ ៥០ ម៉ែត្រពីទឹកសមុទ្រ និងទីលានបាល់ទាត់ ៥ នាក់មានភ្លើងបំភ្លឺ។ លេងពេលថ្ងៃលិច រួចចុះហែលទឹក។",
    province: "sihanoukville", district: "Otres", address: "Otres 2 Beach Rd, Sangkat 4", lat: 10.576, lng: 103.554,
    owner: "sophea", hours: ["07:00", "22:00"],
    amenities: ["parking", "showers", "floodlights", "cafe", "wifi", "equipment_rental", "drinking_water"],
    verified: true, featured: true, status: "approved",
    fields: [
      f("volleyball", "Beach Court 1", "Seafront", "sand", false, "4v4", 10, 9, 13),
      f("volleyball", "Beach Court 2", "Seafront", "sand", false, "4v4", 10, 9, 13),
      f("football", "The Cage", "Behind the bar", "artificial_turf", false, "5v5", 12, 15, 22),
    ],
  },
  {
    slug: "kampot-riverside-pitch",
    name: "Kampot Riverside Pitch",
    nameKm: "ទីលានមាត់ទន្លេ កំពត",
    description: "One well-kept 7-a-side pitch with Bokor mountain behind the far goal. Local teams play most evenings and are happy to take on visitors.",
    descriptionKm: "ទីលាន ៧ នាក់មួយដែលថែទាំល្អ មានភ្នំបូកគោនៅពីក្រោយទី។ ក្រុមក្នុងស្រុកលេងស្ទើររាល់ល្ងាច និងរីករាយប្រកួតជាមួយភ្ញៀវ។",
    province: "kampot", district: "Kampot City", address: "Riverside Rd, Sangkat Kampong Bay", lat: 10.6135, lng: 104.178,
    owner: "piseth", hours: ["06:00", "21:00"],
    amenities: ["parking", "floodlights", "drinking_water"],
    verified: false, featured: false, status: "approved",
    fields: [f("football", "Riverside Pitch", "Outdoor", "artificial_turf", false, "7v7", 16, 12, 18)],
  },
  {
    slug: "mekong-courts-kampong-cham",
    name: "Mekong Courts Kampong Cham",
    nameKm: "ទីលានមេគង្គ កំពង់ចាម",
    description: "New courts near the bamboo bridge: one indoor volleyball hall and one tennis court. Opening this month.",
    descriptionKm: "ទីលានថ្មីនៅជិតស្ពានឫស្សី៖ សាលបាល់ទះក្នុងអគារមួយ និងទីលានតេនីសមួយ។ បើកក្នុងខែនេះ។",
    province: "kampong_cham", district: "Kampong Cham City", address: "Preah Monivong Blvd, Sangkat Veal Vong", lat: 11.9934, lng: 105.4635,
    owner: "sreyneang", hours: ["06:00", "21:00"],
    amenities: ["parking", "showers", "floodlights", "drinking_water"],
    verified: false, featured: false, status: "pending",
    fields: [
      f("volleyball", "Hall 1", "Indoor", "parquet", true, "6v6", 14, 8, 12),
      f("tennis", "Court 1", "Outdoor", "hard_court", false, "Singles/Doubles", 4, 7, 10),
    ],
  },
  {
    slug: "stung-meanchey-fives",
    name: "Stung Meanchey Fives",
    nameKm: "ស្ទឹងមានជ័យ ហ្វាយស៍",
    description: "Two brand-new 5-a-side turf cages opening next to the market, with LED floodlights and a covered waiting area.",
    descriptionKm: "ទីលាន ៥ នាក់ថ្មីពីរ បើកក្បែរផ្សារ មានភ្លើង LED និងកន្លែងរង់ចាំមានដំបូល។",
    province: "phnom_penh", district: "Meanchey", address: "St 217, Sangkat Stung Meanchey", lat: 11.537, lng: 104.897,
    owner: "sophea", hours: ["06:00", "23:00"],
    amenities: ["parking", "floodlights", "drinking_water", "changing_rooms"],
    verified: false, featured: false, status: "pending",
    fields: [
      f("football", "Cage 1", "Market side", "artificial_turf", false, "5v5", 12, 12, 18),
      f("football", "Cage 2", "Canal side", "artificial_turf", false, "5v5", 12, 12, 18),
    ],
  },
  {
    slug: "daun-penh-rooftop-futsal",
    name: "Daun Penh Rooftop Futsal",
    nameKm: "ហ្វូតសាលលើដំបូល ដូនពេញ",
    description: "A rooftop futsal court above a parking building near Central Market.",
    descriptionKm: "ទីលានហ្វូតសាលលើដំបូលអគារចំណតរថយន្ត ក្បែរផ្សារធំថ្មី។",
    province: "phnom_penh", district: "Daun Penh", address: "St 130, Sangkat Phsar Kandal 1", lat: 11.569, lng: 104.922,
    owner: "piseth", hours: ["08:00", "22:00"],
    amenities: ["parking", "floodlights"],
    verified: false, featured: false, status: "rejected",
    moderationNote: "The safety netting around the court is not visible in the photos. Please add photos of all four sides and resubmit.",
    fields: [f("football", "Rooftop Court", "Level 6", "futsal_court", false, "5v5", 12, 14, 20)],
  },
];

export const PLAYER_SEEDS: { name: string; team?: { name: string; sport: "football" | "volleyball"; level: "beginner" | "intermediate" | "advanced"; color: string; bio: string }; province: Province }[] = [
  { name: "Sok Dara", province: "phnom_penh", team: { name: "Riverside FC", sport: "football", level: "intermediate", color: "#0B7A4B", bio: "Office mates from Daun Penh. We play 7-a-side twice a week and never miss the post-match iced coffee." } },
  { name: "Chea Ratanak", province: "phnom_penh", team: { name: "Toul Kork United", sport: "football", level: "intermediate", color: "#1F6FCC", bio: "Neighbourhood team since 2019. Fast on the break, fair in the tackle." } },
  { name: "Meas Sovann", province: "phnom_penh", team: { name: "Mekong Tigers", sport: "football", level: "advanced", color: "#E2621B", bio: "Former university players. We like a proper game with a referee." } },
  { name: "Pich Bopha", province: "phnom_penh", team: { name: "Naga Spikers", sport: "volleyball", level: "intermediate", color: "#D7263D", bio: "Mixed volleyball team. Wednesdays and Sundays, always looking for a new opponent." } },
  { name: "Nhem Vichea", province: "phnom_penh", team: { name: "Sen Sok Strikers", sport: "football", level: "beginner", color: "#7A5C0B", bio: "Beginners who play for fun and fitness. Friendly matches only, please." } },
  { name: "Ouk Sreypov", province: "phnom_penh", team: { name: "Bassac Blockers", sport: "volleyball", level: "advanced", color: "#0E7C86", bio: "Competitive 6v6 side training for the city league." } },
  { name: "Long Kimhak", province: "siem_reap", team: { name: "Angkor Warriors", sport: "football", level: "intermediate", color: "#8A3FB0", bio: "Tuk-tuk drivers and tour guides. We know every pitch in Siem Reap." } },
  { name: "Seng Chanthou", province: "battambang", team: { name: "Battambang Bulls", sport: "football", level: "advanced", color: "#B0271F", bio: "Provincial league regulars looking for strong friendlies." } },
  { name: "Tep Makara", province: "sihanoukville", team: { name: "Otres Sand Kings", sport: "volleyball", level: "intermediate", color: "#E0A100", bio: "Beach volleyball every sunset. Losers buy the coconuts." } },
  { name: "Yim Sokha", province: "kampot", team: { name: "Kampot Pepper FC", sport: "football", level: "beginner", color: "#2F5D3A", bio: "A relaxed Sunday side from the riverside cafes." } },
  { name: "Hun Davin", province: "phnom_penh", team: { name: "Chroy Changvar City", sport: "football", level: "intermediate", color: "#345995", bio: "Across-the-bridge boys. We travel for a good game." } },
  { name: "Kong Sothea", province: "siem_reap", team: { name: "Sla Kram Smashers", sport: "volleyball", level: "beginner", color: "#C2410C", bio: "Friends learning the game on the sand courts." } },
  { name: "Prak Vuthy", province: "phnom_penh" },
  { name: "Ros Channary", province: "phnom_penh" },
];

export const VENUE_REVIEW_COMMENTS = [
  "Turf is in great condition and the lights are bright. Staff let us start five minutes early.",
  "Easy to find and plenty of motorbike parking. Showers were clean.",
  "Good pitch, fair price. Gets crowded after 6pm so arrive early to warm up.",
  "ទីលានស្អាត បុគ្គលិករួសរាយ។ នឹងមកលេងម្តងទៀត។",
  "Booked through the app and the field was ready when we arrived. No waiting.",
  "The surface is a little worn near one goal, but still the best value around here.",
  "តម្លៃសមរម្យ ភ្លើងភ្លឺល្អ ចំណតធំទូលាយ។",
  "Friendly owner, cold water for sale, and the bibs were freshly washed.",
  "Nets and lines are well kept. Our team plays here every week now.",
  "A bit hot in the afternoon, perfect after sunset.",
];

export const TEAM_REVIEW_COMMENTS = [
  "Great sports. Shook hands after every foul and helped an injured player.",
  "Arrived on time, played hard but fair. Would play again.",
  "ក្រុមនេះលេងស្អាត គោរពគូប្រកួត។",
  "Competitive game, no arguments with the referee.",
  "Fun opponents, and they shared their water when ours ran out.",
];
