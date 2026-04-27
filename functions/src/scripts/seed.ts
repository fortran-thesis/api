import {getAuth} from "firebase-admin/auth";
import {getFirestore, Timestamp} from "firebase-admin/firestore";
import {firebase} from "../configs/firebase";
import {Role} from "../types/enums";
import {NotificationType, NotificationReferenceType} from "../types/models/notificationTypes";
import {devLog} from "../utils/dev";
import {FirestoreCollection, FirestoreSubcollection, getCollectionName} from "../types/models/firestoreCollections";
import { addMoldCaseToFirestore } from "../services/moldCaseService";

const SEED_USERS = [
  {
    email: "admin@test.local",
    password: "Test[]1234",
    firstName: "Admin",
    lastName: "User",
    role: Role.ADMIN,
    address: "123 Admin St",
    username: "Admin",
  },
  {
    email: "mycologist@test.local",
    password: "Test[]1234",
    firstName: "Dr. Mycology",
    lastName: "Expert",
    role: Role.CURATOR,
    address: "456 Lab Ave",
    username: "Myco",
    occupation: "Mycologist",
  },
  {
    email: "mycologist2@test.local",
    password: "Test[]1234",
    firstName: "Dr. Fungal",
    lastName: "Specialist",
    role: Role.CURATOR,
    address: "789 Research Blvd",
    username: "Fungal",
    occupation: "Senior Mycologist",
  },
  {
    email: "mycologist3@test.local",
    password: "Test[]1234",
    firstName: "Dr. Pathogen",
    lastName: "Expert",
    role: Role.CURATOR,
    address: "321 Diagnostic Lane",
    username: "Pathogen",
    occupation: "Pathologist Mycologist",
  },
  {
    email: "farmer@test.local",
    password: "Test[]1234",
    firstName: "John",
    lastName: "Farmer",
    role: Role.USER,
    address: "789 Farm Road",
    username: "Farmer",
    occupation: "Rice Farmer",
  },
];

export const seedTestUsers = async () => {
  try {
    const auth = getAuth(firebase);
    const db = getFirestore(firebase);
    const usersCollection = getCollectionName(FirestoreCollection.USERS);

    console.log("\n🌱 Starting database seed...\n");

    const createdUsers = [];

    for (const seedUser of SEED_USERS) {
      try {
        // Check if user already exists
        let userRecord;
        try {
          userRecord = await auth.getUserByEmail(seedUser.email);
          console.log(`⏭️  User already exists: ${seedUser.email} (uid: ${userRecord.uid})`);
        } catch (err: any) {
          if (err.code !== "auth/user-not-found") throw err;

          // Create new user in Firebase Auth
          userRecord = await auth.createUser({
            email: seedUser.email,
            emailVerified: false,
            password: seedUser.password,
            displayName: `${seedUser.firstName} ${seedUser.lastName}`,
          });

          // Set custom claims for role-based access
          await auth.setCustomUserClaims(userRecord.uid, {
            role: seedUser.role,
          });

          console.log(`✅ Created user: ${seedUser.email} (uid: ${userRecord.uid})`);
        }

        // Add/update user document in Firestore
        const userDocRef = db.collection(usersCollection).doc(userRecord.uid);
        const userData = {
          username: seedUser.username,
          first_name: seedUser.firstName,
          last_name: seedUser.lastName,
          role: seedUser.role,
          address: seedUser.address,
          is_banned: false,
          ...(seedUser.occupation && {occupation: seedUser.occupation}),
          metadata: {
            created_at: Timestamp.now(),
            updated_at: null,
            deleted_at: null,
          },
        };

        await userDocRef.set(userData);

        createdUsers.push({
          email: seedUser.email,
          password: seedUser.password,
          uid: userRecord.uid,
          role: seedUser.role,
        });
      } catch (err) {
        console.error(`❌ Failed to create user ${seedUser.email}:`, err);
      }
    }

    console.log("\n📋 Test Users Created:\n");
    console.log("┌─ ADMIN ─────────────────────────────────────────┐");
    console.log(`│ Username: ${SEED_USERS[0].username}                         │`);
    console.log("│ Password: Test[]1234                            │");
    console.log("│ Role: admin                                     │");
    console.log("└─────────────────────────────────────────────────┘");

    console.log("\n┌─ MYCOLOGIST 1 ──────────────────────────────────┐");
    console.log(`│ Username: ${SEED_USERS[1].username}                         │`);
    console.log("│ Password: Test[]1234                              │");
    console.log("│ Role: mycologist (curator)                      │");
    console.log(`│ Occupation: ${SEED_USERS[1].occupation}                     │`);
    console.log("└─────────────────────────────────────────────────┘");

    console.log("\n┌─ MYCOLOGIST 2 ──────────────────────────────────┐");
    console.log(`│ Username: ${SEED_USERS[2].username}                       │`);
    console.log("│ Password: Test[]1234                              │");
    console.log("│ Role: mycologist (curator)                      │");
    console.log(`│ Occupation: ${SEED_USERS[2].occupation}              │`);
    console.log("└─────────────────────────────────────────────────┘");

    console.log("\n┌─ MYCOLOGIST 3 ──────────────────────────────────┐");
    console.log(`│ Username: ${SEED_USERS[3].username}                     │`);
    console.log("│ Password: Test[]1234                              │");
    console.log("│ Role: mycologist (curator)                      │");
    console.log(`│ Occupation: ${SEED_USERS[3].occupation}        │`);
    console.log("└─────────────────────────────────────────────────┘");

    console.log("\n┌─ FARMER ────────────────────────────────────────┐");
    console.log(`│ Username: ${SEED_USERS[4].username}                         │`);
    console.log("│ Password: Test[]1234                            │");
    console.log("│ Role: farmer (user)                             │");
    console.log(`│ Occupation: ${SEED_USERS[4].occupation}                    │`);
    console.log("└─────────────────────────────────────────────────┘\n");

    console.log("✨ Seed completed successfully!\n");
    return createdUsers;
  } catch (err) {
    console.error("💥 Seed failed:", err);
    throw err;
  }
};

// ─── Seed data ────────────────────────────────────────────────────────────────

const CROP_NAMES = [
  "Rice", "Corn", "Tomato", "Potato", "Eggplant",
  "Cabbage", "Onion", "Garlic", "Mango", "Banana",
  "Sugarcane", "Cassava", "Pineapple", "Watermelon", "Ampalaya",
  "Pechay", "Kangkong", "Squash", "Okra", "Strawberry",
];

const PH_CITIES = [
  "Davao City", "Cebu City", "Manila", "Quezon City", "Cagayan de Oro",
  "Iloilo City", "Tacloban", "Bacolod", "Zamboanga City", "General Santos",
  "Butuan", "Dumaguete", "Legazpi City", "Lipa City", "Dagupan",
];

const DESCRIPTION_POOL = [
  "The affected area shows visible white to grayish fungal growth covering the surface of the leaves and stems.",
  "Infected plants display yellowing and wilting symptoms, with dark necrotic lesions spreading rapidly across the field.",
  "A powdery or fuzzy mold coating was observed on the fruit and surrounding foliage, particularly on the lower canopy.",
  "The mold infestation appears to have originated from nearby decaying organic matter found along the field borders.",
  "Significant crop damage is expected if the spread is not contained within the next few days given the current conditions.",
  "The humidity in the area has been consistently high this week, creating very favorable conditions for mold proliferation.",
  "Small dark brown to black spots were first noticed three days ago and have since expanded significantly across multiple plants.",
  "Adjacent plants within a ten-meter radius have also started showing early signs of mold infection and should be monitored closely.",
];

// Picks specific sentence indices from the pool and joins them into a paragraph.
function buildDescription(...indices: number[]): string {
  return indices.map((i) => DESCRIPTION_POOL[i]).join(" ");
}

// Creates a Firestore Timestamp for a given calendar date (local timezone).
function makeTimestamp(year: number, month: number, day: number): Timestamp {
  return Timestamp.fromDate(new Date(year, month - 1, day));
}

// ─── Mold Reports (10) ────────────────────────────────────────────────────────

const MOLD_REPORT_SEED: Array<{
  case_name: string;
  host: string;
  location: string;
  date_observed: Timestamp;
  status: "pending" | "in progress" | "resolved" | "rejected" | "closed";
  descriptionIndices: number[];
}> = [
  {
    case_name: "Mold Infestation on Rice in Davao City",
    host: CROP_NAMES[0], // Rice
    location: PH_CITIES[0], // Davao City
    date_observed: makeTimestamp(2026, 2, 16),
    status: "pending",
    descriptionIndices: [0, 1, 2, 3],
  },
  {
    case_name: "Mold Infestation on Corn in Cebu City",
    host: CROP_NAMES[1], // Corn
    location: PH_CITIES[1], // Cebu City
    date_observed: makeTimestamp(2026, 2, 17),
    status: "pending",
    descriptionIndices: [1, 2, 3, 4],
  },
  {
    case_name: "Mold Infestation on Tomato in Manila",
    host: CROP_NAMES[2], // Tomato
    location: PH_CITIES[2], // Manila
    date_observed: makeTimestamp(2026, 2, 18),
    status: "resolved",
    descriptionIndices: [2, 3, 4, 5],
  },
  {
    case_name: "Mold Infestation on Potato in Quezon City",
    host: CROP_NAMES[3], // Potato
    location: PH_CITIES[3], // Quezon City
    date_observed: makeTimestamp(2026, 2, 19),
    status: "pending",
    descriptionIndices: [3, 4, 5, 6],
  },
  {
    case_name: "Mold Infestation on Eggplant in Cagayan de Oro",
    host: CROP_NAMES[4], // Eggplant
    location: PH_CITIES[4], // Cagayan de Oro
    date_observed: makeTimestamp(2026, 2, 20),
    status: "resolved",
    descriptionIndices: [0, 2, 4, 6],
  },
  {
    case_name: "Mold Infestation on Cabbage in Iloilo City",
    host: CROP_NAMES[5], // Cabbage
    location: PH_CITIES[5], // Iloilo City
    date_observed: makeTimestamp(2026, 2, 22),
    status: "pending",
    descriptionIndices: [1, 3, 5, 7],
  },
  {
    case_name: "Mold Infestation on Mango in Tacloban",
    host: CROP_NAMES[8], // Mango
    location: PH_CITIES[6], // Tacloban
    date_observed: makeTimestamp(2026, 2, 24),
    status: "resolved",
    descriptionIndices: [0, 1, 4, 7],
  },
  {
    case_name: "Mold Infestation on Banana in Bacolod",
    host: CROP_NAMES[9], // Banana
    location: PH_CITIES[7], // Bacolod
    date_observed: makeTimestamp(2026, 2, 25),
    status: "pending",
    descriptionIndices: [2, 4, 6, 7],
  },
  {
    case_name: "Mold Infestation on Sugarcane in General Santos",
    host: CROP_NAMES[10], // Sugarcane
    location: PH_CITIES[9], // General Santos
    date_observed: makeTimestamp(2026, 2, 27),
    status: "pending",
    descriptionIndices: [0, 3, 5, 7],
  },
  {
    case_name: "Mold Infestation on Pineapple in Dagupan",
    host: CROP_NAMES[12], // Pineapple
    location: PH_CITIES[14], // Dagupan
    date_observed: makeTimestamp(2026, 3, 1),
    status: "pending",
    descriptionIndices: [1, 2, 6, 7],
  },
];

export const seedMoldReports = async (farmerUid: string, mycologistUid?: string, moldipediaIds?: string[]) => {
  const db = getFirestore(firebase);
  const reportsCollection = getCollectionName(FirestoreCollection.MOLD_REPORTS);

  console.log("\n🌾 Seeding mold reports...\n");

  for (let i = 0; i < MOLD_REPORT_SEED.length; i++) {
    const report = MOLD_REPORT_SEED[i];
    try {
      const docRef = db.collection(reportsCollection).doc();

      // Mirrors the WithMetadata<Omit<MoldReport, "case_details">> shape
      // that moldReportService.addMoldReportToFirestore writes to Firestore.
      // case_details is intentionally excluded from the parent document and
      // written to the mold_reports/{id}/case_details subcollection instead.

      // Assignment model: only in-progress reports are assigned to a mycologist.
      const shouldAssign = report.status === "in progress";
      const assignedMycologistId = shouldAssign ? (mycologistUid ?? null) : null;

      if (shouldAssign && !assignedMycologistId) {
        console.warn(
          `⚠️  Report "${report.case_name}" is in progress but no mycologist UID was provided. ` +
          "Seeding report as pending to keep report-case linkage consistent."
        );
      }

      const normalizedStatus =
        shouldAssign && assignedMycologistId ? report.status : (report.status === "in progress" ? "pending" : report.status);

      // Do NOT write priority on the report document (priority belongs to MoldCase)
      const reportData: any = {
        case_name: report.case_name,
        date_observed: report.date_observed,
        user_id: farmerUid,
        assigned_mycologist_id: assignedMycologistId,
        host: report.host,
        location: report.location,
        status: normalizedStatus,
        metadata: {
          created_at: Timestamp.now(),
          updated_at: null,
          deleted_at: null,
        },
      };

      await docRef.set(reportData);

      // Write case_details subcollection (no images).
      // Mirrors caseDetailRepository.addCaseDetail → addSubcollectionDocument,
      // which stores the raw MoldReportDetails object without a metadata wrapper.
      const caseDetailData = {
        cover_photo: [],
        description: buildDescription(...report.descriptionIndices),
      };

      await docRef
        .collection(FirestoreSubcollection.CASE_DETAILS)
        .add(caseDetailData);

      // Create MoldCase for in-progress reports that are assigned to a mycologist.
      // Priority is only stored on the MoldCase. Use a deterministic default
      // (no randomness) — set to "medium" unless a different rule is desired.
      if (normalizedStatus === "in progress" && assignedMycologistId) {
        try {
          const createdCase = await addMoldCaseToFirestore({
            mold_report_id: docRef.id,
            mycologist_id: assignedMycologistId,
            name: report.case_name,
            user_id: farmerUid,
            priority: "medium",
            start_date: report.date_observed as any,
            end_date: null as any,
            photo_url: null,
            is_archived: false,
          });
          if (createdCase) {
            console.log(`  📋 Created MoldCase for report: ${report.case_name}`);
          } else {
            console.warn(`  ⚠️  MoldCase returned null for report: ${report.case_name}`);
          }
        } catch (e) {
          console.error(`  ❌ Failed to create MoldCase for report ${report.case_name}:`, e);
        }
      }

      // Create MoldCase for resolved reports with final verdict linking to moldipedia.
      if (normalizedStatus === "resolved" && moldipediaIds && moldipediaIds.length > 0 && mycologistUid) {
        try {
          // Distribute resolved cases across moldipedia articles (round-robin)
          // Count how many resolved cases we've seen so far to determine index
          const resolvedCount = MOLD_REPORT_SEED.slice(0, i).filter(r => r.status === "resolved").length;
          const moldipediaIdx = resolvedCount % moldipediaIds.length;
          const moldipediaId = moldipediaIds[moldipediaIdx];
          const createdCase = await addMoldCaseToFirestore({
            mold_report_id: docRef.id,
            mycologist_id: mycologistUid,
            name: report.case_name,
            user_id: farmerUid,
            priority: "medium",
            start_date: report.date_observed as any,
            end_date: report.date_observed as any,
            photo_url: null,
            is_archived: false,
            final_verdict: {
              moldId: "",
              confidence: 0.95,
              moldipedia_id: moldipediaId,
              mycologist_notes: "Resolved during seeding",
              verdict_timestamp: Timestamp.now(),
            },
          });
          if (createdCase) {
            console.log(`  📋 Created resolved MoldCase for report: ${report.case_name} (linked to moldipedia ${moldipediaIdx + 1})`);
          } else {
            console.warn(`  ⚠️  MoldCase returned null for resolved report: ${report.case_name}`);
          }
        } catch (e) {
          console.error(`  ❌ Failed to create resolved MoldCase for report ${report.case_name}:`, e);
        }
      }

      console.log(`✅ Created mold report: ${report.case_name}`);
    } catch (err) {
      console.error(`❌ Failed to create mold report "${report.case_name}":`, err);
    }
  }

  console.log("\n✨ Mold reports seeded successfully!\n");
};

// ─── Moldipedia Articles (3) ──────────────────────────────────────────────────

const MOLDIPEDIA_SEED = [
  {
    title: "Aspergillus Flavi",
    body: "<p><em>A. flavus</em> is a filamentous ascomycete fungus that produces aflatoxins, among the most potent naturally occurring carcinogens. This species is ubiquitous in soil and decaying organic matter, and is the primary cause of aflatoxin contamination in corn, peanuts, and tree nuts under warm, humid conditions typical of tropical climates.</p>",
    affected_hosts: "<p>Plant pathogenic Aspergillus spp. affect agricultural crops in the field as well as after harvest, often associated with corn ear rot, peanut yellow mold, and contamination of stored grains and nuts worldwide.</p>",
    symptoms: "<p>Infected crops show discoloration, rotting, and visible greenish spore masses on the surface. Stored grains may exhibit off-odors and visible mold growth that spreads rapidly through bulk storage. Pre-harvest infection often accompanies insect damage and drought stress.</p>",
    disease_cycle: "<p>A. flavus conidia are dispersed by wind and soil disturbance. Infection typically occurs through wounds or natural openings following stress conditions such as drought or insect damage. Under warm (25–40°C) and humid conditions (above 70% relative humidity), the pathogen rapidly colonizes host tissue and produces aflatoxins.</p>",
    impact: "<p>Aflatoxins are classified as Group 1 human carcinogens by the International Agency for Research on Cancer (IARC). Chronic exposure is linked to liver cancer and immunosuppression, while acute high-level exposure causes aflatoxicosis. For farmers, contaminated crops result in trade rejections, market losses, and serious long-term health consequences for consumers. Annual worldwide losses due to aflatoxin contamination exceed billions of dollars.</p>",
    tags: ["aspergillus", "aflatoxin", "corn", "peanuts", "post-harvest", "food safety", "mycotoxin"],
    mold_type: "Aspergillus_section_Flavi",
    prevention: "<p>Ensure proper ventilation and low humidity in storage facilities—maintain moisture content below 13% and store at cool temperatures. Use hermetically sealed containers to prevent moisture ingress and limit oxygen availability. Harvest at correct maturity, avoid mechanical damage, and apply atoxigenic A. flavus strains competitively to exclude toxigenic strains. Crop rotation and certified clean seed reduce soil inoculum. When needed, registered fungicides such as tebuconazole or propiconazole can be applied pre-harvest in compliance with local regulations.</p>",
    treatments: {
      cultural: "<p>Use certified disease-free seeds and practice crop rotation to reduce soil inoculum. Harvest at proper maturity and avoid prolonged field exposure. Crop rotation with non-host plants for 2+ seasons minimizes pathogen persistence.</p>",
      mechanical: "<p>Dry grains thoroughly to below 13% moisture content before storage. Remove visibly infected produce immediately and sanitize all storage areas, bins, and handling equipment to prevent cross-contamination.</p>",
      physical: "<p>Store produce below 15°C at humidity under 70% to inhibit spore germination and mycelial growth. Hermetically sealed storage limits O₂ availability and further suppresses fungal development.</p>",
      biological: "<p>Atoxigenic strains of A. flavus competitively exclude toxigenic strains when applied to fields, significantly reducing aflatoxin levels. Bacillus subtilis and Trichoderma species also demonstrate antagonistic activity against A. flavus.</p>",
      chemical: "<p>Registered fungicides such as tebuconazole or propiconazole can be applied as pre-harvest sprays. Post-harvest fumigation with approved agents follows local agricultural authority guidelines to ensure food safety and legal compliance.</p>",
    },
  },
  {
    title: "Aspergillus Nigri",
    body: "<p><em>A. niger</em> is a filamentous ascomycete fungus placed under <em>Aspergillus</em>, Section <em>Nigri</em>. Macroscopically, colonies are initially white, then develop into a compact white or yellow basal felt covered by a dense layer of dark-brown to black conidial heads. Microscopically, conidia are globose to subglobose (3.5–5 µm in diameter), dark brown to black and rough-walled.</p>",
    affected_hosts: "<p>A. niger is by far the most common Aspergillus species responsible for post-harvest decay of fresh fruit, including grapes, apples, pears, peaches, citrus, figs, strawberries, mangoes and melons, and causes black mould rot of onions and crown rot in peanuts.</p>",
    symptoms: "<p>In peanuts (crown rot): when seeds germinate, the elongated shoots become infected, causing the hypocotyl to become water-soaked. Sudden wilting of seedlings occurs, with rotation of the hypocotyl and cotyledon. Once infected, the hypocotyl and rotting roots are covered by black masses of conidia and mycelia. In onions (black mold rot): powdery mould spores appear on the surface or between bulb scales. Affected bulbs display varying degrees of soft rot. In postharvest fruit: lesions enlarge rapidly and separate easily from healthy tissue. Infected tissues are pale and water soaked with dark, powdery fungal spores easily liberated when mature.</p>",
    disease_cycle: "<p>Most leaf spot pathogens including Aspergillus disseminate through conidia by rain splashing, irrigation, and wind dispersal. Aspergillus species are ubiquitous worldwide, found in various substrates and distributed across all geographic areas and climatic conditions. Conidia are common constituents of air, moving via air currents and spreading across both short and long distances. Aspergillus species associated with plant diseases are generally opportunistic pathogens—wounds or injuries are necessary for infection and colonization. A. niger causing crown rot in peanuts can be soil-borne or seed-borne, with the pathogen often present in soil and seeds.</p>",
    impact: "<p>A. niger is the most common Aspergillus species causing post-harvest decay of fresh fruit and black mould rot of onions. On peanuts specifically: economic losses due to crown rot can be significant; in some infected fields, losses of 50% have been reported. The annual worldwide loss of peanut crops due to this disease exceeds 10%. On mycotoxin production: A. niger and nigri section species produce ochratoxin A, fumonisin, sterigmatocystin, cyclopiazonic acid and patulin, posing serious food safety risks.</p>",
    tags: ["aspergillus", "niger", "black mold", "post-harvest", "onion", "peanut", "mycotoxin"],
    mold_type: "Aspergillus_section_Nigri",
    prevention: "<p>Store produce below 15°C at humidity under 70%, prevent wounds during harvest through proper bulb curing and clean equipment, and practice 2–3 year crop rotation with certified clean seed and well-drained land. Biologically, Trichoderma harzianum, T. asperellum, Bacillus subtilis, and marigold (Tagetes spp.) rotation provide natural antifungal suppression. When needed, carbendazim, triazole fungicides (tebuconazole, hexaconazole), and post-harvest sulfur dioxide fumigation are chemical options, applied in accordance with local agricultural authority guidelines.</p>",
    treatments: {
      cultural: "<p>Crop rotation and intercropping minimize soil mycotoxin contamination by breaking the infection cycle. For instance, rotation of legumes like cowpea and soybean with maize helps break pest and disease cycles and improves soil fertility.</p>",
      mechanical: "<p>Disease can be dispersed via airborne spores carried by wind during harvesting. Impact can be minimized by careful crop management during harvesting and storage, with proper sanitization of equipment between fields.</p>",
      physical: "<p>Cold atmospheric plasma (CAP) treatment with helium has been used successfully to eliminate A. niger, A. westerdijkiae, A. steynii, and A. versicolor in stored products like coffee beans.</p>",
      biological: "<p>Among Trichoderma species tested, T. harzianum and T. asperellum were most effective against A. niger. Although P. fluorescens and B. subtilis also displayed antifungal activity, their efficacy was markedly lower. Antagonistic yeast Debaryomyces nepalensis has been evaluated as a biological control agent against A. niger causing soft rot in citrus.</p>",
      chemical: "<p>Carbendazim at 0.1% concentration was found most effective as either foliar spray in standing crop or post-harvest dip. Post-harvest fumigation of onion bulbs with sulphur dioxide for four hours or dipping bulbs in acetic acid (0.4%) markedly reduced disease incidence.</p>",
    },
  },
  {
    title: "Fusarium Oxysporum",
    body: "<p><em>Fusarium oxysporum</em> is a soil-borne pathogen responsible for devastating vascular wilt diseases affecting over 100 plant species worldwide. The pathogen is notorious for its persistence in soil—survival structures (chlamydospores) can remain viable for decades, making infected fields essentially unusable for susceptible crops without intervention. In the Philippines, TR4 (Tropical Race 4) poses an existential threat to the banana export industry.</p>",
    affected_hosts: "<p>F. oxysporum affects a wide range of crops including banana, tomato, ampalaya, eggplant, pepper, melon, cucumber, and numerous other vegetables and fruits. The pathogen exhibits host-specificity through distinct formae speciales, making disease pressure crop-dependent.</p>",
    symptoms: "<p>Fusarium wilt causes one-sided yellowing and wilting of foliage, starting on older leaves and progressing upward. A cross-section of infected stems reveals brown or purple vascular discoloration—a reliable diagnostic indicator. Crown and root rots appear as dark, water-soaked necrosis at the base of plants, eventually causing complete plant collapse.</p>",
    disease_cycle: "<p>F. oxysporum survives as chlamydospores in soil and on plant debris for decades. The pathogen enters plants through roots, particularly through wounds caused by soil-borne insects, nematodes, or cultivation equipment. Once inside, fungal mycelium and spores colonize the vascular system, blocking water and nutrient transport. Sporulation occurs in infected tissue and spreads through contaminated soil, irrigation water, infested plant debris, tools, and footwear moving between fields.</p>",
    impact: "<p>Fusarium wilt is one of the most destructive soil-borne diseases. The TR4 strain of F. oxysporum f. sp. cubense poses an existential threat to the Philippine banana export industry, which relies heavily on the Cavendish variety—a cultivar with no natural resistance to TR4. Fusarium wilt on tomato and other vegetables results in significant yield losses, particularly during the rainy season when soil moisture is elevated. Annual global losses to Fusarium diseases exceed billions of dollars in reduced crop productivity.</p>",
    tags: ["fusarium", "wilt", "soil-borne", "banana", "tomato", "vascular disease", "Philippines"],
    mold_type: "Fusarium_oxysporum",
    prevention: "<p>Solarize infested soil using clear plastic film for 4–6 weeks during hot dry season to reduce viable chlamydospores. Install drainage systems to prevent waterlogging. Sterilize cultivation tools between fields using 10% bleach or 70% ethanol. Avoid planting susceptible varieties in previously infested fields and use raised beds. Apply agricultural lime to raise soil pH above 6.5. Soil drenches with propiconazole or thiophanate-methyl can suppress populations in early-stage infections combined with integrated cultural practices.</p>",
    treatments: {
      cultural: "<p>Use resistance or tolerant cultivars where available—the most sustainable long-term solution. Practice crop rotation with non-host plants for 2+ seasons. Improve soil drainage to reduce moisture stress and avoid planting in known infested fields. Use disease-free planting material and proper field sanitation.</p>",
      mechanical: "<p>Remove and destroy infected plant tissue and roots immediately upon detection. Sterilize all cultivation tools, harvesting equipment, and field machinery using bleach or ethanol solutions between fields to prevent pathogen spread.</p>",
      physical: "<p>Soil solarization with clear plastic for 4–6 weeks during hot season significantly reduces viable chlamydospores in the topsoil. Raised beds and improved drainage infrastructure reduce conditions favorable for disease development.</p>",
      biological: "<p>Trichoderma harzianum and Bacillus subtilis are effective biocontrol agents that colonize the rhizosphere and suppress Fusarium through direct competition, mycoparasitism, and production of antifungal antibiotics and volatile compounds.</p>",
      chemical: "<p>Soil drenches with propiconazole, thiophanate-methyl, or carbendazim reduce disease incidence in early-stage infections. Seed treatments with fungicide formulations protect seedlings during critical early establishment when root systems are most vulnerable.</p>",
    },
  },
];

export const seedMoldipedia = async (mycologistUid: string) => {
  const db = getFirestore(firebase);
  const moldipediaCollection = getCollectionName(FirestoreCollection.MOLDIPEDIA);

  console.log("\n📖 Seeding Moldipedia articles...\n");

  const createdArticleIds: string[] = [];

  for (const article of MOLDIPEDIA_SEED) {
    try {
      // Mirrors the production Moldipedia schema with expanded fields:
      // title, body, affected_hosts, symptoms, disease_cycle, impact,
      // prevention, treatments (cultural, mechanical, physical, biological, chemical),
      // tags, mold_type, cover_photo, is_archived, and metadata
      const articleData = {
        title: article.title,
        body: article.body,
        affected_hosts: article.affected_hosts,
        symptoms: article.symptoms,
        disease_cycle: article.disease_cycle,
        impact: article.impact,
        prevention: article.prevention,
        treatments: article.treatments,
        author_id: mycologistUid,
        cover_photo: "",
        tags: article.tags,
        mold_type: article.mold_type,
        is_archived: false,
        metadata: {
          created_at: Timestamp.now(),
          updated_at: null,
          deleted_at: null,
        },
      };

      const docRef = await db.collection(moldipediaCollection).add(articleData);
      createdArticleIds.push(docRef.id);
      console.log(`✅ Created Moldipedia article: "${article.title}" (ID: ${docRef.id})`);
    } catch (err) {
      console.error(`❌ Failed to create article "${article.title}":`, err);
    }
  }

  console.log("\n✨ Moldipedia articles seeded successfully!\n");
  return createdArticleIds;
};

// ─── Molds (5) ────────────────────────────────────────────────────────────────

const MOLDS_SEED = [
  {
    name: "Aspergillus Flavi",
    symptoms: [
      "Yellow kernel discoloration",
      "Pre-emergence seed rot",
      "Necrotic hypocotyl lesions",
      "Stunted plant growth",
      "Poorly developed roots",
      "Chlorotic leaves",
      "Seed embryo discoloration",
      "Reduced seed germination",
      "Kernel rot",
      "Ear rot",
      "Shriveling of kernels",
      "Pod damage",
      "Wilting of seedlings",
      "Internal grain discoloration",
    ],
    signs: [
      "Yellow-green spore masses",
      "Sporulation on hypocotyls",
      "Yellow-green mold on ears",
      "Sclerotia on infected tissue",
      "Powdery conidial masses",
      "Blue UV fluorescence",
    ],
    characteristics: [
      "Olive to dark green colonies",
      "White edges with conidia",
      "Velvety to powdery texture",
      "Floccose center",
      "Sclerotia present",
      "Cream to tan reverse side",
      "Septate hyaline hyphae",
      "Rough-walled conidiophores",
      "Globose to sub-globose vesicle",
      "Uniseriate or biseriate phialides",
      "Thin-walled roughened conidia",
      "Radiating conidial chains",
    ],
    mold_details: {
      name: "Aspergillus Flavi",
      info: {
        overview:
          "Aspergillus flavus is a cosmopolitan soil fungus and one of the most economically damaging molds in tropical and subtropical agriculture. It survives between seasons as mycelia and sclerotia in soil and crop debris, and spreads by wind- and insect-dispersed conidia. It infects crops both in the field and during storage, and is classified into two morphological groups: L strains (large sclerotia, more aggressive) and S strains (small sclerotia, higher aflatoxin producers). It is the principal producer of aflatoxin B1 and B2, which are classified as Group 1 carcinogens by the IARC. In the Philippines, A. flavus is one of the most significant and frequently isolated toxigenic fungi from corn, peanuts, and other stored commodities. Infection is strongly linked to drought stress, insect damage, and high temperatures during the late growing season and storage.",
        description:
          "Aspergillus flavus is a saprotrophic and plant-pathogenic filamentous fungus found worldwide in soil, decaying organic matter, and stored agricultural products. It is best known for colonizing cereal grains, legumes, and tree nuts, causing significant pre-harvest and postharvest losses. It is the primary producer of aflatoxins, among the most potent naturally occurring carcinogens, making it one of the most economically and toxicologically significant molds in agriculture globally.",
        affected_hosts:
          "Maize (corn), Peanut (groundnut), Cottonseed, Rice, Sorghum, Wheat, Millet, Sesame, Sunflower seeds, Tree nuts (almond, pistachio, walnut, pecan), Coffee, Soybean, Cassava, Mango, Fig, Grape",
        symptoms_and_signs:
          "- On peanuts, necrotic lesions appear on the hypocotyls, radicles, and cotyledons of germinating seeds, with yellow-green sporulation visible on infected tissue, a condition known as yellow mold. - Infected seedlings emerge stunted with a poorly developed root system and chlorotic (yellowed) leaves. - On corn, spores enter through the silks and infect kernels, causing discoloration of embryos, reduced germination, and powdery yellow-green mold on and between kernels. - In stored grain, aflatoxin contamination can be present with little to no visible mold growth, making detection by appearance alone unreliable. - On cottonseed, yellow-green powdery spore masses develop on the seed surface, with internal discoloration of the kernel. - On tree nuts, visible yellow-green mold growth appears on the nut surface, often associated with insect damage entry points.",
        disease_cycle_spread_impact:
          "A. flavus overwinters in soil as sclerotia and mycelium on crop debris. Sclerotia germinate in warm conditions, producing conidia dispersed by wind and insects (particularly stink bugs and lygus bugs). Infection of corn occurs through silks; peanuts are infected via pods in the soil. Excessive heat (27–30°C) and drought periods of 3–6 weeks toward the end of the growing season are the primary triggers for field infection. Postharvest, the fungus continues to grow and produce aflatoxins in improperly stored grain, particularly at moisture levels above 11.5%. Postharvest disease can reduce total crop yield by 10 to 30%, and in developing countries that produce perishable crops, total loss can be greater than 30%.",
        health_risks:
          "Proximity / Exposure (farmers, handlers, storage workers) Allergic respiratory reactions from inhaling conidia, sneezing, nasal congestion, eye irritation Allergic bronchopulmonary aspergillosis (ABPA) in individuals with asthma or cystic fibrosis Sinusitis and keratitis (eye infection), A. flavus is the leading cause of fungal sinusitis in Asia and the Middle East Invasive pulmonary aspergillosis in immunocompromised individuals, more aggressive than A. niger Skin and cutaneous infections in workers with open wounds or burns",
        prevention_summary:
          "Storing grain below 11.5% moisture and 15°C halts aflatoxin production, while crop rotation, avoiding monoculture, adequate irrigation, timely harvest, and certified clean seed collectively reduce field infection risk. Biologically, atoxigenic A. flavus strains are the most validated biocontrol approach for competitively displacing aflatoxigenic strains, with Trichoderma spp. and Bacillus subtilis as supplements. Chemically, triazole fungicides, mancozeb or thiram seed treatments, and post-harvest fumigation are available options, though chemical controls alone are insufficient as infection primarily occurs under field stress conditions before harvest.",
        taxonomy: {
          kingdom: "Fungi",
          phylum: "Ascomycota",
          class: "Eurotiomycetes",
          order: "Eurotialies",
          family: "Trichocomaceae",
          genus: "Aspergillus",
        },
        predicted_class_id: 1,
        predicted_class_name: "Aspergillus_section_Flavi",
      },
      prevention: {
        physicalControl:
          "- Store grain at moisture content below 11.5% and temperature below 15°C to prevent aflatoxin production - Maintain adequate ventilation in storage facilities to reduce humidity buildup - Cold storage effectively halts A. flavus growth as the pathogen cannot grow below 5°C - UV irradiation and ozone treatment have shown laboratory efficacy for postharvest grain decontamination",
        mechanicalControl:
          "- Prevent insect and mechanical damage to corn silks, kernels, and peanut pods during cultivation and harvest, wounds are primary infection entry points - Harvest crops promptly and on time; delayed harvest under drought and heat conditions significantly increases infection risk - Use clean, disinfected harvesting and storage equipment to prevent inoculum transfer between fields and batches - Remove and destroy infected crop debris after harvest to reduce soilborne inoculum",
        culturalControl:
          "- Practice crop rotation with non-host species to break the soilborne sclerotia cycle - Avoid monoculture and late planting, which are known to increase fungal inoculum levels - Apply adequate irrigation during drought-prone late growing season periods to reduce plant stress that predisposes crops to infection - Use certified, clean seed free from mold contamination - Plant resistant or tolerant crop varieties where available - Maintain balanced soil fertility, nutritional stress increases susceptibility to infection",
        biologicalControl:
          "- Apply atoxigenic (non-aflatoxin-producing) strains of A. flavus to soil or crops to competitively displace aflatoxigenic strains, this is the most validated and commercially registered biocontrol strategy for this species (e.g., AF36, AFLA-Guard) - Trichoderma spp. show antagonistic activity against A. flavus in soil applications - Bacillus subtilis offers supplementary biocontrol, particularly as a seed treatment",
        chemicalControl:
          "- Triazole fungicides (tebuconazole, propiconazole) applied pre-harvest for ear rot management in corn - Seed treatment with mancozeb or thiram reduces seedborne inoculum at planting - Post-harvest ammonia and ozone fumigation have been studied for decontamination of aflatoxin-contaminated stored grain - Chemical controls should be used as a last resort, infection largely occurs under drought and heat stress conditions that make pre-harvest fungicide application alone insufficient",
      },
    },
  },
  {
    name: "Aspergillus Nigri",
    symptoms: [
      "Water-soaked scale leaves",
      "Black neck discoloration",
      "Shriveling of scales",
      "Shallow black lesions",
      "Internal black discoloration",
      "Soft rot of bulb",
      "Dry rot of cloves",
      "Sudden wilting",
      "Water-soaked hypocotyl",
      "Reduced seed germination",
      "Stunted root growth",
      "Yellowing and defoliation",
    ],
    signs: [
      "Powdery black spore masses",
      "Black conidial masses",
      "Sooty bulb appearance",
      "Black sporulation on veins",
      "Black masses on roots",
      "Black sporulation on fruit",
      "Black bunch rot",
      "White to gray mycelium",
    ],
    characteristics: [
      "White to jet black colonies",
      "Powdery to granular texture",
      "Pale yellow-white edges",
      "Rapid sporulation 2–3 days",
      "Sooty black patches",
      "Septate hyaline hyphae",
      "Smooth hyaline conidiophores",
      "Foot cell at base",
      "Globose apical vesicle",
      "Biseriate conidial heads",
      "Dark rough-walled conidia",
    ],
    mold_details: {
      name: "Aspergillus Nigri",
      info: {
        overview:
          "A. niger is a filamentous ascomycete fungus placed under Aspergillus, Section Nigri. Macroscopically, colonies are initially white, then develop into a compact white or yellow basal felt covered by a dense layer of dark-brown to black conidial heads. Conidiophore stipes are smooth-walled, hyaline or turning dark toward the vesicle, with biseriate phialides borne on brown, often septate metulae. Microscopically, conidia are globose to subglobose (3.5–5 µm in diameter), dark brown to black and rough-walled.",
        description:
          "Aspergillus niger is a filamentous fungus found worldwide in soil, decaying vegetation, stored grain, and as a common postharvest contaminant of fruits, vegetables, and nuts. It is one of the most prevalent molds in tropical and subtropical environments, thriving under high temperature and humidity. It acts primarily as a saprophyte, feeding on dead organic matter, but becomes an opportunistic pathogen on wounded or stressed plant tissue. It is perhaps best recognized by its dense black powdery spore masses visible on infected crops.",
        affected_hosts:
          "Onion, Garlic, Peanut, Grape, Soybean, Maize, Mango, Citrus, Fig, Strawberry, Peach, Apple, Pear, Melon, Cotton, Yam, Banana, Tomato, Ginger, Coffee, Tree nuts",
        symptoms_and_signs:
          "- On onions, black discoloration first appears at the neck of the bulb, with shallow black lesions forming on and between the outer scale leaves, particularly along the veins, giving the bulb a sooty appearance. - In dry storage conditions, infected onion scales dry and shrivel, revealing powdery black spore masses between the outer layers. - Affected onion and garlic bulbs can develop varying degrees of soft rot, with tissues eventually disintegrating under warm, humid storage conditions. - On garlic, dark brown to black conidial masses form on the bulb surface and a dry rot progresses through the clove tissue. - Internally, sliced onion bulbs may show black or gray discoloration extending from the neck toward the center, even when the outer surface appears normal.",
        disease_cycle_spread_impact:
          "A. niger survives in soil and on decaying plant debris between growing seasons. Aspergillus species associated with black mold in onion and garlic are mainly saprophytes occupying plant debris and decaying organic matter and can turn into opportunistic pathogens by conidial infection. The conidia in the soil spread to the bulbs via the wind or rain. Conidia then enter the plants via wounds. Contaminated seeds are also sources of black mold inoculum.",
        health_risks:
          "Proximity / Exposure (farmers, handlers, storage workers) Otomycosis (ear canal infection) - pain, temporary hearing loss, inflammation Allergic reactions - sneezing, nasal congestion, eye irritation from spore inhalation Hypersensitivity pneumonitis in workers with prolonged spore dust exposure Respiratory symptoms (coughing, wheezing) in individuals with asthma or pre-existing lung conditions Invasive pulmonary aspergillosis - rare, occurs only in severely immunocompromised individuals Cutaneous aspergillosis - rare, associated with open wounds or burns, not general agricultural exposure",
        prevention_summary:
          "Storing produce below 15°C at humidity under 70%, preventing wounds during harvest through proper bulb curing and clean equipment, and practicing 2–3 year crop rotation with certified clean seed and well-drained land collectively form the foundation of A. niger management. Biologically, Trichoderma harzianum, T. asperellum, Bacillus subtilis, and marigold (Tagetes spp.) rotation provide natural antifungal suppression. When all else fails, carbendazim, triazole fungicides (tebuconazole, hexaconazole), and post-harvest sulfur dioxide fumigation are the last-resort chemical options, applied in accordance with local agricultural authority guidelines.",
        taxonomy: {
          kingdom: "Fungi",
          phylum: "Ascomycota",
          class: "Eurotiomycetes",
          order: "Eurotiales",
          family: "Trichocomaceae",
          genus: "Aspergillus",
        },
        predicted_class_id: 2,
        predicted_class_name: "Aspergillus_section_Nigri",
      },
      prevention: {
        physicalControl:
          "- Store onions and garlic at 34°F–59°F (1–15°C); the pathogen is relatively inactive below 15°C - Maintain storage humidity below 70%; high humidity (>70%) accelerates disease development - Ensure adequate ventilation in storage facilities to reduce moisture accumulation - Cold atmospheric plasma (CAP) treatment has shown laboratory efficacy for postharvest decontamination",
        mechanicalControl:
          "- Avoid bruising or wounding during harvesting and handling, wounds are the primary infection entry point - Cure bulbs properly using the windrow method before storage to seal the neck - Use clean, disinfected harvesting and packing equipment to prevent inoculum transfer - Remove and destroy infected plant material and crop debris from the field promptly",
        culturalControl:
          "- Practice 2–3 year crop rotation between successive plantings of onion, garlic, and their relatives on the same land - Choose land with good drainage to avoid soil moisture buildup - Plant red-skinned onion varieties where feasible, as phenolic compounds in red scales confer some resistance to A. niger - Use certified, clean seed free from mold contamination - Avoid late-season drought stress and injury, which predispose crops to infection - Incorporate green manures (e.g., alfalfa) and use suppressive soils with high microbial populations that compete with A. niger",
        biologicalControl:
          "- Trichoderma harzianum and T. asperellum have demonstrated the strongest in vitro antagonistic activity against A. niger among tested biocontrol agents - Pseudomonas fluorescens and Bacillus subtilis also show antifungal activity, though at lower efficacy compared to Trichoderma spp. - Planting marigold (Tagetes spp.) in rotation releases terthienyl compounds that are toxic to A. niger in the soil",
        chemicalControl:
          "- Carbendazim (0.1%) applied as foliar spray or post-harvest dip is most effective among evaluated fungicides; double spray performs better than single spray - Post-harvest fumigation with sulfur dioxide for 4 hours significantly reduces disease incidence - Dipping bulbs in acetic acid at 0.4% concentration also reduces incidence markedly - Triazole fungicides (tebuconazole, hexaconazole, propiconazole) completely inhibit mycelial growth in vitro Seed treatment with mancozeb or thiram when cultural methods are insufficient",
      },
    },
  },
  {
    name: "Rhizopus",
    symptoms: [
      "Watery soft areas",
      "Rapid tissue softening",
      "Fluid leakage from tissue",
      "Internal flesh breakdown",
      "Complete rot within 48–96 hours",
      "Slight acid odor",
      "Wilting and shriveling",
      "Root and tuber rot",
      "Tissue disintegration",
    ],
    signs: [
      "White to gray cottony mycelium",
      "Black spherical sporangia",
      "Dirty gray-black appearance",
      "Root-like rhizoids",
      "Horizontal stolons",
      "Musty fermented odor",
    ],
    characteristics: [
      "White to gray cottony colonies",
      "Rapidly gray-black colonies",
      "Full growth within 24–36 hours",
      "Gray to black on produce",
      "Optimal growth 23–28°C",
      "Growth halted below 10°C",
      "Coenocytic aseptate hyphae",
      "No cross walls",
      "Rhizoids present",
      "Stolons present",
      "Upright sporangiophores",
      "Large globose sporangium",
      "Spherical to angular sporangiospores",
      "Conical-cylindrical columella",
    ],
    mold_details: {
      name: "Rhizopus",
      info: {
        overview:
          "Rhizopus stolonifer is considered one of the most devastating postharvest pathogens globally and is the fastest-growing known fungus. It is primarily a necrotrophic pathogen, actively killing host cells rather than simply growing on decaying matter, with a remarkably wide host range covering over 100 fruit and vegetable genera. Infection typically occurs at harvest through wounds, cracks, or bruised tissue, with rapid colonization of warm, humid produce in transit and storage. Unlike most agricultural molds, R. stolonifer does not produce regulated mycotoxins in the same category as aflatoxins or patulin; its primary agricultural impact is physical destruction of produce. However, it can also cause serious human disease (mucormycosis) in immunocompromised individuals. In tropical and subtropical environments like the Philippines, warm storage temperatures and high humidity create highly favorable conditions for rapid soft rot development.",
        description:
          "Rhizopus is a ubiquitous filamentous fungus found worldwide in soil, decaying organic matter, stored food, and as a primary postharvest pathogen of a wide range of fruits and vegetables. It is best known as the cause of soft rot, one of the most devastating postharvest diseases globally, affecting over 100 kinds of produce including strawberries, tomatoes, sweet potatoes, and melons. It is also commonly known as black bread mold due to its frequent appearance on bread and other stored foods.",
        affected_hosts:
          "Strawberry, Tomato, Sweet potato, Melon, Peach, Plum, Nectarine, Grape, Pear, Apple, Cherry, Banana, Papaya, Jackfruit, Mango, Citrus, Carrot, Potato, Cucumber, Pepper, Eggplant, Cruciferous vegetables (cabbage, broccoli, cauliflower), Yam, Bread and stored grain products",
        symptoms_and_signs:
          "- Infection begins as water-soaked areas on wounded or cracked tissue that rapidly soften, expand, and collapse within 24–48 hours, often accompanied by leakage of fluids from the rotted tissue. - A characteristic coarse, gray hairy mycelium quickly covers the infected surface, followed by the development of dense black spherical sporangia at the tips of the upright sporangiophores, giving infected produce a dirty gray-black appearance. - Horizontal stolons spread across the surface of infected produce and penetrate adjacent healthy fruits or vegetables through direct contact, creating rapid secondary infection in packed storage. - In sweet potatoes and root vegetables, soft rot progresses from the surface inward, leaving the skin intact while the internal flesh liquefies and ferments. - On bread and stored grain, white cottony growth appears first at points of moisture accumulation, rapidly darkening to gray-black as sporulation occurs within 1–2 days under warm conditions.",
        disease_cycle_spread_impact:
          "R. stolonifer survives as sporangiospores in soil, on plant debris, and in the air, with spores ubiquitous in harvesting and storage environments. Infection occurs primarily through wounds, cracks, bruises, stem pulls, and harvest injuries, as the fungus cannot penetrate intact skin. Once spores germinate under warm (15–30°C) and humid conditions, mycelial growth and tissue destruction are extraordinarily rapid. Sporangiospores are dispersed by wind, insects, and direct contact between infected and healthy produce, enabling mass secondary spread throughout packed containers. Storage at temperatures above 10°C combined with high humidity creates ideal conditions for epidemic soft rot losses. In the southeastern United States, annual sweet potato losses due to Rhizopus soft rot are estimated at 20–40%; globally, 20–25% of all harvested fruits and vegetables are lost annually to fungal pathogens, with R. stolonifer being a major contributor.",
        health_risks:
          "Proximity / Exposure (farmers, handlers, storage workers) - Inhalation of sporangiospores can cause allergic reactions, sneezing, nasal congestion, and respiratory irritation in sensitive individuals - Mucormycosis (also called zygomycosis), a rare but serious and potentially fatal fungal infection caused primarily by Rhizopus species; Rhizopus spp. are responsible for over 60% of all mucormycosis cases globally - Risk groups include people with uncontrolled diabetes mellitus (especially diabetic ketoacidosis), cancer patients, transplant recipients on immunosuppressants, burn patients, and individuals with severe neutropenia, healthy individuals face minimal risk - Pulmonary mucormycosis occurs through inhalation of spores and can progress rapidly to tissue necrosis and death if untreated; cutaneous mucormycosis occurs through skin wounds and burns - Rhinocerebral and gastrointestinal forms have also been documented in high-risk individuals",
        prevention_summary:
          "Storing produce below 10°C to halt growth entirely, preventing all wounds during harvest, disinfecting equipment, proper curing of root crops, good storage hygiene, and avoiding overcrowding collectively form the most critical physical, mechanical, and cultural controls as Rhizopus cannot infect intact tissue. Biologically, antagonistic yeasts, Bacillus subtilis, chitosan, and essential oils (thymol, cinnamaldehyde) provide non-chemical alternatives, while chemically, thiabendazole, imazalil, propiconazole, fludioxonil, and dicloran dips or drenches are the most documented fungicides, though resistance concerns necessitate integration with non-chemical approaches and compliance with local agricultural authority guidelines.",
        taxonomy: {
          kingdom: "Fungi",
          phylum: "Zygomycota",
          class: "Zygomycetes",
          order: "Mucorales",
          family: "Mucoraceae",
          genus: "Rhizopus",
        },
        predicted_class_id: 5,
        predicted_class_name: "Rhizopus_spp",
      },
      prevention: {
        physicalControl:
          "- Store produce below 10°C, R. stolonifer growth is halted at this temperature, making cold storage the single most effective control measure - Maintain storage humidity at appropriate levels; high relative humidity (>95%) significantly increases sporulation and secondary spread - UV-C irradiation applied shortly after inoculation has shown significant reduction in disease incidence on sweetpotato - Chlorine dioxide (ClO₂) fumigation effectively reduces sporulation on treated roots in storage environments",
        mechanicalControl:
          "- Prevent all wounds during harvest and handling, R. stolonifer cannot infect intact, unwounded tissue; wounds are the exclusive infection entry point - Cure root crops (sweet potato, yam) before storage at appropriate temperature and humidity to allow wound healing and skin hardening - Disinfect harvesting tools, packing containers, and storage facilities between seasons to eliminate residual spore inoculum - Remove and destroy infected produce immediately to prevent mycelial spread through direct contact to adjacent healthy fruit",
        culturalControl:
          "- Avoid overcrowding produce in storage containers, direct physical contact between fruits is the primary route of secondary spread - Harvest crops at the appropriate maturity stage; over-ripe produce is significantly more susceptible to infection - Maintain good storage facility sanitation between seasons, including cleaning of bins, shelves, and ventilation systems - Use proper post-harvest handling procedures that minimize physical damage throughout the supply chain",
        biologicalControl:
          "- Antagonistic yeasts (Pichia guilliermondii, Debaryomyces nepalensis) have demonstrated biocontrol efficacy against R. stolonifer in postharvest applications - Bacillus subtilis, both as a cell suspension and incorporated in edible films (candelilla wax), effectively reduces soft rot severity on strawberry - Chitosan (medium molecular weight) disrupts R. stolonifer cell membrane permeability and inhibits H⁺-ATPase activity, showing dose-dependent antifungal activity - Essential oils (thymol, cinnamaldehyde, Lippia sidoides) at sufficient concentrations completely inhibit mycelial growth through membrane disruption and cytoskeletal damage",
        chemicalControl:
          "- Registered fungicide options include thiabendazole, imazalil, propiconazole, fludioxonil, and dicloran applied as postharvest dips or drenches - Sanitizers including chlorine, sodium hypochlorite, calcium hypochlorite, ozone, and peracetic acid show good control activity and are used as packinghouse sanitation measures - Calcium chloride and salicylic acid dip treatments have shown inhibitory activity against R. stolonifer as lower-toxicity chemical alternatives",
      },
    },
  },
  {
    name: "Penicillium",
    symptoms: [
      "Tan to brown decay lesions",
      "Soft watery rot",
      "Rapid decay expansion",
      "Shriveling of tissue",
      "Internal browning",
      "Reduced fruit firmness",
      "Off-odors from decay",
      "Blue-green surface discoloration",
      "Water-soaked rind tissue",
      "Rhizome rot",
      "Bulb rot in storage",
    ],
    signs: [
      "Blue-green powdery conidia",
      "Musty odor",
      "White mycelial border",
      "White cottony mycelium",
      "Blue sporulation on rind",
      "Powdery blue-green spore masses",
      "Long conidial chains",
    ],
    characteristics: [
      "Blue-green to gray-green colonies",
      "White to cream edges",
      "Velvety to powdery texture",
      "Full growth within 5–7 days",
      "Cold-storage growth capable",
      "Pale yellow reverse side",
      "Musty odor",
      "Septate hyaline hyphae",
      "Brush-like conidiophores",
      "Whorled metulae and phialides",
      "Flask-shaped phialides",
      "Blue-green globose conidia",
      "Dry dispersible conidial chains",
    ],
    mold_details: {
      name: "Penicillium",
      info: {
        overview:
          "Penicillium is one of the most economically significant postharvest mold genera globally, responsible for blue mold rot, the most common and destructive postharvest decay disease of pome fruits and citrus worldwide. P. expansum is the primary pathogen of apples and pears, while P. digitatum (green mold) and P. italicum (blue mold) are the leading postharvest pathogens of citrus. Unlike most field pathogens, Penicillium primarily infects fruit through wounds, stem pulls, bruises, and natural openings, making harvest handling a critical control point. It is also notable for its ability to grow at near-freezing temperatures, making cold storage alone insufficient as a control measure. Its primary mycotoxin, patulin (from P. expansum), is regulated in food products including apple juice in many countries. In the Philippines and across tropical regions, Penicillium poses a significant risk to stored fruits particularly under inadequate cold chain conditions.",
        description:
          "Penicillium is a large genus of filamentous fungi with over 400 described species found worldwide in soil, decaying organic matter, stored food, and indoor environments. It is best known as a major cause of postharvest blue mold rot in pome fruits and citrus, causing significant economic losses in storage and transit. While it is also the source of the antibiotic penicillin, several species produce harmful mycotoxins, particularly patulin and ochratoxin A, making it both an agricultural and food safety concern.",
        affected_hosts:
          "Apple, Pear, Quince, Medlar, Cherry, Plum, Peach, Strawberry, Grape, Kiwi, Hazelnut, Orange, Mandarin, Lemon, Grapefruit, Citrus (all varieties), Garlic, Onion, Yam, Sugar beet, Tomato, Potato, Cereals (stored grain), Dried fruits",
        symptoms_and_signs:
          "- Blue mold initially appears as a light tan to dark brown circular lesion on wounded or naturally opened fruit tissue, with a clearly defined margin between decayed and healthy tissue. - As decay advances, the rot becomes soft and watery, the fruit flesh collapses, and a characteristic blue-green to grayish-green powdery conidial mass develops on the fruit surface accompanied by a distinctive musty odor. - On citrus fruit, infection produces a white, fluffy mycelial border surrounding the blue sporulating zone, with water-soaking and softening of the rind tissue beneath. - In garlic and onion bulbs stored under inadequate conditions, Penicillium causes internal bulb rot with blue-green sporulation visible between cloves or scale leaves upon inspection. - On stored apples and pears, a single infected fruit can spread conidia to adjacent fruits in packed containers through direct contact or airborne dispersal, creating secondary nesting infections throughout the storage batch.",
        disease_cycle_spread_impact:
          "Penicillium survives in storage environments as conidia on bin surfaces, in flume water, on fruit, and in the air of packinghouses. The fungus requires a wound, stem pull, bruise, puncture, or natural opening, to infect fruit; it cannot directly penetrate intact skin. Once infection is established, white mycelium grows into the tissue and produces blue-green conidia that are easily dispersed, creating rapid secondary spread within packed containers and cold storage rooms. P. italicum in particular is a nesting-type pathogen that spreads rapidly to adjacent fruits through contact. Postharvest losses from blue mold in the United States alone are estimated at USD $50–250 million annually; globally, Penicillium-associated decay can destroy 50% or more of stored pome fruit under inadequate storage conditions. The emergence of fungicide-resistant Penicillium populations has further complicated control.",
        health_risks:
          "Proximity / Exposure (farmers, handlers, storage workers) - Inhalation of airborne conidia triggers allergic reactions, sneezing, runny nose, itchy eyes, nasal congestion - Prolonged spore exposure can cause hypersensitivity pneumonitis, chronic sinusitis, and exacerbation of asthma - Skin allergy and keratitis (eye infection) have been associated with Penicillium exposure in susceptible individuals - Invasive infection (penicilliosis) is rare and occurs almost exclusively in severely immunocompromised individuals, as most species cannot grow at body temperature (37°C)",
        prevention_summary:
          "Cold storage at 0–1°C, controlled atmosphere, careful handling to prevent all wounds, and regular disinfection of packinghouse equipment are the most critical controls as Penicillium exclusively infects through wounds or natural openings, supported culturally and biologically by packinghouse hygiene, seasonal sanitation, antagonistic yeasts, Bacillus subtilis, UV-C irradiation, and essential oils. Chemically, imazalil, thiabendazole, pyrimethanil, and fludioxonil are the four registered postharvest fungicides, though resistant populations have emerged globally, making fungicide class rotation and integration with non-chemical methods essential.",
        taxonomy: {
          kingdom: "Fungi",
          phylum: "Ascomycota",
          class: "Eurotiomycetes",
          order: "Eurotiales",
          family: "Trichocomaceae",
          genus: "Penicillium",
        },
        predicted_class_id: 4,
        predicted_class_name: "Penicillium_spp",
      },
      prevention: {
        physicalControl:
          "- Maintain cold storage at 0–1°C in air; controlled atmosphere storage (low O₂, elevated CO₂) extends fruit shelf life up to 1 year and significantly slows Penicillium growth - UV-C irradiation directly inactivates Penicillium conidia on fruit surfaces and induces host resistance responses in citrus rind tissue - Blue light treatment (400–500 nm) damages conidial morphology and inhibits sporulation - Ensure adequate ventilation in storage facilities to reduce humidity accumulation around stored fruit",
        mechanicalControl:
          "- Prevent all physical damage to fruit during harvest, packing, and transport, Penicillium cannot infect intact fruit skin and exclusively enters through wounds or natural openings - Disinfect harvesting bins, flume water systems, conveyor belts, and packinghouse surfaces regularly as these are primary inoculum reservoirs - Use clean, sterilized packing materials and containers to prevent cross-contamination between batches - Remove and isolate infected fruit immediately upon detection to prevent nesting spread to adjacent healthy fruit",
        culturalControl:
          "- Sanitize cold storage rooms and packinghouse equipment thoroughly between storage seasons to remove residual conidia - Avoid over-mature fruit at harvest, over-ripeness increases susceptibility and softens tissue near natural openings - Use controlled atmosphere storage to extend shelf life and reduce decay incidence - Implement strict packinghouse hygiene protocols including regular monitoring of flume water microbiology",
        biologicalControl:
          "- Antagonistic yeasts (Pichia guilliermondii, Debaryomyces hansenii, Candida oleophila) have demonstrated efficacy against P. expansum, P. digitatum, and P. italicum in postharvest applications - Bacillus subtilis produces antifungal lipopeptides (iturins, fengycins) effective against Penicillium spp. and can be applied as a postharvest treatment - Antifungal proteins (AFPs) from Penicillium chrysogenum have shown potential to control postharvest Penicillium decay - Essential oils (lemongrass, clove, neem, thyme) have demonstrated antifungal activity in laboratory and applied storage studies",
        chemicalControl:
          "- Four registered postharvest fungicides are available: imazalil, thiabendazole (TBZ), pyrimethanil, and fludioxonil, application is typically via postharvest dip, drench, or wax coating - Fungicide-resistant populations of Penicillium are widespread globally, rotate fungicide classes and avoid repeated use of the same active ingredient - Sodium bicarbonate and acetic acid dip treatments are low-toxicity chemical options showing moderate efficacy as postharvest alternatives - Chemical controls must be integrated with biological and physical measures; chemical treatment alone is insufficient where resistant populations are established",
      },
    },
  },
  {
    name: "Alternaria",
    symptoms: [
      "Brown to dark lesions on leaves",
      "Bull's-eye lesion pattern",
      "Yellow halo on lesions",
      "Defoliation",
      "Stem lesions and canker",
      "Fruit rot and surface lesions",
      "Tuber lesions",
      "Seed discoloration",
      "Chlorosis",
      "Premature leaf drop",
      "Leaf tissue necrosis",
      "Water-soaked spots",
      "Yellowing and browning of tissue",
    ],
    signs: [
      "Dark powdery sporulation",
      "Dark conidial masses",
      "Sooty black surface",
      "Olive-brown mycelium",
      "Concentric ring pattern",
      "Visible conidial chains",
    ],
    characteristics: [
      "Dark olive-gray to black colonies",
      "Velvety to powdery texture",
      "Full growth within 5–7 days",
      "Dark brown to black reverse",
      "Wide temperature tolerance",
      "Musty odor",
      "Septate dark-brown hyphae",
      "Simple unbranched conidiophores",
      "Solitary or chained conidia",
      "Muriform conidia",
      "Beaked apical extension",
      "Dark brown olive conidia",
    ],
    mold_details: {
      name: "Alternaria",
      info: {
        overview:
          "Alternaria is one of the most widespread and economically significant fungal genera in global agriculture, classified into 27 sections with A. solani and A. alternata being the two most agronomically important species. A. solani is the principal cause of early blight — a polycyclic disease capable of causing 35–78% yield losses in tomato and 5–40% in potato — while A. alternata has a broader host range and is the primary producer of Alternaria mycotoxins flagged by EFSA as emerging food safety concerns. The genus is particularly aggressive in warm, humid conditions and can sporulate during repeated wet-dry cycles, a trait that distinguishes it from many other foliar pathogens. In the Philippines, Alternaria species have been reported from multiple mangrove hosts and important food crops including tomato, potato, and various vegetables.",
        description:
          "Alternaria is a ubiquitous genus of filamentous fungi found worldwide in soil, decaying plant material, and as a common pathogen of agricultural crops. It is best known as the principal cause of early blight in tomato and potato, and brown spot in a wide range of fruits, vegetables, and cereals. Several species produce mycotoxins classified by the European Food Safety Authority (EFSA) as emerging food safety concerns. It is also a leading cause of outdoor fungal allergy globally, with A. alternata being among the most prevalent airborne allergens in warm and dry conditions.",
        affected_hosts:
          "Tomato, Potato, Eggplant, Pepper, Brassica (cabbage, cauliflower, broccoli), Wheat, Barley, Maize, Sorghum, Sunflower, Sesame, Carrot, Strawberry, Apple, Pear, Citrus, Grape, Mango, Banana, Ginger, Onion, Garlic, Coffee, Tobacco, Cotton, Soybean, Peanut",
        symptoms_and_signs:
          "- Early blight begins as small brown spots on older lower leaves, progressing upward to form dark brown to black lesions displaying a characteristic bull's-eye concentric ring pattern surrounded by a yellow halo. - Severely infected plants undergo rapid defoliation as lesions coalesce across the leaf surface, with stem lesions and cankers developing in advanced stages of infection. - On tomato and potato fruit and tubers, dark brown to black surface lesions develop at the stem end or shoulders, with firm to slightly sunken necrotic areas visible on the produce surface. - In postharvest storage, infected fruits and vegetables show water-soaked dark lesions that expand rapidly under warm and humid conditions, with dark olive-gray sporulation visible on the surface of affected tissue. - On cereals and grain crops, dark discoloration and shriveling of kernels is accompanied by visible dark sporulation on the grain surface under field and storage conditions.",
        disease_cycle_spread_impact:
          "Alternaria survives between seasons in soil, infected plant debris, and on contaminated seed. Conidia are disseminated primarily by wind and rain splash. A. solani dispersal is largely localized within fields, with significant inoculum reduction at distances beyond 400 m, while A. alternata travels longer distances due to its smaller, lighter conidia. The disease is polycyclic, multiple infection cycles occur within a single growing season during periods of high humidity and prolonged leaf wetness. Infection is favored by temperatures of 18–25°C combined with wet-dry cycling conditions. Yield losses can reach 35–78% in tomato and 5–40% in potato under favorable conditions. Mycotoxin contamination of tomato products, cereals, and processed food adds a food safety dimension to the agronomic impact, with approximately 70% of dietary exposure assessment studies identifying one or more Alternaria mycotoxins as a potential food safety risk.",
        health_risks:
          "Proximity / Exposure (farmers, handlers, storage workers) - Alternaria alternata is the third most frequent cause of respiratory allergies globally and the most prevalent outdoor fungal allergen, inhalation triggers sneezing, nasal congestion, runny nose, and eye irritation - Prolonged exposure causes exacerbation of asthma and is strongly associated with severe and poorly controlled asthma, Alternaria sensitization is linked to worse asthma prognosis - Hypersensitivity pneumonitis and allergic alveolitis have been documented in workers with occupational exposure to high spore concentrations - Sick building syndrome has been associated with indoor Alternaria contamination in damp, poorly ventilated environments",
        prevention_summary:
          "Cold storage, prompt removal of infected debris, avoiding overhead irrigation, crop rotation, resistant varieties, balanced nitrogen fertilization, and certified disease-free seed collectively form the foundation of Alternaria management, supported biologically by Trichoderma spp., Bacillus subtilis, Pseudomonas fluorescens, and botanical essential oils. Chemically, protectant fungicides (mancozeb, chlorothalonil) and systemic fungicides (azoxystrobin, difenoconazole, boscalid) are the most established options — applied preventively, rotated to manage resistance, and timed using disease forecasting models in accordance with local agricultural authority guidelines.",
        taxonomy: {
          kingdom: "Fungi",
          phylum: "Ascomycota",
          class: "Dothideomycetes",
          order: "Pleosporales",
          family: "Pleosporaceae",
          genus: "Alternaria",
        },
        predicted_class_id: 0,
        predicted_class_name: "Alternaria_spp",
      },
      prevention: {
        physicalControl:
          "- Maintain cold storage with adequate ventilation to slow postharvest Alternaria rot development, the pathogen can grow at low temperatures so temperature management alone is insufficient - UV-C irradiation has been evaluated for postharvest surface decontamination of fruits and vegetables against Alternaria - Use row covers or physical barriers to reduce rain splash dispersal of conidia from soil to lower plant canopy - Hyperspectral sensors and precision agriculture tools can detect early blight at latent infection stages, enabling targeted and timely intervention before visible lesions develop",
        mechanicalControl:
          "- Promptly remove and destroy infected leaves, stems, and crop debris from the field to reduce inoculum levels - Avoid overhead irrigation which promotes prolonged leaf wetness, a key requirement for infection and sporulation - Disinfect tools, harvesting equipment, and storage containers to prevent inoculum carry-over between seasons - Handle harvested produce carefully to avoid bruising, which creates entry points for postharvest Alternaria infection",
        culturalControl:
          "- Practice crop rotation with non-host species to reduce soil-borne inoculum from infected debris - Use resistant or tolerant cultivars where available, red-scaled varieties in some crops show improved resistance - Apply balanced nitrogen fertilization, nitrogen deficiency significantly increases plant susceptibility to early blight - Avoid late planting and monoculture, which increase inoculum pressure in the field - Use certified disease-free seed to reduce seedborne inoculum at establishment - Implement decision support systems and disease forecasting models to time fungicide applications accurately",
        biologicalControl:
          "- Trichoderma harzianum and T. viride show antagonistic activity against Alternaria spp. in soil and on plant surfaces - Bacillus subtilis and Pseudomonas fluorescens produce antifungal compounds effective against Alternaria and can be applied as foliar sprays or seed treatments - Essential oils from garlic, neem, and thyme have demonstrated antifungal activity against Alternaria with low phytotoxicity, suitable as botanical alternatives",
        chemicalControl:
          "- Preventive protectant fungicides (mancozeb, chlorothalonil) must be applied before infection occurs, fungicides are generally ineffective once disease is established - Systemic fungicides (azoxystrobin, difenoconazole, boscalid) provide both protective and curative activity against early blight - Fungicide resistance to benzimidazoles and SDHIs has been reported in Alternaria populations, rotate fungicide classes to manage resistance - Apply fungicides based on disease forecasting models (e.g., TOMCAST, FAST) to optimize timing, avoid unnecessary applications, and reduce selection pressure for resistance - All fungicide use should comply with local Fertilizer and Pesticide Authority (FPA) guidelines and registered product labels",
      },
    },
  },
  {
    name: "Fusarium",
    symptoms: [
      "Yellowing of lower leaves",
      "Progressive wilting",
      "Stunted growth",
      "Leaf epinasty",
      "Defoliation",
      "Brown vascular discoloration",
      "Root rot",
      "Crown rot",
      "Seedling damping-off",
      "Empty cob development",
      "Premature plant death",
      "Chlorosis",
      "Postharvest fruit decay",
      "Shriveling of kernels",
      "Pink to red grain discoloration",
    ],
    signs: [
      "Pink to violet mycelium",
      "Pink to salmon sporodochia",
      "Reddish-pink grain discoloration",
      "Dark blue to black sclerotia",
      "White basal mycelial growth",
      "Orange to red pigmentation",
      "Pink ear rot",
      "Tan to brown sporodochia on roots",
    ],
    characteristics: [
      "White to purple cottony colonies",
      "Yellow to carmine pigmentation",
      "Velvety to powdery texture",
      "Fast colony growth",
      "Dark blue-black sclerotia",
      "Septate hyaline hyphae",
      "Banana-shaped macroconidia",
      "Oval to globose microconidia",
      "Chlamydospores present",
      "Cylindrical phialides",
      "Cream to orange sporodochia",
    ],
    mold_details: {
      name: "Fusarium",
      info: {
        overview:
          "Fusarium is one of the most important and extensively studied genera of fungal plant pathogens globally. It encompasses hundreds of species organized into species complexes, the most significant of which are the Fusarium oxysporum species complex (FOSC), the Fusarium graminearum species complex (FGSC), and the Fusarium fujikuroi species complex (FFSC). Individual strains within FOSC specialize on specific host crops and are classified by the informal ranking formae speciales (f.sp.), with over 120 known. Fusarium is primarily soilborne, surviving for decades via chlamydospores, and spreads systemically through plant vascular tissue, blocking xylem vessels and causing the characteristic wilting.",
        description:
          "Fusarium is a genus of filamentous fungi found worldwide in soil, plant debris, and a wide range of agricultural crops. It is one of the most economically damaging groups of plant pathogens globally, causing wilts, blights, rots, and cankers across hundreds of crop species. It is also a prolific mycotoxin producer, contaminating food and feed with fumonisins, trichothecenes, and zearalenone. In the Philippines, Fusarium oxysporum f. sp. cubense Tropical Race 4 is the cause of Panama wilt in banana, one of the most destructive plant diseases currently affecting the country.",
        affected_hosts:
          "Banana, Maize, Wheat, Rice, Sorghum, Soybean, Peanut, Tomato, Potato, Sugarcane, Cotton, Pepper, Eggplant, Cucumber, Carnation, Oil palm, Tobacco, Tea, Coffee, Legumes, Cassava",
        symptoms_and_signs:
          "- Vascular wilt begins with vein clearing and leaf epinasty in the lower leaves, progressing upward to yellowing, wilting, and defoliation, with the stem showing brown discoloration of the vascular tissue when cut in cross-section. - Infected seedlings exhibit damping-off, with the stem base rotting and collapsing before or shortly after emergence from the soil. - In maize, stalk rot causes drooping and drying of leaves with empty cob development and an increasing angle between stalks and cobs as the plant deteriorates. - Fusarium head blight in wheat produces bleached spikelets with pink to salmon sporulation on infected grain, and shrunken, lightweight kernels with visible pink to white mold. - In banana, the vascular tissue in the rhizome and pseudostem turns yellow to brown in cross-section, a hallmark of Panama wilt, even before visible wilting occurs above ground. - On postharvest fruits and roots, soft watery rot develops with pink to white mycelial growth visible on the decayed surface.",
        disease_cycle_spread_impact:
          "Fusarium survives in soil primarily as chlamydospores, thick-walled dormant structures that can persist for up to 30 years in the absence of a host. The pathogen enters plants through roots or wounds, colonizes vascular xylem tissue, and blocks water transport, causing systemic wilting and death. Conidia are dispersed by wind, water splash, contaminated soil, infected seed, and farm equipment. Crop rotation does not fully eliminate soilborne Fusarium due to the extreme longevity of chlamydospores. Monoculture and late planting significantly increase inoculum pressure. The economic impact is severe globally: Fusarium head blight alone causes billions of dollars in losses annually, while Panama wilt of banana continues to devastate commercial plantations across Southeast Asia.",
        health_risks:
          "Proximity / Exposure (farmers, handlers, storage workers) - Inhalation of airborne conidia can trigger allergic reactions, sneezing, nasal congestion, asthma worsening - Skin contact with mycotoxins (trichothecenes in particular) can cause skin irritation and dermatitis, trichothecenes are topically absorbed - Eye infection (keratitis) can occur in healthy individuals from direct contact with conidia, Fusarium is a leading cause of fungal keratitis worldwide - Fusariosis (disseminated infection) in severely immunocompromised individuals is the second most common mold infection after aspergillosis, with 90-day survival rates as low as 43%",
        prevention_summary:
          "Storing grain below 14% moisture, soil solarization, preventing root injuries, disinfecting tools, and removing infected debris are critical physical and mechanical measures given that Fusarium enters through wounds and persists as chlamydospores for up to 30 years, supported culturally by crop rotation, certified pathogen-free seed, resistant varieties, and well-drained land. Biologically, non-pathogenic F. oxysporum strains, Trichoderma spp., Bacillus subtilis, and Pseudomonas fluorescens applied as soil drenches or seed treatments provide the most validated biocontrol options. Chemically, triazole fungicides, carbendazim and prochloraz seed treatments, and plant activators such as validamycin A are the established options — all rotated to manage resistance and applied in accordance with local agricultural authority guidelines.",
        taxonomy: {
          kingdom: "Fungi",
          phylum: "Ascomycota",
          class: "Sordariomycetes",
          order: "Hypocreales",
          family: "Nectriaceae",
          genus: "Fusarium",
        },
        predicted_class_id: 3,
        predicted_class_name: "Fusarium_spp",
      },
      prevention: {
        physicalControl:
          "- Store grain at moisture content below 14% and maintain low storage temperatures to prevent mycotoxin accumulation postharvest - Soil solarization using transparent polyethylene mulch heats the soil and significantly reduces soilborne Fusarium populations - UV-C irradiation has shown efficacy for surface decontamination of seeds and postharvest produce - Cold storage effectively slows postharvest Fusarium rot development",
        mechanicalControl:
          "- Prevent root injuries during transplanting, cultivation, and irrigation, open wounds are primary infection entry points for soilborne strains - Disinfect farm tools, irrigation equipment, and planting containers between uses to prevent field-to-field spread - Remove and destroy infected plant material, roots, and crop debris immediately after harvest - Avoid disturbing infected soil or transporting it to uninfected fields",
        culturalControl:
          "- Practice crop rotation with non-host species, though rotation alone is insufficient given chlamydospore longevity in soil - Avoid monoculture and late planting which increase soil inoculum levels - Use certified, pathogen-tested seed, seedborne Fusarium is a major primary inoculum source - Plant resistant or tolerant varieties where available, particularly for banana (TR4-resistant cultivars) and wheat (FHB-resistant cultivars) - Apply balanced nitrogen fertilization, excessive ammonium nitrogen has been shown to worsen Fusarium wilt in banana - Use well-drained land; waterlogged soil promotes root rot and infection",
        biologicalControl:
          "- Non-pathogenic strains of F. oxysporum have been commercially registered as biofungicides (e.g., Fusaclean) and work by competing with pathogenic strains in root tissue - Trichoderma spp. (T. atroviride, T. harzianum) are well-documented biocontrol agents against Fusarium in soil applications - Bacillus subtilis and Pseudomonas fluorescens show antagonistic activity and can be applied as seed treatments or soil drenches - Non-pathogenic Fusarium sp. W5 has demonstrated strong biocontrol against banana Panama wilt through competitive root colonization",
        chemicalControl:
          "- Triazole fungicides (tebuconazole, propiconazole) are registered for Fusarium head blight management in wheat - Prochloraz and carbendazim are used as seed treatments for soilborne Fusarium management - Validamycin A applied as foliar spray induces systemic acquired resistance (SAR) in plants against Fusarium wilt, an indirect chemical approach - Plant activators (acibenzolar-S-methyl, isotianil) prime plant defenses without direct antifungal activity - Benzimidazole resistance in Fusarium populations has been documented; rotate fungicide classes and consult local agricultural authority guidelines before application",
      },
    },
  },
];

export const seedMolds = async () => {
  const db = getFirestore(firebase);
  const moldsCollection = getCollectionName(FirestoreCollection.MOLDS);

  console.log("\n🍄 Seeding molds...\n");

  for (const mold of MOLDS_SEED) {
    try {
      // Mirrors the WithMetadata<Mold> shape that
      // moldService.addMoldToFirestore writes to Firestore.
      const moldData = {
        ...mold,
        metadata: {
          created_at: Timestamp.now(),
          updated_at: null,
          deleted_at: null,
        },
      };
      await db.collection(moldsCollection).add(moldData);
      console.log(`✅ Created mold: ${mold.name}`);
    } catch (err) {
      console.error(`❌ Failed to create mold "${mold.name}":`, err);
    }
  }

  console.log("\n✨ Molds seeded successfully!\n");
};

// Run directly if this file is executed as main script
if (require.main === module) {
  seedTestUsers()
    .then(async (users) => {
      const farmer = users.find((u) => u.role === Role.USER);
      const mycologists = users.filter((u) => u.role === Role.CURATOR);
      const admin = users.find((u) => u.role === Role.ADMIN);

      if (mycologists.length > 0) {
        // Seed Moldipedia FIRST to get article IDs for linking to resolved cases
        console.log("🔗 Seeding Moldipedia first to establish links...");
        const moldipediaIds = await seedMoldipedia(mycologists[0].uid);
        console.log(`   Created ${moldipediaIds.length} Moldipedia articles`);

        if (farmer && mycologists.length > 0) {
          // Distribute in-progress cases among all mycologists
          // Randomly assign to one of the available mycologists
          const assignedMycologist = mycologists[Math.floor(Math.random() * mycologists.length)];

          // Seed mold reports with randomly selected mycologist and moldipedia IDs
          await seedMoldReports(farmer.uid, assignedMycologist.uid, moldipediaIds);

          console.log(`\n✅ In-progress cases assigned to mycologist: ${assignedMycologist.uid}`);
          console.log(`   Total available mycologists: ${mycologists.length} (Myco, Fungal, Pathogen)`);
        } else {
          console.warn("⚠️  No farmer or mycologist users found — skipping mold reports seed.");
        }
      } else {
        console.warn("⚠️  No mycologist user found — skipping Moldipedia and mold reports seed.");
      }

      if (admin) {
        await seedFaqs(admin.uid);
      } else {
        console.warn("⚠️  No admin user found — skipping FAQ seed.");
      }

      // Seed notifications reflecting all notification types
      await seedNotifications(users);

      await seedMolds();
    })
    .then(() => {
      process.exit(0);
    })
    .catch((err) => {
      devLog(err);
      process.exit(1);
    });
}

// ─── Notification Seed ────────────────────────────────────────────────────────

interface NotificationSeedData {
  recipient_id_index: number; // Index into SEED_USERS array
  type: NotificationType;
  title: string;
  body: string;
  reference_id: string | null;
  reference_type: NotificationReferenceType | null;
  is_read: boolean;
}

const NOTIFICATIONS_SEED: Array<NotificationSeedData> = [
  // Mold report lifecycle - farmer perspective
  {
    recipient_id_index: 4, // Farmer
    type: NotificationType.MOLD_REPORT_CREATED,
    title: "New Mold Report",
    body: 'A new mold report "Corn Leaf Spot" has been submitted and is pending review.',
    reference_id: "report_001",
    reference_type: "mold_report",
    is_read: false,
  },
  {
    recipient_id_index: 4, // Farmer
    type: NotificationType.MOLD_REPORT_ASSIGNED,
    title: "Report Approved",
    body: 'Your mold report "Corn Leaf Spot" has been approved and assigned to a mycologist. You may now send samples for further analysis.',
    reference_id: "report_001",
    reference_type: "mold_report",
    is_read: true,
  },
  {
    recipient_id_index: 4, // Farmer
    type: NotificationType.MOLD_REPORT_REJECTED,
    title: "Report Rejected",
    body: 'Your mold report "Wheat Rust" has been reviewed and rejected. Reason: Insufficient image quality for diagnosis.',
    reference_id: "report_002",
    reference_type: "mold_report",
    is_read: true,
  },
  {
    recipient_id_index: 4, // Farmer
    type: NotificationType.MOLD_REPORT_RESOLVED,
    title: "Report Resolved",
    body: 'Your mold report "Corn Leaf Spot" has been marked as resolved.',
    reference_id: "report_001",
    reference_type: "mold_report",
    is_read: false,
  },
  {
    recipient_id_index: 4, // Farmer
    type: NotificationType.CASE_DETAIL_ADDED,
    title: "New Case Detail",
    body: 'A new detail has been added to the mold report "Rice Blast".',
    reference_id: "report_003",
    reference_type: "mold_report",
    is_read: false,
  },
  
  // Samples lifecycle - mycologist perspective
  {
    recipient_id_index: 1, // Mycologist 1
    type: NotificationType.SAMPLES_RECEIVED,
    title: "Samples Received",
    body: 'John Farmer has brought samples for "Corn Leaf Spot".',
    reference_id: "report_001",
    reference_type: "mold_report",
    is_read: true,
  },

  // Flag report lifecycle - admin perspective
  {
    recipient_id_index: 0, // Admin
    type: NotificationType.FLAG_REPORT_CREATED,
    title: "New Flag Report",
    body: "A mold identification has been flagged for review.",
    reference_id: "flagreport_001",
    reference_type: "flag_report",
    is_read: false,
  },
  {
    recipient_id_index: 0, // Admin
    type: NotificationType.FLAG_REPORT_RESOLVED,
    title: "Flag Report Resolved",
    body: "Your flag report has been reviewed and resolved.",
    reference_id: "flagreport_001",
    reference_type: "flag_report",
    is_read: true,
  },

  // Curator application lifecycle - user perspective
  {
    recipient_id_index: 2, // Mycologist 2
    type: NotificationType.CURATOR_APPROVED,
    title: "Application Approved",
    body: "Your mycologist application has been approved! You can now access curator features.",
    reference_id: null,
    reference_type: null,
    is_read: true,
  },
  {
    recipient_id_index: 4, // Farmer (testing rejected curator application)
    type: NotificationType.CURATOR_REJECTED,
    title: "Application Not Approved",
    body: "Your mycologist application was not approved at this time.",
    reference_id: null,
    reference_type: null,
    is_read: true,
  },

  // Admin → user actions
  {
    recipient_id_index: 3, // Mycologist 3
    type: NotificationType.USER_DISABLED,
    title: "Account Disabled",
    body: "Your account has been temporarily disabled by an administrator.",
    reference_id: "user_003",
    reference_type: "user",
    is_read: false,
  },
  {
    recipient_id_index: 3, // Mycologist 3
    type: NotificationType.USER_ENABLED,
    title: "Account Re-enabled",
    body: "Your account has been re-enabled. You can now log in again.",
    reference_id: "user_003",
    reference_type: "user",
    is_read: false,
  },
  {
    recipient_id_index: 4, // Farmer
    type: NotificationType.USER_BANNED,
    title: "Account Banned",
    body: "Your account has been permanently banned due to policy violations.",
    reference_id: "user_004",
    reference_type: "user",
    is_read: true,
  },
];

export const seedNotifications = async (createdUsers: Array<{ uid: string; email: string }>) => {
  const db = getFirestore(firebase);
  const notificationsCollection = getCollectionName(FirestoreCollection.NOTIFICATIONS);

  console.log("\n🔔 Seeding notifications...\n");

  for (const notifData of NOTIFICATIONS_SEED) {
    try {
      // Get the recipient UID from createdUsers array
      const recipientUser = createdUsers[notifData.recipient_id_index];
      if (!recipientUser) {
        console.warn(`⚠️  Skipped notification: user index ${notifData.recipient_id_index} not found`);
        continue;
      }

      const notification = {
        recipient_id: recipientUser.uid,
        type: notifData.type,
        title: notifData.title,
        body: notifData.body,
        reference_id: notifData.reference_id,
        reference_type: notifData.reference_type,
        is_read: notifData.is_read,
        created_at: Timestamp.now(),
      };

      await db.collection(notificationsCollection).add(notification);
      console.log(`✅ Created notification: ${notifData.type} → ${recipientUser.email}`);
    } catch (err) {
      console.error(`❌ Failed to create notification "${notifData.type}":`, err);
    }
  }

  console.log("\n✨ Notifications seeded successfully!\n");
};

// ─── FAQ Seed (5) ─────────────────────────────────────────────────────────────

const FAQ_SEED: Array<{ question: string; answer: string }> = [
  {
    question: "What are common signs of mold infection in crops?",
    answer:
      "Look for fuzzy or powdery growths on leaves or fruit, discolored or water-soaked lesions, wilting, and premature leaf drop. Some molds also produce distinctive spore colors (green, blue, black).",
  },
  {
    question: "How can I prevent mold growth in stored grains?",
    answer:
      "Dry grain to below 13% moisture before storage, use hermetic or well-ventilated storage, maintain low humidity and cool temperatures, and regularly inspect and remove damaged kernels.",
  },
  {
    question: "When should I call a mycologist or submit a sample?",
    answer:
      "Submit samples when you observe rapidly spreading lesions, unusual symptoms, or if initial management fails. Early diagnosis helps target control measures and avoid unnecessary treatments.",
  },
  {
    question: "Are there safe biological controls for mold diseases?",
    answer:
      "Yes — biocontrol agents like Trichoderma spp., Bacillus subtilis, and other beneficial microbes can suppress many molds when used as part of an integrated program with good cultural practices.",
  },
  {
    question: "Can mold-infected produce be made safe for consumption?",
    answer:
      "Some superficially moldy fruits or vegetables can be trimmed and used, but stored-grain mycotoxins (e.g., aflatoxin) cannot be removed by cleaning or cooking; contaminated lots should be tested and disposed of if above safe limits.",
  },
];

export const seedFaqs = async (authorUid: string) => {
  const db = getFirestore(firebase);
  const faqCollection = getCollectionName(FirestoreCollection.FAQ);

  console.log("\n❓ Seeding FAQ entries...\n");

  for (const item of FAQ_SEED) {
    try {
      const data = {
        question: item.question,
        answer: item.answer,
        user_id: authorUid,
        metadata: {
          created_at: Timestamp.now(),
          updated_at: null,
          deleted_at: null,
        },
      };

      await db.collection(faqCollection).add(data);
      console.log(`✅ Created FAQ: "${item.question.substring(0, 40)}..."`);
    } catch (err) {
      console.error(`❌ Failed to create FAQ "${item.question}":`, err);
    }
  }

  console.log("\n✨ FAQs seeded successfully!\n");
};
