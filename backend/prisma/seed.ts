import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// ---------------------------------------------------------------------------
// Status buckets — deterministic, based on i % 20
//
//  bucket  0–7  (8/20 = 40%) → DELIVERED
//  bucket  8–11 (4/20 = 20%) → IN_TRANSIT
//  bucket 12–14 (3/20 = 15%) → PICKUP (accepted)
//  bucket 15–16 (2/20 = 10%) → RTO_UNDELIVERED
//  bucket 17–19 (3/20 = 15%) → DENIED
// ---------------------------------------------------------------------------
interface StatusBucket {
  deliveryStatus: string;
  merchantAcceptDeny: string;
  mappingStatus: string;
  pickupStatus: boolean;
  currentStatus: string;
  installationStatus: string;
}

function getStatusBucket(i: number): StatusBucket {
  const bucket = i % 20;

  if (bucket <= 7) {
    // ~40% DELIVERED
    return {
      deliveryStatus: "DELIVERED",
      merchantAcceptDeny: "ACCEPTED",
      mappingStatus: "MAPPED",
      pickupStatus: true,
      currentStatus: "DELIVERED",
      installationStatus: "COMPLETED",
    };
  } else if (bucket <= 11) {
    // ~20% IN_TRANSIT
    return {
      deliveryStatus: "IN_TRANSIT",
      merchantAcceptDeny: "ACCEPTED",
      mappingStatus: "MAPPED",
      pickupStatus: true,
      currentStatus: "IN_TRANSIT",
      installationStatus: "PENDING",
    };
  } else if (bucket <= 14) {
    // ~15% PICKUP (accepted, not yet picked up)
    return {
      deliveryStatus: "PICKUP",
      merchantAcceptDeny: "ACCEPTED",
      mappingStatus: "MAPPED",
      pickupStatus: false,
      currentStatus: "PICKUP",
      installationStatus: "PENDING",
    };
  } else if (bucket <= 16) {
    // ~10% RTO_UNDELIVERED
    return {
      deliveryStatus: "RTO_UNDELIVERED",
      merchantAcceptDeny: "ACCEPTED",
      mappingStatus: "MAPPED",
      pickupStatus: true,
      currentStatus: "RTO_UNDELIVERED",
      installationStatus: "PENDING",
    };
  } else {
    // ~15% DENIED
    return {
      deliveryStatus: "PICKUP",
      merchantAcceptDeny: "DENIED",
      mappingStatus: "UNMAPPED",
      pickupStatus: false,
      currentStatus: "DENIED",
      installationStatus: "PENDING",
    };
  }
}

async function main() {
  // -------------------------------------------------------------------------
  // 1. Admin user
  // -------------------------------------------------------------------------
  const hashedPassword = await bcrypt.hash("password123", 10);
  await prisma.user.upsert({
    where: { email: "admin@soundbox.com" },
    update: {},
    create: {
      email: "admin@soundbox.com",
      password: hashedPassword,
      name: "Admin User",
      role: "ADMIN",
    },
  });

  // -------------------------------------------------------------------------
  // 2. Banks (8 banks × 25 records = 200 total)
  // -------------------------------------------------------------------------
  const bankNames = [
    "Canara Bank",
    "Bank of Baroda",
    "CBoI",
    "HDFC Bank",
    "ICICI Bank",
    "SBI",
    "Axis Bank",
    "PNB",
  ];
  const banks: Record<string, any> = {};
  for (const name of bankNames) {
    banks[name] = await prisma.bank.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }

  // -------------------------------------------------------------------------
  // 3. Courier partners
  // -------------------------------------------------------------------------
  const courierNames = ["BlueDart", "Delhivery", "Ecom Express", "XpressBees"];
  const couriers: Record<string, any> = {};
  for (const name of courierNames) {
    couriers[name] = await prisma.courierPartner.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }

  // -------------------------------------------------------------------------
  // 4. Create 200 indents
  //
  // Layout:
  //   i = 0..199
  //   bankIdx  = Math.floor(i / 25)   → 0..7, so each bank gets exactly 25 records
  //   j        = i % 25               → position within the bank (0..24)
  //
  // Date distribution per bank (using j):
  //   year   = even j → 2024, odd j → 2025
  //            → 2024: j = 0,2,4,…,24 (13 records)
  //            → 2025: j = 1,3,5,…,23 (12 records)
  //   month  = j % 12                 → 0 (Jan) … 11 (Dec)
  //            → 2024 gets months 0,2,4,6,8,10     (6 distinct months ✓)
  //            → 2025 gets months 1,3,5,7,9,11     (6 distinct months ✓)
  //   day    = (j % 28) + 1           → 1..28 (safe for all months)
  //
  // Status distribution (i % 20 → see getStatusBucket above)
  // -------------------------------------------------------------------------
  const TOTAL = 200;
  const PER_BANK = 25;

  for (let i = 0; i < TOTAL; i++) {
    const bankIdx = Math.floor(i / PER_BANK);
    const j = i % PER_BANK;

    const bankName = bankNames[bankIdx];
    const courierName = courierNames[i % courierNames.length];
    const deliveryType = i % 2 === 0 ? "OPEX" : "CAPEX";

    const year = j % 2 === 0 ? 2024 : 2025;
    const month = j % 12; // 0-based (0 = Jan, 11 = Dec)
    const day = (j % 28) + 1; // 1–28, valid for every month

    const indentDate = new Date(year, month, day);

    const status = getStatusBucket(i);

    // Unique merchant per indent — name "Merchant 1" … "Merchant 200"
    // Mobile is deterministic: 9000000001 … 9000000200
    const merchant = await prisma.merchant.create({
      data: {
        name: `Merchant ${i + 1}`,
        mobile: String(9000000000 + i + 1),
      },
    });

    await prisma.indent.create({
      data: {
        merchantId: merchant.id,
        bankId: banks[bankName].id,
        deliveryType,
        indentDate,
        merchantAcceptDeny: status.merchantAcceptDeny,
        mappingStatus: status.mappingStatus,
        pickupStatus: status.pickupStatus,
        deliveryStatus: status.deliveryStatus,
        installationStatus: status.installationStatus,
        currentStatus: status.currentStatus,
        // Denied records never reach the courier stage
        courierPartnerId:
          status.merchantAcceptDeny !== "DENIED"
            ? couriers[courierName].id
            : null,
        remarks: i % 10 === 0 ? "Urgent delivery requested" : null,
      },
    });
  }

  console.log(
    `Seed complete: 200 indents across ${bankNames.length} banks, years 2024–2025.`,
  );
  console.log(
    "  Distribution: ~40% DELIVERED | ~20% IN_TRANSIT | ~15% PICKUP | ~10% RTO | ~15% DENIED",
  );
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
