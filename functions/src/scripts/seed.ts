import {getAuth} from "firebase-admin/auth";
import {getFirestore, Timestamp} from "firebase-admin/firestore";
import {firebase} from "../configs/firebase";
import {Role} from "../types/enums";
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

    console.log("\n┌─ MYCOLOGIST ────────────────────────────────────┐");
    console.log(`│ Username: ${SEED_USERS[1].username}                         │`);
    console.log("│ Password: Test[]1234                              │");
    console.log("│ Role: mycologist (curator)                      │");
    console.log("└─────────────────────────────────────────────────┘");

    console.log("\n┌─ FARMER ────────────────────────────────────────┐");
    console.log(`│ Username: ${SEED_USERS[2].username}                         │`);
    console.log("│ Password: Test[]1234                            │");
    console.log("│ Role: farmer (user)                             │");
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
  status: "pending" | "in progress" | "resolved" | "rejected";
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
    status: "in progress",
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
    status: "in progress",
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
    status: "in progress",
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

export const seedMoldReports = async (farmerUid: string, mycologistUid?: string) => {
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

      // Create MoldCase only for in-progress reports that are assigned to a mycologist.
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
    title: "Understanding Fusarium Wilt in Philippine Crop Fields",
    body: "<p>Fusarium wilt is one of the most destructive soil-borne diseases affecting a wide range of crops in the Philippines, including banana, tomato, ampalaya, and eggplant. Caused primarily by Fusarium oxysporum and its host-specific formae speciales, the disease is notorious for its persistence in soil and its capacity to devastate entire plantations.</p><h2>How Fusarium Spreads</h2><p>The pathogen thrives in warm, moist soils and enters plants through the roots, colonizing the vascular system. Once inside, fungal mycelium and spores block water and nutrient transport, causing the hallmark one-sided yellowing and wilting. A cross-section of an infected stem typically reveals brown discoloration of the vascular tissue — a reliable diagnostic indicator.</p><p>Fusarium spores (chlamydospores) can survive in the soil for decades, making infected fields essentially unusable for susceptible crops without intervention. The pathogen spreads through contaminated soil, irrigation water, infested plant debris, and tools and footwear moving between fields.</p><h2>Impact on Philippine Agriculture</h2><p>The TR4 (Tropical Race 4) strain of Fusarium oxysporum f. sp. cubense poses an existential threat to the Philippine banana export industry, which relies heavily on the Cavendish variety — a cultivar with no natural resistance to TR4. Beyond banana, Fusarium wilt on tomato and other vegetables results in significant yield losses, particularly during the rainy season when soil moisture is elevated.</p><h2>Integrated Management Strategies</h2><p>Effective control of Fusarium wilt requires an integrated approach:</p><ul><li><strong>Cultural practices</strong>: Avoid planting susceptible varieties in known infested fields. Use disease-free planting material. Improve soil drainage to reduce moisture stress.</li><li><strong>Biological control</strong>: Soil application of Trichoderma harzianum and Bacillus subtilis-based products can suppress Fusarium populations and promote root health.</li><li><strong>Chemical management</strong>: Soil drenches with propiconazole or thiophanate-methyl can reduce disease incidence in early-stage infections.</li><li><strong>Resistant varieties</strong>: Adopting Fusarium-resistant or tolerant cultivars is the most sustainable long-term solution where available.</li></ul><p>Early detection and rapid response remain the most critical components of Fusarium wilt management in Philippine agroecosystems.</p>",
    tags: ["fusarium", "wilt", "banana", "tomato", "soil-borne disease", "crop disease", "Philippines"],
  },
  {
    title: "Aspergillus and Aflatoxin Contamination in Stored Grains",
    body: "<p>Among the many post-harvest challenges facing Filipino farmers, contamination of stored grains and nuts by Aspergillus molds — and the aflatoxins they produce — stands out as both a food safety and an economic crisis. Aflatoxins are among the most potent naturally occurring carcinogens, and their presence in food commodities triggers trade restrictions, export rejections, and serious long-term health consequences for consumers.</p><h2>What is Aspergillus?</h2><p>Aspergillus is a large genus of molds found ubiquitously in soil and decaying plant material. In agricultural contexts, the most economically important species are Aspergillus flavus and A. parasiticus, both of which produce aflatoxins. These molds primarily attack crops before and during storage, particularly affecting corn, peanuts, and copra (dried coconut meat) — all major Philippine commodities.</p><h2>How Aflatoxin Contamination Occurs</h2><p>Contamination can begin in the field through insect damage and drought stress, which predisposes kernels to fungal invasion. However, the critical phase is post-harvest: inadequate drying of grains (moisture content above 14%), poor storage facilities with high humidity, and temperature fluctuations create ideal conditions for Aspergillus proliferation and aflatoxin synthesis.</p><h2>Health and Economic Implications</h2><p>Aflatoxin B1 is classified as a Group 1 human carcinogen by the International Agency for Research on Cancer (IARC). Chronic low-level exposure is linked to liver cancer, while acute high-level exposure causes aflatoxicosis — a severe, sometimes fatal condition. For Filipino farmers, rejected shipments and condemned stocks translate directly into income losses.</p><h2>Prevention and Control</h2><ul><li><strong>Harvest at correct maturity</strong> and avoid delays that expose crops to prolonged field moisture.</li><li><strong>Dry thoroughly</strong>: Reduce grain moisture to below 13% before placing into storage.</li><li><strong>Use hermetically sealed storage</strong>: Limit oxygen to inhibit mold growth.</li><li><strong>Biological competition</strong>: Atoxigenic A. flavus strains applied to fields outcompete toxigenic strains and significantly reduce aflatoxin levels.</li><li><strong>Regular monitoring</strong>: Use rapid aflatoxin test kits at farmer cooperative level to screen grains before sale.</li></ul><p>Addressing aflatoxin contamination requires farm-level awareness, infrastructure investment, and policy support — all of which are essential for protecting both public health and Filipino farmers' livelihoods.</p>",
    tags: ["aspergillus", "aflatoxin", "stored grains", "food safety", "post-harvest", "corn", "peanuts"],
  },
  {
    title: "Managing Alternaria Blight During the Wet Season",
    body: "<p>Every wet season, vegetable farmers across the Philippines contend with the aggressive spread of Alternaria blight — a fungal disease that targets tomatoes, potatoes, cabbage, and many other vegetable crops. Caused by several species of Alternaria fungi, particularly A. solani and A. alternata, this disease can cause yield losses of up to 50% when left unmanaged during prolonged periods of rain and humidity.</p><h2>Recognizing Alternaria Blight</h2><p>The most distinctive symptom of Alternaria blight is the appearance of dark brown to black circular lesions with characteristic concentric rings — resembling a target or bullseye — on older leaves, stems, and fruit. As lesions enlarge and coalesce, heavily infected leaves turn yellow and drop prematurely, stripping the plant of its photosynthetic capacity. On tomato fruits, Alternaria causes dark sunken lesions at the stem end, making the produce unmarketable.</p><h2>Why the Wet Season is High Risk</h2><p>Alternaria spores are spread efficiently by wind and rain splash. Extended periods of leaf wetness — more than 9 hours at temperatures between 20–30°C — are ideal for infection. The rainy season in the Philippines, particularly from June to November, creates precisely these conditions over extended periods. Poor air circulation within dense planting arrangements further compounds the risk.</p><h2>Integrated Management Approach</h2><p>Managing Alternaria requires coordinated action before and during the growing season:</p><ol><li><strong>Use quality seeds and resistant varieties</strong>: Begin with certified disease-free seeds. Where available, choose Alternaria-tolerant tomato and potato varieties.</li><li><strong>Improve field sanitation</strong>: Remove and properly dispose of infected plant debris after harvest. Plow under crop residues to accelerate decomposition and reduce inoculum.</li><li><strong>Optimize plant spacing</strong>: Adequate spacing promotes air movement, reduces canopy humidity, and shortens leaf wetness duration.</li><li><strong>Stake and trellis plants</strong>: Keeping foliage off the ground minimizes splash-dispersal of spores from soil.</li><li><strong>Biological controls</strong>: Foliar sprays of Bacillus amyloliquefaciens or Trichoderma-based biofungicides have demonstrated suppressive activity against Alternaria and can be integrated into spray programs.</li><li><strong>Fungicide applications</strong>: Initiate protective fungicide sprays at first sign of disease or at canopy closure. Effective active ingredients include chlorothalonil, mancozeb, azoxystrobin, and difenoconazole. Rotate between modes of action to prevent resistance.</li></ol><p>With vigilant scouting and early intervention, Alternaria blight can be kept below economically damaging thresholds even during the most challenging rainy seasons.</p>",
    tags: ["alternaria", "blight", "early blight", "tomato", "vegetable", "wet season", "fungal disease"],
  },
];

export const seedMoldipedia = async (mycologistUid: string) => {
  const db = getFirestore(firebase);
  const moldipediaCollection = getCollectionName(FirestoreCollection.MOLDIPEDIA);

  console.log("\n📖 Seeding Moldipedia articles...\n");

  for (const article of MOLDIPEDIA_SEED) {
    try {
      // Mirrors the WithMetadata<Moldipedia> shape that
      // moldipediaService.addMoldipediaToFirestore writes to Firestore.
      const articleData = {
        title: article.title,
        body: article.body,
        author_id: mycologistUid,
        cover_photo: "",
        tags: article.tags,
        is_archived: false,
        mycologist_id: mycologistUid,
        approved_at: Timestamp.now(),
        metadata: {
          created_at: Timestamp.now(),
          updated_at: null,
          deleted_at: null,
        },
      };

      await db.collection(moldipediaCollection).add(articleData);
      console.log(`✅ Created Moldipedia article: "${article.title}"`);
    } catch (err) {
      console.error(`❌ Failed to create article "${article.title}":`, err);
    }
  }

  console.log("\n✨ Moldipedia articles seeded successfully!\n");
};

// ─── Molds (5) ────────────────────────────────────────────────────────────────

const MOLDS_SEED = [
  {
    name: "Aspergillus Flavi",
    symptoms: ["yellowing", "wilting", "spotting"],
    signs: ["white to green spores", "powdery surface", "off-odors"],
    characteristics: ["aflatoxin production", "thrives in warm dry storage", "rapid colonization"],
    mold_details: {
      info: {
        description:
          "Aspergillus is a genus of molds commonly found in soil, decaying organic matter, and various agricultural settings. Several species are pathogenic to crops, producing mycotoxins such as aflatoxins that contaminate stored grains, nuts, and other food products. Under warm, humid conditions typical of tropical climates like the Philippines, Aspergillus species proliferate rapidly and can cause significant pre- and post-harvest losses.",
        taxonomy: {
          kingdom: "Fungi",
          phylum: "Ascomycota",
          class: "Eurotiomycetes",
          order: "Eurotiales",
          family: "Aspergillaceae",
          genus: "Aspergillus",
        },
        additional_info: [
          {
            title: "Symptoms",
            description:
              "Infected crops show discoloration, rotting, and visible greenish to black spore masses on the surface. Stored grains may exhibit off-odors and visible mold growth that spreads rapidly through bulk storage.",
          },
          {
            title: "Favorable Conditions",
            description:
              "High relative humidity (above 70%), temperatures between 25–40°C, and mechanical damage to produce facilitate Aspergillus invasion and rapid colonization of host tissue.",
          },
          {
            title: "Economic Impact",
            description:
              "Aflatoxins produced by Aspergillus flavus and A. parasiticus pose serious food safety risks and can lead to trade rejections and significant economic losses for Filipino farmers, particularly in corn and peanut production.",
          },
        ],
        predicted_class_id: 1,
        predicted_class_name: "Aspergillus_section_Flavi",
      },
      prevention: {
        physicalControl:
          "Ensure proper ventilation and low humidity in storage facilities. Use hermetically sealed containers to prevent moisture ingress and limit oxygen availability, inhibiting spore germination.",
        mechanicalControl:
          "Regularly clean and sanitize all storage areas, bins, and handling equipment. Remove and dispose of visibly infected produce immediately to prevent cross-contamination of healthy stocks.",
        culturalControl:
          "Harvest crops at the right maturity stage and avoid mechanical damage during harvesting and transport. Practice proper crop rotation to reduce soil inoculum levels over successive seasons.",
        biologicalControl:
          "Apply biocontrol agents such as Bacillus subtilis or atoxigenic strains of Aspergillus flavus, which competitively exclude toxigenic strains in the field and during storage, significantly reducing aflatoxin levels.",
        chemicalControl:
          "Use registered fungicides such as tebuconazole or propiconazole as pre-harvest sprays. Treat stored grains with recommended fumigants under proper safety protocols and in compliance with local regulations.",
      },
    },
  },
  {
    name: "Aspergillus Nigri",
    symptoms: ["surface discoloration", "softening"],
    signs: ["black spore masses", "powdery colonies"],
    characteristics: ["post-harvest rot", "tolerant to moderate humidity"],
    mold_details: {
      info: {
        description:
          "Aspergillus is a genus of molds commonly found in soil, decaying organic matter, and various agricultural settings. Several species are pathogenic to crops and post-harvest produce; the Nigri group (black aspergilli) includes species that affect fruits and stored products.",
        taxonomy: {
          kingdom: "Fungi",
          phylum: "Ascomycota",
          class: "Eurotiomycetes",
          order: "Eurotiales",
          family: "Aspergillaceae",
          genus: "Aspergillus",
        },
        additional_info: [
          {
            title: "Symptoms",
            description:
              "Infected produce may show dark, powdery spore masses and rapid surface spoilage; black aspergilli often colonize damaged fruit and contribute to post-harvest losses.",
          },
          {
            title: "Favorable Conditions",
            description:
              "Warm temperatures and high humidity with injury or bruising to produce favor infection by black aspergilli. Poor post-harvest handling increases risk.",
          },
          {
            title: "Economic Impact",
            description:
              "Black aspergilli can cause significant post-harvest quality loss in fruits and vegetables, affecting marketability and shelf life.",
          },
        ],
        predicted_class_id: 2,
        predicted_class_name: "Aspergillus_section_Nigri",
      },
      prevention: {
        physicalControl:
          "Improve post-harvest handling and cooling to reduce surface colonization and spore germination.",
        mechanicalControl:
          "Sanitize containers and handling equipment; remove damaged fruit before storage to limit spread.",
        culturalControl:
          "Reduce harvest injuries and avoid long field exposure of produce; sort and pack carefully.",
        biologicalControl:
          "Research on biocontrol options for black aspergilli is ongoing; consider integrated post-harvest hygiene measures.",
        chemicalControl:
          "Use approved post-harvest treatments where applicable and in compliance with local regulations.",
      },
    },
  },
  {
    name: "Rhizopus",
    symptoms: ["soft rot", "water-soaked lesions"],
    signs: ["dense white mycelium", "black sporangiophores"],
    characteristics: ["rapid spread in moist conditions", "favors injured tissue"],
    mold_details: {
      info: {
        description:
          "Rhizopus is a genus of common bread molds found worldwide in soil and decomposing organic material. In tropical regions, R. stolonifer and R. oryzae are significant post-harvest pathogens that cause soft rot on a wide range of fruits, vegetables, and root crops. The mold spreads rapidly through contact and airborne spores under warm, moist conditions prevalent in the Philippines.",
        taxonomy: {
          kingdom: "Fungi",
          phylum: "Mucoromycota",
          class: "Mucoromycetes",
          order: "Mucorales",
          family: "Rhizopodaceae",
          genus: "Rhizopus",
        },
        additional_info: [
          {
            title: "Symptoms",
            description:
              "Affected produce develops water-soaked lesions that rapidly turn soft and mushy. Dense white mycelium with black sporangiophores becomes visible on the rotting tissue within 24–48 hours of infection.",
          },
          {
            title: "Favorable Conditions",
            description:
              "Optimal growth occurs between 25–30°C with high relative humidity. Injuries on the surface of fruits and vegetables serve as primary infection sites through which the pathogen gains entry.",
          },
          {
            title: "Economic Impact",
            description:
              "Rhizopus soft rot is a major cause of post-harvest losses in sweet potato, strawberry, mango, and other crops in the Philippines, often leading to complete spoilage within days of harvest if not properly managed.",
          },
        ],
        predicted_class_id: 5,
        predicted_class_name: "Rhizopus_spp",
      },
      prevention: {
        physicalControl:
          "Store produce at low temperatures (below 10°C) immediately after harvest to inhibit spore germination and mycelial growth. Maintain good airflow throughout storage facilities to reduce surface moisture.",
        mechanicalControl:
          "Handle produce carefully during harvesting and packaging to avoid surface injuries. Sort and discard damaged or infected items before storage to prevent rapid spread through stored lots.",
        culturalControl:
          "Avoid excessive irrigation close to harvest time to reduce field humidity. Practice field sanitation by removing crop debris and fallen fruit to minimize spore build-up in the growing environment.",
        biologicalControl:
          "Apply Trichoderma spp. or Bacillus subtilis-based biocontrol products to suppress Rhizopus growth on stored produce. Post-harvest dips with yeast-based antagonists have also shown significant efficacy in trials.",
        chemicalControl:
          "Post-harvest application of iprodione or thiabendazole dips can substantially reduce Rhizopus infection rates. Ensure compliance with local pesticide regulations and observe recommended post-harvest intervals before consumption.",
      },
    },
  },
  {
    name: "Penicillium",
    symptoms: ["softening", "water-soaked tissue"],
    signs: ["blue-green powdery colonies", "musty odor"],
    characteristics: ["psychrotolerant growth", "post-harvest spoilage"],
    mold_details: {
      info: {
        description:
          "Penicillium is a diverse genus of ascomycetous molds widespread in soil, indoor environments, and food storage areas. Several species are important post-harvest pathogens of citrus and other fruits, while others produce mycotoxins such as patulin and ochratoxin A. In the Philippines, blue and green molds caused by Penicillium expansum and P. digitatum are frequent problems during fruit transport and storage.",
        taxonomy: {
          kingdom: "Fungi",
          phylum: "Ascomycota",
          class: "Eurotiomycetes",
          order: "Eurotiales",
          family: "Aspergillaceae",
          genus: "Penicillium",
        },
        additional_info: [
          {
            title: "Symptoms",
            description:
              "Infected fruits and vegetables display characteristic blue or green powdery mold colonies surrounded by white mycelial rings. The affected tissue becomes soft, watery, and eventually collapses, emitting a characteristic musty odor.",
          },
          {
            title: "Favorable Conditions",
            description:
              "Penicillium thrives in cool to moderate temperatures (0–25°C) with high relative humidity. Even cold storage does not fully prevent growth, as several species are psychrotolerant and can grow at near-freezing temperatures.",
          },
          {
            title: "Economic Impact",
            description:
              "Penicillium molds are among the most economically damaging post-harvest pathogens of citrus, apples, and stone fruits, causing significant financial losses in transport and retail chains across the Philippines and Southeast Asia.",
          },
        ],
        predicted_class_id: 4,
        predicted_class_name: "Penicillium_spp",
      },
      prevention: {
        physicalControl:
          "Use cold storage (0–5°C) combined with controlled atmosphere storage to slow Penicillium development. Maintain humidity levels below 90% in storage facilities to reduce the risk of surface condensation that promotes spore germination.",
        mechanicalControl:
          "Clean and sanitize storage bins, crates, and cold rooms regularly using registered sanitizers. Remove all organic debris, which can serve as a persistent reservoir for Penicillium spores and inoculum.",
        culturalControl:
          "Apply proper field sanitation practices and remove fallen or decaying fruit from orchards promptly. Use good drainage practices to reduce humidity around fruit clusters and minimize wounding during harvest.",
        biologicalControl:
          "Post-harvest biological control agents such as Candida oleophila and Pichia guilliermondii have demonstrated effectiveness against Penicillium blue and green mold on citrus fruits, offering a residue-free alternative to chemical treatments.",
        chemicalControl:
          "Post-harvest fungicide treatments with thiabendazole, imazalil, or fludioxonil effectively reduce Penicillium infection rates. Rotate between different fungicide classes to prevent the development and spread of fungicide-resistant strains.",
      },
    },
  },
  {
    name: "Alternaria",
    symptoms: ["leaf spots", "defoliation"],
    signs: ["concentric ring lesions", "dark necrotic spots"],
    characteristics: ["thrives with prolonged leaf wetness", "wind/rain dispersed spores"],
    mold_details: {
      info: {
        description:
          "Alternaria is a genus of widespread saprotrophic and parasitic fungi that cause disease in a broad range of crop plants. Alternaria spp. are responsible for early blight, leaf spot, and fruit rot diseases in tomatoes, potatoes, and other vegetables. In the Philippines, humid weather and warm temperatures during the rainy season favor Alternaria outbreaks, leading to substantial yield losses in vegetable production areas.",
        taxonomy: {
          kingdom: "Fungi",
          phylum: "Ascomycota",
          class: "Dothideomycetes",
          order: "Pleosporales",
          family: "Pleosporaceae",
          genus: "Alternaria",
        },
        additional_info: [
          {
            title: "Symptoms",
            description:
              "Characteristic symptoms include dark brown to black concentric ring lesions on leaves, stems, and fruit. As the disease progresses, lesions coalesce, causing defoliation and fruit blemishing that renders produce unmarketable.",
          },
          {
            title: "Favorable Conditions",
            description:
              "Alternaria sporulates profusely under warm temperatures (20–30°C), prolonged leaf wetness of more than 9 hours, and alternating wet-dry cycles. Spores are dispersed efficiently by wind and splashing rain.",
          },
          {
            title: "Economic Impact",
            description:
              "Alternaria early blight is one of the most destructive foliar diseases of tomato and potato in the Philippines, causing yield losses of up to 50% in severe cases during the wet season without adequate management.",
          },
        ],
        predicted_class_id: 0,
        predicted_class_name: "Alternaria_spp",
      },
      prevention: {
        physicalControl:
          "Remove and destroy infected plant debris from the field promptly after each crop cycle. Stake and trellis plants to improve air circulation and reduce leaf wetness duration, limiting the infection window for Alternaria spores.",
        mechanicalControl:
          "Prune infected leaves and branches using sterilized tools to remove inoculum sources. Avoid working in fields when foliage is wet to minimize the mechanical spread of spores to healthy tissue.",
        culturalControl:
          "Rotate crops with non-host plants for at least two seasons to reduce soil inoculum levels. Plant resistant or tolerant varieties and use quality, certified disease-free seeds as the foundation of disease management.",
        biologicalControl:
          "Applying Bacillus amyloliquefaciens or Trichoderma-based biofungicides as foliar sprays has shown suppressive effects on Alternaria lesion development. These biological options integrate well into comprehensive pest management programs.",
        chemicalControl:
          "Fungicides containing chlorothalonil, mancozeb, or azoxystrobin are effective against Alternaria. Initiate preventive spray programs early in the season, before disease onset, and rotate chemical classes to manage fungicide resistance.",
      },
    },
  },
  {
    name: "Fusarium",
    symptoms: ["one-sided yellowing", "wilting"],
    signs: ["brown vascular discoloration", "root rot"],
    characteristics: ["soil-borne persistence", "race-specific pathogenicity"],
    mold_details: {
      info: {
        description:
          "Fusarium is a large genus of filamentous fungi found in soil and plant material across all tropical and temperate regions. Many species are serious plant pathogens responsible for Fusarium wilt, crown rot, and head blight in cereals, vegetables, and ornamentals. In the Philippines, Fusarium oxysporum and F. solani are key pathogens of banana, tomato, and ampalaya, posing a persistent threat to agricultural productivity.",
        taxonomy: {
          kingdom: "Fungi",
          phylum: "Ascomycota",
          class: "Sordariomycetes",
          order: "Hypocreales",
          family: "Nectriaceae",
          genus: "Fusarium",
        },
        additional_info: [
          {
            title: "Symptoms",
            description:
              "Fusarium wilt causes one-sided yellowing and wilting of foliage, with distinct brown vascular discoloration visible on cross-sections of infected stems. Crown and root rots appear as dark, water-soaked necrosis at the base of the plant, eventually causing collapse.",
          },
          {
            title: "Favorable Conditions",
            description:
              "Warm soil temperatures (25–30°C), wet conditions followed by dry spells, and acidic soils favor Fusarium infection. Root wounds caused by soil-borne insects, nematodes, or cultivation equipment also predispose plants to successful pathogen entry.",
          },
          {
            title: "Economic Impact",
            description:
              "Fusarium wilt of banana caused by the TR4 strain poses a catastrophic risk to the Philippine banana export industry. Fusarium diseases across other crops collectively account for significant annual yield and income losses among smallholder farmers nationwide.",
          },
        ],
        predicted_class_id: 3,
        predicted_class_name: "Fusarium_spp",
      },
      prevention: {
        physicalControl:
          "Solarize infested soil by covering moist soil with clear plastic film for 4–6 weeks during the hot dry season to reduce viable Fusarium chlamydospores in the topsoil. Install drainage systems to prevent waterlogging that favors pathogen activity.",
        mechanicalControl:
          "Sterilize all cultivation tools and field equipment between fields using a 10% bleach or 70% ethanol solution to avoid transferring infested soil. Remove and destroy infected plant tissue and roots immediately upon detection.",
        culturalControl:
          "Avoid planting susceptible varieties in previously infested fields. Use raised beds and improve soil drainage infrastructure. Apply agricultural lime to raise soil pH above 6.5, creating conditions less conducive to Fusarium survival and sporulation.",
        biologicalControl:
          "Trichoderma harzianum and Bacillus subtilis are effective biocontrol agents that colonize the rhizosphere and suppress Fusarium through direct competition, mycoparasitism, and the production of antifungal antibiotics and volatile compounds.",
        chemicalControl:
          "Soil drenches with propiconazole, thiophanate-methyl, or carbendazim can suppress Fusarium populations in heavily infested fields. Seed treatments with fungicide formulations protect seedlings during the critical early establishment phase when root systems are most vulnerable.",
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
      const mycologist = users.find((u) => u.role === Role.CURATOR);
      const admin = users.find((u) => u.role === Role.ADMIN);

      if (farmer) {
        await seedMoldReports(farmer.uid, mycologist?.uid);
      } else {
        console.warn("⚠️  No farmer user found — skipping mold reports seed.");
      }

      if (mycologist) {
        await seedMoldipedia(mycologist.uid);
      } else {
        console.warn("⚠️  No mycologist user found — skipping Moldipedia seed.");
      }

      if (admin) {
        await seedFaqs(admin.uid);
      } else {
        console.warn("⚠️  No admin user found — skipping FAQ seed.");
      }

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
